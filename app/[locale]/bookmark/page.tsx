"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

type BookmarkedPost = {
  post_id: number;
  post: {
    id: number;
    title: string | null;
    image_url: string | null;
    view_count: number | null;
    content: string | null;
  } | null;
};

export default function BookmarkPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;

  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<BookmarkedPost[]>([]);
  const [removingId, setRemovingId] = useState<number | null>(null);

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
        .from("user_bookmarks")
        .select("post_id, post:post(id, title, image_url, view_count, content)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setBookmarks((data ?? []) as unknown as BookmarkedPost[]);
      setLoading(false);
    };

    load();
  }, [locale]);

  const removeBookmark = async (postId: number) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    setRemovingId(postId);
    await supabase
      .from("user_bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", session.user.id);
    setBookmarks((prev) => prev.filter((b) => b.post_id !== postId));
    setRemovingId(null);
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <div
          className={styles.shell}
          style={{ paddingTop: 80, textAlign: "center", color: "#6a5858" }}
        >
          {dict.common.loading}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <BackButton />

        <header className={styles.header}>
          <div>
            <p className={styles.breadcrumb}>ACCOUNT / BOOKMARKS</p>
            <h1 className={styles.title}>Bookmarks</h1>
            <p className={styles.subtitle}>
              {dict.account.bookmarkSubtitle.replace("{count}", String(bookmarks.length))}
            </p>
          </div>
          <Link href={`/${locale}/account`} className={styles.topLink}>
            {dict.account.backToProfile}
          </Link>
        </header>

        {bookmarks.length === 0 ? (
          <p className={styles.empty}>
            {dict.account.noBookmarks}
          </p>
        ) : (
          <div className={styles.feed}>
            {bookmarks.map((bm) => {
              if (!bm.post) return null;
              const excerpt =
                bm.post.content && bm.post.content.length > 60
                  ? `${bm.post.content.slice(0, 60)}…`
                  : (bm.post.content ?? "");

              return (
                <div
                  key={bm.post_id}
                  style={{ display: "flex", alignItems: "stretch", marginBottom: 1 }}
                >
                  <Link
                    href={`/${locale}/story/${bm.post.id}`}
                    className={styles.card}
                    style={{ flex: 1 }}
                  >
                    {bm.post.image_url ? (
                      <img
                        src={bm.post.image_url}
                        alt={bm.post.title ?? ""}
                        className={styles.thumb}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>NO IMAGE</div>
                    )}
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.badge}>{dict.story.label}</span>
                      </div>
                      <h3 className={styles.cardTitle}>
                        {bm.post.title ?? dict.story.untitled}
                      </h3>
                      {excerpt && (
                        <p className={styles.cardExcerpt}>{excerpt}</p>
                      )}
                      <p className={styles.cardViews}>
                        👁 {bm.post.view_count ?? 0}
                      </p>
                    </div>
                  </Link>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeBookmark(bm.post_id)}
                    disabled={removingId === bm.post_id}
                    title={dict.common.unbookmark}
                  >
                    {removingId === bm.post_id ? "…" : dict.common.delete}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
