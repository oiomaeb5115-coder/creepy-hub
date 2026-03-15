import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function translateStoryToEnglish(
  title: string,
  content: string
): Promise<TranslatedStory> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a professional translator specializing in Japanese horror and occult content.
Translate the following Japanese horror story to natural, atmospheric English.
Keep the creepy tone and nuance. Output ONLY valid JSON — no markdown, no code fences.

Input title: ${title}
Input content:
${content}

Output format (JSON only):
{"title":"...","content":"..."}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const parsed = JSON.parse(text.trim()) as TranslatedStory;
  return parsed;
}

export async function translateWikiToEnglish(params: {
  title: string;
  subtitle: string | null;
  summary: string | null;
  content: string | null;
}): Promise<TranslatedWiki> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a professional translator specializing in Japanese occult and folklore content.
Translate the following Japanese occult wiki article to natural, informative English.
Preserve markdown formatting in the content field. Output ONLY valid JSON — no markdown, no code fences.

Input title: ${params.title}
Input subtitle: ${params.subtitle ?? ""}
Input summary: ${params.summary ?? ""}
Input content:
${params.content ?? ""}

Output format (JSON only):
{"title":"...","subtitle":"...","summary":"...","content":"..."}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const parsed = JSON.parse(text.trim()) as TranslatedWiki;
  return parsed;
}
