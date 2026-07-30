import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const email = process.env.TEST_PRODUCER_EMAIL ?? "producer.test@velocity.local";
const password = process.env.TEST_PRODUCER_PASSWORD ?? "ProducerTest123!";
const fullName = process.env.TEST_PRODUCER_NAME ?? "Test Producer";

if (!supabaseUrl) {
  console.error("NEXT_PUBLIC_SUPABASE_URL is required.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is required. Use the server-only key from Supabase project settings.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(targetEmail) {
  const perPage = 100;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === targetEmail.toLowerCase(),
    );
    if (user) return user;
    if (data.users.length < perPage) return null;
  }
}

const existingUser = await findUserByEmail(email);

if (existingUser) {
  const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    app_metadata: {
      ...existingUser.app_metadata,
      role: "producer",
    },
    user_metadata: {
      ...existingUser.user_metadata,
      full_name: fullName,
    },
  });

  if (error) throw error;
  console.log(`Updated producer test account: ${email}`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "producer" },
    user_metadata: { full_name: fullName },
  });

  if (error) throw error;
  console.log(`Created producer test account: ${email}`);
}

console.log("Producer access: app_metadata.role=producer");
console.log(`Sign in with email/password (Google auth unchanged): ${email}`);
