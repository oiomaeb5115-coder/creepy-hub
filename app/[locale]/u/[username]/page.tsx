"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import FollowButton from "@/components/FollowButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";
import ViewIcon from "@/components/icons/ViewIcon";
import ImpressionTracker from "@/components/ImpressionTracker";

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
  stream_video_id: string | null;
  view_count: number | null;
  created_at: string | null;
  slug: string | null;
};

type CommentRow = {
  id: number;
  post_id: number;
  content: string;
  created_at: string | null;
  post: { id: number; title: string | null; slug: string | null } | null;
};

type WikiRow = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  image_url: string | null;
  view_count: number | null;
  updated_at: string | null;
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

type StoryMediaRow = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  duration_ms: number | null;
  created_at: string;
  expires_at: string;
};

type TabKey = "posts" | "replies" | "wiki" | "media" | "bookmarks";
type ModalKey = "following" | "followers" | null;

export default function UserProfilePage() {
  const params = useParams<{ locale: string; username: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;
  const username = params?.username ? decodeURIComponent(params.username) : "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [wikiPages, setWikiPages] = useState<WikiRow[]>([]);
  const [bookmarks, setBookmarks] = useState<PostRow[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("posts");

  // モーダル用
  const [modalOpen, setModalOpen] = useState<ModalKey>(null);
  const [followers, setFollowers] = useState<UserRow[]>([]);
  const [followingUsers, setFollowingUsers] = useState<UserRow[]>([]);
  const [followersLoaded, setFollowersLoaded] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);

  // メディア（ストーリー）
  const [storyMedia, setStoryMedia] = useState<StoryMediaRow[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // 遅延読み込みフラグ
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [wikiLoaded, setWikiLoaded] = useState(false);

  // ⋮メニュー＆ブロック
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockToggling, setBlockToggling] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
          .select("id, title, content, image_url, stream_video_id, view_count, created_at, slug")
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

  // 返信タブ: コメント取得（遅延読み込み）
  useEffect(() => {
    if (activeTab !== "replies" || commentsLoaded || !profile) return;

    const loadComments = async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("id, post_id, content, created_at, post:post_id(id, title, slug)")
        .eq("user_id", profile.id)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setComments(data as unknown as CommentRow[]);
      }
      setCommentsLoaded(true);
    };

    loadComments();
  }, [activeTab, commentsLoaded, profile]);

  // Wikiタブ: Wiki記事取得（遅延読み込み）
  useEffect(() => {
    if (activeTab !== "wiki" || wikiLoaded || !profile) return;

    const loadWiki = async () => {
      const { data } = await supabase
        .from("wiki_pages")
        .select("id, title, slug, summary, image_url, view_count, updated_at")
        .eq("author_id", profile.id)
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (data) {
        setWikiPages(data as WikiRow[]);
      }
      setWikiLoaded(true);
    };

    loadWiki();
  }, [activeTab, wikiLoaded, profile]);

  // メディアタブ: ストーリー画像/動画取得（遅延読み込み、API経由でRLSバイパス）
  useEffect(() => {
    if (activeTab !== "media" || mediaLoaded || !profile) return;

    const loadMedia = async () => {
      try {
        const res = await fetch(`/api/stories/user/${profile.id}`);
        const json = await res.json();
        if (json.stories) {
          setStoryMedia(json.stories as StoryMediaRow[]);
        }
      } catch (e) {
        console.error("Failed to load media:", e);
      }
      setMediaLoaded(true);
    };

    loadMedia();
  }, [activeTab, mediaLoaded, profile]);

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

  // モーダル: フォロワー取得
  useEffect(() => {
    if (modalOpen !== "followers" || followersLoaded || !profile) return;

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
  }, [modalOpen, followersLoaded, profile]);

  // モーダル: フォロー中取得
  useEffect(() => {
    if (modalOpen !== "following" || followingLoaded || !profile) return;

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
  }, [modalOpen, followingLoaded, profile]);

  // ⋮メニュー外クリックで閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // ブロック状態チェック
  useEffect(() => {
    if (!currentUserId || !profile || currentUserId === profile.id) return;
    const checkBlock = async () => {
      const { data } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", profile.id)
        .maybeSingle();
      setBlocked(!!data);
    };
    checkBlock();
  }, [currentUserId, profile]);

  const handleBlockToggle = async () => {
    if (!currentUserId || !profile) return;
    const confirmMsg = locale === "en"
      ? "Block this user?"
      : "このユーザーをブロックしますか？";
    if (!blocked && !confirm(confirmMsg)) return;

    setBlockToggling(true);
    setMenuOpen(false);
    try {
      if (blocked) {
        await supabase
          .from("blocks")
          .delete()
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", profile.id);
        setBlocked(false);
      } else {
        await supabase.from("blocks").insert({
          blocker_id: currentUserId,
          blocked_id: profile.id,
        });
        setBlocked(true);
      }
    } finally {
      setBlockToggling(false);
    }
  };

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
              <ImpressionTracker type="post" id={post.id}>
              <div className={styles.thumbCol} style={{ position: "relative" }}>
                {post.image_url ? (
                  <>
                    <img src={post.image_url} alt={safeTitle} className={styles.thumb} />
                    {post.stream_video_id && (
                      <span style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: 3, padding: "1px 4px", fontSize: 10, lineHeight: 1 }}>▶</span>
                    )}
                  </>
                ) : post.stream_video_id ? (
                  <>
                    <img
                      src={`https://${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${post.stream_video_id}/thumbnails/thumbnail.jpg?width=200&height=200&fit=crop`}
                      alt={safeTitle}
                      className={styles.thumb}
                    />
                    <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>▶</span>
                  </>
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
                <p className={`${styles.postViews} stat-icon`}><ViewIcon /> {post.view_count ?? 0}</p>
              </div>
              </ImpressionTracker>
            </Link>
          );
        })}
      </div>
    </>
  );

  const renderCommentList = () => (
    <>
      {comments.length === 0 && (
        <p className={styles.empty}>
          {locale === "en" ? "No replies yet." : "まだ返信はありません。"}
        </p>
      )}
      <div className={styles.feed}>
        {comments.map((c) => {
          const postTitle = c.post?.title ?? dict.post.untitled;
          const href = c.post ? postUrl(locale, c.post.id, c.post.slug) : "#";
          const excerpt = c.content.length > 60
            ? `${c.content.slice(0, 60)}…`
            : c.content;

          return (
            <Link key={c.id} href={href} className={styles.commentRow}>
              <p className={styles.commentMeta}>
                {postTitle}
                {c.created_at && (
                  <span className={styles.commentDate}>
                    {new Date(c.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ja-JP")}
                  </span>
                )}
              </p>
              <p className={styles.commentContent}>{excerpt}</p>
            </Link>
          );
        })}
      </div>
    </>
  );

  const renderWikiList = () => (
    <>
      {wikiPages.length === 0 && (
        <p className={styles.empty}>
          {locale === "en" ? "No files yet." : "まだファイルはありません。"}
        </p>
      )}
      <div className={styles.feed}>
        {wikiPages.map((w) => (
          <Link
            key={w.id}
            href={`/${locale}/wiki/${w.slug}`}
            className={styles.postRow}
          >
            <ImpressionTracker type="wiki" id={w.id}>
            <div className={styles.thumbCol}>
              {w.image_url ? (
                <img src={w.image_url} alt={w.title} className={styles.thumb} />
              ) : (
                <div className={styles.thumbPlaceholder}>WIKI</div>
              )}
            </div>
            <div className={styles.postContent}>
              <div className={styles.tagRow}>
                <span className={styles.badgeWiki}>Wiki</span>
              </div>
              <h3 className={styles.postTitle}>{w.title}</h3>
              {w.summary && <p className={styles.postExcerpt}>{w.summary}</p>}
              <p className={`${styles.postViews} stat-icon`}><ViewIcon /> {w.view_count ?? 0}</p>
            </div>
            </ImpressionTracker>
          </Link>
        ))}
      </div>
    </>
  );

  const renderMediaGrid = () => (
    <>
      {storyMedia.length === 0 && (
        <p className={styles.empty}>
          {locale === "en" ? "No media yet." : "まだメディアはありません。"}
        </p>
      )}
      <div className={styles.mediaGrid}>
        {storyMedia.map((m) => {
          const isExpired = new Date(m.expires_at) < new Date();
          return (
            <div key={m.id} className={`${styles.mediaCard} ${isExpired ? styles.mediaCardExpired : ""}`}>
              {m.media_type === "image" ? (
                <img
                  src={m.media_url}
                  alt=""
                  className={styles.mediaThumb}
                  loading="lazy"
                />
              ) : (
                <video
                  src={m.media_url}
                  className={styles.mediaThumb}
                  muted
                  playsInline
                  preload="metadata"
                />
              )}
              {m.media_type === "video" && (
                <span className={styles.mediaVideoIcon}>▶</span>
              )}
              {isExpired && (
                <span className={styles.mediaExpiredBadge}>
                  {locale === "en" ? "Expired" : "期限切れ"}
                </span>
              )}
              <div className={styles.mediaCardFooter}>
                <span className={styles.mediaDate}>
                  {m.created_at
                    ? new Date(m.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ja-JP")
                    : ""}
                </span>
              </div>
            </div>
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
            onClick={() => setModalOpen(null)}
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
        {/* トップバー */}
        <div className={styles.topBar}>
          <BackButton />
          <div className={styles.topBarInfo}>
            <h2>{profile.display_name ?? profile.username}</h2>
            <p className={styles.topBarSub}>
              {posts.length} {dict.profile.stories}
            </p>
          </div>
        </div>

        {/* バナー */}
        {profile.banner_url ? (
          <img src={profile.banner_url} className={styles.banner} alt="banner" />
        ) : (
          <div className={styles.bannerPlaceholder}></div>
        )}

        {/* アバター＋アクションボタン行 */}
        <div className={styles.avatarActionRow}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className={styles.avatar} alt={profile.display_name ?? "avatar"} />
          ) : (
            <div className={styles.avatarPlaceholder}></div>
          )}

          <div className={styles.actions}>
            {isOwnProfile ? (
              <Link
                href={`/${locale}/account/settings`}
                style={{
                  padding: "8px 18px",
                  border: "1px solid rgba(161,102,108,0.4)",
                  borderRadius: "999px",
                  color: "#f0e0e0",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  letterSpacing: "0.03em",
                  background: "transparent",
                }}
              >
                {locale === "en" ? "Edit Profile" : "プロフィールを編集"}
              </Link>
            ) : (
              <>
                <FollowButton targetUserId={profile.id} />
                {currentUserId && (
                  <div style={{ position: "relative" }} ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      disabled={blockToggling}
                      style={{
                        background: "none",
                        border: "1px solid rgba(161,102,108,0.4)",
                        borderRadius: "999px",
                        color: "#8a7870",
                        fontSize: "18px",
                        cursor: "pointer",
                        padding: "4px 10px",
                        lineHeight: 1,
                      }}
                      aria-label="menu"
                    >
                      ⋮
                    </button>
                    {menuOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          zIndex: 50,
                          marginTop: "4px",
                          minWidth: "140px",
                          background: "#1a0c0e",
                          border: "1px solid rgba(161,102,108,0.3)",
                          borderRadius: "8px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={handleBlockToggle}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "10px 16px",
                            background: "none",
                            border: "none",
                            color: blocked ? "#ff9090" : "#e05c6a",
                            fontSize: "13px",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          {blocked
                            ? (locale === "en" ? "Unblock" : "ブロック解除")
                            : (locale === "en" ? "Block" : "ブロック")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ユーザー情報 */}
        <div className={styles.userInfo}>
          <h1 className={styles.displayName}>
            {profile.display_name ?? profile.username}
          </h1>
          <p className={styles.username}>@{profile.username}</p>

          {profile.bio && (
            <p className={styles.bio}>{profile.bio}</p>
          )}

          {profile.location && (
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>📍 {profile.location}</span>
            </div>
          )}

          <div className={styles.followStats}>
            <button
              className={styles.followStatBtn}
              onClick={() => setModalOpen("following")}
            >
              <span className={styles.followCount}>{followingCount}</span>
              <span className={styles.followLabel}>{dict.profile.following}</span>
            </button>
            <button
              className={styles.followStatBtn}
              onClick={() => setModalOpen("followers")}
            >
              <span className={styles.followCount}>{followerCount}</span>
              <span className={styles.followLabel}>{dict.profile.followers}</span>
            </button>
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
            className={`${styles.tab} ${activeTab === "replies" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("replies")}
          >
            {locale === "en" ? "Replies" : "返信"}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "wiki" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("wiki")}
          >
            Wiki
          </button>
          <button
            className={`${styles.tab} ${activeTab === "media" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("media")}
          >
            {locale === "en" ? "Media" : "メディア"}
          </button>
        </div>

        <section className={styles.section}>
          {activeTab === "posts" && renderPostList(posts, dict.profile.noStories)}
          {activeTab === "bookmarks" && renderPostList(bookmarks, dict.profile.noBookmarks)}
          {activeTab === "replies" && renderCommentList()}
          {activeTab === "wiki" && renderWikiList()}
          {activeTab === "media" && renderMediaGrid()}
        </section>

        <div className={styles.back}>
          <Link href={`/${locale}`}>
            {dict.profile.backToHome}
          </Link>
        </div>
      </div>

      {/* フォロー/フォロワーモーダル */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {modalOpen === "following" ? dict.profile.following : dict.profile.followers}
              </h3>
              <button
                className={styles.modalClose}
                onClick={() => setModalOpen(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {modalOpen === "following" &&
                renderUserList(
                  followingUsers,
                  locale === "en" ? "Not following anyone yet." : "まだ誰もフォローしていません。"
                )}
              {modalOpen === "followers" &&
                renderUserList(
                  followers,
                  locale === "en" ? "No followers yet." : "まだフォロワーがいません。"
                )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
