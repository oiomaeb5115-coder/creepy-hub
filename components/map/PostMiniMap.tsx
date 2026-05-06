"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { renderSpotPin } from "@/lib/mapPins";
import type { SpotCategory } from "@/lib/mapPalettes";
import styles from "./PostMiniMap.module.css";

interface Props {
  lat: number;
  lng: number;
  mapCategory: SpotCategory;
  locationName: string | null;
  /** 全画面マップへのリンク先 (/[locale]/map?focus=...) */
  mapHref: string;
  /** ロケール依存ラベル（例: "地図全体を表示" / "Open full map"） */
  openLabel?: string;
}

type MapTheme = "dark" | "light";

function getMapTheme(): MapTheme {
  if (typeof document === "undefined") return "dark";
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" ? "light" : "dark";
}

function makeCartoStyle(theme: MapTheme) {
  const base = theme === "light" ? "light_all" : "dark_all";
  const suffix =
    typeof window !== "undefined" && window.innerWidth < 768 ? "" : "@2x";
  return {
    version: 8 as const,
    sources: {
      cartoBase: {
        type: "raster" as const,
        tiles: [
          `https://a.basemaps.cartocdn.com/${base}/{z}/{x}/{y}${suffix}.png`,
          `https://b.basemaps.cartocdn.com/${base}/{z}/{x}/{y}${suffix}.png`,
          `https://c.basemaps.cartocdn.com/${base}/{z}/{x}/{y}${suffix}.png`,
          `https://d.basemaps.cartocdn.com/${base}/{z}/{x}/{y}${suffix}.png`,
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap © CARTO",
      },
    },
    layers: [{ id: "base", type: "raster" as const, source: "cartoBase" }],
  };
}

/**
 * 投稿詳細ページ内で表示するミニマップ。
 * - 単一ピンを表示、ドラッグ/ズームは無効（静的ビュー）
 * - 「地図全体を表示 →」ボタンで /[locale]/map へ遷移
 */
export default function PostMiniMap({
  lat,
  lng,
  mapCategory,
  locationName,
  mapHref,
  openLabel = "地図全体を表示 →",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const theme = getMapTheme();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeCartoStyle(theme),
      center: [lng, lat],
      zoom: 14,
      interactive: false, // ミニマップはドラッグ/ズーム無効
      attributionControl: { compact: true },
      maxTileCacheSize: 30,
    });
    mapRef.current = map;

    map.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.error("[PostMiniMap error]", e?.error?.message ?? e);
    });

    // ピンを追加
    map.once("load", () => {
      const el = document.createElement("div");
      el.innerHTML = renderSpotPin(mapCategory, 38);
      markerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map);
      requestAnimationFrame(() => map.resize());
    });

    const resizeTimer = setTimeout(() => map.resize(), 500);

    // テーマ切替対応
    let currentTheme: MapTheme = theme;
    const themeObserver = new MutationObserver(() => {
      const next = getMapTheme();
      if (next === currentTheme) return;
      currentTheme = next;
      try {
        map.setStyle(makeCartoStyle(next));
      } catch (_) { /* noop */ }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      clearTimeout(resizeTimer);
      themeObserver.disconnect();
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
     
  }, []);

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.canvas} />
      {locationName && (
        <div className={styles.locationBadge}>
          <span className={styles.pinIcon}>📍</span>
          {locationName}
        </div>
      )}
      <Link href={mapHref} className={styles.openBtn}>
        {openLabel}
      </Link>
    </div>
  );
}
