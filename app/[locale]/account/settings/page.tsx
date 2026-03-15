"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";

type ProfileRow = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  website_url: string | null;
  location: string | null;
  is_public: boolean | null;
};

export default function AccountSettingsPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [location, setLocation] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        window.location.href = `/${locale}/login`;
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "username, display_name, avatar_url, banner_url, bio, website_url, location, is_public"
        )
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("profile load error:", error);
      }

      const profile = (data as ProfileRow | null) ?? null;

      if (profile) {
        setUsername(profile.username ?? "");
        setDisplayName(profile.display_name ?? "");
        setAvatarUrl(profile.avatar_url ?? "");
        setBannerUrl(profile.banner_url ?? "");
        setBio(profile.bio ?? "");
        setWebsiteUrl(profile.website_url ?? "");
        setLocation(profile.location ?? "");
        setIsPublic(profile.is_public ?? true);
      }

      setLoading(false);
    };

    loadProfile();
  }, [locale]);

  const uploadImage = async (
    file: File,
    bucket: "avatars" | "banners"
  ): Promise<string | null> => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      alert("ログインが必要です。");
      window.location.href = `/${locale}/login`;
      return null;
    }

    const userId = session.user.id;
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      alert(`画像アップロードに失敗しました: ${uploadError.message}`);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadImage(file, "avatars");
      if (publicUrl) {
        setAvatarUrl(publicUrl);
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const publicUrl = await uploadImage(file, "banners");
      if (publicUrl) {
        setBannerUrl(publicUrl);
      }
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        window.location.href = `/${locale}/login`;
        return;
      }

      const payload = {
        id: session.user.id,
        username: username.trim() || null,
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        banner_url: bannerUrl.trim() || null,
        bio: bio.trim() || null,
        website_url: websiteUrl.trim() || null,
        location: location.trim() || null,
        is_public: isPublic,
      };

      const { error } = await supabase.from("profiles").upsert(payload);

      if (error) {
        alert(`保存に失敗しました: ${error.message}`);
        return;
      }

      alert("プロフィールを保存しました。");
      window.location.href = `/${locale}/account`;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.settingsPage}>
        <div className={styles.settingsShell}>読み込み中...</div>
      </main>
    );
  }

  return (
    <main className={styles.settingsPage}>
      <div className={styles.settingsShell}>
        <BackButton />
        <header className={styles.settingsHeader}>
          <div>
            <p className={styles.settingsBreadcrumb}>ACCOUNT / SETTINGS</p>
            <h1 className={styles.settingsTitle}>Profile Settings</h1>
            <p className={styles.settingsSubtitle}>
              表示名、自己紹介、画像、公開設定などを編集します
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href={`/${locale}/account`} className={styles.topLink}>
              プロフィールへ戻る
            </Link>
          </div>
        </header>

        <section className={styles.card}>
          <form className={styles.form} onSubmit={handleSave}>
            <div className={styles.previewArea}>
              <div className={styles.bannerPreviewWrap}>
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt="banner preview"
                    className={styles.bannerPreview}
                  />
                ) : (
                  <div className={styles.bannerPlaceholder}>NO BANNER</div>
                )}
              </div>

              <div className={styles.avatarPreviewRow}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar preview"
                    className={styles.avatarPreview}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>AVATAR</div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="username">ユーザー名</label>
              <input
                id="username"
                className={styles.formControl}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例: creepylab"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="displayName">表示名</label>
              <input
                id="displayName"
                className={styles.formControl}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: Creepy Lab"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="avatarFile">アバター画像アップロード</label>
              <input
                id="avatarFile"
                type="file"
                accept="image/*"
                className={styles.formControl}
                onChange={handleAvatarUpload}
              />
              <p className={styles.helpText}>
                {uploadingAvatar ? "アバターをアップロード中..." : "画像を選ぶとURLに反映されます。"}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="avatarUrl">アバター画像URL</label>
              <input
                id="avatarUrl"
                className={styles.formControl}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bannerFile">バナー画像アップロード</label>
              <input
                id="bannerFile"
                type="file"
                accept="image/*"
                className={styles.formControl}
                onChange={handleBannerUpload}
              />
              <p className={styles.helpText}>
                {uploadingBanner ? "バナーをアップロード中..." : "画像を選ぶとURLに反映されます。"}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bannerUrl">バナー画像URL</label>
              <input
                id="bannerUrl"
                className={styles.formControl}
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bio">自己紹介</label>
              <textarea
                id="bio"
                className={`${styles.formControl} ${styles.textarea}`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="プロフィール文を入力してください。"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="websiteUrl">WebサイトURL</label>
              <input
                id="websiteUrl"
                className={styles.formControl}
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="location">地域</label>
              <input
                id="location"
                className={styles.formControl}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: Tokyo"
              />
            </div>

            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                公開プロフィールにする
              </label>
            </div>

            <div className={styles.submitRow}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving || uploadingAvatar || uploadingBanner}
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}