"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin, getAccessToken } from "@/lib/auth";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

type StoryRow = { id: number; title: string | null; created_at: string | null };
type WikiRow = { slug: string; title: string; updated_at: string | null };
type PendingCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string | null;
  reported_count: number;
};

type PendingWikiCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string | null;
};

type TrashStory = { id: number; title: string | null; deleted_at: string };
type TrashWiki = { slug: string; title: string; deleted_at: string };
type TrashCategory = { id: number; name: string; slug: string; deleted_at: string };

type TranslateStatus = "idle" | "loading" | "done" | "error" | "exists";
type ApproveStatus = "idle" | "loading" | "done" | "error";
type DeleteStatus = "idle" | "loading" | "done" | "error";
type TrashStatus = "idle" | "loading" | "restored" | "purged" | "error";

export default function AdminPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const dict = locale === "en" ? en : ja;
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [wikis, setWikis] = useState<WikiRow[]>([]);
  const [pendingCategories, setPendingCategories] = useState<PendingCategory[]>([]);
  const [reportedCategories, setReportedCategories] = useState<PendingCategory[]>([]);
  const [pendingWikiCategories, setPendingWikiCategories] = useState<PendingWikiCategory[]>([]);
  const [wikiApproveStatus, setWikiApproveStatus] = useState<Record<number, ApproveStatus>>({});
  const [wikiDeleteStatus, setWikiDeleteStatus] = useState<Record<number, DeleteStatus>>({});
  const [storyStatus, setStoryStatus] = useState<Record<number, TranslateStatus>>({});
  const [wikiStatus, setWikiStatus] = useState<Record<string, TranslateStatus>>({});
  const [approveStatus, setApproveStatus] = useState<Record<number, ApproveStatus>>({});
  const [deleteStatus, setDeleteStatus] = useState<Record<number, DeleteStatus>>({});
  const [trashStories, setTrashStories] = useState<TrashStory[]>([]);
  const [trashWikis, setTrashWikis] = useState<TrashWiki[]>([]);
  const [trashCategories, setTrashCategories] = useState<TrashCategory[]>([]);
  const [trashStoryStatus, setTrashStoryStatus] = useState<Record<number, TrashStatus>>({});
  const [trashWikiStatus, setTrashWikiStatus] = useState<Record<string, TrashStatus>>({});
  const [trashCatStatus, setTrashCatStatus] = useState<Record<number, TrashStatus>>({});

  useEffect(() => {
    const init = async () => {
      // キャッシュに依存しない直接クエリで管理者チェック
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/${locale}`);
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profileData?.role !== "admin") {
        router.replace(`/${locale}`);
        return;
      }

      // 未翻訳ストーリーを取得
      const { data: allStories } = await supabase
        .from("post")
        .select("id, title, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: translatedStories } = await supabase
        .from("post_translations")
        .select("post_id")
        .eq("locale", "en");

      const translatedIds = new Set((translatedStories ?? []).map((t) => t.post_id));
      const untranslated = (allStories ?? []).filter((s) => !translatedIds.has(s.id));
      setStories(untranslated);

      // 未翻訳 Wiki を取得
      const { data: jaWikis } = await supabase
        .from("wiki_pages")
        .select("slug, title, updated_at")
        .eq("locale", "ja")
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .limit(100);

      const { data: enWikis } = await supabase
        .from("wiki_pages")
        .select("slug")
        .eq("locale", "en");

      const enSlugs = new Set((enWikis ?? []).map((w) => w.slug));
      const untranslatedWikis = (jaWikis ?? []).filter((w) => !enSlugs.has(w.slug));
      setWikis(untranslatedWikis);

      // 審査待ちカテゴリを取得
      const { data: pendingCats } = await supabase
        .from("story_categories")
        .select("id, name, slug, description, created_at, reported_count")
        .eq("is_user_created", true)
        .eq("approved", false)
        .order("created_at", { ascending: false });
      setPendingCategories((pendingCats ?? []) as PendingCategory[]);

      // 審査待ち Wiki カテゴリを取得
      const { data: pendingWikiCats } = await supabase
        .from("categories")
        .select("id, name, slug, description, created_at")
        .eq("is_user_created", true)
        .eq("is_active", false)
        .order("created_at", { ascending: false });
      setPendingWikiCategories((pendingWikiCats ?? []) as PendingWikiCategory[]);

      // 報告が多いカテゴリを取得（承認済みで reported_count >= 3）
      const { data: reportedCats } = await supabase
        .from("story_categories")
        .select("id, name, slug, description, created_at, reported_count")
        .eq("is_user_created", true)
        .eq("approved", true)
        .gte("reported_count", 3)
        .order("reported_count", { ascending: false });
      setReportedCategories((reportedCats ?? []) as PendingCategory[]);

      // ゴミ箱: ソフトデリートされた投稿
      const { data: tStories } = await supabase
        .from("post")
        .select("id, title, deleted_at")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      setTrashStories((tStories ?? []) as TrashStory[]);

      // ゴミ箱: ソフトデリートされたWiki
      const { data: tWikis } = await supabase
        .from("wiki_pages")
        .select("slug, title, deleted_at")
        .eq("locale", "ja")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      setTrashWikis((tWikis ?? []) as TrashWiki[]);

      // ゴミ箱: ソフトデリートされたカテゴリ
      const { data: tCats } = await supabase
        .from("story_categories")
        .select("id, name, slug, deleted_at")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      setTrashCategories((tCats ?? []) as TrashCategory[]);

      setChecking(false);
    };

    init();
  }, [locale, router]);

  const translateStory = async (postId: number) => {
    setStoryStatus((prev) => ({ ...prev, [postId]: "loading" }));
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/translate/story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ postId }),
      });
      const json = await res.json();
      if (json.alreadyTranslated) {
        setStoryStatus((prev) => ({ ...prev, [postId]: "exists" }));
      } else if (!res.ok) {
        setStoryStatus((prev) => ({ ...prev, [postId]: "error" }));
      } else {
        setStoryStatus((prev) => ({ ...prev, [postId]: "done" }));
        setStories((prev) => prev.filter((s) => s.id !== postId));
      }
    } catch {
      setStoryStatus((prev) => ({ ...prev, [postId]: "error" }));
    }
  };

  const translateWiki = async (slug: string) => {
    setWikiStatus((prev) => ({ ...prev, [slug]: "loading" }));
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/translate/wiki", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (json.alreadyTranslated) {
        setWikiStatus((prev) => ({ ...prev, [slug]: "exists" }));
      } else if (!res.ok) {
        setWikiStatus((prev) => ({ ...prev, [slug]: "error" }));
      } else {
        setWikiStatus((prev) => ({ ...prev, [slug]: "done" }));
        setWikis((prev) => prev.filter((w) => w.slug !== slug));
      }
    } catch {
      setWikiStatus((prev) => ({ ...prev, [slug]: "error" }));
    }
  };

  const approveCategory = async (categoryId: number) => {
    setApproveStatus((prev) => ({ ...prev, [categoryId]: "loading" }));
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/category/${categoryId}/approve`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setApproveStatus((prev) => ({ ...prev, [categoryId]: "done" }));
        setPendingCategories((prev) => prev.filter((c) => c.id !== categoryId));
      } else {
        setApproveStatus((prev) => ({ ...prev, [categoryId]: "error" }));
      }
    } catch {
      setApproveStatus((prev) => ({ ...prev, [categoryId]: "error" }));
    }
  };

  const approveWikiCategory = async (categoryId: number) => {
    setWikiApproveStatus((prev) => ({ ...prev, [categoryId]: "loading" }));
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/wiki-category/${categoryId}/approve`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setWikiApproveStatus((prev) => ({ ...prev, [categoryId]: "done" }));
        setPendingWikiCategories((prev) => prev.filter((c) => c.id !== categoryId));
      } else {
        setWikiApproveStatus((prev) => ({ ...prev, [categoryId]: "error" }));
      }
    } catch {
      setWikiApproveStatus((prev) => ({ ...prev, [categoryId]: "error" }));
    }
  };

  const deleteWikiCategory = async (categoryId: number) => {
    if (!window.confirm(dict.admin.deleteWikiCatConfirm)) return;
    setWikiDeleteStatus((prev) => ({ ...prev, [categoryId]: "loading" }));
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/wiki-category/${categoryId}/delete`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setWikiDeleteStatus((prev) => ({ ...prev, [categoryId]: "done" }));
        setPendingWikiCategories((prev) => prev.filter((c) => c.id !== categoryId));
      } else {
        setWikiDeleteStatus((prev) => ({ ...prev, [categoryId]: "error" }));
      }
    } catch {
      setWikiDeleteStatus((prev) => ({ ...prev, [categoryId]: "error" }));
    }
  };

  const deleteCategory = async (categoryId: number) => {
    if (!window.confirm(dict.admin.deleteCatConfirm)) return;
    setDeleteStatus((prev) => ({ ...prev, [categoryId]: "loading" }));
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/category/${categoryId}/delete`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setDeleteStatus((prev) => ({ ...prev, [categoryId]: "done" }));
        setPendingCategories((prev) => prev.filter((c) => c.id !== categoryId));
        setReportedCategories((prev) => prev.filter((c) => c.id !== categoryId));
      } else {
        setDeleteStatus((prev) => ({ ...prev, [categoryId]: "error" }));
      }
    } catch {
      setDeleteStatus((prev) => ({ ...prev, [categoryId]: "error" }));
    }
  };

  // ゴミ箱: 復元
  const restoreStory = async (postId: number) => {
    setTrashStoryStatus((prev) => ({ ...prev, [postId]: "loading" }));
    const token = await getAccessToken();
    const res = await fetch(`/api/post/${postId}/restore`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setTrashStoryStatus((prev) => ({ ...prev, [postId]: "restored" }));
      setTrashStories((prev) => prev.filter((s) => s.id !== postId));
    } else {
      setTrashStoryStatus((prev) => ({ ...prev, [postId]: "error" }));
    }
  };

  const purgeStory = async (postId: number) => {
    if (!window.confirm(dict.admin.purgeConfirm)) return;
    setTrashStoryStatus((prev) => ({ ...prev, [postId]: "loading" }));
    const token = await getAccessToken();
    const res = await fetch(`/api/post/${postId}/purge`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setTrashStoryStatus((prev) => ({ ...prev, [postId]: "purged" }));
      setTrashStories((prev) => prev.filter((s) => s.id !== postId));
    } else {
      setTrashStoryStatus((prev) => ({ ...prev, [postId]: "error" }));
    }
  };

  const restoreWiki = async (slug: string) => {
    setTrashWikiStatus((prev) => ({ ...prev, [slug]: "loading" }));
    const token = await getAccessToken();
    const res = await fetch(`/api/wiki/${slug}/restore`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setTrashWikiStatus((prev) => ({ ...prev, [slug]: "restored" }));
      setTrashWikis((prev) => prev.filter((w) => w.slug !== slug));
    } else {
      setTrashWikiStatus((prev) => ({ ...prev, [slug]: "error" }));
    }
  };

  const purgeWiki = async (slug: string) => {
    if (!window.confirm(dict.admin.purgeConfirm)) return;
    setTrashWikiStatus((prev) => ({ ...prev, [slug]: "loading" }));
    const token = await getAccessToken();
    const res = await fetch(`/api/wiki/${slug}/purge`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setTrashWikiStatus((prev) => ({ ...prev, [slug]: "purged" }));
      setTrashWikis((prev) => prev.filter((w) => w.slug !== slug));
    } else {
      setTrashWikiStatus((prev) => ({ ...prev, [slug]: "error" }));
    }
  };

  const restoreCategory = async (catId: number) => {
    setTrashCatStatus((prev) => ({ ...prev, [catId]: "loading" }));
    const token = await getAccessToken();
    const res = await fetch(`/api/category/${catId}/restore`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setTrashCatStatus((prev) => ({ ...prev, [catId]: "restored" }));
      setTrashCategories((prev) => prev.filter((c) => c.id !== catId));
    } else {
      setTrashCatStatus((prev) => ({ ...prev, [catId]: "error" }));
    }
  };

  const purgeCategory = async (catId: number) => {
    if (!window.confirm(dict.admin.purgeConfirm)) return;
    setTrashCatStatus((prev) => ({ ...prev, [catId]: "loading" }));
    const token = await getAccessToken();
    const res = await fetch(`/api/category/${catId}/purge`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setTrashCatStatus((prev) => ({ ...prev, [catId]: "purged" }));
      setTrashCategories((prev) => prev.filter((c) => c.id !== catId));
    } else {
      setTrashCatStatus((prev) => ({ ...prev, [catId]: "error" }));
    }
  };

  const daysLeft = (deletedAt: string) => {
    const diff = Date.now() - new Date(deletedAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, 3 - days);
  };

  if (checking) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>{dict.admin.authChecking}</div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <BackButton />

        <header style={headerStyle}>
          <div>
            <p style={breadcrumbStyle}>ADMIN / DASHBOARD</p>
            <h1 style={titleStyle}>{dict.admin.dashboard}</h1>
            <p style={subtitleStyle}>{dict.admin.subtitle}</p>
          </div>
          <Link href={`/${locale}`} style={topLinkStyle}>
            {dict.admin.homeLink}
          </Link>
        </header>

        {/* ストーリー翻訳 */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            {dict.admin.untranslatedStories.replace("{count}", String(stories.length))}
          </h2>
          {stories.length === 0 ? (
            <p style={emptyStyle}>{dict.admin.allTranslated}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{dict.admin.titleCol}</th>
                  <th style={thStyle}>{dict.admin.dateCol}</th>
                  <th style={thStyle}>{dict.admin.actionCol}</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => {
                  const st = storyStatus[story.id] ?? "idle";
                  return (
                    <tr key={story.id} style={trStyle}>
                      <td style={tdStyle}>
                        <Link
                          href={`/${locale}/post/${story.id}`}
                          style={linkStyle}
                        >
                          {story.title ?? `#${story.id}`}
                        </Link>
                      </td>
                      <td style={tdStyle}>
                        {story.created_at
                          ? new Date(story.created_at).toLocaleDateString(dateLocale)
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        <button
                          style={actionButtonStyle(st)}
                          disabled={st === "loading" || st === "done" || st === "exists"}
                          onClick={() => translateStory(story.id)}
                        >
                          {st === "loading"
                            ? dict.admin.translating
                            : st === "done"
                            ? dict.admin.translated
                            : st === "exists"
                            ? dict.admin.alreadyTranslated
                            : st === "error"
                            ? dict.common.retry
                            : dict.admin.translateBtn}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Wiki 翻訳 */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            {dict.admin.untranslatedWiki.replace("{count}", String(wikis.length))}
          </h2>
          {wikis.length === 0 ? (
            <p style={emptyStyle}>{dict.admin.allTranslated}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{dict.admin.titleCol}</th>
                  <th style={thStyle}>{dict.admin.updatedCol}</th>
                  <th style={thStyle}>{dict.admin.actionCol}</th>
                </tr>
              </thead>
              <tbody>
                {wikis.map((wiki) => {
                  const st = wikiStatus[wiki.slug] ?? "idle";
                  return (
                    <tr key={wiki.slug} style={trStyle}>
                      <td style={tdStyle}>
                        <Link
                          href={`/${locale}/wiki/${wiki.slug}`}
                          style={linkStyle}
                        >
                          {wiki.title}
                        </Link>
                      </td>
                      <td style={tdStyle}>
                        {wiki.updated_at
                          ? new Date(wiki.updated_at).toLocaleDateString(dateLocale)
                          : "—"}
                      </td>
                      <td style={tdStyle}>
                        <button
                          style={actionButtonStyle(st)}
                          disabled={st === "loading" || st === "done" || st === "exists"}
                          onClick={() => translateWiki(wiki.slug)}
                        >
                          {st === "loading"
                            ? dict.admin.translating
                            : st === "done"
                            ? dict.admin.translated
                            : st === "exists"
                            ? dict.admin.alreadyTranslated
                            : st === "error"
                            ? dict.common.retry
                            : dict.admin.translateBtn}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
        {/* 審査待ちカテゴリ */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            {dict.admin.pendingCats.replace("{count}", String(pendingCategories.length))}
          </h2>
          {pendingCategories.length === 0 ? (
            <p style={emptyStyle}>{dict.admin.noPending}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{dict.admin.catNameCol}</th>
                  <th style={thStyle}>{dict.admin.slugCol}</th>
                  <th style={thStyle}>{dict.admin.descCol}</th>
                  <th style={thStyle}>{dict.admin.requestDateCol}</th>
                  <th style={thStyle}>{dict.admin.actionCol}</th>
                </tr>
              </thead>
              <tbody>
                {pendingCategories.map((cat) => {
                  const st = approveStatus[cat.id] ?? "idle";
                  const dst = deleteStatus[cat.id] ?? "idle";
                  return (
                    <tr key={cat.id} style={trStyle}>
                      <td style={tdStyle}>{cat.name}</td>
                      <td style={tdStyle}>
                        <span style={{ color: "#7a6a60", fontFamily: "monospace" }}>
                          {cat.slug}
                        </span>
                      </td>
                      <td style={tdStyle}>{cat.description ?? "—"}</td>
                      <td style={tdStyle}>
                        {cat.created_at
                          ? new Date(cat.created_at).toLocaleDateString(dateLocale)
                          : "—"}
                      </td>
                      <td style={{ ...tdStyle, display: "flex", gap: 6 }}>
                        <button
                          style={actionButtonStyle(
                            st === "done" ? "done" : st === "error" ? "error" : "idle"
                          )}
                          disabled={st === "loading" || st === "done" || dst === "done"}
                          onClick={() => approveCategory(cat.id)}
                        >
                          {st === "loading"
                            ? dict.admin.processing
                            : st === "done"
                            ? dict.admin.approved
                            : st === "error"
                            ? dict.common.retry
                            : dict.admin.approveBtn}
                        </button>
                        <button
                          style={deleteButtonStyle(dst)}
                          disabled={dst === "loading" || dst === "done" || st === "done"}
                          onClick={() => deleteCategory(cat.id)}
                        >
                          {dst === "loading" ? dict.admin.deleting : dst === "done" ? dict.common.deleted : dst === "error" ? dict.common.retry : dict.admin.deleteBtn}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* 審査待ち Wiki カテゴリ */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            {dict.admin.pendingWikiCats.replace("{count}", String(pendingWikiCategories.length))}
          </h2>
          {pendingWikiCategories.length === 0 ? (
            <p style={emptyStyle}>{dict.admin.noPending}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{dict.admin.catNameCol}</th>
                  <th style={thStyle}>{dict.admin.slugCol}</th>
                  <th style={thStyle}>{dict.admin.descCol}</th>
                  <th style={thStyle}>{dict.admin.requestDateCol}</th>
                  <th style={thStyle}>{dict.admin.actionCol}</th>
                </tr>
              </thead>
              <tbody>
                {pendingWikiCategories.map((cat) => {
                  const st = wikiApproveStatus[cat.id] ?? "idle";
                  const dst = wikiDeleteStatus[cat.id] ?? "idle";
                  return (
                    <tr key={cat.id} style={trStyle}>
                      <td style={tdStyle}>{cat.name}</td>
                      <td style={tdStyle}>
                        <span style={{ color: "#7a6a60", fontFamily: "monospace" }}>
                          {cat.slug}
                        </span>
                      </td>
                      <td style={tdStyle}>{cat.description ?? "—"}</td>
                      <td style={tdStyle}>
                        {cat.created_at
                          ? new Date(cat.created_at).toLocaleDateString(dateLocale)
                          : "—"}
                      </td>
                      <td style={{ ...tdStyle, display: "flex", gap: 6 }}>
                        <button
                          style={actionButtonStyle(
                            st === "done" ? "done" : st === "error" ? "error" : "idle"
                          )}
                          disabled={st === "loading" || st === "done" || dst === "done"}
                          onClick={() => approveWikiCategory(cat.id)}
                        >
                          {st === "loading" ? dict.admin.processing : st === "done" ? dict.admin.approved : st === "error" ? dict.common.retry : dict.admin.approveBtn}
                        </button>
                        <button
                          style={deleteButtonStyle(dst)}
                          disabled={dst === "loading" || dst === "done" || st === "done"}
                          onClick={() => deleteWikiCategory(cat.id)}
                        >
                          {dst === "loading" ? dict.admin.deleting : dst === "done" ? dict.common.deleted : dst === "error" ? dict.common.retry : dict.admin.deleteBtn}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* 報告されたカテゴリ */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            {dict.admin.reportedCats.replace("{count}", String(reportedCategories.length))}
          </h2>
          {reportedCategories.length === 0 ? (
            <p style={emptyStyle}>{dict.admin.noReports}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{dict.admin.catNameCol}</th>
                  <th style={thStyle}>{dict.admin.slugCol}</th>
                  <th style={thStyle}>{dict.admin.reportCountCol}</th>
                  <th style={thStyle}>{dict.admin.actionCol}</th>
                </tr>
              </thead>
              <tbody>
                {reportedCategories.map((cat) => {
                  const dst = deleteStatus[cat.id] ?? "idle";
                  return (
                    <tr key={cat.id} style={trStyle}>
                      <td style={tdStyle}>{cat.name}</td>
                      <td style={tdStyle}>
                        <span style={{ color: "#7a6a60", fontFamily: "monospace" }}>
                          {cat.slug}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: "#e08080", fontWeight: 600 }}>
                        {cat.reported_count}
                      </td>
                      <td style={{ ...tdStyle, display: "flex", gap: 8, alignItems: "center" }}>
                        <Link
                          href={`/${locale}/post/category/${cat.slug}`}
                          style={linkStyle}
                          target="_blank"
                        >
                          {dict.admin.viewBtn}
                        </Link>
                        <button
                          style={deleteButtonStyle(dst)}
                          disabled={dst === "loading" || dst === "done"}
                          onClick={() => deleteCategory(cat.id)}
                        >
                          {dst === "loading" ? dict.admin.deleting : dst === "done" ? dict.common.deleted : dst === "error" ? dict.common.retry : dict.admin.deleteBtn}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* ゴミ箱 */}
        <section style={sectionStyle}>
          <h2 style={{ ...sectionTitleStyle, color: "#e0a0a0" }}>
            {dict.admin.trash}
          </h2>
          <p style={{ ...emptyStyle, marginBottom: 16 }}>
            {dict.admin.trashInfo}
          </p>

          {/* ゴミ箱: 投稿 */}
          {trashStories.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 12, color: "#9a8a88", marginBottom: 8, letterSpacing: "0.08em" }}>
                {dict.admin.trashStoriesSec.replace("{count}", String(trashStories.length))}
              </p>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{dict.admin.titleCol}</th>
                    <th style={thStyle}>{dict.admin.deletedDateCol}</th>
                    <th style={thStyle}>{dict.admin.remainingCol}</th>
                    <th style={thStyle}>{dict.admin.actionCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {trashStories.map((s) => {
                    const st = trashStoryStatus[s.id] ?? "idle";
                    return (
                      <tr key={s.id} style={trStyle}>
                        <td style={tdStyle}>{s.title ?? `#${s.id}`}</td>
                        <td style={tdStyle}>{new Date(s.deleted_at).toLocaleDateString(dateLocale)}</td>
                        <td style={{ ...tdStyle, color: daysLeft(s.deleted_at) === 0 ? "#e08080" : "#c8b8b0" }}>
                          {daysLeft(s.deleted_at)}{dict.admin.daysLeftUnit}
                        </td>
                        <td style={{ ...tdStyle, display: "flex", gap: 6 }}>
                          <button style={restoreButtonStyle} disabled={st !== "idle"} onClick={() => restoreStory(s.id)}>
                            {st === "loading" ? dict.admin.processing : st === "restored" ? dict.admin.restoredStatus : st === "error" ? dict.admin.errorStatus : dict.admin.restoreBtn}
                          </button>
                          <button style={purgeButtonStyle} disabled={st !== "idle"} onClick={() => purgeStory(s.id)}>
                            {st === "purged" ? dict.admin.purgedStatus : dict.admin.purgeBtn}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ゴミ箱: Wiki */}
          {trashWikis.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 12, color: "#9a8a88", marginBottom: 8, letterSpacing: "0.08em" }}>
                {dict.admin.trashWikiSec.replace("{count}", String(trashWikis.length))}
              </p>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{dict.admin.titleCol}</th>
                    <th style={thStyle}>{dict.admin.deletedDateCol}</th>
                    <th style={thStyle}>{dict.admin.remainingCol}</th>
                    <th style={thStyle}>{dict.admin.actionCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {trashWikis.map((w) => {
                    const st = trashWikiStatus[w.slug] ?? "idle";
                    return (
                      <tr key={w.slug} style={trStyle}>
                        <td style={tdStyle}>{w.title}</td>
                        <td style={tdStyle}>{new Date(w.deleted_at).toLocaleDateString(dateLocale)}</td>
                        <td style={{ ...tdStyle, color: daysLeft(w.deleted_at) === 0 ? "#e08080" : "#c8b8b0" }}>
                          {daysLeft(w.deleted_at)}{dict.admin.daysLeftUnit}
                        </td>
                        <td style={{ ...tdStyle, display: "flex", gap: 6 }}>
                          <button style={restoreButtonStyle} disabled={st !== "idle"} onClick={() => restoreWiki(w.slug)}>
                            {st === "loading" ? dict.admin.processing : st === "restored" ? dict.admin.restoredStatus : st === "error" ? dict.admin.errorStatus : dict.admin.restoreBtn}
                          </button>
                          <button style={purgeButtonStyle} disabled={st !== "idle"} onClick={() => purgeWiki(w.slug)}>
                            {st === "purged" ? dict.admin.purgedStatus : dict.admin.purgeBtn}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ゴミ箱: カテゴリ */}
          {trashCategories.length > 0 && (
            <div>
              <p style={{ fontSize: 12, color: "#9a8a88", marginBottom: 8, letterSpacing: "0.08em" }}>
                {dict.admin.trashCatSec.replace("{count}", String(trashCategories.length))}
              </p>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{dict.admin.catNameCol}</th>
                    <th style={thStyle}>{dict.admin.deletedDateCol}</th>
                    <th style={thStyle}>{dict.admin.remainingCol}</th>
                    <th style={thStyle}>{dict.admin.actionCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {trashCategories.map((c) => {
                    const st = trashCatStatus[c.id] ?? "idle";
                    return (
                      <tr key={c.id} style={trStyle}>
                        <td style={tdStyle}>{c.name}</td>
                        <td style={tdStyle}>{new Date(c.deleted_at).toLocaleDateString(dateLocale)}</td>
                        <td style={{ ...tdStyle, color: daysLeft(c.deleted_at) === 0 ? "#e08080" : "#c8b8b0" }}>
                          {daysLeft(c.deleted_at)}{dict.admin.daysLeftUnit}
                        </td>
                        <td style={{ ...tdStyle, display: "flex", gap: 6 }}>
                          <button style={restoreButtonStyle} disabled={st !== "idle"} onClick={() => restoreCategory(c.id)}>
                            {st === "loading" ? dict.admin.processing : st === "restored" ? dict.admin.restoredStatus : st === "error" ? dict.admin.errorStatus : dict.admin.restoreBtn}
                          </button>
                          <button style={purgeButtonStyle} disabled={st !== "idle"} onClick={() => purgeCategory(c.id)}>
                            {st === "purged" ? dict.admin.purgedStatus : dict.admin.purgeBtn}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {trashStories.length === 0 && trashWikis.length === 0 && trashCategories.length === 0 && (
            <p style={emptyStyle}>{dict.admin.emptyTrash}</p>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---- スタイル ---- */
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0d0808",
  color: "#c8b8b0",
  padding: "0 16px 80px",
};

const shellStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  paddingTop: 24,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  borderBottom: "1px solid rgba(180,100,110,0.25)",
  paddingBottom: 20,
  marginBottom: 32,
};

const breadcrumbStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.15em",
  color: "#7a6a60",
  marginBottom: 4,
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: "#e8d8d0",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7a6a60",
  marginTop: 4,
};

const topLinkStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#b08888",
  textDecoration: "none",
  border: "1px solid rgba(180,100,110,0.3)",
  padding: "6px 14px",
  borderRadius: 4,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 48,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#e0c8c0",
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: "1px solid rgba(180,100,110,0.15)",
};

const emptyStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7a6a60",
  fontStyle: "italic",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  color: "#7a6a60",
  fontWeight: 500,
  borderBottom: "1px solid rgba(180,100,110,0.2)",
  fontSize: 12,
  letterSpacing: "0.08em",
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(180,100,110,0.1)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
};

const linkStyle: React.CSSProperties = {
  color: "#c8a8b0",
  textDecoration: "none",
};

const actionButtonStyle = (
  st: TranslateStatus
): React.CSSProperties => ({
  padding: "5px 12px",
  fontSize: 12,
  background:
    st === "done" || st === "exists"
      ? "rgba(40, 80, 40, 0.4)"
      : st === "error"
      ? "rgba(80, 20, 20, 0.5)"
      : "rgba(40, 10, 15, 0.85)",
  border: `1px solid ${
    st === "done" || st === "exists"
      ? "rgba(80, 160, 80, 0.4)"
      : st === "error"
      ? "rgba(200, 60, 60, 0.5)"
      : "rgba(180, 100, 110, 0.4)"
  }`,
  color:
    st === "done" || st === "exists"
      ? "#80c080"
      : st === "error"
      ? "#e08080"
      : "#d4a0a8",
  cursor: st === "loading" || st === "done" || st === "exists" ? "default" : "pointer",
  borderRadius: 4,
});

const deleteButtonStyle = (st: DeleteStatus): React.CSSProperties => ({
  padding: "5px 12px",
  fontSize: 12,
  background:
    st === "done"
      ? "rgba(40, 80, 40, 0.4)"
      : st === "error"
      ? "rgba(80, 20, 20, 0.5)"
      : "rgba(80, 10, 10, 0.7)",
  border: `1px solid ${
    st === "done"
      ? "rgba(80, 160, 80, 0.4)"
      : st === "error"
      ? "rgba(200, 60, 60, 0.5)"
      : "rgba(200, 60, 60, 0.4)"
  }`,
  color: st === "done" ? "#80c080" : st === "error" ? "#e08080" : "#e09090",
  cursor: st === "loading" || st === "done" ? "default" : "pointer",
  borderRadius: 4,
});

const restoreButtonStyle: React.CSSProperties = {
  padding: "5px 12px",
  fontSize: 12,
  background: "rgba(20, 60, 30, 0.7)",
  border: "1px solid rgba(80, 160, 80, 0.4)",
  color: "#80c080",
  cursor: "pointer",
  borderRadius: 4,
};

const purgeButtonStyle: React.CSSProperties = {
  padding: "5px 12px",
  fontSize: 12,
  background: "rgba(80, 10, 10, 0.7)",
  border: "1px solid rgba(200, 60, 60, 0.4)",
  color: "#e09090",
  cursor: "pointer",
  borderRadius: 4,
};
