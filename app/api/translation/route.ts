export async function POST(request: Request) {
  let body: { text?: string; targetLanguage?: string };
  try {
    body = (await request.json()) as { text?: string; targetLanguage?: string };
  } catch {
    return Response.json({ error: "A valid JSON body is required." }, { status: 400 });
  }

  const text = body.text?.trim();
  const targetLanguage = body.targetLanguage?.trim().toLowerCase();
  const supportedLanguages = new Set(["es", "fr", "de", "ja"]);
  if (!text || text.length > 2_000) {
    return Response.json({ error: "Text between 1 and 2,000 characters is required." }, { status: 400 });
  }
  if (!targetLanguage || !supportedLanguages.has(targetLanguage)) {
    return Response.json({ error: "A supported target language is required." }, { status: 400 });
  }

  const endpoint = process.env.TRANSLATION_WEBHOOK_URL;
  if (!endpoint) {
    return Response.json({ error: "Real-time translation is not configured." }, { status: 503 });
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.TRANSLATION_WEBHOOK_TOKEN
          ? { authorization: `Bearer ${process.env.TRANSLATION_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ text, targetLanguage }),
      signal: AbortSignal.timeout(8_000),
    });
    const result = (await response.json()) as { translated?: string; provider?: string };
    if (!response.ok || !result.translated?.trim()) {
      return Response.json({ error: "The translation provider did not return a translation." }, { status: 502 });
    }
    return Response.json(
      {
        original: text,
        translated: result.translated.trim(),
        targetLanguage,
        provider: result.provider || process.env.TRANSLATION_PROVIDER_NAME || "Configured translation service",
        latencyMs: Date.now() - startedAt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The translation provider timed out."
      : "The translation provider is unavailable.";
    return Response.json({ error: message }, { status: 502 });
  }
}
