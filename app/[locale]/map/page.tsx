"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import MapCanvas, { type SpotDatum, type PostDatum } from "@/components/map/MapCanvas";
import SpotDetailDialog from "@/components/map/SpotDetailDialog";
import PostDetailDialog from "@/components/map/PostDetailDialog";

/**
 * iOS / Android / デスクトップ 共通の地図ページ。
 * - MapLibre GL JS + CARTO dark basemap
 * - キュレーションスポット（/data/spots.json）+ ユーザー投稿（/api/posts/map）
 */
export default function MapPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const router = useRouter();

  const [spots, setSpots] = useState<SpotDatum[]>([]);
  const [posts, setPosts] = useState<PostDatum[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SpotDatum | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostDatum | null>(null);

  // キュレーションスポットを 1 度だけ読み込み
  useEffect(() => {
    fetch("/data/spots.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SpotDatum[]) => setSpots(Array.isArray(data) ? data : []))
      .catch(() => setSpots([]));
  }, []);

  // bbox 変化時に投稿を取得
  const handleRegionChange = useCallback(
    (bbox: { north: number; south: number; east: number; west: number }) => {
      const q = new URLSearchParams({
        north: String(bbox.north),
        south: String(bbox.south),
        east: String(bbox.east),
        west: String(bbox.west),
        limit: "300",
      });
      fetch(`/api/posts/map?${q.toString()}`)
        .then((r) => (r.ok ? r.json() : { posts: [] }))
        .then((data: { posts?: PostDatum[] }) => setPosts(data.posts ?? []))
        .catch(() => setPosts([]));
    },
    []
  );

  return (
    <div style={wrap}>
      <MapCanvas
        spots={spots}
        posts={posts}
        onRegionChange={handleRegionChange}
        onSelectSpot={setSelectedSpot}
        onSelectPost={setSelectedPost}
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
