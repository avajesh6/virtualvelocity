import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  name: "virtualvelocity",
  main: "./worker/index.ts",
  compatibility_date: "2026-07-24",
  compatibility_flags: ["nodejs_compat"],
  vars: {
    NEXT_PUBLIC_LIVEKIT_URL:
      "wss://virtualvelocity-xn55gx33.livekit.cloud",
    NEXT_PUBLIC_SUPABASE_URL:
      "https://mrpmpvjbognefbtayivn.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      "sb_publishable_V4SFYC5FZwQSj223tX5gLg_mrN1WOIh",
  },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "velocity-venue-db",
          database_id: "dea0bb5e-5e48-466a-8b87-737367bce431",
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
