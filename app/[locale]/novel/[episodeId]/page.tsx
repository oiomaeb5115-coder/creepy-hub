import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import NovelPlayer from "./NovelPlayer";

type Props = {
  params: Promise<{ locale: string; episodeId: string }>;
};

export default async function NovelEpisodePage({ params }: Props) {
  const { locale, episodeId } = await params;

  // Server-side iOS detection via User-Agent
  const headersList = await headers();
  const ua = headersList.get("user-agent") ?? "";
  const isIOS = ua.includes("CreepyHubApp");

  if (!isIOS) {
    redirect(`/${locale}`);
  }

  const dict = await getDictionary(locale);

  // Fetch episode
  const { data: episode } = await supabase
    .from("novel_episodes")
    .select("*")
    .eq("id", episodeId)
    .eq("is_published", true)
    .single();

  if (!episode) {
    redirect(`/${locale}/novel`);
  }

  // Fetch scenes
  const { data: scenes } = await supabase
    .from("novel_scenes")
    .select("*")
    .eq("episode_id", episodeId)
    .order("scene_order", { ascending: true });

  if (!scenes || scenes.length === 0) {
    redirect(`/${locale}/novel`);
  }

  const title = locale === "en" && episode.title_en ? episode.title_en : episode.title_ja;

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
