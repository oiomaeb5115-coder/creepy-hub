"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin } from "@/lib/auth";
import styles from "./page.module.css";

type Props = {
  locale: string;
};

export default function HomeAuthButtons({ locale }: Props) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setLoggedIn(!!session);
      if (session) {
        const admin = await getIsAdmin();
        setIsAdmin(admin);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      if (!session) setIsAdmin(false);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  };

  if (loading) return <div style={{ minHeight: "36px" }} />;

  if (loggedIn) {
    return (
      <>
        <span style={{
          fontSize: "11px",
          color: isAdmin ? "#e8a0a0" : "#8899bb",
          letterSpacing: "0.05em",
          opacity: 0.85,
        }}>
          {isAdmin ? "adminとしてログイン" : "ログイン中"}
        </span>
        {isAdmin && (
          <Link
            href={`/${locale}/admin`}
            className={styles.topTextButton}
            style={{ color: "#e8a0a0" }}
          >
            管理画面
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={styles.topTextButton}
        >
          logout
        </button>
      </>
    );
  }

  return (
    <>
      <Link href={`${pathname}?modal=login`} className={styles.topTextButton}>
        login
      </Link>
      <Link href={`${pathname}?modal=register`} className={styles.topTextButton}>
        register
      </Link>
    </>
  );
}
