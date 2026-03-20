"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";
import styles from "./post-drawer.module.css";

type Labels = {
  loginRequired: string;
  loginLink: string;
  checkingAuth: string;
  postedAs: string;
  draftNotice: string;
  draftRestored: string;
  deleteDraft: string;
  saveDraft: string;
  draftSaved: string;
  genre: string;
  selectGenre: string;
  titleLabel: string;
  tagsLabel: string;
  image1: string;
  image2: string;
  image3: string;
  bodyLabel: string;
  posting: string;
  publish: string;
  alertTitleRequired: string;
  alertBodyRequired: string;
  alertSessionExpired: string;
  alertImageFailed: string;
  alertPostFailed: string;
};

type Props = { locale: string; labels: Labels };

export default function PostDrawer({ locale, labels }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string; name_en: string | null }[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [mainImage1, setMainImage1] = useState<File | null>(null);
  const [mainImage2, setMainImage2] = useState<File | null>(null);
  const [mainImage3, setMainImage3] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!userId) return;
    const raw = localStorage.getItem(`draft_post_${userId}`);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.title) setTitle(draft.title);
      if (draft.body) setBody(draft.body);
      if (draft.tags) setTags(draft.tags);
      if (draft.categoryId) setCategoryId(draft.categoryId);
      setDraftRestored(true);
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(`draft_post_${userId}`, JSON.stringify({ categoryId, title, tags, body }));
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [userId, categoryId, title, tags, body]);

  const deleteDraft = () => {
    if (!userId) return;
    localStorage.removeItem(`draft_post_${userId}`);
    setDraftRestored(false);
    setCategoryId(""); setTitle(""); setTags(""); setBody("");
  };

  const saveDraftManually = () => {
    if (!userId) return;
    localStorage.setItem(`draft_post_${userId}`, JSON.stringify({ categoryId, title, tags, body }));
    setIsSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setIsSaved(false), 2000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });

    supabase
      .from("story_categories")
      .select("id, name, name_en")
      .eq("is_active", true)
      .or("is_user_created.eq.false,approved.eq.true")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setCategories(data as { id: number; name: string; name_en: string | null }[]);
      });
  }, []);

  const uploadImage = async (
    file: File | null,
    userId: string,
    suffix: string
  ): Promise<string | null> => {
    if (!file) return null;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE = 5 * 1024 * 1024;
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("画像ファイル（JPEG / PNG / WebP / GIF）のみアップロード可能です");
    }
    if (file.size > MAX_SIZE) {
      throw new Error("ファイルサイズは5MB以内にしてください");
    }
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${userId}/${Date.now()}-${suffix}.${fileExt}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert(labels.alertTitleRequired); return; }
    if (!body.trim()) { alert(labels.alertBodyRequired); return; }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) { alert(labels.alertSessionExpired); return; }

      const [imageUrl1, imageUrl2, imageUrl3] = await Promise.all([
        uploadImage(mainImage1, user.id, "1"),
        uploadImage(mainImage2, user.id, "2"),
        uploadImage(mainImage3, user.id, "3"),
      ]).catch((err) => {
        alert(`${labels.alertImageFailed}${err.message}`);
        throw err;
      });

      const { data, error } = await supabase
        .from("post")
        .insert([{
          title: title.trim(),
          content: body.trim(),
          user_id: user.id,
          category_id: categoryId ? Number(categoryId) : null,
          view_count: 0,
          is_published: true,
          image_url: imageUrl1,
          image_url_2: imageUrl2,
          image_url_3: imageUrl3,
        }])
        .select()
        .single();

      if (error) { alert(`${labels.alertPostFailed}${error.message}`); return; }

      // EN locale で投稿した場合、post_translations に EN 翻訳行を作成
      // → EN版ストーリー一覧（post_translations!inner 結合）に表示されるようになる
      if (locale === "en" && data) {
        await supabase.from("post_translations").insert([{
          post_id: data.id,
          locale: "en",
          title: title.trim(),
          content: body.trim(),
        }]);
      }

      if (userId) localStorage.removeItem(`draft_post_${userId}`);
      setTitle(""); setBody(""); setTags(""); setCategoryId("");
      setMainImage1(null); setMainImage2(null); setMainImage3(null);
      setDraftRestored(false);
      setIsOpen(false);
      window.location.href = `/${locale}/post/${data.id}`;
    } catch {
      // already alerted
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        className={styles.floatingButton}
        onClick={() => setIsOpen(true)}
        aria-label={labels.publish}
      >
        <Image src="/images/ui/post.png" alt="POST" width={68} height={68} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </button>

      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={() => setIsOpen(false)}
      />

      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <p className={styles.drawerTitle}>NEW POST ENTRY</p>
          <button className={styles.closeButton} onClick={() => setIsOpen(false)} aria-label="close">
            ✕
          </button>
        </div>

        <div className={styles.drawerBody}>
          {!authChecked ? (
            <div className={styles.loginPrompt}>{labels.checkingAuth}</div>
          ) : !isLoggedIn ? (
            <div className={styles.loginPrompt}>
              <p>{labels.loginRequired}</p>
              <Link href={`?modal=login`} className={styles.loginPromptLink}>
                {labels.loginLink}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className={styles.loginStatus}>{labels.postedAs}</p>

              <div className={styles.draftNotice}>{labels.draftNotice}</div>

              <div className={styles.formGroup}>
                <label htmlFor="drawer-category">{labels.genre}</label>
                <select id="drawer-category" className={styles.formControl} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">{labels.selectGenre}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {locale.startsWith("en") ? (cat.name_en ?? cat.name) : cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="drawer-title">{labels.titleLabel}</label>
                <input id="drawer-title" type="text" className={styles.formControl} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="drawer-tags">{labels.tagsLabel}</label>
                <input id="drawer-tags" type="text" className={styles.formControl} placeholder="Backrooms, ARG, Liminal Space" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="drawer-image1">{labels.image1}</label>
                <input id="drawer-image1" type="file" className={`${styles.formControl} ${styles.fileInput}`} accept="image/*" onChange={(e) => setMainImage1(e.target.files?.[0] ?? null)} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="drawer-image2">{labels.image2}</label>
                <input id="drawer-image2" type="file" className={`${styles.formControl} ${styles.fileInput}`} accept="image/*" onChange={(e) => setMainImage2(e.target.files?.[0] ?? null)} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="drawer-image3">{labels.image3}</label>
                <input id="drawer-image3" type="file" className={`${styles.formControl} ${styles.fileInput}`} accept="image/*" onChange={(e) => setMainImage3(e.target.files?.[0] ?? null)} />
              </div>

              <div className={styles.divider} />

              <div className={styles.formGroup}>
                <label htmlFor="drawer-body">{labels.bodyLabel}</label>
                <textarea id="drawer-body" className={`${styles.formControl} ${styles.bodyTextarea}`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="..." />
              </div>

              <div className={styles.submitRow}>
                <button type="button" className={styles.saveDraftButton} onClick={saveDraftManually} disabled={isSubmitting}>
                  {isSaved ? labels.draftSaved : labels.saveDraft}
                </button>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? labels.posting : labels.publish}
                </button>
              </div>

              {draftRestored && (
                <div className={styles.draftRestoredRow}>
                  <span className={styles.draftRestoredMsg}>{labels.draftRestored}</span>
                  <button type="button" className={styles.draftDeleteBtn} onClick={deleteDraft}>
                    {labels.deleteDraft}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
