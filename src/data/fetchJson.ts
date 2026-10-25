export class ConnectionError extends Error {
  code: "timeout" | "offline" | "response";
  constructor(code: ConnectionError["code"]) {
    super(
      code === "timeout"
        ? "The connection timed out. Check your connection and retry."
        : code === "response"
          ? "Musify returned an invalid response. Try again."
          : "Could not connect to Musify. Check your connection and retry.",
    );
    this.code = code;
  }
}

export async function fetchJson(
  url: string,
  init: RequestInit,
  {
    timeoutMs = 12000,
    transport = fetch,
  }: { timeoutMs?: number; transport?: typeof fetch } = {},
) {
  const external = init.signal;
  if (external?.aborted) throw external.reason;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  external?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await transport(url, {
      ...init,
      signal: controller.signal,
    });
    const json: unknown = response.status === 204 ? {} : await response.json();
    return { response, json };
  } catch (error) {
    if (external?.aborted) throw error;
    if (timedOut) throw new ConnectionError("timeout");
    throw new ConnectionError(
      error instanceof SyntaxError ? "response" : "offline",
    );
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", cancel);
  }
}
