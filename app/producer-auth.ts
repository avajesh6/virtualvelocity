import { createClient, type User } from "@supabase/supabase-js";

export type AppUser = {
  displayName: string;
  email: string;
  role: "attendee" | "producer";
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function displayNameFor(user: User) {
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }
  return user.email?.split("@")[0] ?? "Attendee";
}

function producerEmails() {
  return (process.env.PRODUCER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isProducer(user: User) {
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
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);
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
