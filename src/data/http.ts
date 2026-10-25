import { randomUUID } from "./uuid";
import { Platform } from "react-native";
import { credentials } from "./credentials";
import { fetchJson } from "./fetchJson";
import type { MusicData, QueueState, Snapshot } from "./types";
export const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:4100"
).replace(/\/$/, "");
let authPromise = credentials.read();
const acknowledged = new Map<string, QueueState | null>();
let tokenRefresh: Promise<void> | null = null;
let authGeneration = 0;
class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  retry = true,
  signal?: AbortSignal,
): Promise<any> {
  const generation = authGeneration;
  const auth = await authPromise;
  const result = await fetchJson(`${apiUrl}${path}`, {
    method,
    credentials: "include",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Saz-Platform": Platform.OS === "web" ? "web" : "native",
      ...(auth?.accessToken
        ? { Authorization: `Bearer ${auth.accessToken}` }
        : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const response = result.response;
  const json = result.json as Record<string, any>;
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    try {
      if (generation !== authGeneration)
        throw new RequestError("Your account changed. Try again.", 409);
      const latest = await authPromise;
      if (latest?.accessToken === auth?.accessToken) {
        tokenRefresh ||= request(
          "/auth/refresh",
          "POST",
          auth?.refreshToken ? { refreshToken: auth.refreshToken } : {},
          undefined,
          false,
        )
          .then((value) => {
            if (generation === authGeneration) return saveAuth(value, true);
          })
          .finally(() => {
            tokenRefresh = null;
          });
        await tokenRefresh;
      }
      if (generation !== authGeneration)
        throw new RequestError("Your account changed. Try again.", 409);
      return request(path, method, body, key, false, signal);
    } catch (error) {
      if (
        error instanceof RequestError &&
        (error.status === 401 || error.status === 403)
      ) {
        if (generation === authGeneration) await saveAuth(null);
      } else throw error;
    }
  }
  if (!response.ok)
    throw new RequestError(
      json?.error?.message || "The service is unavailable. Try again.",
      response.status,
    );
  return json;
}
async function saveAuth(
  value: { accessToken?: string; refreshToken?: string } | null,
  renewal = false,
) {
  if (!renewal) authGeneration++;
  const next = value?.accessToken
    ? { accessToken: value.accessToken, refreshToken: value.refreshToken }
    : null;
  authPromise = Promise.resolve(next);
  await credentials.write(next);
}
const fromWire = (s: any): QueueState => ({
  revision: s.revision,
  entries: s.entries,
  currentId: s.currentEntryId,
  positionMs: s.positionMs,
  repeat: s.repeatMode,
  shuffle: s.shuffle,
});
export const http: MusicData = {
  search(query, kind, signal, cursor) {
    return request(
      `/v1/search?q=${encodeURIComponent(query)}&type=${kind}&limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      "GET",
      undefined,
      undefined,
      true,
      signal,
    );
  },
  resolve(kind, id) {
    return request(`/v1/resolve/${kind}/${encodeURIComponent(id)}`);
  },
  async snapshot() {
    const generation = authGeneration;
    const value: Snapshot = await request("/v1/snapshot");
    if (!value.profile && value.accountProvider === "supabase") {
      try {
        const auth = await authPromise;
        const renewed = await request(
          "/auth/refresh",
          "POST",
          auth?.refreshToken ? { refreshToken: auth.refreshToken } : {},
        );
        if (generation !== authGeneration) return request("/v1/snapshot");
        await saveAuth(renewed, true);
        return request("/v1/snapshot");
      } catch (error) {
        if (
          error instanceof RequestError &&
          (error.status === 401 || error.status === 403)
        ) {
          if (generation === authGeneration) await saveAuth(null);
        } else throw error;
      }
    }
    return value;
  },
  async auth(kind, email, password, displayName) {
    const value = await request(
      !email && kind === "login" ? "/auth/demo" : `/auth/${kind}`,
      "POST",
      !email
        ? {}
        : kind === "recover"
          ? { email }
          : {
              email,
              password,
              ...(kind === "register" ? { displayName } : {}),
            },
    );
    await saveAuth(value);
    acknowledged.clear();
    return value.message;
  },
  async signOut() {
    await request("/auth/logout", "POST", {});
    await saveAuth(null);
    acknowledged.clear();
  },
  async save(kind, id, saved) {
    await request(`/v1/library/${kind}/${id}`, saved ? "PUT" : "DELETE", {});
  },
  async createPlaylist(title, description, key) {
    return request("/v1/playlists", "POST", { title, description }, key);
  },
  async editPlaylist(id, revision, title, description, items) {
    await request(
      `/v1/playlists/${id}/items`,
      "PUT",
      { expectedRevision: revision, title, description, items },
      randomUUID(),
    );
    return request(`/v1/playlists/${id}`);
  },
  async deletePlaylist(id, revision) {
    await request(
      `/v1/playlists/${id}`,
      "DELETE",
      { expectedRevision: revision },
      randomUUID(),
    );
  },
  async preferences(value) {
    await request("/v1/preferences", "PATCH", value);
  },
  async restoreQueue(id) {
    try {
      const raw = await request(`/v1/playback-sessions/${id}`);
      const value = raw ? fromWire(raw) : null;
      acknowledged.set(id, value);
      return value;
    } catch (e) {
      if (e instanceof RequestError && e.status === 404) {
        acknowledged.set(id, null);
        return null;
      }
      throw e;
    }
  },
  async queue(id, state) {
    const fresh = !acknowledged.has(id);
    if (fresh) await this.restoreQueue(id);
    const old = acknowledged.get(id);
    const expectedRevision = fresh
      ? (old?.revision ?? null)
      : old
        ? state.revision
        : null;
    const membershipChanged =
      !old || JSON.stringify(old.entries) !== JSON.stringify(state.entries);
    const payload = {
      expectedRevision,
      currentEntryId: state.currentId,
      positionMs: state.positionMs,
      repeatMode: state.repeat,
      shuffle: state.shuffle,
      ...(membershipChanged ? { entries: state.entries } : {}),
    };
    try {
      const result = fromWire(
        await request(
          `/v1/playback-sessions/${id}`,
          membershipChanged ? "PUT" : "PATCH",
          payload,
        ),
      );
      acknowledged.set(id, result);
      return result;
    } catch (e) {
      if (e instanceof RequestError && e.status === 409)
        await this.restoreQueue(id);
      throw e;
    }
  },
  async grant(id) {
    return (await request(`/v1/playback-sessions/${id}/grants`, "POST", {}))
      .token;
  },
  media(lease, entry) {
    return `${apiUrl}/v1/media/${encodeURIComponent(lease)}/${entry.id}`;
  },
  async recent(trackId) {
    await request("/v1/listening-events", "POST", {
      events: [
        {
          id: randomUUID(),
          trackId,
          occurredAt: new Date().toISOString(),
          playedMs: 0,
        },
      ],
    });
  },
  async deleteAccount() {
    await request("/v1/me", "DELETE", {}, randomUUID());
    await saveAuth(null);
    acknowledged.clear();
  },
  async verify(tokenHash, type) {
    await saveAuth(await request("/auth/verify", "POST", { tokenHash, type }));
    acknowledged.clear();
  },
  async updatePassword(password) {
    await request("/auth/password", "POST", { password });
  },
};
