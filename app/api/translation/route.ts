const TRANSLATION_TIMEOUT_MS = 8_000;
const SUPPORTED_LANGUAGES = new Set(["es", "fr", "de", "ja"]);

type TranslationResult = {
  translated: string;
  provider: string;
};

class TranslationProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "TranslationProviderError";
  }
}

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function translateWithDeepL(text: string, targetLanguage: string, apiKey: string): Promise<TranslationResult> {
  const endpoint = apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `DeepL-Auth-Key ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text: [text], target_lang: targetLanguage.toUpperCase() }),
    signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS),
  });
  const result = await readJson(response);

  if (!response.ok) {
    if (response.status === 403) throw new TranslationProviderError("DeepL rejected the configured API key.", 503);
    if (response.status === 429) throw new TranslationProviderError("DeepL is temporarily rate-limiting translation.", 503);
    if (response.status === 456) throw new TranslationProviderError("The DeepL translation quota has been exhausted.", 503);
    throw new TranslationProviderError("DeepL did not accept the translation request.");
  }

  const translations = result?.translations;
  const first = Array.isArray(translations) ? translations[0] : null;
  const translated = first && typeof first === "object" && "text" in first && typeof first.text === "string"
    ? first.text.trim()
    : "";
  if (!translated) throw new TranslationProviderError("DeepL did not return a translation.");

  return { translated, provider: "DeepL" };
}

async function translateWithWebhook(text: string, targetLanguage: string, endpoint: string): Promise<TranslationResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.TRANSLATION_WEBHOOK_TOKEN
        ? { authorization: `Bearer ${process.env.TRANSLATION_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ text, targetLanguage }),
    signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS),
  });
  const result = await readJson(response);
  const translated = typeof result?.translated === "string" ? result.translated.trim() : "";
  if (!response.ok || !translated) {
    throw new TranslationProviderError("The translation provider did not return a translation.");
  }
  return {
    translated,
    provider: typeof result?.provider === "string" && result.provider.trim()
      ? result.provider.trim()
      : process.env.TRANSLATION_PROVIDER_NAME || "Configured translation service",
  };
}

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

export async function POST(request: Request) {
  let body: { text?: string; targetLanguage?: string };
  try {
    body = (await request.json()) as { text?: string; targetLanguage?: string };
  } catch {
    return json({ error: "A valid JSON body is required." }, 400);
  }

  const text = body.text?.trim();
  const targetLanguage = body.targetLanguage?.trim().toLowerCase();
  if (!text || text.length > 2_000) {
    return json({ error: "Text between 1 and 2,000 characters is required." }, 400);
  }
  if (!targetLanguage || !SUPPORTED_LANGUAGES.has(targetLanguage)) {
    return json({ error: "A supported target language is required." }, 400);
  }

  const deepLApiKey = process.env.DEEPL_API_KEY?.trim();
  const webhookEndpoint = process.env.TRANSLATION_WEBHOOK_URL?.trim();
  if (!deepLApiKey && !webhookEndpoint) {
    return json({ error: "Real-time translation is not configured." }, 503);
  }

  const startedAt = Date.now();
  try {
    const result = deepLApiKey
      ? await translateWithDeepL(text, targetLanguage, deepLApiKey)
      : await translateWithWebhook(text, targetLanguage, webhookEndpoint!);
    return json({
      original: text,
      translated: result.translated,
      targetLanguage,
      provider: result.provider,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (isTimeout(error)) return json({ error: "The translation provider timed out." }, 504);
    if (error instanceof TranslationProviderError) return json({ error: error.message }, error.status);
    return json({ error: "The translation provider is unavailable." }, 502);
  }
}
