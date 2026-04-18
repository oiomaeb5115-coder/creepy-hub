"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

type NavLabels = {
  home: string;
  stories: string;
  wiki: string;
  stream: string;
};

const ITEMS = [
  { key: "home", seg: "", en: "HOME", labelKey: "home" as const },
  { key: "stories", seg: "post", en: "STORIES", labelKey: "stories" as const },
  { key: "files", seg: "wiki", en: "FILES", labelKey: "wiki" as const },
  { key: "stream", seg: "stream", en: "STREAM", labelKey: "stream" as const },
];

export default function BottomNav({
  locale,
  labels,
}: {
  locale: string;
  labels: NavLabels;
}) {
  const pathname = usePathname() ?? "";
  const rest =
    pathname.replace(`/${locale}`, "").replace(/^\//, "").split("/")[0] ?? "";

  return (
    <nav className={styles.bottomNav} aria-label="primary">
      {ITEMS.map((it) => {
        const isActive = it.seg === rest || (it.seg === "" && rest === "");
        const href = it.seg === "" ? `/${locale}` : `/${locale}/${it.seg}`;
        return (
          <Link
            key={it.key}
            href={href}
            className={`${styles.bottomNavItem} ${
              isActive ? styles.bottomNavItemActive : ""
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={styles.bottomNavLabel}>
              <span className={styles.bottomNavLabelEn}>{it.en}</span>
              <span className={styles.bottomNavLabelJa}>
                {labels[it.labelKey]}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
