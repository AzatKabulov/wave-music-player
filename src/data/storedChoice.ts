import { createLatestWriter } from "./latestWriter.ts";

type ChoiceStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};
type Writer = ReturnType<typeof createLatestWriter<string>>;
type Channel = { writer: Writer; revision: number };
// Share pending writes across remounts, but release settled channels. Reads wait
// for the old screen's last choice instead of briefly restoring an older value.
const channels = new WeakMap<ChoiceStorage, Map<string, Channel>>();
function writers(storage: ChoiceStorage) {
  let entries = channels.get(storage);
  if (!entries) {
    entries = new Map();
    channels.set(storage, entries);
  }
  return entries;
}
function persist(storage: ChoiceStorage, key: string, value: string) {
  const entries = writers(storage);
  let channel = entries.get(key);
  if (!channel) {
    channel = {
      writer: createLatestWriter<string>((raw) => storage.setItem(key, raw)),
      revision: 0,
    };
    entries.set(key, channel);
  }
  const revision = ++channel.revision;
  channel.writer.submit(value);
  void channel.writer.idle().then(() => {
    if (entries.get(key) === channel && channel.revision === revision)
      entries.delete(key);
  });
}

export function createStoredChoice<T>(options: {
  storage: ChoiceStorage;
  key: string;
  fallback: T;
  parse: (raw: string | null) => T | undefined;
  encode: (value: T) => string;
  onValue: (value: T) => void;
}) {
  const { storage, key, fallback, parse, encode, onValue } = options;
  let active = true,
    edited = false,
    generation = 0;
  return {
    async load() {
      active = true;
      const request = ++generation;
      await writers(storage).get(key)?.writer.idle();
      const raw = await storage.getItem(key).catch(() => null);
      if (active && request === generation && !edited)
        onValue(parse(raw) ?? fallback);
    },
    choose(value: T) {
      if (!active) return;
      edited = true;
      onValue(value);
      persist(storage, key, encode(value));
    },
    dispose() {
      active = false;
      generation++;
      // Keep the already selected value's write alive under its original key.
    },
    async idle() {
      await writers(storage).get(key)?.writer.idle();
    },
  };
}
