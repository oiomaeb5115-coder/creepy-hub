import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/getDictionary";
import { NOVEL_PUBLIC_ACCESS_ENABLED } from "@/lib/features";
import { isCreepyHubAppFromHeaders } from "@/lib/isCreepyHubApp";
import NovelPlayer from "../[episodeId]/NovelPlayer";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NovelDemoPage({ params }: Props) {
  const { locale } = await params;
  if (!NOVEL_PUBLIC_ACCESS_ENABLED) {
    notFound();
  }

  // ノベル機能は iOS/Android 公式アプリ内でのみ公開。Web ブラウザからは 404。
  if (!(await isCreepyHubAppFromHeaders())) {
    notFound();
  }

  const dict = await getDictionary(locale);

  const demoScenes = [
    {
      id: "demo-1",
      scene_order: 0,
      layers: [
        { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-3.png" },
        { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-2.png" },
        { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-1.png" },
      ],
      text_ja: "夕暮れの街を見下ろす、古びた喫茶店。\n窓の外には、赤く染まった空が広がっていた。",
      text_en: null,
      speaker_name_ja: null,
      speaker_name_en: null,
      audio_url: null,
      transition_effect: "fade" as const,
    },
    {
      id: "demo-2",
      scene_order: 1,
      layers: [
        { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-3.png" },
        { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-2.png" },
        { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-1.png" },
      ],
      text_ja: "「……あの日のことを、覚えていますか？」",
      text_en: null,
      speaker_name_ja: "少女",
      speaker_name_en: null,
      audio_url: null,
      transition_effect: "fade" as const,
    },
    {
      id: "demo-3",
      scene_order: 2,
      layers: [
        { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-1.png" },
        { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-3.png" },
      ],
      text_ja: "私は答えることができなかった。\nあの日の記憶は、まるで霧の中にいるように曖昧で……\n\nただ一つ、確かなことがあった。",
      text_en: null,
      speaker_name_ja: null,
      speaker_name_en: null,
      audio_url: null,
      transition_effect: "fade" as const,
    },
  ];

  return (
    <NovelPlayer
      scenes={demoScenes}
      locale={locale}
      episodeTitle="デモエピソード"
      backHref={`/${locale}/novel`}
      dict={dict.novel}
    />
  );
}
