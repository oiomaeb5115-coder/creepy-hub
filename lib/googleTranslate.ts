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

async function translateText(text: string): Promise<string> {
  if (!text) return "";

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set");

  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "ja", target: "en", format: "text" }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Translate API error: ${err}`);
  }

  const json = await res.json() as {
    data: { translations: { translatedText: string }[] };
  };

  return json.data.translations[0].translatedText;
}

export async function translateStoryToEnglish(
  title: string,
  content: string
): Promise<TranslatedStory> {
  const [translatedTitle, translatedContent] = await Promise.all([
    translateText(title),
    translateText(content),
  ]);
  return { title: translatedTitle, content: translatedContent };
}

export async function translateCategoryName(name: string): Promise<string> {
  return translateText(name);
}

export async function translateWikiToEnglish(params: {
  title: string;
  subtitle: string | null;
  summary: string | null;
  content: string | null;
}): Promise<TranslatedWiki> {
  const [title, subtitle, summary, content] = await Promise.all([
    translateText(params.title),
    translateText(params.subtitle ?? ""),
    translateText(params.summary ?? ""),
    translateText(params.content ?? ""),
  ]);
  return { title, subtitle, summary, content };
}
