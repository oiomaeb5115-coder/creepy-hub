"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { PinVariant } from "@/lib/mapPins";
import MapCanvas, { type SpotDatum, type PostDatum } from "@/components/map/MapCanvas";
import SpotDetailDialog from "@/components/map/SpotDetailDialog";
import PostDetailDialog from "@/components/map/PostDetailDialog";
import MapFilterBar, {
  DEFAULT_FILTER,
  type MapFilterState,
} from "@/components/map/MapFilterBar";
import type { SpotCategory } from "@/lib/mapPalettes";

const FILTER_KEY = "creepyhub_map_filter_v1";

/**
 * iOS / Android / デスクトップ 共通の地図ページ。
 * - MapLibre GL JS + CARTO dark basemap
 * - キュレーションスポット（/data/spots.json）+ ユーザー投稿（/api/posts/map）
 * - カテゴリ/ソース/期間フィルタ + 現在地ボタン（MapLibre GeolocateControl）
 */
export default function MapPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const router = useRouter();
  const searchParams = useSearchParams();
  const pinVariant = ((): PinVariant => {
    const raw = (searchParams?.get("pinVariant") ?? "A").toUpperCase();
    return raw === "B" || raw === "C" || raw === "D" ? (raw as PinVariant) : "A";
  })();

  const [spots, setSpots] = useState<SpotDatum[]>([]);
  const [posts, setPosts] = useState<PostDatum[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SpotDatum | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostDatum | null>(null);
  const [filter, setFilter] = useState<MapFilterState>(DEFAULT_FILTER);
  const lastBboxRef = useRef<{ north: number; south: number; east: number; west: number } | null>(
    null
  );

  // localStorage からフィルタ復元
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as {
        categories?: SpotCategory[];
        source?: MapFilterState["source"];
        period?: MapFilterState["period"];
      };
      setFilter((prev) => ({
        categories: new Set<SpotCategory>(p.categories ?? Array.from(prev.categories)),
        source: p.source ?? prev.source,
        period: p.period ?? prev.period,
      }));
    } catch {
      // noop
    }
  }, []);

  // フィルタ保存
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTER_KEY,
        JSON.stringify({
          categories: Array.from(filter.categories),
          source: filter.source,
          period: filter.period,
        })
      );
    } catch {
      // noop
    }
  }, [filter]);

  // キュレーションスポットを 1 度だけ読み込み
  useEffect(() => {
    fetch("/data/spots.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SpotDatum[]) => setSpots(Array.isArray(data) ? data : []))
      .catch(() => setSpots([]));
  }, []);

  // 投稿 fetch 本体（bbox と 期間を合わせて叩く）
  const fetchPosts = useCallback(
    (
      bbox: { north: number; south: number; east: number; west: number },
      period: MapFilterState["period"]
    ) => {
      const q = new URLSearchParams({
        north: String(bbox.north),
        south: String(bbox.south),
        east: String(bbox.east),
        west: String(bbox.west),
        limit: "300",
      });
      if (period !== "all") q.set("since", period);
      fetch(`/api/posts/map?${q.toString()}`)
        .then((r) => (r.ok ? r.json() : { posts: [] }))
        .then((data: { posts?: PostDatum[] }) => setPosts(data.posts ?? []))
        .catch(() => setPosts([]));
    },
    []
  );

  // bbox 変化時に投稿を取得
  const handleRegionChange = useCallback(
    (bbox: { north: number; south: number; east: number; west: number }) => {
      lastBboxRef.current = bbox;
      fetchPosts(bbox, filter.period);
    },
    [fetchPosts, filter.period]
  );

  // period が変わった時、最新bboxで再取得
  useEffect(() => {
    if (lastBboxRef.current) fetchPosts(lastBboxRef.current, filter.period);
  }, [filter.period, fetchPosts]);

  // カテゴリ + ソースフィルタを適用
  const filteredSpots = useMemo(() => {
    if (filter.source === "posts") return [];
    return spots.filter((s) => filter.categories.has(s.category));
  }, [spots, filter.source, filter.categories]);

  const filteredPosts = useMemo(() => {
    if (filter.source === "spots") return [];
    // 投稿のカテゴリは map_category 未設定なら "haunted" に揃える
    return posts.filter((p) => filter.categories.has(p.map_category ?? "haunted"));
  }, [posts, filter.source, filter.categories]);

  return (
    <div style={wrap}>
      <MapCanvas
        spots={filteredSpots}
        posts={filteredPosts}
        onRegionChange={handleRegionChange}
        onSelectSpot={setSelectedSpot}
        onSelectPost={setSelectedPost}
        pinVariant={pinVariant}
      />

      {/* 戻るボタン */}
      <Link
        href={`/${locale}`}
        style={backBtn}
        onClick={(e) => {
          // SPA 遷移で前ページに戻れるなら優先
          if (typeof window !== "undefined" && window.history.length > 1) {
            e.preventDefault();
            router.back();
          }
        }}
      >
        ← 戻る
      </Link>

      <MapFilterBar value={filter} onChange={setFilter} />

      {selectedSpot && (
        <SpotDetailDialog spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
      )}
      {selectedPost && (
        <PostDetailDialog post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#0b0b0e",
  overflow: "hidden",
  // Sidebar のフローティングアイコンや下部タブナビより上に出す
  zIndex: 2000,
};
const backBtn: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 20,
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 999,
  fontSize: 14,
  textDecoration: "none",
  fontFamily: '"装甲明朝","Soukou Mincho",serif',
};
