"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";
import styles from "./layout.module.css";

type Props = { locale: string };

export default function BottomNavProfileLink({ locale }: Props) {
  const [href, setHref] = useState(`/${locale}/account/settings`);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;

      // Resolve profile link
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();
      const username = (data as { username: string | null } | null)?.username;
      const profileHref = username ? `/${locale}/u/${username}` : `/${locale}/account/settings`;

      // Get notification + pending category count
      try {
        const token = await getAccessToken();
        if (token) {
          const res = await fetch("/api/notifications/count", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            const total = (json.unread ?? 0) + (json.pendingCategories ?? 0);
            setBadgeCount(total);
            // With unread notifications, link to notifications page
            setHref(total > 0 ? `/${locale}/notifications` : profileHref);
            return;
          }
        }
      } catch {
        // ignore, fall through
      }

      setHref(profileHref);
    });
  }, [locale]);

  return (
    <Link href={href} className={styles.bottomNavItem}>
      <span className={styles.bottomNavLabel} style={{ position: "relative" }}>
        {badgeCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-10px",
              right: "-16px",
              minWidth: "18px",
              height: "18px",
              borderRadius: "9px",
              background: "#e53e3e",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              lineHeight: 1,
              pointerEvents: "none",
            }}
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
        <span className={styles.bottomNavLabelEn}>PROFILE</span>
        <span className={styles.bottomNavLabelJa}>プロフィール</span>
      </span>
    </Link>
  );
}
