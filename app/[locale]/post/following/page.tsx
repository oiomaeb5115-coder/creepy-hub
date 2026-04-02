"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { postUrl } from "@/lib/postUrl";
import BackButton from "@/components/BackButton";
import styles from "../page.module.css";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

type AuthorProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PostRow = {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  view_count: number | null;
  slug: string | null;
  user_id: string | null;
};

export default function FollowingPostsPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";

  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [posts, setPosts] = useState<(PostRow & { author?: AuthorProfile | null })[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoggedIn(false);
        setLoading(false);
        return;
      }
      setLoggedIn(true);

      // フォロー中のユーザーID取得
      const { data: followData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", session.user.id);

      const followingIds = (followData ?? []).map((f: { following_id: string }) => f.following_id);

      if (followingIds.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // フォロー中ユーザーの投稿取得
      const { data: postData } = await supabase
        .from("post")
        .select("id, title, content, created_at, image_url, image_url_2, image_url_3, view_count, slug, user_id")
        .eq("is_published", true)
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(50);

      const rawPosts = (postData ?? []) as PostRow[];

      // プロフィール取得
      const userIds = [...new Set(rawPosts.map((p) => p.user_id).filter(Boolean))] as string[];
      let profilesMap: Record<string, AuthorProfile> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds);
        for (const p of profiles ?? []) {
          profilesMap[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
        }
      }

      setPosts(rawPosts.map((p) => ({
        ...p,
        author: p.user_id ? (profilesMap[p.user_id] ?? null) : null,
      })));
      setLoading(false);
    };

    load();
  }, [locale]);

  if (loading) {
    return (
      <main className={styles.storyPage}>
        <div className={styles.storyShell} style={{ paddingTop: 80, textAlign: "center", color: "#8a7870" }}>
          {dict.common.loading}
        </div>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className={styles.storyPage}>
        <div className={styles.storyShell}>
          <BackButton />
          <header className={styles.pageHeader}>
            <div>
              <p className={styles.breadcrumb}>HORROR POST / FOLLOWING</p>
              <h1 className={styles.pageTitle}>{dict.post.following}</h1>
            </div>
          </header>
          <p className={styles.emptyText}>
            {dict.post.loginToSeeFollowing}
          </p>
          <div style={{ textAlign: "center" }}>
            <Link href={`/${locale}/login`} style={{ color: "#c49090" }}>{dict.nav.login}</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.storyPage}>
      <div className={styles.storyShell}>
        <BackButton />
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>HORROR POST / FOLLOWING</p>
            <h1 className={styles.pageTitle}>{dict.post.following}</h1>
          </div>
          <div className={styles.headerActions}>
            <Link href={`/${locale}/post`} className={styles.topLink}>{dict.post.all}</Link>
          </div>
        </header>

        {posts.length === 0 ? (
          <p className={styles.emptyText}>
            {dict.post.followingEmpty}
          </p>
        ) : (
          <div className={styles.feed}>
            {posts.map((post) => {
              const safeTitle = post.title ?? dict.post.untitled;
              const safeContent = post.content ?? "";
              const dateStr = post.created_at
                ? new Date(post.created_at).toLocaleDateString(dateLocale)
                : "";
              const imageUrls = [post.image_url, post.image_url_2, post.image_url_3]
                .filter((url): url is string => Boolean(url))
                .slice(0, 4);
              const authorName = post.author?.display_name || post.author?.username || null;

              return (
                <Link
                  key={post.id}
                  href={postUrl(locale, post.id, post.slug)}
                  className={styles.postRow}
                >
                  <div className={styles.postContent}>
                    <div className={styles.postAuthorRow}>
                      {post.author?.avatar_url ? (
                        <img src={post.author.avatar_url} alt="" className={styles.postAvatar} />
                      ) : (
                        <span className={styles.postAvatarPlaceholder} />
                      )}
                      <span className={styles.postAuthorName}>
                        {authorName ? `@${post.author?.username ?? authorName}` : (locale === "en" ? "Anonymous" : "匿名")}
                      </span>
                      <span className={styles.postDate}>{dateStr}</span>
                    </div>
                    <h3 className={styles.postTitle}>{safeTitle}</h3>
                    <p className={styles.postExcerpt}>
                      {safeContent.length > 400
                        ? `${safeContent.slice(0, 400)}...`
                        : safeContent}
                    </p>
                    {imageUrls.length > 0 && (
                      <div className={`${styles.postImageWrap} ${imageUrls.length >= 2 ? styles.postImageGrid : ""}`}>
                        {imageUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`${safeTitle} ${i + 1}`}
                            className={styles.postImage}
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                    <div className={styles.postFooter}>
                      <span>👁 {post.view_count ?? 0}</span>
                    </div>
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
