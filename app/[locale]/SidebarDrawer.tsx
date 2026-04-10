"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import FavoriteSidebar from "@/components/FavoriteSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./sidebar-drawer.module.css";

type UserInfo = {
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
} | null;

type Labels = {
  profile: string;
  settings: string;
  notifications: string;
  admin: string;
  logout: string;
  loginPrompt: string;
  login: string;
  register: string;
  favPost: string;
  favWiki: string;
};

type Props = {
  locale: string;
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo;
  isAdmin: boolean;
  notificationCount: number;
  labels: Labels;
};

export default function SidebarDrawer({
  locale,
  isOpen,
  onClose,
  user,
  isAdmin,
  notificationCount,
  labels,
}: Props) {
  const pathname = usePathname();

  // Escape で閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  };

  const profileHref = user?.username
    ? `/${locale}/u/${user.username}`
    : `/${locale}/account/settings`;

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <ThemeToggle />
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {user ? (
          <>
            {/* ユーザー情報 */}
            <div className={styles.userSection}>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className={styles.userAvatar}
                />
              ) : (
                <div className={styles.userAvatarPlaceholder}>
                  {(user.display_name || user.username || "?")[0]}
                </div>
              )}
              <p className={styles.userDisplayName}>
                {user.display_name || user.username || "Anonymous"}
              </p>
              {user.username && (
                <p className={styles.userUsername}>@{user.username}</p>
              )}
            </div>

            {/* メニュー */}
            <nav className={styles.menuList}>
              <Link
                href={profileHref}
                className={styles.menuItem}
                onClick={onClose}
              >
                <span className={styles.menuLabel}>{labels.profile}</span>
              </Link>

              <Link
                href={`/${locale}/notifications`}
                className={styles.menuItem}
                onClick={onClose}
              >
                <span className={styles.menuLabel}>{labels.notifications}</span>
                {notificationCount > 0 && (
                  <span className={styles.menuBadge}>
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </Link>

              <Link
                href={`/${locale}/account/settings`}
                className={styles.menuItem}
                onClick={onClose}
              >
                <span className={styles.menuLabel}>{labels.settings}</span>
              </Link>

              {isAdmin && (
                <>
                  <div className={styles.menuDivider} />
                  <Link
                    href={`/${locale}/admin`}
                    className={styles.menuItem}
                    onClick={onClose}
                  >
                    <span className={styles.menuLabel}>{labels.admin}</span>
                  </Link>
                </>
              )}
            </nav>

            {/* お気に入りカテゴリー */}
            <div className={styles.favSection}>
              <FavoriteSidebar
                type="story"
                locale={locale}
                labels={{ title: labels.favPost }}
                embedded
                onClose={onClose}
              />
            </div>
            <div className={styles.favSection}>
              <FavoriteSidebar
                type="wiki"
                locale={locale}
                labels={{ title: labels.favWiki }}
                embedded
                onClose={onClose}
              />
            </div>

            {/* ログアウト */}
            <div className={styles.drawerFooter}>
              <button
                className={styles.logoutBtn}
                onClick={handleLogout}
                type="button"
              >
                {labels.logout}
              </button>
            </div>
          </>
        ) : (
          /* 未ログイン */
          <div className={styles.guestSection}>
            <p className={styles.guestPrompt}>{labels.loginPrompt}</p>
            <div className={styles.guestActions}>
              <Link
                href={`${pathname}?modal=login`}
                className={`${styles.guestBtn} ${styles.guestBtnLogin}`}
                onClick={onClose}
              >
                {labels.login}
              </Link>
              <Link
                href={`${pathname}?modal=register`}
                className={`${styles.guestBtn} ${styles.guestBtnRegister}`}
                onClick={onClose}
              >
                {labels.register}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
