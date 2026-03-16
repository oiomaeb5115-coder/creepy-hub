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
            <Link href={`/${locale}/admin`} className={styles.topLink} style={{ color: "#e8a0a0" }}>
              管理画面
            </Link>
            <Link href={`/${locale}/account/settings`} className={styles.topLink}>
                編集
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
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? "avatar"}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>AVATAR</div>
            )}

            <div className={styles.profileBody}>
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}