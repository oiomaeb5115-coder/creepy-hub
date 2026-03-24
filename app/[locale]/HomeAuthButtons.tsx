"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  };

  if (loading) return <div style={{ minHeight: "36px" }} />;

  if (loggedIn) {
    return (
      <div ref={menuRef} className={styles.userMenuWrapper}>
        <button
          type="button"
          className={`${styles.topTextButton} ${styles.userMenuButton}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        >
          {isAdmin ? "ADMIN" : "MENU"} ▾
        </button>

        {menuOpen && (
          <div className={styles.userDropdown}>
            <span className={styles.userDropdownStatus}>
              {isAdmin ? "adminとしてログイン" : "ログイン中"}
            </span>
            {isAdmin && (
              <Link
                href={`/${locale}/admin`}
                className={styles.userDropdownItem}
                style={{ color: "#e8a0a0" }}
                onClick={() => setMenuOpen(false)}
              >
                管理画面
              </Link>
            )}
            <button
              type="button"
              className={styles.userDropdownItem}
              onClick={handleLogout}
            >
              logout
            </button>
          </div>
        )}
      </div>
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
