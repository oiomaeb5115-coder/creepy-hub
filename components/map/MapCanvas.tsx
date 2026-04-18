"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { renderSpotPin, type PinVariant } from "@/lib/mapPins";
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

interface Props {
  spots: SpotDatum[];
  posts: PostDatum[];
  onRegionChange?: (bbox: { north: number; south: number; east: number; west: number }) => void;
  onSelectSpot?: (s: SpotDatum) => void;
  onSelectPost?: (p: PostDatum) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  showControls?: boolean;
  pinVariant?: PinVariant;
}

const CARTO_STYLE = {
  version: 8 as const,
  sources: {
    cartoDark: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [{ id: "base", type: "raster" as const, source: "cartoDark" }],
};

/**
 * MapLibre GL JS で CARTO ダーク basemap を表示し、
 * props で渡されたキュレーションスポット・ユーザー投稿をマーカーで描画する。
 */
export default function MapCanvas({
  spots,
  posts,
  onRegionChange,
  onSelectSpot,
  onSelectPost,
  initialCenter = [138, 36.5],
  initialZoom = 5,
  showControls = true,
  pinVariant = "A",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const spotMarkers = useRef<Marker[]>([]);
  const postMarkers = useRef<Marker[]>([]);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // MapLibre 初期化
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // 二重初期化防止

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 4,
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

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

    return () => {
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
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
      el.innerHTML = renderSpotPin(s.category, 42, pinVariant);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectSpot?.(s);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([s.lng, s.lat])
        .addTo(map);
      spotMarkers.current.push(marker);
    }
  }, [spots, onSelectSpot, pinVariant]);

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
      el.innerHTML = renderSpotPin(cat, 38, pinVariant);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectPost?.(p);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      postMarkers.current.push(marker);
    }
  }, [posts, onSelectPost, pinVariant]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        background: "#0b0b0e",
      }}
    />
  );
}
