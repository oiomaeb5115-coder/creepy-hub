export type TranslatedStory = {
  title: string;
  content: string;
};

export type TranslatedWiki = {
  title: string;
  subtitle: string;
  summary: string;
  content: string;
};

const CF_API_URL = `https://api.cloudflare.com/client/v4/accounts`;
const MODEL_70B = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MODEL_8B = "@cf/meta/llama-3.1-8b-instruct";

async function callModel(
  prompt: string,
  model: string
): Promise<{ ok: boolean; response?: string; error?: string }> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("CF_ACCOUNT_ID or CF_API_TOKEN is not set");
  }

  const res = await fetch(`${CF_API_URL}/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }

  const json = (await res.json()) as {
    result: { response: string };
    success: boolean;
  };

  if (!json.success || !json.result?.response) {
    return { ok: false, error: "Invalid response" };
  }

  return { ok: true, response: json.result.response };
}

async function callLlama(prompt: string): Promise<string> {
  // まず70Bを試行、失敗（無料枠超過等）したら8Bにフォールバック
  const primary = await callModel(prompt, MODEL_70B);
  if (primary.ok && primary.response) {
    return primary.response;
  }

  console.warn(
    `Llama 70B failed (${primary.error}), falling back to 8B`
  );

  const fallback = await callModel(prompt, MODEL_8B);
  if (fallback.ok && fallback.response) {
    return fallback.response;
  }

  throw new Error(
    `Cloudflare Workers AI error: 70B: ${primary.error}, 8B: ${fallback.error}`
  );
}

function parseJsonResponse<T>(raw: string, fallbackKey: string): T {
  // LLMが返すJSON前後の余分なテキストを除去
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      // JSON解析失敗 → フォールバック
    }
  }
  // JSONとして解析できない場合、レスポンス全体をfallbackKeyの値として扱う
  return { [fallbackKey]: raw.trim() } as T;
}

async function translateText(
  text: string,
  targetLang: "en" | "ja"
): Promise<string> {
  if (!text) return "";

  const instruction =
    targetLang === "en"
      ? "Translate the following Japanese text into natural English. Preserve the horror/occult tone and atmosphere. Return ONLY the translated text, no commentary."
      : "以下の英語テキストを自然な日本語に翻訳してください。ホラー・オカルトの文体と雰囲気を維持すること。翻訳文のみを返してください。";

  const prompt = `${instruction}\n\n${text}`;
  return (await callLlama(prompt)).trim();
}

export async function translateStoryToEnglish(
  title: string,
  content: string
): Promise<TranslatedStory> {
  const prompt = `You are a professional translator specializing in horror and occult literature.
Translate the following Japanese horror story title and body into natural English.
Preserve the eerie, unsettling tone and atmosphere.
Return ONLY a JSON object with "title" and "content" keys. No other text.

Title: ${title}

Body:
${content}`;

  const raw = await callLlama(prompt);
  const parsed = parseJsonResponse<{ title?: string; content?: string }>(
    raw,
    "content"
  );

  return {
    title: parsed.title ?? (await translateText(title, "en")),
    content: parsed.content ?? (await translateText(content, "en")),
  };
}

export async function translateCategoryName(name: string): Promise<string> {
  return translateText(name, "en");
}

export async function translateWikiToEnglish(params: {
  title: string;
  subtitle: string | null;
  summary: string | null;
  content: string | null;
}): Promise<TranslatedWiki> {
  const prompt = `You are a professional translator specializing in horror and occult topics.
Translate the following Japanese wiki article fields into natural English.
Preserve the tone appropriate for a horror/occult encyclopedia.
Return ONLY a JSON object with "title", "subtitle", "summary", and "content" keys. No other text.

Title: ${params.title}
Subtitle: ${params.subtitle ?? ""}
Summary: ${params.summary ?? ""}
Content:
${params.content ?? ""}`;

  const raw = await callLlama(prompt);
  const parsed = parseJsonResponse<{
    title?: string;
    subtitle?: string;
    summary?: string;
    content?: string;
  }>(raw, "content");

  return {
    title: parsed.title ?? (await translateText(params.title, "en")),
    subtitle:
      parsed.subtitle ?? (await translateText(params.subtitle ?? "", "en")),
    summary:
      parsed.summary ?? (await translateText(params.summary ?? "", "en")),
    content:
      parsed.content ?? (await translateText(params.content ?? "", "en")),
  };
}
