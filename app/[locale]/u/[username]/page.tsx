"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import FollowButton from "@/components/FollowButton";
import BlockButton from "@/components/BlockButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

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
  slug: string | null;
};

type BookmarkRow = {
  post_id: number;
  post: PostRow;
};

type UserRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type FollowerRow = { follower_id: string; profile: UserRow | null };
type FollowingRow = { following_id: string; profile: UserRow | null };

type TabKey = "posts" | "bookmarks" | "following" | "followers";

export default function UserProfilePage() {
  const params = useParams<{ locale: string; username: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;
  const username = params?.username ? decodeURIComponent(params.username) : "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [bookmarks, setBookmarks] = useState<PostRow[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("posts");

  // フォロー/フォロワーリスト
  const [followers, setFollowers] = useState<UserRow[]>([]);
  const [followingUsers, setFollowingUsers] = useState<UserRow[]>([]);
  const [followersLoaded, setFollowersLoaded] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

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

      const [{ data: postData }, { count: fcCount }, { count: fgCount }] = await Promise.all([
        supabase
          .from("post")
          .select("id, title, content, image_url, view_count, created_at, slug")
          .eq("user_id", p.id)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", p.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", p.id),
      ]);

      setPosts((postData ?? []) as PostRow[]);
      setFollowerCount(fcCount ?? 0);
      setFollowingCount(fgCount ?? 0);
      setLoading(false);
    };

    load();
  }, [username]);

  // ブックマーク取得（本人のプロフィール閲覧時のみ）
  useEffect(() => {
    if (!profile || !currentUserId) return;
    if (currentUserId !== profile.id) return;

    const loadBookmarks = async () => {
      const { data } = await supabase
        .from("user_bookmarks")
        .select("post_id, post:post_id(id, title, content, image_url, view_count, created_at, slug)")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        const rows = data as unknown as BookmarkRow[];
        setBookmarks(rows.map((r) => r.post).filter(Boolean));
      }
    };

    loadBookmarks();
  }, [profile, currentUserId]);

  // フォロワー取得（タブ選択時に遅延読み込み）
  useEffect(() => {
    if (activeTab !== "followers" || followersLoaded || !profile) return;

    const loadFollowers = async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id, profile:profiles!follower_id(id, username, display_name, avatar_url)")
        .eq("following_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        const rows = data as unknown as FollowerRow[];
        setFollowers(rows.map((r) => r.profile).filter(Boolean) as UserRow[]);
      }
      setFollowersLoaded(true);
    };

    loadFollowers();
  }, [activeTab, followersLoaded, profile]);

  // フォロー中取得（タブ選択時に遅延読み込み）
  useEffect(() => {
    if (activeTab !== "following" || followingLoaded || !profile) return;

    const loadFollowing = async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id, profile:profiles!following_id(id, username, display_name, avatar_url)")
        .eq("follower_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        const rows = data as unknown as FollowingRow[];
        setFollowingUsers(rows.map((r) => r.profile).filter(Boolean) as UserRow[]);
      }
      setFollowingLoaded(true);
    };

    loadFollowing();
  }, [activeTab, followingLoaded, profile]);

  const isOwnProfile = currentUserId === profile?.id;

  if (loading) {
    return (
      <main className={styles.profilePage}>
        <div className={styles.shell} style={{ paddingTop: "80px", textAlign: "center", color: "#8a7870" }}>
          {dict.common.loading}
        </div>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className={styles.profilePage}>
        <div className={styles.shell} style={{ paddingTop: "80px", textAlign: "center", color: "#8a7870" }}>
          <p>{dict.profile.notFound}</p>
          <Link href={`/${locale}`} style={{ color: "#c49090" }}>{dict.profile.backToHome}</Link>
        </div>
      </main>
    );
  }

  const renderPostList = (postList: PostRow[], emptyMsg: string) => (
    <>
      {postList.length === 0 && (
        <p className={styles.empty}>{emptyMsg}</p>
      )}
      <div className={styles.feed}>
        {postList.map((post) => {
          const safeTitle = post.title ?? dict.post.untitled;
          const safeContent = post.content ?? "";
          const excerpt = safeContent.length > 20
            ? `${safeContent.slice(0, 20)}…`
            : safeContent;

          return (
            <Link
              key={post.id}
              href={postUrl(locale, post.id, post.slug)}
              className={styles.postRow}
            >
              <div className={styles.thumbCol}>
                {post.image_url ? (
                  <img src={post.image_url} alt={safeTitle} className={styles.thumb} />
                ) : (
                  <div className={styles.thumbPlaceholder}>NO IMAGE</div>
                )}
              </div>
              <div className={styles.postContent}>
                <div className={styles.tagRow}>
                  <span className={styles.badge}>{dict.post.label}</span>
                </div>
                <h3 className={styles.postTitle}>{safeTitle}</h3>
                {excerpt && <p className={styles.postExcerpt}>{excerpt}</p>}
                <p className={styles.postViews}>👁 {post.view_count ?? 0}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );

  const renderUserList = (users: UserRow[], emptyMsg: string) => (
    <>
      {users.length === 0 && (
        <p className={styles.empty}>{emptyMsg}</p>
      )}
      <div className={styles.userList}>
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/${locale}/u/${u.username}`}
            className={styles.userRow}
          >
            {u.avatar_url ? (
              <img src={u.avatar_url} alt={u.display_name ?? ""} className={styles.userAvatar} />
            ) : (
              <div className={styles.userAvatarPlaceholder}>?</div>
            )}
            <div>
              <p className={styles.userDisplayName}>
                {u.display_name ?? u.username ?? (locale === "en" ? "Unknown" : "不明なユーザー")}
              </p>
              {u.username && (
                <p className={styles.userUsername}>@{u.username}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );

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
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0 }}>
                {profile.display_name ?? profile.username}
              </h1>
              {currentUserId === profile.id ? (
                <Link
                  href={`/${locale}/account/settings`}
                  style={{
                    padding: "6px 14px",
                    border: "1px solid #555",
                    color: "#ccc",
                    fontSize: "13px",
                    textDecoration: "none",
                    letterSpacing: "0.05em",
                  }}
                >
                  {locale === "en" ? "Edit Profile" : "プロフィールを編集"}
                </Link>
              ) : (
                <>
                  <FollowButton targetUserId={profile.id} />
                  <BlockButton targetUserId={profile.id} />
                </>
              )}
            </div>

            <p className={styles.username}>
              @{profile.username}
            </p>

            {profile.location && (
              <p className={styles.meta}>
                📍 {profile.location}
              </p>
            )}

            <div className={styles.followStats}>
              <button
                className={styles.followStatBtn}
                onClick={() => setActiveTab("following")}
              >
                <span className={styles.followCount}>{followingCount}</span>
                <span className={styles.followLabel}>{dict.profile.following}</span>
              </button>
              <button
                className={styles.followStatBtn}
                onClick={() => setActiveTab("followers")}
              >
                <span className={styles.followCount}>{followerCount}</span>
                <span className={styles.followLabel}>{dict.profile.followers}</span>
              </button>
            </div>

            {profile.bio && (
              <p className={styles.bio}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* タブ */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "posts" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            {dict.profile.stories}
          </button>
          {isOwnProfile && (
            <button
              className={`${styles.tab} ${activeTab === "bookmarks" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("bookmarks")}
            >
              {dict.profile.bookmarks}
            </button>
          )}
          <button
            className={`${styles.tab} ${activeTab === "following" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("following")}
          >
            {dict.profile.following}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "followers" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("followers")}
          >
            {dict.profile.followers}
          </button>
        </div>

        <section className={styles.section}>
          {activeTab === "posts" && renderPostList(posts, dict.profile.noStories)}
          {activeTab === "bookmarks" && renderPostList(bookmarks, dict.profile.noBookmarks)}
          {activeTab === "following" && renderUserList(
            followingUsers,
            locale === "en" ? "Not following anyone yet." : "まだ誰もフォローしていません。"
          )}
          {activeTab === "followers" && renderUserList(
            followers,
            locale === "en" ? "No followers yet." : "まだフォロワーがいません。"
          )}
        </section>

        <div className={styles.back}>
          <Link href={`/${locale}`}>
            {dict.profile.backToHome}
          </Link>
        </div>

      </div>
    </main>
  );
}
