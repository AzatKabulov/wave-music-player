import {
  setAudioModeAsync,
  useAudioPlaylist,
  useAudioPlaylistStatus,
} from "expo-audio";
import { randomUUID } from "./uuid";
import Constants from "expo-constants";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { http } from "./http";
import { setRepeat } from "./audioCommands";
import { mock } from "./mock";
import {
  contextQueue,
  insertExplicit,
  moveEntry,
  shuffleEntries,
} from "./queue";
import { deviceStorage } from "./storage";
import { sourceUpdate } from "./sourceUpdate";
import { sourcePatch } from "./sourcePatch";
import { savedIds } from "./libraryState";
import { mergeCatalog, refreshCatalog } from "./catalogCache";
import { createLatestWriter } from "./latestWriter";
import { playbackTiming } from "./playbackTiming";
import type {
  MusicData,
  Library,
  SearchKind,
  QueueEntry,
  QueueState,
  Snapshot,
  Track,
} from "./types";

const emptyQueue = (): QueueState => ({
  revision: "0",
  entries: [],
  currentId: null,
  positionMs: 0,
  repeat: "none",
  shuffle: false,
});
const data: MusicData =
  process.env.EXPO_PUBLIC_DATA_MODE === "mock" ? mock : http;
const expoGo = Boolean(Constants.expoGoConfig);
function useMusicController() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [notice, setNotice] = useState(""),
    [pending, setPending] = useState(0),
    [queue, setQueue] = useState<QueueState>(emptyQueue);
  const queueRef = useRef(queue),
    installation = useRef(""),
    lease = useRef(""),
    leaseMinted = useRef(0),
    loadedLease = useRef(""),
    pipeline = useRef<Promise<unknown>>(Promise.resolve()),
    canonical = useRef<QueueEntry[]>([]);
  const seekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekVersion = useRef(0);
  const restorationVersion = useRef(0);
  const cancelSeek = useCallback(() => {
    seekVersion.current++;
    if (seekTimer.current) clearTimeout(seekTimer.current);
  }, []);
  const mounted = useRef(true),
    generation = useRef(0);
  const snapshotRef = useRef(snapshot);
  type PositionWrite = {
    owner: string;
    installation: string;
    state: QueueState;
    reportError: boolean;
  };
  const writePosition = useCallback(async (value: PositionWrite) => {
    if (snapshotRef.current?.profile?.id !== value.owner) return;
    await data.position(value.installation, value.state);
  }, []);
  const positionError = useCallback((_error: unknown, value: PositionWrite) => {
    if (
      value.reportError &&
      mounted.current &&
      snapshotRef.current?.profile?.id === value.owner
    )
      setError("Could not save this playback position. Try seeking again.");
  }, []);
  const positions = useRef<ReturnType<
    typeof createLatestWriter<PositionWrite>
  > | null>(null);
  useEffect(() => {
    const writer = createLatestWriter(writePosition, positionError);
    positions.current = writer;
    return () => {
      writer.clear();
      positions.current = null;
    };
  }, [writePosition, positionError]);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
  const resolved = useRef(
    new Map<string, { at: number; request: Promise<void> }>(),
  );
  const resolve = useCallback(
    (kind: "album" | "artist" | "playlist", id: string) => {
      const owner = snapshotRef.current?.profile?.id;
      if (!owner) return Promise.resolve();
      const key = `${owner}:${kind}:${id}`;
      const cached = resolved.current.get(key);
      const state = snapshotRef.current;
      const present =
        kind === "playlist"
          ? [
              ...(state?.playlists || []),
              ...(state?.catalog.playlists || []),
            ].some((item) => item.id === id)
          : state?.catalog[kind === "album" ? "albums" : "artists"].some(
              (item) => item.id === id,
            );
      if (cached && present && Date.now() - cached.at < 60000)
        return cached.request;
      const request = data
        .resolve(kind, id)
        .then((graph) => {
          setSnapshot((previous) =>
            previous && previous.profile?.id === owner
              ? mergeCatalog(
                  previous,
                  graph,
                  true,
                  queueRef.current.entries.map((entry) => entry.trackId),
                )
              : previous,
          );
        })
        .catch((error) => {
          resolved.current.delete(key);
          throw error;
        });
      resolved.current.set(key, { at: Date.now(), request });
      return request;
    },
    [],
  );
  const search = useCallback(
    async (
      query: string,
      kind: SearchKind,
      signal?: AbortSignal,
      cursor?: string,
    ) => {
      const owner = snapshotRef.current?.profile?.id;
      const result = await data.search(query, kind, signal, cursor);
      if (!signal?.aborted)
        setSnapshot((previous) =>
          previous && previous.profile?.id === owner
            ? mergeCatalog(
                previous,
                result.catalog,
                false,
                queueRef.current.entries.map((entry) => entry.trackId),
              )
            : previous,
        );
      return result;
    },
    [],
  );
  const saves = useRef(
    new Map<
      string,
      {
        owner: string;
        kind: keyof Library;
        id: string;
        intent: boolean;
        confirmed: boolean;
        version: number;
        tail: Promise<void>;
      }
    >(),
  );
  const engine = useAudioPlaylist({
      sources: [],
      updateInterval: 500,
      loop: "none",
    }),
    status = useAudioPlaylistStatus(engine);
  const statusRef = useRef(status);
  const activeTiming = useRef<number | null>(null);
  useEffect(() => {
    statusRef.current = status;
    const entry = queueRef.current.entries[status.currentIndex];
    if (entry)
      playbackTiming.observe(
        activeTiming.current,
        entry.id,
        status.playing && status.isLoaded && !status.isBuffering,
        status.currentTime,
      );
  }, [status]);
  const activeEntry = queue.entries[status.currentIndex],
    track = snapshot?.catalog.tracks.find((t) => t.id === activeEntry?.trackId);
  const refresh = useCallback(async () => {
    const n = ++generation.current;
    let value = await data.snapshot();
    for (const entry of saves.current.values()) {
      if (entry.owner === value.profile?.id)
        value = {
          ...value,
          library: {
            ...value.library,
            [entry.kind]: savedIds(
              value.library[entry.kind],
              entry.id,
              entry.intent,
            ),
          },
        };
    }
    if (mounted.current && n === generation.current)
      setSnapshot((previous) =>
        refreshCatalog(
          previous,
          value,
          queueRef.current.entries.map((entry) => entry.trackId),
        ),
      );
    return value;
  }, []);
  const save = useCallback(
    (kind: keyof Library, id: string, desired: boolean) => {
      const current = snapshotRef.current;
      if (!current?.profile) return;
      const owner = current.profile.id;
      const key = `${owner}:${kind}:${id}`;
      const entry = saves.current.get(key) || {
        owner,
        kind,
        id,
        intent: desired,
        confirmed: current.library[kind].includes(id),
        version: 0,
        tail: Promise.resolve(),
      };
      entry.intent = desired;
      const version = ++entry.version;
      saves.current.set(key, entry);
      setSnapshot((previous) =>
        previous?.profile?.id === owner
          ? {
              ...previous,
              library: {
                ...previous.library,
                [kind]: savedIds(previous.library[kind], id, desired),
              },
            }
          : previous,
      );
      entry.tail = entry.tail.then(async () => {
        // A sign-out/account switch must not send an old user's queued mutation
        // with the next user's credentials.
        if (snapshotRef.current?.profile?.id !== owner) return;
        try {
          await data.save(kind, id, desired);
          entry.confirmed = desired;
        } catch (error) {
          if (
            version === entry.version &&
            snapshotRef.current?.profile?.id === owner
          ) {
            setSnapshot((previous) =>
              previous
                ? {
                    ...previous,
                    library: {
                      ...previous.library,
                      [kind]: savedIds(
                        previous.library[kind],
                        id,
                        entry.confirmed,
                      ),
                    },
                  }
                : previous,
            );
            setError(
              error instanceof Error
                ? error.message
                : "Could not save. Try again.",
            );
          }
        } finally {
          if (version === entry.version) saves.current.delete(key);
        }
      });
      return entry.tail;
    },
    [],
  );
  const run = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      success?: string,
    ): Promise<T | undefined> => {
      setPending((p) => p + 1);
      setError("");
      try {
        const value = await operation();
        await refresh();
        if (success) setNotice(success);
        return value;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "The request failed. Try again.",
        );
        return undefined;
      } finally {
        setPending((p) => p - 1);
      }
    },
    [refresh],
  );
  const ensureLease = useCallback(async () => {
    if (
      !lease.current ||
      Date.now() - leaseMinted.current > 23 * 60 * 60 * 1000
    ) {
      lease.current = await data.grant(installation.current);
      leaseMinted.current = Date.now();
    }
    return lease.current;
  }, []);
  const install = useCallback(
    (state: QueueState, play: boolean, token: string) => {
      const previous = queueRef.current;
      const update = sourceUpdate(
        previous.entries,
        state.entries,
        loadedLease.current === token,
      );
      const patch =
        update === "replace" &&
        Platform.OS === "android" &&
        loadedLease.current === token &&
        previous.currentId === state.currentId
          ? sourcePatch(previous.entries, state.entries, state.currentId)
          : null;
      if (update === "replace" && !patch) {
        engine.pause();
        engine.clear();
      }
      const additions =
        update === "reuse" || patch
          ? []
          : update === "append"
            ? state.entries.slice(previous.entries.length)
            : state.entries;
      additions.forEach((entry) =>
        engine.add({ uri: data.media(token, entry) }),
      );
      if (patch) {
        patch.remove.forEach((index) => engine.remove(index));
        patch.insert.forEach(({ entry, index }) =>
          engine.insert({ uri: data.media(token, entry) }, index),
        );
      }
      loadedLease.current = token;
      const index = state.entries.findIndex((e) => e.id === state.currentId);
      if (
        !patch &&
        index >= 0 &&
        (update === "replace" || index !== engine.currentIndex)
      )
        engine.skipTo(index);
      setRepeat(engine, state.repeat);
      queueRef.current = state;
      setQueue(state);
      if (update === "replace" && !patch && state.positionMs > 0)
        void engine
          .seekTo(state.positionMs / 1000)
          .catch(() => setError("Could not restore this position."));
      if (
        play &&
        state.entries.length &&
        ((update === "replace" && !patch) || !statusRef.current.playing)
      )
        engine.play();
    },
    [engine],
  );
  const reconcile = useCallback(async () => {
    const restored = await data.restoreQueue(installation.current);
    if (restored) {
      canonical.current = restored.entries;
      await ensureLease();
      install(restored, false, lease.current);
    }
  }, [ensureLease, install]);
  const command = useCallback(
    (
      change: (current: QueueState) => QueueState,
      play?: boolean,
      action: "playSelection" | "queueEdit" = "queueEdit",
    ) => {
      const timing = playbackTiming.start(action);
      restorationVersion.current++;
      setPending((p) => p + 1);
      const next = pipeline.current
        .catch(() => {})
        .then(async () => {
          playbackTiming.mark(timing, "commandStarted");
          const old = queueRef.current,
            s = statusRef.current;
          const state = change({
            ...old,
            currentId: old.entries[s.currentIndex]?.id || old.currentId,
            positionMs: Math.floor(s.currentTime * 1000),
          });
          playbackTiming.mark(timing, "requestStarted");
          const committed = await data.queue(installation.current, state, {
            includeGrant:
              !lease.current ||
              Date.now() - leaseMinted.current > 23 * 60 * 60 * 1000,
          });
          playbackTiming.mark(timing, "serverAcknowledged");
          playbackTiming.mark(timing, "grantStarted");
          await ensureLease();
          playbackTiming.mark(timing, "grantReady");
          const selected = committed.entries.find(
            (entry) => entry.id === committed.currentId,
          );
          if (selected)
            playbackTiming.bind(timing, selected.id, selected.trackId);
          playbackTiming.mark(timing, "installStarted");
          install(committed, play ?? s.playing, lease.current);
          playbackTiming.mark(timing, "installed");
          activeTiming.current = timing;
          return true;
        })
        .catch(async (e) => {
          playbackTiming.mark(timing, "failed");
          setError(
            e instanceof Error ? e.message : "Could not update the queue.",
          );
          await reconcile().catch(() => {});
          return false;
        })
        .finally(() => setPending((p) => p - 1));
      pipeline.current = next;
      return next;
    },
    [ensureLease, install, reconcile],
  );
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const version = restorationVersion.current;
    const current = () => !cancelled && version === restorationVersion.current;
    void (async () => {
      try {
        let id = await deviceStorage.getItem("saz.installation");
        if (!id) {
          id = randomUUID();
          await deviceStorage.setItem("saz.installation", id);
        }
        installation.current = id;
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: !expoGo,
          interruptionMode: "doNotMix",
        });
        const cached = await data.cachedSnapshot().catch(() => null);
        if (cached && !cancelled) {
          snapshotRef.current = cached;
          setSnapshot(cached);
          setLoading(false);
        }
        const account = await refresh();
        if (cancelled) return;
        // The browse surface is useful as soon as its metadata is available.
        // Queue/media authorization restores independently and never wins over
        // a newer explicit choice made while its network request was pending.
        setLoading(false);
        if (account.profile && current()) {
          const restored = await data.restoreQueue(id);
          if (restored?.entries.length && current()) {
            await ensureLease();
            if (!current()) return;
            canonical.current = restored.entries;
            install(restored, false, lease.current);
          }
        }
      } catch (e) {
        if (current())
          setError(e instanceof Error ? e.message : "Could not connect.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      mounted.current = false;
      cancelSeek();
    };
  }, [ensureLease, install, refresh, cancelSeek]);
  useEffect(() => {
    const timer = setInterval(() => {
      const owner = snapshotRef.current?.profile?.id;
      if (!owner || !queueRef.current.entries.length || !installation.current)
        return;
      const old = queueRef.current,
        s = statusRef.current;
      positions.current?.submit({
        owner,
        installation: installation.current,
        reportError: false,
        state: {
          ...old,
          currentId: old.entries[s.currentIndex]?.id || old.currentId,
          positionMs: Math.floor(s.currentTime * 1000),
        },
      });
    }, 10000);
    return () => {
      clearInterval(timer);
      positions.current?.clear();
    };
  }, [positions]);
  useEffect(() => {
    if (Platform.OS !== "web" && !expoGo && track) {
      engine.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        albumTitle: track.album,
        artworkUrl: track.artworkUrl,
      });
    }
  }, [track, engine]);
  const trackId = track?.id;
  const ownerId = snapshot?.profile?.id;
  useEffect(() => {
    if (trackId && status.playing)
      void data
        .recent(trackId)
        .then(() =>
          setSnapshot((previous) =>
            previous && previous.profile?.id === ownerId
              ? {
                  ...previous,
                  recents: [
                    trackId,
                    ...previous.recents.filter((id) => id !== trackId),
                  ].slice(0, 100),
                }
              : previous,
          ),
        )
        .catch(() => {});
  }, [trackId, status.playing, ownerId]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void refresh()
          .then((account) => {
            if (
              account.profile &&
              queueRef.current.entries.length &&
              Date.now() - leaseMinted.current > 23 * 60 * 60 * 1000
            )
              return command((q) => q);
          })
          .catch(() => {});
    });
    return () => listener.remove();
  }, [refresh, command]);
  const playTracks = useCallback(
    (tracks: Track[], start = 0, shuffle = false) =>
      command(
        (current) => {
          const result = contextQueue(
            tracks,
            {
              revision: current.revision,
              start,
              shuffle,
              explicitAllowed: !!snapshot?.preferences.explicitAllowed,
            },
            randomUUID,
          );
          if (!result.state.entries.length)
            throw Error("No playable tracks in this collection.");
          canonical.current = result.canonical;
          return result.state;
        },
        true,
        "playSelection",
      ),
    [command, snapshot?.preferences.explicitAllowed],
  );
  const enqueueTracks = useCallback(
    (tracks: Track[]) =>
      command((current) => {
        const eligible = tracks.filter(
          (track) =>
            track.available &&
            (snapshot?.preferences.explicitAllowed || !track.explicit),
        );
        if (!eligible.length)
          throw Error("No playable tracks in this collection.");
        let entries = current.entries;
        for (const track of eligible)
          entries = insertExplicit(entries, current.currentId, {
            id: randomUUID(),
            trackId: track.id,
            origin: "explicit",
          });
        return {
          ...current,
          entries,
          currentId: current.currentId || entries[0]?.id || null,
        };
      }),
    [command, snapshot?.preferences.explicitAllowed],
  );
  const stop = useCallback(() => {
    restorationVersion.current++;
    cancelSeek();
    positions.current?.clear();
    engine.pause();
    engine.clear();
    lease.current = "";
    loadedLease.current = "";
    activeTiming.current = null;
    playbackTiming.clear();
    queueRef.current = emptyQueue();
    setQueue(emptyQueue());
  }, [cancelSeek, engine, positions]);
  const seek = useCallback(
    (seconds: number) => {
      const version = ++seekVersion.current;
      const positionMs = Math.floor(
        Math.max(
          0,
          Math.min(
            statusRef.current.duration || (track?.durationMs ?? 0) / 1000,
            seconds,
          ),
        ) * 1000,
      );
      const currentId = queueRef.current.entries[engine.currentIndex]?.id;
      if (seekTimer.current) clearTimeout(seekTimer.current);
      void engine
        .seekTo(positionMs / 1000)
        .then(() => {
          if (!mounted.current || version !== seekVersion.current) return;
          seekTimer.current = setTimeout(() => {
            const old = queueRef.current,
              owner = snapshotRef.current?.profile?.id;
            if (
              !owner ||
              !mounted.current ||
              version !== seekVersion.current ||
              !currentId ||
              old.entries[engine.currentIndex]?.id !== currentId
            )
              return;
            positions.current?.submit({
              owner,
              installation: installation.current,
              reportError: true,
              state: { ...old, currentId, positionMs },
            });
          }, 250);
        })
        .catch(() => {
          if (mounted.current && version === seekVersion.current)
            setError("Could not seek.");
        });
    },
    [engine, track?.durationMs, positions],
  );
  const music = useMemo(
    () => ({
      data,
      resolve,
      search,
      snapshot,
      loading,
      error,
      setError,
      notice,
      setNotice,
      pending: pending > 0,
      queue,
      track,
      activeEntry,
      run,
      refresh,
      save,
      retryPlayback: () => {
        lease.current = "";
        return command((q) => q, true);
      },
      playTracks,
      enqueueTracks,
      toggle: () => {
        try {
          if (statusRef.current.playing) engine.pause();
          else engine.play();
        } catch {
          setError("Playback could not start. Try another track.");
        }
      },
      next: () => engine.next(),
      previous: () =>
        statusRef.current.currentTime > 3 ? seek(0) : engine.previous(),
      seek,
      enqueue: (track: Track) => enqueueTracks([track]),
      moveQueue: (id: string, delta: number) =>
        command((q) => ({ ...q, entries: moveEntry(q.entries, id, delta) })),
      moveQueueTo: (id: string, targetId: string) =>
        command((q) => {
          const from = q.entries.findIndex((entry) => entry.id === id);
          const target = q.entries.findIndex((entry) => entry.id === targetId);
          return from < 0 || target < 0
            ? q
            : { ...q, entries: moveEntry(q.entries, id, target - from) };
        }),
      removeQueue: (id: string) =>
        command((q) => {
          if (id === q.currentId)
            throw Error("Skip the current track before removing it.");
          return { ...q, entries: q.entries.filter((e) => e.id !== id) };
        }),
      restoreQueueEntry: (
        entry: QueueEntry,
        beforeId?: string,
        afterId?: string,
      ) =>
        command((q) => {
          if (q.entries.some((item) => item.id === entry.id)) return q;
          const nextIndex = q.entries.findIndex((item) => item.id === afterId);
          const previousIndex = q.entries.findIndex(
            (item) => item.id === beforeId,
          );
          const entries = [...q.entries];
          entries.splice(
            nextIndex >= 0
              ? nextIndex
              : previousIndex >= 0
                ? previousIndex + 1
                : entries.length,
            0,
            entry,
          );
          return { ...q, entries };
        }),
      clearExplicit: () =>
        command((q) => ({
          ...q,
          entries: q.entries.filter(
            (e) => e.origin !== "explicit" || e.id === q.currentId,
          ),
        })),
      jumpQueue: (id: string) => {
        const index = queue.entries.findIndex((e) => e.id === id);
        if (index >= 0) {
          engine.skipTo(index);
          engine.play();
        }
      },
      repeat: () =>
        command((q) => ({
          ...q,
          repeat:
            q.repeat === "none"
              ? "all"
              : q.repeat === "all"
                ? "single"
                : "none",
        })),
      shuffle: () =>
        command((q) => {
          if (!q.shuffle) canonical.current = q.entries;
          const order = q.shuffle
            ? [
                ...canonical.current.filter((e) =>
                  q.entries.some((x) => x.id === e.id),
                ),
                ...q.entries.filter(
                  (e) => !canonical.current.some((x) => x.id === e.id),
                ),
              ]
            : shuffleEntries(q.entries, q.currentId);
          return { ...q, entries: order, shuffle: !q.shuffle };
        }),
      signOut: () =>
        run(async () => {
          await pipeline.current;
          await Promise.all(
            [...saves.current.values()].map((entry) => entry.tail),
          );
          stop();
          await positions.current?.idle();
          await data.signOut();
        }),
      deleteAccount: () =>
        run(async () => {
          await pipeline.current;
          await Promise.all(
            [...saves.current.values()].map((entry) => entry.tail),
          );
          stop();
          await positions.current?.idle();
          await data.deleteAccount();
        }, "Account deletion requested."),
    }),
    [
      snapshot,
      loading,
      error,
      notice,
      pending,
      queue,
      track,
      activeEntry,
      run,
      refresh,
      save,
      playTracks,
      enqueueTracks,
      seek,
      engine,
      command,
      stop,
      resolve,
      search,
      positions,
    ],
  );
  return { music, status };
}
type MusicContext = ReturnType<typeof useMusicController>["music"];
const Context = createContext<MusicContext | null>(null);
const PlaybackContext = createContext<ReturnType<
  typeof useAudioPlaylistStatus
> | null>(null);
export function MusicProvider({ children }: { children: React.ReactNode }) {
  const { music, status } = useMusicController();
  return (
    <Context.Provider value={music}>
      <PlaybackContext.Provider value={status}>
        {children}
      </PlaybackContext.Provider>
    </Context.Provider>
  );
}
export function useMusic() {
  const value = useContext(Context);
  if (!value) throw Error("MusicProvider is missing");
  return value;
}
export function usePlaybackStatus() {
  const value = useContext(PlaybackContext);
  if (!value) throw Error("MusicProvider is missing");
  return value;
}
