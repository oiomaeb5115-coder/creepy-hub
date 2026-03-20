"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import BackButton from "@/components/BackButton";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

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
  const dict = locale === "en" ? en : ja;

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
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE = 5 * 1024 * 1024;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("画像ファイル（JPEG / PNG / WebP / GIF）のみアップロード可能です");
      return null;
    }
    if (file.size > MAX_SIZE) {
      alert("ファイルサイズは5MB以内にしてください");
      return null;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      alert(dict.common.loginRequired);
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
      alert(`${dict.account.imageFailed}${uploadError.message}`);
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
        alert(`${dict.account.profileFailed}${error.message}`);
        return;
      }

      alert(dict.account.profileSaved);
      window.location.href = `/${locale}/account`;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.settingsPage}>
        <div className={styles.settingsShell}>{dict.common.loading}</div>
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
              {dict.account.settingsSubtitle}
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href={`/${locale}/account`} className={styles.topLink}>
              {dict.account.backToProfile}
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
              <label htmlFor="username">{dict.account.usernameLabel}</label>
              <input
                id="username"
                className={styles.formControl}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例: creepylab"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="displayName">{dict.account.displayNameLabel}</label>
              <input
                id="displayName"
                className={styles.formControl}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: Creepy Lab"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="avatarFile">{dict.account.uploadAvatar}</label>
              <input
                id="avatarFile"
                type="file"
                accept="image/*"
                className={styles.formControl}
                onChange={handleAvatarUpload}
              />
              <p className={styles.helpText}>
                {uploadingAvatar ? dict.account.uploading : dict.account.uploadHint}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="avatarUrl">{dict.account.avatarUrlLabel}</label>
              <input
                id="avatarUrl"
                className={styles.formControl}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bannerFile">{dict.account.uploadBanner}</label>
              <input
                id="bannerFile"
                type="file"
                accept="image/*"
                className={styles.formControl}
                onChange={handleBannerUpload}
              />
              <p className={styles.helpText}>
                {uploadingBanner ? dict.account.uploading : dict.account.uploadHint}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bannerUrl">{dict.account.bannerUrlLabel}</label>
              <input
                id="bannerUrl"
                className={styles.formControl}
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bio">{dict.account.bioInputLabel}</label>
              <textarea
                id="bio"
                className={`${styles.formControl} ${styles.textarea}`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={dict.account.bioInputLabel}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="websiteUrl">{dict.account.websiteLabel}</label>
              <input
                id="websiteUrl"
                className={styles.formControl}
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="location">{dict.account.locationLabel}</label>
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
                {dict.account.makePublic}
              </label>
            </div>

            <div className={styles.submitRow}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving || uploadingAvatar || uploadingBanner}
              >
                {saving ? dict.account.saving : dict.account.saveButton}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}