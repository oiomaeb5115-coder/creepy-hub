"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { renderSpotPin } from "@/lib/mapPins";
import type { SpotCategory } from "@/lib/mapPalettes";

export interface SpotDatum {
  id: string;
  name: string;
  category: SpotCategory;
  lat: number;
  lng: number;
  prefecture: string;
  description: string;
  tags?: string[];
}

export interface PostDatum {
  id: number;
  title: string;
  slug: string | null;
  content: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  lat: number;
  lng: number;
  location_name: string | null;
  location_precision: "exact" | "town" | "prefecture" | null;
  /** ユーザーが投稿時に選んだピン種別。未選択の旧投稿は null。地図上は haunted にフォールバック */
  map_category: SpotCategory | null;
  created_at: string | null;
}

export interface WikiDatum {
  id: number | string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  image_url: string | null;
  locale: string | null;
  lat: number;
  lng: number;
  location_name: string | null;
  location_precision: "exact" | "town" | "prefecture" | null;
  map_category: SpotCategory | null;
  published_at: string | null;
}

interface Props {
  spots: SpotDatum[];
  posts: PostDatum[];
  wikis?: WikiDatum[];
  onRegionChange?: (bbox: { north: number; south: number; east: number; west: number }) => void;
  onSelectSpot?: (s: SpotDatum) => void;
  onSelectPost?: (p: PostDatum) => void;
  onSelectWiki?: (w: WikiDatum) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  showControls?: boolean;
}

/**
 * iOS WebKit (iPhone Safari/Chrome) は @2x タイル + 高 devicePixelRatio の
 * 組み合わせで raster ソースのレンダリングがメモリ制約で落ちることがある。
 * モバイル幅では標準解像度タイルにフォールバックして互換性を優先する。
 */
const isMobileViewport =
  typeof window !== "undefined" && window.innerWidth < 768;
const TILE_SUFFIX = isMobileViewport ? "" : "@2x";

type MapTheme = "dark" | "light";

/** ブラウザの現在テーマを html[data-theme] から取得（無ければ dark） */
function getMapTheme(): MapTheme {
  if (typeof document === "undefined") return "dark";
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" ? "light" : "dark";
}

/** テーマに応じた CARTO ベースマップスタイルを生成 */
function makeCartoStyle(theme: MapTheme) {
  const base = theme === "light" ? "light_all" : "dark_all";
  return {
    version: 8 as const,
    sources: {
      cartoBase: {
        type: "raster" as const,
        tiles: [
          `https://a.basemaps.cartocdn.com/${base}/{z}/{x}/{y}${TILE_SUFFIX}.png`,
          `https://b.basemaps.cartocdn.com/${base}/{z}/{x}/{y}${TILE_SUFFIX}.png`,
          `https://c.basemaps.cartocdn.com/${base}/{z}/{x}/{y}${TILE_SUFFIX}.png`,
          `https://d.basemaps.cartocdn.com/${base}/{z}/{x}/{y}${TILE_SUFFIX}.png`,
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap © CARTO',
      },
    },
    layers: [{ id: "base", type: "raster" as const, source: "cartoBase" }],
  };
}

/**
 * MapLibre GL JS で CARTO ダーク basemap を表示し、
 * props で渡されたキュレーションスポット・ユーザー投稿をマーカーで描画する。
 */
export default function MapCanvas({
  spots,
  posts,
  wikis = [],
  onRegionChange,
  onSelectSpot,
  onSelectPost,
  onSelectWiki,
  initialCenter = [138, 36.5],
  initialZoom = 5,
  showControls = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const spotMarkers = useRef<Marker[]>([]);
  const postMarkers = useRef<Marker[]>([]);
  const wikiMarkers = useRef<Marker[]>([]);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // MapLibre 初期化
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // 二重初期化防止

    const initialTheme = getMapTheme();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeCartoStyle(initialTheme),
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 4,
      maxZoom: 18,
      attributionControl: { compact: true },
      // モバイルでのメモリ消費を抑える
      maxTileCacheSize: typeof window !== "undefined" && window.innerWidth < 768 ? 50 : 200,
    });
    mapRef.current = map;

    // タイル取得失敗等のエラーをログ出力（モバイル特有の問題切り分け用）
    map.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.error("[MapLibre error]", e?.error?.message ?? e);
    });

    if (showControls) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserLocation: true,
          showAccuracyCircle: true,
        }),
        "bottom-right"
      );
    }

    // bbox 変化通知（デバウンス）
    const emitMoveEnd = () => {
      if (!onRegionChange) return;
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      moveTimerRef.current = setTimeout(() => {
        const b = map.getBounds();
        onRegionChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }, 400);
    };
    map.on("moveend", emitMoveEnd);
    map.once("load", emitMoveEnd);

    // iOS Safari/Chrome は URLバーの伸縮で初期高さがズレることがあるため、
    // load 後と短い遅延後にリサイズして正しい寸法に合わせる
    map.once("load", () => {
      requestAnimationFrame(() => map.resize());
    });
    const resizeTimer = setTimeout(() => map.resize(), 500);
    const onWinResize = () => map.resize();
    window.addEventListener("resize", onWinResize);
    window.addEventListener("orientationchange", onWinResize);

    // テーマ変更（html[data-theme] の変化）を検知してベースマップタイルを切替
    let currentTheme: MapTheme = initialTheme;
    const themeObserver = new MutationObserver(() => {
      const next = getMapTheme();
      if (next === currentTheme) return;
      currentTheme = next;
      try {
        // setStyle はマーカーと controls を保持したまま raster source を差し替えてくれる
        map.setStyle(makeCartoStyle(next));
      } catch (e) {
        console.error("[MapLibre setStyle error]", e);
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("orientationchange", onWinResize);
      themeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // スポットマーカー同期
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    spotMarkers.current.forEach((m) => m.remove());
    spotMarkers.current = [];
    for (const s of spots) {
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.innerHTML = renderSpotPin(s.category, 42);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectSpot?.(s);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([s.lng, s.lat])
        .addTo(map);
      spotMarkers.current.push(marker);
    }
  }, [spots, onSelectSpot]);

  // 投稿マーカー同期
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    postMarkers.current.forEach((m) => m.remove());
    postMarkers.current = [];
    for (const p of posts) {
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      // 投稿ピンもスポットと同じ 4 カテゴリピンで描画する。
      // 古い投稿 (map_category が null) は心霊 (haunted) にフォールバック。
      const cat: SpotCategory = p.map_category ?? "haunted";
      el.innerHTML = renderSpotPin(cat, 38);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectPost?.(p);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      postMarkers.current.push(marker);
    }
  }, [posts, onSelectPost]);

  // wiki マーカー同期
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    wikiMarkers.current.forEach((m) => m.remove());
    wikiMarkers.current = [];
    for (const w of wikis) {
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      // wiki ピンもスポット/投稿と同じ 4 カテゴリピンで描画。やや小さめにして post と差別化
      const cat: SpotCategory = w.map_category ?? "haunted";
      el.innerHTML = renderSpotPin(cat, 34);
      // wiki ピンは半透明枠で post と区別（CSS だけで軽く付与）
      el.style.filter = "drop-shadow(0 0 3px rgba(255,255,255,0.35))";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectWiki?.(w);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([w.lng, w.lat])
        .addTo(map);
      wikiMarkers.current.push(marker);
    }
  }, [wikis, onSelectWiki]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg-image, #0b0b0e)",
      }}
    />
  );
}
