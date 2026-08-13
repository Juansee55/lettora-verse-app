import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEMPORARY_PREFIXES = ["tmp/", "temp/", "temporary/", "uploads/tmp/"];
const STORAGE_BUCKETS = ["announcements", "chat-media", "gang-photos", "posts", "stories", "weapon-images"];
const FILE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const REMOVE_BATCH_SIZE = 1000;

type StorageCleanupResult = {
  scanned: number;
  removed: number;
  failures: string[];
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function objectPath(prefix: string, name: string) {
  return prefix ? `${prefix.replace(/\/$/, "")}/${name}` : name;
}

async function collectExpiredTemporaryFiles(bucket: string, prefix: string, cutoff: number) {
  const candidates: string[] = [];
  let scanned = 0;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "created_at", order: "asc" },
    });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = objectPath(prefix, entry.name);
      if (!entry.id) {
        const nested = await collectExpiredTemporaryFiles(bucket, `${path}/`, cutoff);
        candidates.push(...nested.candidates);
        scanned += nested.scanned;
        continue;
      }
      scanned += 1;
      const createdAt = Date.parse(entry.created_at || entry.updated_at || "");
      if (Number.isFinite(createdAt) && createdAt < cutoff) candidates.push(path);
    }

    if (data.length < 1000) break;
    offset += data.length;
  }

  return { candidates, scanned };
}

async function cleanTemporaryStorage(): Promise<StorageCleanupResult> {
  const cutoff = Date.now() - FILE_RETENTION_MS;
  const result: StorageCleanupResult = { scanned: 0, removed: 0, failures: [] };

  for (const bucket of STORAGE_BUCKETS) {
    for (const prefix of TEMPORARY_PREFIXES) {
      try {
        const { candidates, scanned } = await collectExpiredTemporaryFiles(bucket, prefix, cutoff);
        result.scanned += scanned;
        for (let index = 0; index < candidates.length; index += REMOVE_BATCH_SIZE) {
          const paths = candidates.slice(index, index + REMOVE_BATCH_SIZE);
          const { error } = await supabase.storage.from(bucket).remove(paths);
          if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
          result.removed += paths.length;
        }
      } catch (error) {
        result.failures.push(String(error));
      }
    }
  }

  return result;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase.rpc("claim_maintenance_slot", {
    p_key: "daily_cleanup",
    p_cooldown: "22 hours",
  });

  if (claimError) return json({ error: "maintenance lock unavailable" }, 500);
  if (!claimed) return json({ status: "skipped", reason: "recent maintenance run" });

  const { data: run, error: runError } = await supabase
    .from("maintenance_runs")
    .insert({ run_type: "daily_cleanup", status: "running", started_at: startedAt })
    .select("id")
    .single();

  if (runError || !run) return json({ error: "maintenance audit record unavailable" }, 500);

  try {
    const { data: databaseResult, error: databaseError } = await supabase.rpc("run_database_maintenance", {
      p_batch_size: 1000,
    });
    if (databaseError) throw databaseError;

    const storageResult = await cleanTemporaryStorage();
    const status = storageResult.failures.length ? "completed" : "completed";
    await supabase
      .from("maintenance_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        database_result: databaseResult || {},
        storage_result: storageResult,
      })
      .eq("id", run.id);

    return json({ status, database: databaseResult, storage: storageResult });
  } catch (error) {
    await supabase
      .from("maintenance_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: String(error).slice(0, 1000),
      })
      .eq("id", run.id);
    return json({ error: "maintenance failed" }, 500);
  }
});
