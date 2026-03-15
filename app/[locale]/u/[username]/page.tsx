"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  location: string | null;
};

type PostRow = {
  id: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  view_count: number | null;
  created_at: string | null;
};

export default function UserProfilePage() {
  const params = useParams<{ locale: string; username: string }>();
  const locale = params?.locale ?? "ja";
  const username = params?.username ? decodeURIComponent(params.username) : "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, banner_url, bio, location")
        .eq("username", username)
        .single();

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const p = profileData as ProfileRow;
      setProfile(p);

      const { data: postData } = await supabase
        .from("post")
        .select("id, title, content, image_url, view_count, created_at")
        .eq("user_id", p.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(20);

      setPosts((postData ?? []) as PostRow[]);
      setLoading(false);
    };

    load();
  }, [username]);

  if (loading) {
    return (
      <main className={styles.profilePage}>
        <div className={styles.shell} style={{ paddingTop: "80px", textAlign: "center", color: "#8a7870" }}>
          読み込み中...
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className={styles.profilePage}>
        <div className={styles.shell} style={{ paddingTop: "80px", textAlign: "center", color: "#8a7870" }}>
          <p>プロフィールが見つかりませんでした。</p>
          <Link href={`/${locale}`} style={{ color: "#c49090" }}>ホームへ戻る</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.profilePage}>
      <div className={styles.shell}>
        <BackButton />

        {profile.banner_url ? (
          <img src={profile.banner_url} className={styles.banner} alt="banner" />
        ) : (
          <div className={styles.bannerPlaceholder}></div>
        )}

        <div className={styles.header}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className={styles.avatar} alt={profile.display_name ?? "avatar"} />
          ) : (
            <div className={styles.avatarPlaceholder}></div>
          )}

          <div className={styles.userInfo}>
            <h1>
              {profile.display_name ?? profile.username}
            </h1>

            <p className={styles.username}>
              @{profile.username}
            </p>

            {profile.location && (
              <p className={styles.meta}>
                📍 {profile.location}
              </p>
            )}

            {profile.bio && (
              <p className={styles.bio}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        <section className={styles.section}>
          <h2>投稿怪談</h2>

          {posts.length === 0 && (
            <p className={styles.empty}>
              まだ投稿がありません
            </p>
          )}

          <div className={styles.feed}>
            {posts.map((post) => {
              const safeTitle = post.title ?? "無題";
              const safeContent = post.content ?? "";
              const excerpt = safeContent.length > 20
                ? `${safeContent.slice(0, 20)}…`
                : safeContent;

              return (
                <Link
                  key={post.id}
                  href={`/${locale}/story/${post.id}`}
                  className={styles.postRow}
                >
                  <div className={styles.thumbCol}>
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={safeTitle}
                        className={styles.thumb}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>NO IMAGE</div>
                    )}
                  </div>

                  <div className={styles.postContent}>
                    <div className={styles.tagRow}>
                      <span className={styles.badge}>怪談</span>
                    </div>
                    <h3 className={styles.postTitle}>{safeTitle}</h3>
                    {excerpt && (
                      <p className={styles.postExcerpt}>{excerpt}</p>
                    )}
                    <p className={styles.postViews}>👁 {post.view_count ?? 0}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <div className={styles.back}>
          <Link href={`/${locale}`}>
            ホームへ戻る
          </Link>
        </div>

      </div>
    </main>
  );
}
