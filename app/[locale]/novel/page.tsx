import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NOVEL_PUBLIC_ACCESS_ENABLED } from "@/lib/features";
import { redirect } from "next/navigation";
import NovelIdleScreen from "./NovelIdleScreen";

type Props = {
  params: Promise<{ locale: string }>;
};

/** 背景画像レイヤー（アイドル画面用） */
const idleLayers = [
  { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-3.png" },
  { type: "char" as const, image_url: "/images/novel/char/eiko_shadow.png", role: "shadow" as const },
  { type: "char" as const, image_url: "/images/novel/char/eiko_normal.png" },
  { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-2.png" },
  { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-1.png" },
];

export default async function NovelPage({ params }: Props) {
  const { locale } = await params;
  if (!NOVEL_PUBLIC_ACCESS_ENABLED) {
    redirect(`/${locale}`);
  }

  // Fetch all published episodes for lobby list
  // Web/iOS/Android すべてで無料ノベルは公開。課金エピソードは access_tier で判別する。
  const { data: episodesData } = await supabaseAdmin
    .from("novel_episodes")
    .select("id, title_ja, title_en, description_ja, description_en, access_tier, required_membership, premium_unlock_note_ja, premium_unlock_note_en")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const episodes = (episodesData ?? []).map((e) => ({
    id: e.id as string,
    title_ja: e.title_ja as string,
    title_en: (e.title_en as string | null) ?? null,
    description_ja: (e.description_ja as string | null) ?? null,
    description_en: (e.description_en as string | null) ?? null,
    access_tier: ((e.access_tier as string | null) ?? "free") as "free" | "premium" | "members_only",
    required_membership: (e.required_membership as string | null) ?? null,
    premium_unlock_note_ja: (e.premium_unlock_note_ja as string | null) ?? null,
    premium_unlock_note_en: (e.premium_unlock_note_en as string | null) ?? null,
  }));

  // storyHref は「エピソードが1件のみ」の時の即時開始用。
  // 無料を優先し、なければ先頭（ロック画面で誘導する）
  const firstPlayable = episodes.find((e) => e.access_tier === "free") ?? episodes[0];
  const storyHref = firstPlayable ? `/${locale}/novel/${firstPlayable.id}` : undefined;

  // Always show idle screen as lobby — tap to start story
  return (
    <NovelIdleScreen
      layers={idleLayers}
      locale={locale}
      storyHref={storyHref}
      speakerName="映子"
      episodes={episodes}
    />
  );
}
