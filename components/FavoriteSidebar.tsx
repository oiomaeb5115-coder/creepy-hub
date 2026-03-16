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

type Props = {
  type: "story" | "wiki";
  locale: string;
};

export default function FavoriteSidebar({ type, locale }: Props) {
  const [favorites, setFavorites] = useState<FavEntry[]>([]);

  useEffect(() => {
    const load = () => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as FavEntry[];
      setFavorites(saved.filter((e) => e.type === type && e.locale === locale));
    };
    load();
    // ページ内の他タブでお気に入りが変わったとき同期
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [type, locale]);

  const basePath = type === "story"
    ? `/${locale}/story/category`
    : `/${locale}/wiki/category`;

  return (
    <aside className={styles.sidebar}>
      <p className={styles.title}>
        <span className={styles.titleStar}>★</span>
        お気に入り
      </p>
      {favorites.length === 0 ? (
        <p className={styles.empty}>なし</p>
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
    </aside>
  );
}
