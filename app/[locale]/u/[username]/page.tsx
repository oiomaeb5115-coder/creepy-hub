import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import UserProfileClient from "./UserProfileClient";

const BASE_URL = "https://creepyhub.com";

export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string; username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, banner_url")
    .eq("username", username)
    .single();

  if (!profile) return {};

  // 公開投稿の有無を確認（空プロフィールは noindex でクロール予算を節約）
  let publishedPostCount = 0;
  if (profile.id) {
    const { count } = await supabaseAdmin
      .from("post")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_published", true);
    publishedPostCount = count ?? 0;
  }
  const hasBio = !!(profile.bio && profile.bio.trim().length > 0);
  const isEmptyProfile = publishedPostCount === 0 && !hasBio;

  const displayName = profile.display_name || profile.username || username;
  const title = displayName;
  const description = profile.bio
    ? profile.bio.replace(/\n+/g, " ").trim().slice(0, 160)
    : locale === "en"
      ? `${displayName}'s profile on creepy hub`
      : `${displayName} さんのプロフィール - creepy hub`;

  const url = `${BASE_URL}/${locale}/u/${encodeURIComponent(profile.username ?? username)}`;
  const ogImage = profile.banner_url || profile.avatar_url || undefined;

  return {
    title,
    description,
    ...(isEmptyProfile ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: url,
      languages: {
        ja: `${BASE_URL}/ja/u/${encodeURIComponent(profile.username ?? username)}`,
        en: `${BASE_URL}/en/u/${encodeURIComponent(profile.username ?? username)}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      locale: locale === "en" ? "en_US" : "ja_JP",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default function UserProfilePage() {
  return <UserProfileClient />;
}
