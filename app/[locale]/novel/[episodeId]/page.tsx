import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDictionary } from "@/lib/getDictionary";
import { NOVEL_PUBLIC_ACCESS_ENABLED } from "@/lib/features";
import { redirect } from "next/navigation";
import NovelPlayer from "./NovelPlayer";
// Lock screen for premium/members-only episodes. Using absolute path
// to work around a Next.js module resolution caching quirk with bracket routes.
import NovelPremiumLock from "@/app/[locale]/novel/[episodeId]/NovelPremiumLock";

type Props = {
  params: Promise<{ locale: string; episodeId: string }>;
};

export default async function NovelEpisodePage({ params }: Props) {
  const { locale, episodeId } = await params;
  if (!NOVEL_PUBLIC_ACCESS_ENABLED) {
    redirect(`/${locale}`);
  }

  const dict = await getDictionary(locale);

  // Fetch episode — Web/iOS/Android すべて閲覧可。課金判定は access_tier で行う。
  const { data: episode } = await supabaseAdmin
    .from("novel_episodes")
    .select("*")
    .eq("id", episodeId)
    .eq("is_published", true)
    .single();

  if (!episode) {
    redirect(`/${locale}/novel`);
  }

  // Fetch scenes
  const { data: scenes } = await supabaseAdmin
    .from("novel_scenes")
    .select("*")
    .eq("episode_id", episodeId)
    .order("scene_order", { ascending: true });

  if (!scenes || scenes.length === 0) {
    redirect(`/${locale}/novel`);
  }

  const title = locale === "en" && episode.title_en ? episode.title_en : episode.title_ja;
  const accessTier = (episode.access_tier as string | null) ?? "free";
  const previewCount = (episode.preview_scene_count as number | null) ?? 0;

  // ===== 課金ロック判定 =====
  // Phase1: サーバーサイドでは「課金エピソードかどうか」の箱だけ作る。
  // サブスク実装後は auth.uid() から subscriptions テーブルを引いて isMember を算出する。
  const isMember = false; // TODO: subscriptions テーブル実装後に置換

  if (accessTier !== "free" && !isMember) {
    // preview_scene_count > 0 ならその分だけシーンを渡し、
    // プレイヤー側で最後に誘導モーダルを出す方が理想だが、
    // まずはシンプルに「ロック画面」を表示する。
    if (previewCount > 0) {
      const previewScenes = scenes.slice(0, previewCount);
      return (
        <NovelPlayer
          scenes={previewScenes}
          locale={locale}
          episodeTitle={title}
          backHref={`/${locale}/novel`}
          dict={dict.novel}
          lockedAtEnd={{
            requiredMembership: (episode.required_membership as string | null) ?? "youtube",
            unlockNote:
              locale === "en"
                ? (episode.premium_unlock_note_en as string | null) ?? null
                : (episode.premium_unlock_note_ja as string | null) ?? null,
          }}
        />
      );
    }
    return (
      <NovelPremiumLock
        locale={locale}
        title={title}
        requiredMembership={(episode.required_membership as string | null) ?? "youtube"}
        unlockNote={
          locale === "en"
            ? (episode.premium_unlock_note_en as string | null) ?? null
            : (episode.premium_unlock_note_ja as string | null) ?? null
        }
        dict={dict.novel}
      />
    );
  }

  return (
    <NovelPlayer
      scenes={scenes}
      locale={locale}
      episodeTitle={title}
      backHref={`/${locale}/novel`}
      dict={dict.novel}
    />
  );
}
