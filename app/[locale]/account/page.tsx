"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin } from "@/lib/auth";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  website_url: string | null;
  location: string | null;
  is_public: boolean | null;
};

export default function AccountPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // インライン編集用
  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadAccount = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        window.location.href = `/${locale}/login`;
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, banner_url, bio, website_url, location, is_public"
        )
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("profile fetch error:", profileError);
      }

      const adminFlag = await getIsAdmin();
      setIsAdmin(adminFlag);
      setProfile((profileData as ProfileRow | null) ?? null);
      setLoading(false);
    };

    loadAccount();
  }, [locale]);

  const openEdit = () => {
    setEditDisplayName(profile?.display_name ?? "");
    setEditAvatarUrl(profile?.avatar_url ?? "");
    setEditBannerUrl(profile?.banner_url ?? "");
    setEditBio(profile?.bio ?? "");
    setEditing(true);
  };

  const uploadImage = async (file: File, bucket: "avatars" | "banners"): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: "3600", upsert: true });
    if (uploadError) {
      alert(`画像アップロードに失敗しました: ${uploadError.message}`);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, "avatars");
      if (url) setEditAvatarUrl(url);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadImage(file, "banners");
      if (url) setEditBannerUrl(url);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editDisplayName.trim() || null,
          avatar_url: editAvatarUrl.trim() || null,
          banner_url: editBannerUrl.trim() || null,
          bio: editBio.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        alert(`保存に失敗しました: ${error.message}`);
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              display_name: editDisplayName.trim() || null,
              avatar_url: editAvatarUrl.trim() || null,
              banner_url: editBannerUrl.trim() || null,
              bio: editBio.trim() || null,
            }
          : prev
      );
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.accountPage}>
        <div className={styles.accountShell}>読み込み中...</div>
      </main>
    );
  }

  return (
    <main className={styles.accountPage}>
      <div className={styles.accountShell}>
        <BackButton />
        <header className={styles.accountHeader}>
          <div>
            <p className={styles.accountBreadcrumb}>ACCOUNT / PROFILE</p>
            <h1 className={styles.accountTitle}>My Profile</h1>
            <p className={styles.accountSubtitle}>
              登録ユーザーのプロフィールページです
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href={`/${locale}`} className={styles.topLink}>
              ホーム
            </Link>
            {isAdmin && (
              <Link href={`/${locale}/admin`} className={styles.topLink} style={{ color: "#e8a0a0" }}>
                管理画面
              </Link>
            )}
            <Link href={`/${locale}/bookmark`} className={styles.topLink}>
              保存済み
            </Link>
            <Link href={`/${locale}/account/settings`} className={styles.topLink}>
              プロフィール編集
            </Link>
            {profile?.username && (
              <Link href={`/${locale}/u/${profile.username}`} className={styles.topLink}>
                公開ページ
              </Link>
            )}
          </div>
        </header>

        <section className={styles.profileCard}>
          {profile?.banner_url ? (
            <img
              src={profile.banner_url}
              alt="banner"
              className={styles.banner}
            />
          ) : (
            <div className={styles.bannerPlaceholder}>NO BANNER</div>
          )}

          <div className={styles.profileMain}>
            {/* アバター */}
            <div className={styles.avatarCol}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? "avatar"}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>AVATAR</div>
              )}
              {!editing && (
                <button className={styles.editBtn} onClick={openEdit}>
                  編集
                </button>
              )}
            </div>

            <div className={styles.profileBody}>
              {editing ? (
                /* ── インライン編集フォーム ── */
                <div className={styles.inlineEdit}>
                  <div className={styles.inlineGroup}>
                    <label className={styles.inlineLabel}>表示名</label>
                    <input
                      className={styles.inlineInput}
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="表示名"
                    />
                  </div>

                  <div className={styles.inlineGroup}>
                    <label className={styles.inlineLabel}>アバター画像をアップロード</label>
                    <input
                      type="file"
                      accept="image/*"
                      className={styles.inlineInput}
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                    {uploadingAvatar && (
                      <p className={styles.inlineHint}>アップロード中...</p>
                    )}
                  </div>

                  <div className={styles.inlineGroup}>
                    <label className={styles.inlineLabel}>アバター画像URL</label>
                    <input
                      className={styles.inlineInput}
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  {editAvatarUrl && (
                    <img
                      src={editAvatarUrl}
                      alt="avatar preview"
                      className={styles.avatarPreview}
                    />
                  )}

                  <div className={styles.inlineGroup}>
                    <label className={styles.inlineLabel}>ヘッダー画像をアップロード</label>
                    <input
                      type="file"
                      accept="image/*"
                      className={styles.inlineInput}
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                    />
                    {uploadingBanner && (
                      <p className={styles.inlineHint}>アップロード中...</p>
                    )}
                  </div>

                  <div className={styles.inlineGroup}>
                    <label className={styles.inlineLabel}>ヘッダー画像URL</label>
                    <input
                      className={styles.inlineInput}
                      value={editBannerUrl}
                      onChange={(e) => setEditBannerUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  {editBannerUrl && (
                    <img
                      src={editBannerUrl}
                      alt="banner preview"
                      className={styles.bannerPreviewInline}
                    />
                  )}

                  <div className={styles.inlineGroup}>
                    <label className={styles.inlineLabel}>自己紹介</label>
                    <textarea
                      className={`${styles.inlineInput} ${styles.inlineTextarea}`}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="プロフィール文を入力してください。"
                      rows={4}
                    />
                  </div>

                  <div className={styles.inlineActions}>
                    <button
                      className={styles.saveBtn}
                      onClick={handleSave}
                      disabled={saving || uploadingAvatar || uploadingBanner}
                    >
                      {saving ? "保存中..." : "保存する"}
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => setEditing(false)}
                      disabled={saving}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                /* ── 表示モード ── */
                <>
                  <h2 className={styles.displayName}>
                    {profile?.display_name ?? "未設定"}
                  </h2>

                  <p className={styles.username}>
                    @{profile?.username ?? "username"}
                  </p>

                  <div className={styles.metaRow}>
                    {profile?.location && (
                      <span className={styles.badge}>{profile.location}</span>
                    )}
                    <span className={styles.badge}>
                      {profile?.is_public ? "公開プロフィール" : "非公開プロフィール"}
                    </span>
                  </div>

                  <p className={styles.bio}>
                    {profile?.bio ?? "自己紹介はまだ設定されていません。"}
                  </p>

                  {profile?.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.website}
                    >
                      {profile.website_url}
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}