"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getIsAdmin } from "@/lib/auth";

type AuthHeaderProps = {
  locale: string;
};

export default function AuthHeader({ locale }: AuthHeaderProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setEmail(session?.user?.email ?? null);
      if (session?.user) {
        const admin = await getIsAdmin();
        setIsAdmin(admin);
      }
      setLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(`ログアウトに失敗しました: ${error.message}`);
      return;
    }

    window.location.href = `/${locale}`;
  };

  if (loading) {
    return <div style={{ minHeight: "46px" }} />;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {email ? (
        <>
          <span style={{
            fontSize: "11px",
            color: isAdmin ? "#e8a0a0" : "#8899bb",
            letterSpacing: "0.05em",
            opacity: 0.85,
          }}>
            {isAdmin ? "adminとしてログイン" : "ログイン中"}
          </span>
          <span style={{ color: "#d9e4f5", fontSize: "14px" }}>{email}</span>
          
          <Link
            href={`/${locale}/account`}
             style={{
             minHeight: "46px",
             padding: "0 18px",
             borderRadius: "10px",
             border: "1px solid rgba(108, 132, 170, 0.32)",
             background: "rgba(28, 42, 64, 0.78)",
             color: "#eff4ff",
             fontWeight: 700,
             textDecoration: "none",
             display: "inline-flex",
             alignItems: "center",
             justifyContent: "center",
             }}
            >
             プロフィール
          </Link>

          <Link href={`/${locale}/bookmarks`}>
              保存
          </Link>


          <Link
            href={`/${locale}/post`}
            style={{
              minHeight: "46px",
              padding: "0 18px",
              borderRadius: "10px",
              border: "1px solid rgba(108, 132, 170, 0.32)",
              background: "rgba(28, 42, 64, 0.78)",
              color: "#eff4ff",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            投稿する
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              minHeight: "46px",
              padding: "0 18px",
              borderRadius: "10px",
              border: "1px solid rgba(108, 132, 170, 0.32)",
              background: "rgba(28, 42, 64, 0.78)",
              color: "#eff4ff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ログアウト
          </button>
        </>
      ) : (
        <>
          <Link
            href={`/${locale}/login`}
            style={{
              minHeight: "46px",
              padding: "0 18px",
              borderRadius: "10px",
              border: "1px solid rgba(108, 132, 170, 0.32)",
              background: "rgba(28, 42, 64, 0.78)",
              color: "#eff4ff",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ログイン
          </Link>

          


          <Link
            href={`/${locale}/register`}
            style={{
              minHeight: "46px",
              padding: "0 18px",
              borderRadius: "10px",
              border: "1px solid rgba(108, 132, 170, 0.32)",
              background: "rgba(28, 42, 64, 0.78)",
              color: "#eff4ff",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            登録
          </Link>
        </>
      )}
    </div>
  );
}