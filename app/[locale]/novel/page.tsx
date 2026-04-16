import { supabase } from "@/lib/supabase";
import { getDictionary } from "@/lib/getDictionary";
import { headers } from "next/headers";
import NovelPlayer from "./[episodeId]/NovelPlayer";

type Props = {
  params: Promise<{ locale: string }>;
};

/** 背景画像レイヤー（エピソードがないときのソシャゲホーム風表示用） */
const idleLayers = [
  { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-3.png" },
  { type: "bg" as const, image_url: "/images/novel/bg/スマホ用　背景-2.png" },
  { type: "char" as const, image_url: "/images/novel/char/eiko_1.png", position: "center" as const },
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

  // Fetch first published episode with scenes
  const { data: episodes } = await supabase
    .from("novel_episodes")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(1);

  const episode = episodes?.[0];

  if (episode) {
    // Fetch scenes for this episode
    const { data: scenes } = await supabase
      .from("novel_scenes")
      .select("*")
      .eq("episode_id", episode.id)
      .order("scene_order", { ascending: true });

    if (scenes && scenes.length > 0) {
      const title = locale === "en" && episode.title_en ? episode.title_en : episode.title_ja;
      // Auto-start the novel
      return (
        <NovelPlayer
          scenes={scenes}
          locale={locale}
          episodeTitle={title}
          backHref={`/${locale}`}
          dict={dict.novel}
        />
      );
    }
  }

  // No episodes — show idle home screen with background layers
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* Layers */}
      {idleLayers.map((layer, i) => {
        if (layer.type === "char") {
          const pos: string = "position" in layer ? (layer.position ?? "center") : "center";
          return (
            <img
              key={i}
              src={layer.image_url}
              alt=""
              style={{
                position: "absolute",
                bottom: "28%",
                left: pos === "left" ? "5%" : pos === "right" ? "auto" : "50%",
                right: pos === "right" ? "5%" : "auto",
                transform: pos === "center" ? "translateX(-50%)" : "none",
                maxHeight: "55%",
                maxWidth: "50%",
                objectFit: "contain",
                zIndex: i + 1,
                pointerEvents: "none",
                filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
              }}
            />
          );
        }
        return (
          <img
            key={i}
            src={layer.image_url}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: i + 1,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.5) 100%)",
          zIndex: idleLayers.length + 1,
          pointerEvents: "none",
        }}
      />

      {/* Home button */}
      <a
        href={`/${locale}`}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 30,
          color: "#fff",
          textDecoration: "none",
          fontSize: 14,
          padding: "6px 14px",
          background: "rgba(0,0,0,0.6)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      >
        &larr; {dict.novel.backToList}
      </a>

      {/* Title overlay at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: idleLayers.length + 2,
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'SoukouMincho', serif",
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          {dict.novel.title}
        </p>
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            marginTop: 4,
          }}
        >
          {dict.novel.subtitle}
        </p>
      </div>
    </div>
  );
}
