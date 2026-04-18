"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LocationPrecision } from "@/lib/roundLocation";

interface Props {
  isOpen: boolean;
  onConfirm: (args: { lat: number; lng: number; precision: LocationPrecision }) => void;
  onCancel: () => void;
  initialCenter?: [number, number];
  initialZoom?: number;
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
 * 投稿作成フォームから呼ばれる位置ピッカーモーダル。
 * - MapLibre フルスクリーン（中央レチクル方式）
 * - 下部パネルで精度（正確 / 町単位 / 県のみ）を選択
 * - 「この場所に設定」で onConfirm を呼ぶ
 *
 * ネイティブ JS ブリッジを廃止し純 Web で動作するので iOS / Android / デスクトップ共通。
 */
export default function LocationPickerModal({
  isOpen,
  onConfirm,
  onCancel,
  initialCenter = [138, 36.5],
  initialZoom = 5,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [precision, setPrecision] = useState<LocationPrecision>("town");

  useEffect(() => {
    if (!isOpen) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isOpen, initialCenter, initialZoom]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const c = mapRef.current?.getCenter();
    if (!c) return;
    onConfirm({ lat: c.lat, lng: c.lng, precision });
  };

  return (
    <div style={overlay}>
      {/* MapLibre container */}
      <div ref={containerRef} style={mapStyle} />

      {/* 中央レチクル */}
      <div style={reticleWrap}>
        <div style={reticleCircle} />
        <div style={reticleVertical} />
        <div style={reticleHorizontal} />
      </div>

      {/* 上部：キャンセル */}
      <div style={topBar}>
        <button type="button" style={topBtn} onClick={onCancel}>キャンセル</button>
      </div>

      {/* 下部：精度 + 確定 */}
      <div style={bottomPanel}>
        <div style={hint}>この場所を投稿に付けますか？</div>
        <div style={precisionRow}>
          <PrecisionButton
            label="正確"
            active={precision === "exact"}
            onClick={() => setPrecision("exact")}
          />
          <PrecisionButton
            label="町単位"
            active={precision === "town"}
            onClick={() => setPrecision("town")}
          />
          <PrecisionButton
            label="県のみ"
            active={precision === "prefecture"}
            onClick={() => setPrecision("prefecture")}
          />
        </div>
        <div style={precisionHint}>{hintFor(precision)}</div>
        <button type="button" style={confirmBtn} onClick={handleConfirm}>
          この場所に設定
        </button>
      </div>
    </div>
  );
}

function PrecisionButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...precisionBtn,
        background: active ? "#8B1A22" : "rgba(255,255,255,0.1)",
        fontWeight: active ? 700 : 400,
      }}
    >
      {label}
    </button>
  );
}

function hintFor(p: LocationPrecision): string {
  switch (p) {
    case "exact": return "正確な座標が保存されます。心霊スポット等に最適。";
    case "town": return "町の範囲内でランダムにずれた座標が保存されます。";
    case "prefecture": return "県の重心が保存されます。自宅体験談などにどうぞ。";
  }
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  background: "#000",
  fontFamily: '"装甲明朝","Soukou Mincho",serif',
};
const mapStyle: React.CSSProperties = { position: "absolute", inset: 0 };
const reticleWrap: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
  zIndex: 10,
};
const reticleCircle: React.CSSProperties = {
  width: 48,
  height: 48,
  border: "1.5px solid rgba(255,255,255,0.9)",
  borderRadius: "50%",
  boxShadow: "0 0 4px rgba(0,0,0,0.7)",
};
const reticleVertical: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: 1.5,
  height: 20,
  background: "rgba(255,255,255,0.9)",
  transform: "translate(-50%, -50%)",
};
const reticleHorizontal: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: 20,
  height: 1.5,
  background: "rgba(255,255,255,0.9)",
  transform: "translate(-50%, -50%)",
};
const topBar: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 20,
};
const topBtn: React.CSSProperties = {
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: 'inherit',
};
const bottomPanel: React.CSSProperties = {
  position: "absolute",
  left: 16,
  right: 16,
  bottom: 32,
  background: "rgba(0,0,0,0.78)",
  borderRadius: 12,
  padding: 16,
  color: "#fff",
  zIndex: 20,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const hint: React.CSSProperties = { fontSize: 13, textAlign: "center", color: "rgba(255,255,255,0.9)" };
const precisionRow: React.CSSProperties = { display: "flex", gap: 6 };
const precisionBtn: React.CSSProperties = {
  flex: 1,
  padding: "8px 6px",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
const precisionHint: React.CSSProperties = {
  fontSize: 11,
  textAlign: "center",
  color: "rgba(255,255,255,0.55)",
  minHeight: 14,
};
const confirmBtn: React.CSSProperties = {
  padding: "12px",
  background: "#8B1A22",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
