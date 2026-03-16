"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAccessToken, getIsAdmin } from "@/lib/auth";
import BackButton from "@/components/BackButton";

type Notification = {
  id: number;
  type: "comment" | "reply";
  is_read: boolean;
  post_id: number | null;
  actor_id: string | null;
  created_at: string;
};

type PendingCategory = {
  id: number;
  name: string;
  slug: string;
  created_at: string | null;
};

type ProfileRow = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function NotificationsPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [postTitles, setPostTitles] = useState<Record<number, string>>({});
  const [pendingCategories, setPendingCategories] = useState<PendingCategory[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace(`/${locale}/login`);
        return;
      }

      const token = await getAccessToken();
      const adminFlag = await getIsAdmin();
      setIsAdmin(adminFlag);

      // Fetch own profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, bio")
        .eq("id", session.user.id)
        .single();
      setProfile((profileData as ProfileRow | null) ?? null);

      // Fetch notifications
      const { data: notifData } = await supabase
        .from("notifications")
        .select("id, type, is_read, post_id, actor_id, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const notifs = (notifData ?? []) as Notification[];
      setNotifications(notifs);

      // Batch fetch actor usernames
      const actorIds = [...new Set(notifs.map((n) => n.actor_id).filter(Boolean) as string[])];
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", actorIds);
        const map: Record<string, string> = {};
        (profiles ?? []).forEach((p: { id: string; username: string | null }) => {
          map[p.id] = p.username ?? "unknown";
        });
        setActorNames(map);
      }

      // Batch fetch post titles
      const postIds = [...new Set(notifs.map((n) => n.post_id).filter(Boolean) as number[])];
      if (postIds.length > 0) {
        const { data: posts } = await supabase
          .from("post")
          .select("id, title")
          .in("id", postIds);
        const map: Record<number, string> = {};
        (posts ?? []).forEach((p: { id: number; title: string | null }) => {
          map[p.id] = p.title ?? "投稿";
        });
        setPostTitles(map);
      }

      // Admin: fetch pending categories
      if (adminFlag) {
        const { data: cats } = await supabase
          .from("story_categories")
          .select("id, name, slug, created_at")
          .eq("is_user_created", true)
          .eq("approved", false)
          .order("created_at", { ascending: false });
        setPendingCategories((cats ?? []) as PendingCategory[]);
      }

      // Mark all as read
      if (token) {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setLoading(false);
    };

    init();
  }, [locale, router]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>読み込み中...</div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <BackButton />

        <header style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.15em", color: "#7a6a60", margin: "0 0 4px" }}>
            ACCOUNT
          </p>
          <h1 style={{ fontSize: 20, color: "#e8d8d0", margin: "0 0 16px" }}>プロフィール</h1>

          {/* Profile summary */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 16px",
            background: "rgba(20,10,12,0.6)",
            border: "1px solid rgba(180,100,110,0.18)",
            borderRadius: 8,
            marginBottom: 12,
          }}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? "avatar"}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: "50%", background: "#2a1a1e",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#7a6a60", fontSize: 10, flexShrink: 0,
              }}>
                AVATAR
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, color: "#e8d8d0", fontWeight: 600 }}>
                {profile?.display_name ?? "名前未設定"}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#7a6a60" }}>
                @{profile?.username ?? "username"}
              </p>
              {profile?.bio && (
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#c0a898", lineHeight: 1.5 }}>
                  {profile.bio.length > 60 ? `${profile.bio.slice(0, 60)}...` : profile.bio}
                </p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
              {isAdmin && (
                <Link
                  href={`/${locale}/admin`}
                  style={{ fontSize: 11, color: "#e8a0a0", textDecoration: "none", letterSpacing: "0.05em" }}
                >
                  管理画面 →
                </Link>
              )}
              <Link
                href={profile?.username ? `/${locale}/u/${profile.username}` : `/${locale}/account`}
                style={{ fontSize: 11, color: "#b08888", textDecoration: "none", letterSpacing: "0.05em" }}
              >
                公開ページ →
              </Link>
              <Link
                href={`/${locale}/account/settings`}
                style={{ fontSize: 11, color: "#8899bb", textDecoration: "none", letterSpacing: "0.05em" }}
              >
                設定 →
              </Link>
            </div>
          </div>
        </header>

        <header style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.15em", color: "#7a6a60", margin: "0 0 4px" }}>
            NOTIFICATIONS
          </p>
          <h2 style={{ fontSize: 16, color: "#e8d8d0", margin: 0 }}>通知</h2>
        </header>

        {/* Admin: pending categories */}
        {isAdmin && pendingCategories.length > 0 && (
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              審査待ちカテゴリ（{pendingCategories.length}件）
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingCategories.map((cat) => (
                <div key={cat.id} style={notifItemStyle(true)}>
                  <span style={{ color: "#e0c8c0", fontSize: 14 }}>
                    新しいカテゴリが審査を待っています：
                    <strong style={{ marginLeft: 6 }}>{cat.name}</strong>
                  </span>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <span style={{ color: "#7a6a60", fontSize: 11 }}>
                      {cat.created_at
                        ? new Date(cat.created_at).toLocaleString("ja-JP")
                        : "—"}
                    </span>
                    <Link
                      href={`/${locale}/admin`}
                      style={{ color: "#b08888", fontSize: 12, textDecoration: "none" }}
                    >
                      → 審査する
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* User notifications */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>コメント・返信</h2>

          {notifications.length === 0 ? (
            <p style={{ color: "#7a6a60", fontSize: 13, fontStyle: "italic" }}>
              通知はありません
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notifications.map((n) => {
                const actor = n.actor_id ? actorNames[n.actor_id] ?? "誰か" : "誰か";
                const postTitle = n.post_id ? postTitles[n.post_id] ?? "投稿" : "投稿";

                return (
                  <div key={n.id} style={notifItemStyle(!n.is_read)}>
                    <span style={{ color: "#e0c8c0", fontSize: 14 }}>
                      {n.type === "comment" ? (
                        <>
                          <strong style={{ color: "#cfe0ff" }}>@{actor}</strong>{" "}
                          が「{postTitle}」にコメントしました
                        </>
                      ) : (
                        <>
                          <strong style={{ color: "#cfe0ff" }}>@{actor}</strong>{" "}
                          があなたのコメントに返信しました
                        </>
                      )}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      <span style={{ color: "#7a6a60", fontSize: 11 }}>
                        {new Date(n.created_at).toLocaleString("ja-JP")}
                      </span>
                      {n.post_id && (
                        <Link
                          href={`/${locale}/story/${n.post_id}`}
                          style={{ color: "#b08888", fontSize: 12, textDecoration: "none" }}
                        >
                          → 投稿を見る
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0d0808",
  color: "#c8b8b0",
  padding: "0 16px 80px",
};

const shellStyle: React.CSSProperties = {
  maxWidth: 700,
  margin: "0 auto",
  paddingTop: 24,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 36,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#e0c8c0",
  marginBottom: 12,
  paddingBottom: 6,
  borderBottom: "1px solid rgba(180,100,110,0.2)",
  letterSpacing: "0.06em",
};

const notifItemStyle = (unread: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "12px 14px",
  borderRadius: 6,
  background: unread ? "rgba(60, 20, 20, 0.55)" : "rgba(20, 10, 12, 0.5)",
  border: `1px solid ${unread ? "rgba(200,90,100,0.3)" : "rgba(180,100,110,0.12)"}`,
});
