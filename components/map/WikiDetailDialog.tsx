"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { colorFor } from "@/lib/mapPalettes";
import type { WikiDatum } from "@/components/map/MapCanvas";

interface Props {
  wiki: WikiDatum;
  onClose: () => void;
}

const SUMMARY_LIMIT = 400;

export default function WikiDetailDialog({ wiki, onClose }: Props) {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? wiki.locale ?? "ja";
  const color = colorFor(wiki.map_category ?? "haunted");

  const summary =
    wiki.summary && wiki.summary.length > SUMMARY_LIMIT
      ? wiki.summary.slice(0, SUMMARY_LIMIT) + "…"
      : wiki.summary ?? "";

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <header style={header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...badge, background: `${color}40`, color }}>
              {precisionLabel(wiki.location_precision)}
            </span>
            <h2 style={title}>{wiki.title}</h2>
            {wiki.subtitle && <div style={sub}>{wiki.subtitle}</div>}
            {wiki.location_name && <div style={loc}>{wiki.location_name}</div>}
          </div>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Close">×</button>
        </header>

        {wiki.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wiki.image_url} alt={wiki.title} style={image} />
        )}

        {summary && <p style={bodyStyle}>{summary}</p>}

        <Link
          href={`/${locale}/wiki/${encodeURIComponent(wiki.slug)}`}
          style={{ ...linkBtn, background: `${color}CC` }}
        >
          Wiki ページを開く →
        </Link>
      </div>
    </div>
  );
}

function precisionLabel(p: WikiDatum["location_precision"]): string {
  switch (p) {
    case "exact": return "Wiki · 正確";
    case "town": return "Wiki · 町単位";
    case "prefecture": return "Wiki · 県";
    default: return "Wiki";
  }
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
  maxHeight: "75vh",
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
const sub: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6 };
const loc: React.CSSProperties = { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 };
const closeBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.6)",
  fontSize: 28,
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
};
const image: React.CSSProperties = {
  width: "100%",
  maxHeight: 220,
  objectFit: "cover",
  borderRadius: 8,
  marginBottom: 12,
};
const bodyStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.75,
  color: "rgba(255,255,255,0.88)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
const linkBtn: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  padding: "12px 16px",
  marginTop: 16,
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
  borderRadius: 6,
};
