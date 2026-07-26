import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// `cloudflare:workers` is a virtual module that exists only in the Worker
// runtime. Resolve it lazily at module initialization so Node production
// previews can still serve routes that do not require D1.
const workerEnv = await import("cloudflare:workers")
  .then((runtime) => runtime.env)
  .catch(() => null);

export function getDb() {
  if (!workerEnv?.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(workerEnv.DB, { schema });
}
