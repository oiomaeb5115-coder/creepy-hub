"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type Props = { locale: string };

export default function BottomNavProfileLink({ locale }: Props) {
  const [href, setHref] = useState(`/${locale}/account`);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();
      const username = (data as { username: string | null } | null)?.username;
      if (username) {
        setHref(`/${locale}/u/${username}`);
      }
    });
  }, [locale]);

  return (
    <Link href={href} className={styles.bottomNavItem}>
      <span className={styles.bottomNavLabel}>
        <span className={styles.bottomNavLabelEn}>PROFILE</span>
        <span className={styles.bottomNavLabelJa}>プロフィール</span>
      </span>
    </Link>
  );
}
