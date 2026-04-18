import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import { headers } from "next/headers";
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

  // Server-side iOS detection
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? "";
  const isIOS = ua.includes("CreepyHubApp");

  const dict = await getDictionary(locale);

  if (!isIOS) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
        <p style={{ fontSize: 18 }}>{dict.novel.iosOnly}</p>
      </div>
    );
  }

  // Fetch all published episodes for lobby list
  const { data: episodesData } = await supabase
    .from("novel_episodes")
    .select("id, title_ja, title_en, description_ja, description_en")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const episodes = (episodesData ?? []).map((e) => ({
    id: e.id as string,
    title_ja: e.title_ja as string,
    title_en: (e.title_en as string | null) ?? null,
    description_ja: (e.description_ja as string | null) ?? null,
    description_en: (e.description_en as string | null) ?? null,
  }));

  const storyHref = episodes[0] ? `/${locale}/novel/${episodes[0].id}` : undefined;

  // Always show idle screen as lobby — tap to start story
  return (
    <NovelIdleScreen
      layers={idleLayers}
      locale={locale}
      dict={dict.novel}
      storyHref={storyHref}
      speakerName="映子"
      episodes={episodes}
    />
  );
}
