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

  // ログイン済み時はサイドバーに移行したため非表示
  if (loggedIn) {
    return null;
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
