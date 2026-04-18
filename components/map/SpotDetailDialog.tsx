"use client";

import { CATEGORY_LABEL, colorFor } from "@/lib/mapPalettes";
import type { SpotDatum } from "@/components/map/MapCanvas";

interface Props {
  spot: SpotDatum;
  onClose: () => void;
}

export default function SpotDetailDialog({ spot, onClose }: Props) {
  const color = colorFor(spot.category);
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <header style={header}>
          <div>
            <span
              style={{
                ...badge,
                background: `${color}40`,
                color,
              }}
            >
              {CATEGORY_LABEL[spot.category]}
            </span>
            <h2 style={title}>{spot.name}</h2>
            <div style={prefStyle}>{spot.prefecture}</div>
          </div>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Close">×</button>
        </header>

        <p style={bodyStyle}>{spot.description}</p>

        {spot.tags && spot.tags.length > 0 && (
          <div style={tagRow}>
            {spot.tags.map((t) => (
              <span key={t} style={tag}>#{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 1500,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};
const panel: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  maxHeight: "70vh",
  overflowY: "auto",
  background: "#0b0b0e",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: 20,
  color: "#eee",
  fontFamily: '"装甲明朝","Soukou Mincho",serif',
};
const header: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};
const badge: React.CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 999,
  marginBottom: 6,
};
const title: React.CSSProperties = { fontSize: 20, margin: 0, color: "#fff", fontWeight: 700 };
const prefStyle: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 };
const closeBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.6)",
  fontSize: 28,
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
};
const bodyStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.7,
  color: "rgba(255,255,255,0.88)",
};
const tagRow: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 };
const tag: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.7)",
};
