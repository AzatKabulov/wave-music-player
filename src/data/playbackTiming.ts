export type PlaybackStage =
  | "tap"
  | "commandStarted"
  | "requestStarted"
  | "serverAcknowledged"
  | "grantStarted"
  | "grantReady"
  | "installStarted"
  | "installed"
  | "playbackObserved"
  | "failed";
type Action = "playSelection" | "queueEdit";
type Trace = {
  id: number;
  action: Action;
  entryId?: string;
  trackId?: string;
  marks: Partial<Record<PlaybackStage, number>>;
};
const uuid = (value: string) =>
  /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

// Local, bounded diagnostics. No network, disk, raw URLs, tokens or error text.
export function createPlaybackTiming({
  enabled,
  now = () => performance.now(),
  limit = 32,
}: {
  enabled: boolean;
  now?: () => number;
  limit?: number;
}) {
  const traces = new Map<
    number,
    { value: Trace; start: number; position?: number }
  >();
  let sequence = 0;
  const mark = (id: number | null, stage: PlaybackStage) => {
    const trace = id === null ? null : traces.get(id);
    if (!trace || trace.value.marks[stage] !== undefined) return;
    const previous = Math.max(0, ...Object.values(trace.value.marks));
    trace.value.marks[stage] = Math.max(
      previous,
      Math.round((now() - trace.start) * 100) / 100,
    );
  };
  return {
    start(action: Action): number | null {
      if (!enabled) return null;
      const id = ++sequence;
      traces.set(id, {
        start: now(),
        value: { id, action, marks: { tap: 0 } },
      });
      while (traces.size > Math.max(1, Math.min(128, limit)))
        traces.delete(traces.keys().next().value!);
      return id;
    },
    mark,
    bind(id: number | null, entryId: string, trackId: string) {
      const trace = id === null ? null : traces.get(id);
      if (!trace) return;
      if (uuid(entryId)) trace.value.entryId = entryId;
      if (uuid(trackId)) trace.value.trackId = trackId;
    },
    observe(
      id: number | null,
      entryId: string,
      ready: boolean,
      seconds: number,
    ) {
      const trace = id === null ? null : traces.get(id);
      if (
        !trace ||
        trace.value.entryId !== entryId ||
        trace.value.marks.installed === undefined ||
        trace.value.marks.failed !== undefined
      )
        return;
      if (!ready || !Number.isFinite(seconds)) {
        trace.position = undefined;
        return;
      }
      if (trace.position !== undefined && seconds > trace.position + 0.02)
        mark(id, "playbackObserved");
      trace.position = seconds;
    },
    snapshot(): Trace[] {
      return [...traces.values()].map(({ value }) => ({
        ...value,
        marks: { ...value.marks },
      }));
    },
    clear() {
      traces.clear();
    },
  };
}

const enabled =
  (typeof __DEV__ !== "undefined" && __DEV__) ||
  process.env.EXPO_PUBLIC_PERSONAL_TEST === "1";
export const playbackTiming = createPlaybackTiming({ enabled });
if (enabled)
  Object.defineProperty(globalThis, "__musifyPlaybackTimings", {
    configurable: true,
    value: () => playbackTiming.snapshot(),
  });
