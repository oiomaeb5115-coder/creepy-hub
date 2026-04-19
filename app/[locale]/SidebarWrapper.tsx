"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAccessToken, getIsAdmin } from "@/lib/auth";
import UserAvatarButton from "./UserAvatarButton";
import SidebarDrawer from "./SidebarDrawer";

type UserInfo = {
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
};

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
  labels: Labels;
};

export default function SidebarWrapper({ locale, labels }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);

  // スワイプ検知用
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // ── ユーザーデータ取得 ──
  const fetchUserData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUser(null);
      setLoggedIn(false);
      setIsAdmin(false);
      setBadgeCount(0);
      return;
    }

    setLoggedIn(true);

    // プロフィール取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setUser(profile as UserInfo);
    }

    // Admin チェック
    const admin = await getIsAdmin();
    setIsAdmin(admin);

    // 通知カウント取得
    try {
      const token = await getAccessToken();
      if (token) {
        const res = await fetch("/api/notifications/count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setBadgeCount((json.unread ?? 0) + (json.pendingCategories ?? 0));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  // ── モバイル左端スワイプで開く ──
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // 左端25px以内でのタッチ開始のみ検知
      if (touch.clientX < 25 && !isOpen) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      } else {
        touchStartRef.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      // 水平移動60px以上 & 垂直移動より水平移動が大きい場合
      if (deltaX > 60 && deltaX > deltaY) {
        setIsOpen(true);
      }
      touchStartRef.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isOpen]);

  return (
    <>
      <UserAvatarButton
        avatarUrl={loggedIn ? user?.avatar_url ?? null : null}
        badgeCount={badgeCount}
        onClick={open}
      />
      {/* ノベルアイコン: Web/iOS/Android 問わず常時表示（無料ノベルは全員公開）。
          ios判定は残してあるが使用していない（将来、アプリ内でのみ表示したい機能追加時に利用）。 */}
      <Link
        href={`/${locale}/novel`}
        style={{
          position: "fixed",
          top: 114,
          left: 14,
          zIndex: 100,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2px solid rgba(var(--accent-rgb), 0.4)",
          background: "var(--bg-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          color: "var(--accent, #c62828)",
          fontSize: 18,
          transition: "border-color 0.2s, box-shadow 0.2s",
          pointerEvents: "auto",
        }}
        aria-label="Horror Novel"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </Link>
      {/* 地図アイコンは MapShortcutIcon として layout で独立マウント */}
      <SidebarDrawer
        locale={locale}
        isOpen={isOpen}
        onClose={close}
        user={loggedIn ? user : null}
        isAdmin={isAdmin}
        notificationCount={badgeCount}
        labels={labels}
      />
    </>
  );
}
