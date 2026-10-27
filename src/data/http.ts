import { randomUUID } from "./uuid";
import { Platform } from "react-native";
import { credentials } from "./credentials";
import { fetchJson } from "./fetchJson";
import { digestStringAsync, CryptoDigestAlgorithm } from "expo-crypto";
import { deviceStorage } from "./storage";
import { createSnapshotCache } from "./snapshotCache";
import { parsePlaybackSource } from "./playbackSource";
import type { MusicData, QueueState, Snapshot } from "./types";
export const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:4100"
).replace(/\/$/, "");
let authPromise = credentials.read();
const acknowledged = new Map<string, QueueState | null>();
let tokenRefresh: Promise<void> | null = null;
let authGeneration = 0;
let snapshotVersion = 0;
let offeredGrant: {
  installationId: string;
  token: string;
  expiresAt: number;
} | null = null;
const metadataCache = createSnapshotCache(deviceStorage);
async function cacheScope() {
  // Browser sessions use httpOnly cookies; their account cannot be identified
  // safely before server validation. Early cached startup is native-only.
  if (Platform.OS === "web") return null;
  const auth = await authPromise;
  if (!auth?.accessToken) return null;
  return digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    `${apiUrl}\n${auth.refreshToken || auth.accessToken}`,
  );
}
function rememberSnapshot(
  value: Snapshot,
  generation: number,
  version: number,
) {
  if (Platform.OS === "web") return;
  void cacheScope()
    .then(async (scope) => {
      if (generation !== authGeneration || version !== snapshotVersion) return;
      if (scope && value.profile) await metadataCache.write(scope, value);
      else await metadataCache.clear();
    })
    .catch(() => {});
}
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
  if (!renewal) {
    authGeneration++;
    snapshotVersion++;
    offeredGrant = null;
    void metadataCache.clear();
  }
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
  source: parsePlaybackSource(s.source),
});
async function fetchSnapshot() {
  const generation = authGeneration;
  const path = "/v1/snapshot?playlistShape=summary";
  const value: Snapshot = await request(path);
  if (!value.profile && value.accountProvider === "supabase") {
    try {
      const auth = await authPromise;
      const renewed = await request(
        "/auth/refresh",
        "POST",
        auth?.refreshToken ? { refreshToken: auth.refreshToken } : {},
      );
      if (generation !== authGeneration) return request(path);
      await saveAuth(renewed, true);
      return request(path);
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
}
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
  async cachedSnapshot() {
    const generation = authGeneration;
    try {
      const scope = await cacheScope();
      if (!scope || generation !== authGeneration) return null;
      const value = await metadataCache.read(scope);
      return generation === authGeneration ? value : null;
    } catch {
      return null;
    }
  },
  async snapshot() {
    const generation = authGeneration,
      version = ++snapshotVersion;
    const value = await fetchSnapshot();
    rememberSnapshot(value, generation, version);
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
  async pin(kind, id, pinned) {
    await request(
      `/v1/library/pins/${kind}/${id}`,
      pinned ? "PUT" : "DELETE",
      {},
    );
  },
  async createPlaylist(title, description, key) {
    return request("/v1/playlists", "POST", { title, description }, key);
  },
  async appendPlaylistItem(id, revision, item) {
    await request(`/v1/playlists/${id}/items`, "POST", {
      expectedRevision: revision,
      ...item,
    });
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
    const generation = authGeneration;
    const previous = acknowledged.get(id);
    const remember = (value: QueueState | null) => {
      if (generation === authGeneration && acknowledged.get(id) === previous)
        acknowledged.set(id, value);
    };
    try {
      const raw = await request(`/v1/playback-sessions/${id}`);
      const value = raw ? fromWire(raw) : null;
      remember(value);
      return value;
    } catch (e) {
      if (e instanceof RequestError && e.status === 404) {
        remember(null);
        return null;
      }
      throw e;
    }
  },
  async position(id, state) {
    if (!state.currentId) return false;
    return (
      await request(`/v1/playback-sessions/${id}/position`, "PATCH", {
        expectedRevision: state.revision,
        currentEntryId: state.currentId,
        positionMs: state.positionMs,
      })
    ).saved;
  },
  async queue(id, state, options = {}) {
    const generation = authGeneration;
    const fresh = !acknowledged.has(id);
    if (fresh) await this.restoreQueue(id);
    const old = acknowledged.get(id);
    // Restore may acknowledge a revision before the deferred UI restore runs.
    // Membership writes still use the last server acknowledgement, never an
    // optimistic local revision or a stale restore response.
    const expectedRevision = old?.revision ?? null;
    const membershipChanged =
      !old || JSON.stringify(old.entries) !== JSON.stringify(state.entries);
    const payload = {
      expectedRevision,
      currentEntryId: state.currentId,
      positionMs: state.positionMs,
      repeatMode: state.repeat,
      shuffle: state.shuffle,
      source: state.source ?? null,
      ...(options.includeGrant ? { includeGrant: true } : {}),
      ...(membershipChanged ? { entries: state.entries } : {}),
    };
    try {
      const raw = await request(
        `/v1/playback-sessions/${id}`,
        membershipChanged ? "PUT" : "PATCH",
        payload,
      );
      const result = fromWire(raw);
      if (generation === authGeneration) {
        acknowledged.set(id, result);
        const grant = raw.playbackGrant;
        const expiresAt = Date.parse(grant?.expiresAt);
        if (
          options.includeGrant &&
          /^[a-zA-Z0-9_-]{43}$/.test(grant?.token || "") &&
          expiresAt > Date.now() + 60000
        )
          offeredGrant = { installationId: id, token: grant.token, expiresAt };
      }
      return result;
    } catch (e) {
      if (e instanceof RequestError && e.status === 409)
        await this.restoreQueue(id);
      throw e;
    }
  },
  async grant(id) {
    const offered = offeredGrant;
    offeredGrant = null;
    if (
      offered?.installationId === id &&
      offered.expiresAt > Date.now() + 60000
    )
      return offered.token;
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
