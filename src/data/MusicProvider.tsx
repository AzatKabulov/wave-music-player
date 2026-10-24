import {
  setAudioModeAsync,
  useAudioPlaylist,
  useAudioPlaylistStatus,
} from "expo-audio";
import { randomUUID } from "expo-crypto";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { http } from "./http";
import { mock } from "./mock";
import { insertExplicit, moveEntry, shuffleEntries } from "./queue";
import { deviceStorage } from "./storage";
import type {
  MusicData,
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
    pipeline = useRef<Promise<unknown>>(Promise.resolve()),
    canonical = useRef<QueueEntry[]>([]);
  const mounted = useRef(true),
    generation = useRef(0);
  const engine = useAudioPlaylist({
      sources: [],
      updateInterval: 500,
      loop: "none",
    }),
    status = useAudioPlaylistStatus(engine);
  const statusRef = useRef(status);
  statusRef.current = status;
  const activeEntry = queue.entries[status.currentIndex],
    track = snapshot?.catalog.tracks.find((t) => t.id === activeEntry?.trackId);
  const refresh = useCallback(async () => {
    const n = ++generation.current;
    const value = await data.snapshot();
    if (mounted.current && n === generation.current) setSnapshot(value);
    return value;
  }, []);
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
  const ensureLease = async () => {
    if (
      !lease.current ||
      Date.now() - leaseMinted.current > 23 * 60 * 60 * 1000
    ) {
      lease.current = await data.grant(installation.current);
      leaseMinted.current = Date.now();
    }
    return lease.current;
  };
  const install = (state: QueueState, play: boolean, token: string) => {
    engine.pause();
    engine.clear();
    state.entries.forEach((entry) =>
      engine.add({ uri: data.media(token, entry) }),
    );
    const index = state.entries.findIndex((e) => e.id === state.currentId);
    if (index >= 0) engine.skipTo(index);
    engine.loop = state.repeat;
    queueRef.current = state;
    setQueue(state);
    if (state.positionMs > 0)
      void engine
        .seekTo(state.positionMs / 1000)
        .catch(() => setError("Could not restore this position."));
    if (play && state.entries.length) engine.play();
  };
  const reconcile = async () => {
    const restored = await data.restoreQueue(installation.current);
    if (restored) {
      canonical.current = restored.entries;
      await ensureLease();
      install(restored, false, lease.current);
    }
  };
  const command = (
    change: (current: QueueState) => QueueState,
    play?: boolean,
  ) => {
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
  };
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
          shouldPlayInBackground: true,
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
    };
  }, []);
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
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web" && track) {
      engine.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        albumTitle: track.album,
      });
    }
  }, [track?.id]);
  useEffect(() => {
    if (track && status.playing)
      void data
        .recent(track.id)
        .then(refresh)
        .catch(() => {});
  }, [track?.id, status.playing]);
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
  }, [refresh]);
  const playTracks = (tracks: Track[], start = 0) =>
    command((current) => {
      const entries = tracks
        .filter(
          (t) =>
            t.available &&
            (snapshot?.preferences.explicitAllowed || !t.explicit),
        )
        .map((t) => ({
          id: randomUUID(),
          trackId: t.id,
          origin: "context" as const,
        }));
      canonical.current = entries;
      return {
        ...emptyQueue(),
        revision: current.revision,
        entries,
        currentId:
          entries.find((e) => e.trackId === tracks[start]?.id)?.id ||
          entries[0]?.id ||
          null,
      };
    }, true);
  const stop = () => {
    engine.pause();
    engine.clear();
    lease.current = "";
    queueRef.current = emptyQueue();
    setQueue(emptyQueue());
  };
  return {
    data,
    snapshot,
    loading,
    error,
    setError,
    notice,
    setNotice,
    pending: pending > 0,
    queue,
    status,
    track,
    activeEntry,
    run,
    refresh,
    playTracks,
    toggle: () => {
      try {
        status.playing ? engine.pause() : engine.play();
      } catch {
        setError("Playback could not start. Try another track.");
      }
    },
    next: () => engine.next(),
    previous: () =>
      status.currentTime > 3 ? void engine.seekTo(0) : engine.previous(),
    seek: (seconds: number) => {
      void engine
        .seekTo(Math.max(0, Math.min(status.duration, seconds)))
        .catch(() => setError("Could not seek."));
    },
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
          q.repeat === "none" ? "all" : q.repeat === "all" ? "single" : "none",
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
        stop();
        await data.signOut();
      }),
    deleteAccount: () =>
      run(async () => {
        await pipeline.current;
        stop();
        await data.deleteAccount();
      }, "Account deletion requested."),
  };
}
type MusicContext = ReturnType<typeof useMusicController>;
const Context = createContext<MusicContext | null>(null);
export function MusicProvider({ children }: { children: React.ReactNode }) {
  const value = useMusicController();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMusic() {
  const value = useContext(Context);
  if (!value) throw Error("MusicProvider is missing");
  return value;
}
