import { createClient } from "@supabase/supabase-js";
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { fail, hash } from "./common.mjs";
const scrypt = promisify(scryptCallback);
const authInput = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(10).max(256),
  displayName: z.string().trim().min(1).max(80).optional(),
});
export function supabase(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY)
    throw Error("Supabase server configuration is missing");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export function createAuth({ db, mode, env, route, app, origin }) {
  const provider = mode === "supabase" ? supabase(env) : null;
  const mint = async (userId) => {
    const token = randomBytes(32).toString("base64url");
    await db.system((c) =>
      c.query(
        "insert into local_auth.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '7 days')",
        [hash(token), userId],
      ),
    );
    return { access_token: token };
  };
  const deliver = (req, reply, session) => {
    const secure = mode !== "local";
    reply.setCookie("saz_access", session.access_token, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: mode === "local" ? 604800 : 3600,
    });
    if (session.refresh_token)
      reply.setCookie("saz_refresh", session.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "strict",
        path: "/auth",
        maxAge: 604800,
      });
    return req.headers["x-saz-platform"] === "native"
      ? {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }
      : { ok: true };
  };
  const bootstrap = async (id, name) =>
    db.user(id, async (c) => {
      await c.query(
        "insert into music.profiles(user_id,display_name) values($1,$2) on conflict(user_id) do nothing",
        [id, name],
      );
      await c.query(
        "insert into music.user_preferences(user_id,locale) values($1,'en') on conflict(user_id) do nothing",
        [id],
      );
    });
  route(
    "POST",
    "/auth/demo",
    z.strictObject({}),
    async (req, reply) => {
      if (mode !== "local")
        fail(404, "not_found", "This endpoint is unavailable.");
      const id = randomUUID();
      await db.system((c) =>
        c.query("insert into auth.users(id) values($1)", [id]),
      );
      await db.system((c) =>
        c.query("insert into local_auth.users(user_id) values($1)", [id]),
      );
      await bootstrap(id, "Demo listener");
      return deliver(req, reply, await mint(id));
    },
    { public: true },
  );
  for (const kind of ["register", "login"])
    route(
      "POST",
      `/auth/${kind}`,
      authInput,
      async (req, reply) => {
        const { email, password, displayName } = req.body;
        if (provider) {
          const auth = supabase(env).auth;
          const result =
            kind === "register"
              ? await auth.signUp({
                  email,
                  password,
                  options: {
                    data: { display_name: displayName || "Listener" },
                  },
                })
              : await auth.signInWithPassword({ email, password });
          if (result.error)
            fail(
              401,
              "auth_failed",
              "Could not complete sign-in. Check your details or confirmation email.",
            );
          if (!result.data.session)
            return { message: "Check your email to confirm your account." };
          await bootstrap(
            result.data.user.id,
            displayName ||
              result.data.user.user_metadata?.display_name ||
              "Listener",
          );
          return deliver(req, reply, result.data.session);
        }
        const normalized = email.toLowerCase();
        let id;
        if (kind === "register") {
          const salt = randomBytes(16).toString("hex"),
            digest = (await scrypt(password, salt, 64)).toString("hex");
          id = randomUUID();
          try {
            await db.system(async (c) => {
              await c.query("insert into auth.users(id) values($1)", [id]);
              await c.query(
                "insert into local_auth.users(user_id,email,password_hash) values($1,$2,$3)",
                [id, normalized, `${salt}:${digest}`],
              );
            });
          } catch (e) {
            if (e.code === "23505")
              fail(
                409,
                "account_exists",
                "An account with these details may already exist.",
              );
            throw e;
          }
          await bootstrap(id, displayName || "Listener");
        } else {
          const row = (
            await db.system((c) =>
              c.query(
                "select user_id,password_hash from local_auth.users where email=$1",
                [normalized],
              ),
            )
          ).rows[0];
          const [salt, digest] = (
            row?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`
          ).split(":");
          const actual = await scrypt(password, salt, 64);
          if (!row || !timingSafeEqual(actual, Buffer.from(digest, "hex")))
            fail(
              401,
              "invalid_credentials",
              "Email or password was not accepted.",
            );
          id = row.user_id;
        }
        return deliver(req, reply, await mint(id));
      },
      { public: true },
    );
  route(
    "POST",
    "/auth/recover",
    z.strictObject({ email: z.email().max(254) }),
    async (req) => {
      if (!provider)
        return {
          message:
            "Local demo accounts have no email delivery. Use your existing password or create a fresh demo.",
        };
      if (!env.AUTH_RECOVERY_REDIRECT)
        fail(
          503,
          "configuration_required",
          "Email recovery is not configured yet.",
        );
      await supabase(env).auth.resetPasswordForEmail(req.body.email, {
        redirectTo: env.AUTH_RECOVERY_REDIRECT,
      });
      return {
        message:
          "If the address is registered, a recovery email will arrive shortly.",
      };
    },
    { public: true },
  );
  route(
    "POST",
    "/auth/refresh",
    z.strictObject({ refreshToken: z.string().max(4096).optional() }),
    async (req, reply) => {
      if (!provider)
        fail(400, "not_supported", "Sign in again to renew the local session.");
      const token = req.cookies.saz_refresh || req.body.refreshToken;
      if (!token) fail(401, "unauthorized", "Sign in again.");
      const { data, error } = await supabase(env).auth.refreshSession({
        refresh_token: token,
      });
      if (error || !data.session) fail(401, "unauthorized", "Sign in again.");
      return deliver(req, reply, data.session);
    },
    { public: true },
  );
  route(
    "POST",
    "/auth/verify",
    z.strictObject({
      tokenHash: z.string().min(20).max(4096),
      type: z.enum(["recovery", "email"]),
    }),
    async (req, reply) => {
      if (!provider)
        fail(
          400,
          "not_supported",
          "Email verification needs a configured provider.",
        );
      const { data, error } = await supabase(env).auth.verifyOtp({
        token_hash: req.body.tokenHash,
        type: req.body.type,
      });
      if (error || !data.session)
        fail(401, "expired_link", "This link expired. Request another email.");
      await bootstrap(
        data.user.id,
        data.user.user_metadata?.display_name || "Listener",
      );
      return deliver(req, reply, data.session);
    },
    { public: true },
  );
  route(
    "POST",
    "/auth/password",
    z.strictObject({ password: z.string().min(10).max(256) }),
    async (req) => {
      if (!provider)
        fail(400, "not_supported", "Local password recovery is unavailable.");
      if (
        !(req.identity.claims?.amr || []).some(
          (x) => x.timestamp > Date.now() / 1000 - 600,
        )
      )
        fail(
          403,
          "reauthentication_required",
          "Use a fresh recovery email or sign in again before changing your password.",
        );
      const client = supabase(env);
      const { data, error } = await client.auth.getUser(req.accessToken);
      if (error) fail(401, "unauthorized", "Sign in again.");
      const update = await provider.auth.admin.updateUserById(data.user.id, {
        password: req.body.password,
      });
      if (update.error)
        fail(400, "update_failed", "Could not update your password.");
      return { ok: true };
    },
  );
  route("POST", "/auth/logout", z.strictObject({}), async (req, reply) => {
    await db.admin(async (c) => {
      await c.query(
        "update music.playback_grants set revoked_at=now() where user_id=$1",
        [req.identity.id],
      );
      await c.query(
        "insert into music.audit_events(user_id,action,subject_ref) values($1,'auth.signout',$2)",
        [req.identity.id, req.identity.id],
      );
    });
    if (provider) await provider.auth.admin.signOut(req.accessToken, "global");
    else
      await db.system((c) =>
        c.query("delete from local_auth.sessions where user_id=$1", [
          req.identity.id,
        ]),
      );
    reply.clearCookie("saz_access", { path: "/" });
    reply.clearCookie("saz_refresh", { path: "/auth" });
    return { ok: true };
  });
  return {
    provider,
    async identify(token) {
      if (!token) return null;
      let identity;
      if (provider) {
        const { data, error } = await provider.auth.getUser(token);
        if (error || !data.user) return null;
        let claims;
        try {
          claims = JSON.parse(
            Buffer.from(token.split(".")[1], "base64url").toString(),
          );
        } catch {
          return null;
        }
        const revoked = await db.admin((c) =>
          c.query(
            "select 1 from music.audit_events where user_id=$1 and action='auth.signout' and created_at>=to_timestamp($2) limit 1",
            [data.user.id, claims.iat],
          ),
        );
        if (revoked.rows.length) return null;
        identity = {
          id: data.user.id,
          email: data.user.email,
          claims,
          authenticatedAt:
            (claims.amr || []).find((x) => x.method === "password")
              ?.timestamp || 0,
        };
      } else {
        const r = (
          await db.system((c) =>
            c.query(
              "select s.user_id,u.email,s.created_at from local_auth.sessions s join local_auth.users u on u.user_id=s.user_id where s.token_hash=$1 and s.expires_at>now()",
              [hash(token)],
            ),
          )
        ).rows[0];
        if (!r) return null;
        identity = {
          id: r.user_id,
          email: r.email,
          authenticatedAt: new Date(r.created_at).getTime() / 1000,
        };
      }
      const profile = await db.user(identity.id, (c) =>
        c.query("select state from music.profiles where user_id=$1", [
          identity.id,
        ]),
      );
      if (profile.rows[0]?.state === "deleting") return null;
      return identity;
    },
  };
}
