import { processImport } from "./imports.mjs";
export function createJobs({ db, mode, provider, env = process.env }) {
  let running = false,
    timer;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await db.admin(async (c) => {
        await c.query(
          "update music.jobs set status='failed',locked_until=null,last_error_code='attempts_exhausted' where attempts>=5 and (status='ready' or (status='running' and locked_until<now()))",
        );
        await c.query(
          "delete from music.rate_limit_buckets where expires_at<now()",
        );
        await c.query(
          "delete from music.operation_receipts where expires_at<now()",
        );
        await c.query(
          "delete from music.playback_grants where expires_at<now()",
        );
        await c.query(
          "delete from music.listening_events where created_at<now()-interval '90 days'",
        );
        await c.query(
          "delete from music.audit_events where created_at<now()-interval '90 days'",
        );
      });
      if (mode === "local")
        await db.system((c) =>
          c.query("delete from local_auth.sessions where expires_at<now()"),
        );
      const job = await db.admin(
        async (c) =>
          (
            await c.query(`update music.jobs set status='running',attempts=attempts+1,locked_until=now()+interval '2 minutes'
    where id=(select id from music.jobs where ((status='ready' and run_after<=now()) or (status='running' and locked_until<now())) and attempts<5 order by created_at for update skip locked limit 1) returning *`)
          ).rows[0],
      );
      if (!job) return;
      try {
        let result;
        if (job.kind === "account_delete") {
          if (mode === "local")
            await db.system((c) =>
              c.query("delete from auth.users where id=$1", [
                job.payload.userId,
              ]),
            );
          else {
            const result = await provider.auth.admin.deleteUser(
              job.payload.userId,
            );
            if (result.error) throw result.error;
          }
        } else if (job.kind === "catalog_withdrawal") {
          /* Access was disabled synchronously; no fixture caches exist. */
        } else if (job.kind === "catalog_import")
          result = await processImport({ db, provider, env, job });
        await db.admin((c) =>
          c.query(
            "update music.jobs set status='succeeded',locked_until=null,last_error_code=null,payload=$3 where id=$1 and attempts=$2 and status='running'",
            [job.id, job.attempts, JSON.stringify(result ? { result } : {})],
          ),
        );
      } catch {
        process.stderr.write(
          JSON.stringify({
            event: "job_failed",
            kind: job.kind,
            attempt: job.attempts,
            code: "job_failed",
          }) + "\n",
        );
        await db.admin((c) =>
          c.query(
            "update music.jobs set status=case when attempts>=5 then 'failed' else 'ready' end,run_after=now()+($1 * interval '1 second'),locked_until=null,last_error_code='job_failed' where id=$2 and attempts=$3 and status='running'",
            [Math.min(3600, 2 ** job.attempts * 10), job.id, job.attempts],
          ),
        );
      }
    } finally {
      running = false;
    }
  };
  timer = setInterval(() => void run().catch(() => {}), 5000);
  timer.unref();
  return {
    run,
    close: async () => {
      clearInterval(timer);
    },
  };
}
