"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import MapCanvas, { type SpotDatum, type PostDatum, type WikiDatum } from "@/components/map/MapCanvas";
import SpotDetailDialog from "@/components/map/SpotDetailDialog";
import PostDetailDialog from "@/components/map/PostDetailDialog";
import WikiDetailDialog from "@/components/map/WikiDetailDialog";
import MapFilterBar, {
  DEFAULT_FILTER,
  type MapFilterState,
} from "@/components/map/MapFilterBar";
import type { SpotCategory } from "@/lib/mapPalettes";

const FILTER_KEY = "creepyhub_map_filter_v1";
const normalizeLocale = (locale: string) => (locale === "en" ? "en" : "ja");

/**
 * iOS / Android / デスクトップ 共通の地図ページ。
 * - MapLibre GL JS + CARTO dark basemap
 * - キュレーションスポット（/data/spots.json）+ ユーザー投稿（/api/posts/map）
 * - カテゴリ/ソース/期間フィルタ + 現在地ボタン（MapLibre GeolocateControl）
 */
export default function MapPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const safeLocale = normalizeLocale(locale);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 投稿詳細ページからの `?focus=<postId>&lat=&lng=` 遷移対応
  const focusPostId = searchParams?.get("focus");
  const focusLatRaw = searchParams?.get("lat");
  const focusLngRaw = searchParams?.get("lng");
  const focusLat = focusLatRaw != null ? parseFloat(focusLatRaw) : NaN;
  const focusLng = focusLngRaw != null ? parseFloat(focusLngRaw) : NaN;
  const hasFocus =
    !!focusPostId && Number.isFinite(focusLat) && Number.isFinite(focusLng);

  const [spots, setSpots] = useState<SpotDatum[]>([]);
  const [posts, setPosts] = useState<PostDatum[]>([]);
  const [wikis, setWikis] = useState<WikiDatum[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SpotDatum | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostDatum | null>(null);
  const [selectedWiki, setSelectedWiki] = useState<WikiDatum | null>(null);
  const [filter, setFilter] = useState<MapFilterState>(DEFAULT_FILTER);
  const lastBboxRef = useRef<{ north: number; south: number; east: number; west: number } | null>(
    null
  );
  const focusOpenedRef = useRef(false);

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

  // wiki fetch 本体
  const fetchWikis = useCallback(
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
      fetch(`/api/wiki/map?${q.toString()}`)
        .then((r) => (r.ok ? r.json() : { wikis: [] }))
        .then((data: { wikis?: WikiDatum[] }) => setWikis(data.wikis ?? []))
        .catch(() => setWikis([]));
    },
    []
  );

  // bbox 変化時に投稿と wiki を並行取得
  const handleRegionChange = useCallback(
    (bbox: { north: number; south: number; east: number; west: number }) => {
      lastBboxRef.current = bbox;
      fetchPosts(bbox, filter.period);
      fetchWikis(bbox, filter.period);
    },
    [fetchPosts, fetchWikis, filter.period]
  );

  // period が変わった時、最新bboxで再取得
  useEffect(() => {
    if (lastBboxRef.current) {
      fetchPosts(lastBboxRef.current, filter.period);
      fetchWikis(lastBboxRef.current, filter.period);
    }
  }, [filter.period, fetchPosts, fetchWikis]);

  // 投稿詳細ページから ?focus= 付きで遷移してきた場合、
  // 対象投稿が posts 配列に含まれたら一度だけ PostDetailDialog を開く
  useEffect(() => {
    if (!hasFocus || focusOpenedRef.current) return;
    const target = posts.find((p) => String(p.id) === focusPostId);
    if (target) {
      setSelectedPost(target);
      focusOpenedRef.current = true;
    }
  }, [hasFocus, focusPostId, posts]);

  // カテゴリ + ソースフィルタを適用
  // source: "all" は全部表示、それ以外はそのソースだけ
  const filteredSpots = useMemo(() => {
    if (filter.source !== "all" && filter.source !== "spots") return [];
    return spots.filter((s) => filter.categories.has(s.category));
  }, [spots, filter.source, filter.categories]);

  const filteredPosts = useMemo(() => {
    if (filter.source !== "all" && filter.source !== "posts") return [];
    return posts.filter((p) => filter.categories.has(p.map_category ?? "haunted"));
  }, [posts, filter.source, filter.categories]);

  const filteredWikis = useMemo(() => {
    if (filter.source !== "all" && filter.source !== "wikis") return [];
    return wikis.filter((w) => filter.categories.has(w.map_category ?? "haunted"));
  }, [wikis, filter.source, filter.categories]);

  return (
    <div style={wrap}>
      <MapCanvas
        spots={filteredSpots}
        posts={filteredPosts}
        wikis={filteredWikis}
        onRegionChange={handleRegionChange}
        onSelectSpot={setSelectedSpot}
        onSelectPost={setSelectedPost}
        onSelectWiki={setSelectedWiki}
        {...(hasFocus
          ? { initialCenter: [focusLng, focusLat] as [number, number], initialZoom: 14 }
          : {})}
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

      {/* ノベル(映子の物語)へ */}
      <Link href={`/${safeLocale}/novel`} style={novelBtn} aria-label="ノベルを開く">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        ノベル
      </Link>

      <MapFilterBar value={filter} onChange={setFilter} />

      {selectedSpot && (
        <SpotDetailDialog spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
      )}
      {selectedPost && (
        <PostDetailDialog post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
      {selectedWiki && (
        <WikiDetailDialog wiki={selectedWiki} onClose={() => setSelectedWiki(null)} />
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "var(--bg-image, #0b0b0e)",
  overflow: "hidden",
  // Sidebar のフローティングアイコンや下部タブナビより上に出す
  zIndex: 2000,
};
const backBtn: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 20,
  background: "var(--bg-surface, rgba(0,0,0,0.55))",
  color: "var(--text-primary, #fff)",
  border: "1px solid rgba(var(--accent-rgb, 200,40,50), 0.3)",
  padding: "8px 14px",
  borderRadius: 999,
  fontSize: 14,
  textDecoration: "none",
  fontFamily: '"装甲明朝","Soukou Mincho",serif',
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
};
const novelBtn: React.CSSProperties = {
  // フィルタバー (top:16 left:80~right:16) と被らないよう、画面下部中央に配置
  position: "absolute",
  bottom: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 20,
  background: "rgba(0,0,0,0.7)",
  color: "var(--text-primary, #fff)",
  border: "1px solid rgba(var(--accent-rgb, 200,40,50), 0.55)",
  padding: "8px 16px",
  borderRadius: 999,
  fontSize: 14,
  textDecoration: "none",
  fontFamily: '"装甲明朝","Soukou Mincho",serif',
  backdropFilter: "blur(4px)",
  WebkitBackdropFilter: "blur(4px)",
  display: "inline-flex",
  alignItems: "center",
};
