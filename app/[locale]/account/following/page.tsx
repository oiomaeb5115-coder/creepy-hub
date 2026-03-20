"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

type FollowRow = {
  following_id: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default function AccountFollowingPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;

  const [loading, setLoading] = useState(true);
  const [follows, setFollows] = useState<FollowRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = `/${locale}/login`;
        return;
      }

      const { data } = await supabase
        .from("follows")
        .select("following_id, profile:profiles!following_id(username, display_name, avatar_url)")
        .eq("follower_id", session.user.id)
        .order("created_at", { ascending: false });

      setFollows((data ?? []) as unknown as FollowRow[]);
      setLoading(false);
    };

    load();
  }, [locale]);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0d0608", color: "#f5f1eb", padding: "80px 20px", textAlign: "center" }}>
        {dict.common.loading}
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0d0608", color: "#f5f1eb", padding: "32px 20px 100px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <BackButton />

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, paddingBottom: 24, marginBottom: 32, borderBottom: "1px solid rgba(167,108,113,0.16)" }}>
          <div>
            <p style={{ margin: "0 0 14px", fontSize: 13, letterSpacing: "0.12em", color: "#8a7870" }}>ACCOUNT / FOLLOWING</p>
            <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 42px)", color: "#f5f1eb" }}>Following</h1>
            <p style={{ margin: "14px 0 0", fontSize: 15, color: "#a49080" }}>
              {follows.length}{locale === "en" ? " users" : " 人をフォロー中"}
            </p>
          </div>
          <Link href={`/${locale}/account`} style={{ minHeight: 42, padding: "0 16px", border: "1px solid rgba(170,108,112,0.32)", background: "rgba(48,18,22,0.78)", color: "#f5f1eb", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", fontSize: 13, whiteSpace: "nowrap" }}>
            {dict.account.backToProfile}
          </Link>
        </header>

        {follows.length === 0 ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "#6a5858", fontSize: 15 }}>
            {locale === "en" ? "Not following anyone yet." : "まだ誰もフォローしていません。"}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {follows.map((f) => {
              const profile = f.profile;
              const username = profile?.username;
              return (
                <Link
                  key={f.following_id}
                  href={username ? `/${locale}/u/${username}` : `/${locale}`}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: "rgba(12,4,6,0.95)", border: "1px solid rgba(161,102,108,0.18)", textDecoration: "none", color: "inherit" }}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.display_name ?? ""} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#150608", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a4848", fontSize: 11, flexShrink: 0 }}>?</div>
                  )}
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "#f0e8e0" }}>
                      {profile?.display_name ?? profile?.username ?? locale === "en" ? "Unknown" : "不明なユーザー"}
                    </p>
                    {username && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8a7870" }}>@{username}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
