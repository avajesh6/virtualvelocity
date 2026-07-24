import { createClient, type User } from "@supabase/supabase-js";

/**
 * Public profile returned to the browser after Supabase has verified a session.
 * Keep this deliberately small: raw Supabase metadata should not become part of
 * the application's client contract.
 */
export type AppUser = {
  displayName: string;
  email: string;
  role: "attendee" | "producer";
};

function getBearerToken(request: Request) {
  // Protected API routes use the access token from the active browser session.
  // Reject malformed schemes early instead of forwarding arbitrary header data.
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function displayNameFor(user: User) {
  // Identity providers use different metadata keys. Email local-part is a safe,
  // deterministic fallback when the optional human-readable name is absent.
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }
  return user.email?.split("@")[0] ?? "Attendee";
}

function producerEmails() {
  // Normalize once so allowlist comparison is case-insensitive and whitespace
  // in a comma-separated deployment secret cannot accidentally deny access.
  return (process.env.PRODUCER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isProducer(user: User) {
  // app_metadata is server-managed in Supabase and therefore preferred over
  // user-editable metadata. The allowlist supports small test deployments.
  const appRole = user.app_metadata.role;
  if (appRole === "admin" || appRole === "producer") return true;
  return Boolean(user.email && producerEmails().includes(user.email.toLowerCase()));
}

export async function authenticateRequest(
  request: Request,
): Promise<{ user: AppUser; authUser: User } | { error: Response }> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      error: Response.json(
        { error: "Sign in is required." },
        { status: 401 },
      ),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return {
      error: Response.json(
        { error: "Authentication is not configured." },
        { status: 503 },
      ),
    };
  }

  const supabase = createClient(url, publishableKey, {
    auth: {
      // This client exists for one server request. Session persistence and
      // refresh behavior belong to the browser client, not the Worker.
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);
  // getUser performs authoritative token validation with Supabase. Decoding the
  // JWT locally would not confirm revocation or account state.
  if (error || !data.user?.email) {
    return {
      error: Response.json(
        { error: "Your session is invalid or has expired." },
        { status: 401 },
      ),
    };
  }

  return {
    authUser: data.user,
    user: {
      displayName: displayNameFor(data.user),
      email: data.user.email,
      role: isProducer(data.user) ? "producer" : "attendee",
    },
  };
}

export async function authorizeProducerRequest(request: Request) {
  // Authentication and authorization remain separate so attendee-authenticated
  // endpoints can reuse authenticateRequest without inheriting producer access.
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth;
  if (auth.user.role !== "producer") {
    return {
      error: Response.json(
        { error: "This account is not an authorized producer." },
        { status: 403 },
      ),
    };
  }
  return auth;
}
