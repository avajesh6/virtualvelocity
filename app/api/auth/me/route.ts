import { authenticateRequest } from "../../../producer-auth";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  return Response.json({ user: auth.user }, {
    headers: { "cache-control": "no-store" },
  });
}
