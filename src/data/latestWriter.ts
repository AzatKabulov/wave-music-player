// One in-flight write and at most one pending value. This writer is independent
// of interactive queue commands; a checkpoint failure never reinstalls audio.
export function createLatestWriter<T>(
  write: (value: T) => Promise<unknown>,
  onError: (error: unknown, value: T) => void = () => {},
) {
  let pending: { value: T } | null = null;
  let running: Promise<void> | null = null;
  async function drain() {
    while (pending) {
      const { value } = pending;
      pending = null;
      try {
        await write(value);
      } catch (error) {
        onError(error, value);
      }
    }
  }
  function start() {
    if (!running && pending)
      running = drain().finally(() => {
        running = null;
        start();
      });
  }
  return {
    submit(value: T) {
      pending = { value };
      start();
    },
    clear() {
      pending = null;
    },
    async idle() {
      while (running) await running;
    },
  };
}
