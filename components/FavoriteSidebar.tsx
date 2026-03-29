"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./FavoriteSidebar.module.css";

const STORAGE_KEY = "creepyhub_fav_categories";

type FavEntry = {
  type: "story" | "wiki";
  slug: string;
  name: string;
  locale: string;
};

type Labels = {
  title?: string;
  empty?: string;
};

type Props = {
  type: "story" | "wiki";
  locale: string;
  labels?: Labels;
  embedded?: boolean;
};

export default function FavoriteSidebar({ type, locale, labels, embedded }: Props) {
  const [favorites, setFavorites] = useState<FavEntry[]>([]);

  const t = {
    title: labels?.title ?? "お気に入り",
    empty: labels?.empty ?? "なし",
  };

  useEffect(() => {
    const load = () => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as FavEntry[];
      setFavorites(saved.filter((e) => e.type === type && e.locale === locale));
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [type, locale]);

  const basePath = type === "story"
    ? `/${locale}/post/category`
    : `/${locale}/wiki/category`;

  const Wrapper = embedded ? "div" : "aside";

  return (
    <Wrapper className={embedded ? undefined : styles.sidebar}>
      <p className={styles.title}>
        <span className={styles.titleStar}>★</span>
        {t.title}
      </p>
      {favorites.length === 0 ? (
        <p className={styles.empty}>{t.empty}</p>
      ) : (
        <ul className={styles.list}>
          {favorites.map((fav) => (
            <li key={fav.slug} className={styles.item}>
              <Link href={`${basePath}/${fav.slug}`} className={styles.link}>
                {fav.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Wrapper>
  );
}
