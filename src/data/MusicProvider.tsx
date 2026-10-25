import {
  setAudioModeAsync,
  useAudioPlaylist,
  useAudioPlaylistStatus,
} from "expo-audio";
import { randomUUID } from "expo-crypto";
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
import { insertExplicit, moveEntry, shuffleEntries } from "./queue";
import { deviceStorage } from "./storage";
import { sourceUpdate } from "./sourceUpdate";
import { savedIds } from "./libraryState";
import type {
  MusicData,
  Library,
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
  const cancelSeek = useCallback(() => {
    seekVersion.current++;
    if (seekTimer.current) clearTimeout(seekTimer.current);
  }, []);
  const mounted = useRef(true),
    generation = useRef(0);
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
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
  useEffect(() => {
    statusRef.current = status;
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
    if (mounted.current && n === generation.current) setSnapshot(value);
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
      if (update === "replace") {
        engine.pause();
        engine.clear();
      }
      const additions =
        update === "reuse"
          ? []
          : update === "append"
            ? state.entries.slice(previous.entries.length)
            : state.entries;
      additions.forEach((entry) =>
        engine.add({ uri: data.media(token, entry) }),
      );
      loadedLease.current = token;
      const index = state.entries.findIndex((e) => e.id === state.currentId);
      if (index >= 0 && (update === "replace" || index !== engine.currentIndex))
        engine.skipTo(index);
      setRepeat(engine, state.repeat);
      queueRef.current = state;
      setQueue(state);
      if (update === "replace" && state.positionMs > 0)
        void engine
          .seekTo(state.positionMs / 1000)
          .catch(() => setError("Could not restore this position."));
      if (
        play &&
        state.entries.length &&
        (update === "replace" || !statusRef.current.playing)
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
    (change: (current: QueueState) => QueueState, play?: boolean) => {
      setPending((p) => p + 1);
      const next = pipeline.current
        .catch(() => {})
        .then(async () => {
          const old = queueRef.current,
            s = statusRef.current;
          const state = change({
            ...old,
            currentId: old.entries[s.currentIndex]?.id || old.currentId,
            positionMs: Math.floor(s.currentTime * 1000),
          });
          const committed = await data.queue(installation.current, state);
          await ensureLease();
          install(committed, play ?? s.playing, lease.current);
          return true;
        })
        .catch(async (e) => {
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
        const account = await refresh();
        if (account.profile) {
          const restored = await data.restoreQueue(id);
          if (restored?.entries.length) {
            await ensureLease();
            canonical.current = restored.entries;
            install(restored, false, lease.current);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not connect.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted.current = false;
      cancelSeek();
    };
  }, [ensureLease, install, refresh, cancelSeek]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!queueRef.current.entries.length || !installation.current) return;
      pipeline.current = pipeline.current
        .catch(() => {})
        .then(async () => {
          const old = queueRef.current,
            s = statusRef.current;
          const state = {
            ...old,
            currentId: old.entries[s.currentIndex]?.id || old.currentId,
            positionMs: Math.floor(s.currentTime * 1000),
          };
          const committed = await data.queue(installation.current, state);
          queueRef.current = committed;
          setQueue(committed);
        })
        .catch(() => reconcile().catch(() => {}));
    }, 10000);
    return () => clearInterval(timer);
  }, [reconcile]);
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
  useEffect(() => {
    if (trackId && status.playing)
      void data
        .recent(trackId)
        .then(() =>
          setSnapshot((previous) =>
            previous
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
  }, [trackId, status.playing]);
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
    (tracks: Track[], start = 0) =>
      command((current) => {
        const eligible = tracks
          .map((track, index) => ({ track, index }))
          .filter(
            ({ track }) =>
              track.available &&
              (snapshot?.preferences.explicitAllowed || !track.explicit),
          );
        const entries = eligible.map(({ track }) => ({
          id: randomUUID(),
          trackId: track.id,
          origin: "context" as const,
        }));
        canonical.current = entries;
        return {
          ...emptyQueue(),
          revision: current.revision,
          entries,
          currentId:
            entries[eligible.findIndex((item) => item.index === start)]?.id ||
            entries[0]?.id ||
            null,
        };
      }, true),
    [command, snapshot?.preferences.explicitAllowed],
  );
  const stop = useCallback(() => {
    cancelSeek();
    engine.pause();
    engine.clear();
    lease.current = "";
    loadedLease.current = "";
    queueRef.current = emptyQueue();
    setQueue(emptyQueue());
  }, [cancelSeek, engine]);
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
            // Serialize cursor writes with membership edits; do not apply an old seek to a new track.
            pipeline.current = pipeline.current
              .catch(() => {})
              .then(async () => {
                const old = queueRef.current;
                if (
                  !mounted.current ||
                  version !== seekVersion.current ||
                  !currentId ||
                  old.entries[engine.currentIndex]?.id !== currentId
                )
                  return;
                const committed = await data.queue(installation.current, {
                  ...old,
                  currentId,
                  positionMs,
                });
                queueRef.current = committed;
                if (mounted.current) setQueue(committed);
              })
              .catch(() => {
                if (mounted.current && version === seekVersion.current)
                  setError(
                    "Could not save this playback position. Try seeking again.",
                  );
              });
          }, 250);
        })
        .catch(() => {
          if (mounted.current && version === seekVersion.current)
            setError("Could not seek.");
        });
    },
    [engine, track?.durationMs],
  );
  const music = useMemo(
    () => ({
      data,
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
      playTracks,
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
      enqueue: (track: Track) =>
        command((q) => {
          const entry = {
            id: randomUUID(),
            trackId: track.id,
            origin: "explicit" as const,
          };
          return {
            ...q,
            entries: insertExplicit(q.entries, q.currentId, entry),
            currentId: q.currentId || entry.id,
          };
        }),
      moveQueue: (id: string, delta: number) =>
        command((q) => ({ ...q, entries: moveEntry(q.entries, id, delta) })),
      removeQueue: (id: string) =>
        command((q) => {
          if (id === q.currentId)
            throw Error("Skip the current track before removing it.");
          return { ...q, entries: q.entries.filter((e) => e.id !== id) };
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
          await data.signOut();
        }),
      deleteAccount: () =>
        run(async () => {
          await pipeline.current;
          await Promise.all(
            [...saves.current.values()].map((entry) => entry.tail),
          );
          stop();
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
      seek,
      engine,
      command,
      stop,
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
