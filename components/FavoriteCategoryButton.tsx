"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "creepyhub_fav_categories";

type FavEntry = {
  type: "story" | "wiki";
  slug: string;
  name: string;
  locale: string;
};

type Labels = {
  unfavorite?: string;
  favoriteAdd?: string;
  favorite?: string;
  unfavorited?: string;
};

type Props = {
  type: "story" | "wiki";
  slug: string;
  name: string;
  locale: string;
  labels?: Labels;
};

export default function FavoriteCategoryButton({ type, slug, name, locale, labels }: Props) {
  const [favorited, setFavorited] = useState(false);

  const t = {
    unfavorite: labels?.unfavorite ?? "お気に入り解除",
    favoriteAdd: labels?.favoriteAdd ?? "お気に入りに追加",
    favorite: labels?.favorite ?? "お気に入り",
    unfavorited: labels?.unfavorited ?? "お気に入り中",
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as FavEntry[];
    setFavorited(saved.some((e) => e.type === type && e.slug === slug && e.locale === locale));
  }, [type, slug, locale]);

  function toggle() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as FavEntry[];
    if (favorited) {
      const updated = saved.filter(
        (e) => !(e.type === type && e.slug === slug && e.locale === locale)
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setFavorited(false);
    } else {
      saved.push({ type, slug, name, locale });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setFavorited(true);
    }
  }

  return (
    <button
      onClick={toggle}
      title={favorited ? t.unfavorite : t.favoriteAdd}
      aria-label={favorited ? t.unfavorite : t.favoriteAdd}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "0 14px",
        minHeight: "40px",
        border: favorited
          ? "1px solid rgba(224, 160, 60, 0.5)"
          : "1px solid rgba(161, 102, 108, 0.32)",
        background: favorited ? "rgba(224, 160, 60, 0.12)" : "rgba(48, 18, 22, 0.78)",
        color: favorited ? "#e0a03c" : "#f5f1eb",
        fontFamily: '"装甲明朝", "Soukou Mincho", serif',
        fontWeight: 700,
        fontSize: "13px",
        letterSpacing: "0.06em",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: "14px" }}>{favorited ? "★" : "☆"}</span>
      {favorited ? t.unfavorited : t.favorite}
    </button>
  );
}
