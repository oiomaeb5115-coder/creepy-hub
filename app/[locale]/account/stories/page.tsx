"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import { postUrl } from "@/lib/postUrl";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";
import ViewIcon from "@/components/icons/ViewIcon";

type StoryRow = {
  id: number;
  title: string | null;
  image_url: string | null;
  view_count: number | null;
  content: string | null;
  is_published: boolean | null;
  created_at: string | null;
  slug: string | null;
};

export default function AccountStoriesPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<StoryRow[]>([]);

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
        .from("post")
        .select("id, title, image_url, view_count, content, is_published, created_at, slug")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      setStories((data ?? []) as StoryRow[]);
      setLoading(false);
    };

    load();
  }, [locale]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell} style={{ paddingTop: 80, textAlign: "center", color: "#6a5858" }}>
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
            <p className={styles.breadcrumb}>ACCOUNT / STORIES</p>
            <h1 className={styles.title}>My Stories</h1>
            <p className={styles.subtitle}>
              {stories.length}{locale === "en" ? " stories" : " 件の投稿"}
            </p>
          </div>
          <Link href={`/${locale}/account`} className={styles.topLink}>
            {dict.account.backToProfile}
          </Link>
        </header>

        {stories.length === 0 ? (
          <p className={styles.empty}>
            {locale === "en" ? "No stories yet." : "まだ投稿がありません。"}
          </p>
        ) : (
          <div className={styles.feed}>
            {stories.map((story) => {
              const excerpt =
                story.content && story.content.length > 60
                  ? `${story.content.slice(0, 60)}…`
                  : (story.content ?? "");

              return (
                <div key={story.id} className={styles.row}>
                  <Link
                    href={postUrl(locale, story.id, story.slug)}
                    className={styles.card}
                  >
                    {story.image_url ? (
                      <img
                        src={story.image_url}
                        alt={story.title ?? ""}
                        className={styles.thumb}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>NO IMAGE</div>
                    )}
                    <div className={styles.cardBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.badge}>{dict.post.label}</span>
                        {!story.is_published && (
                          <span className={`${styles.badge} ${styles.draftBadge}`}>
                            {locale === "en" ? "Draft" : "下書き"}
                          </span>
                        )}
                      </div>
                      <h3 className={styles.cardTitle}>
                        {story.title ?? dict.post.untitled}
                      </h3>
                      {excerpt && (
                        <p className={styles.cardViews}>{excerpt}</p>
                      )}
                      <p className={`${styles.cardViews} stat-icon`}>
                        <ViewIcon /> {story.view_count ?? 0}
                      </p>
                    </div>
                  </Link>
                  <Link
                    href={`/${locale}/post/${story.id}/edit`}
                    className={styles.editBtn}
                  >
                    {locale === "en" ? "Edit" : "編集"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
