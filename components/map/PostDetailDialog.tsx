"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { postUrl } from "@/lib/postUrl";
import { colorFor } from "@/lib/mapPalettes";
import type { PostDatum } from "@/components/map/MapCanvas";

interface Props {
  post: PostDatum;
  onClose: () => void;
}

const BODY_LIMIT = 500;

export default function PostDetailDialog({ post, onClose }: Props) {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const color = colorFor("haunted");

  const body =
    post.content && post.content.length > BODY_LIMIT
      ? post.content.slice(0, BODY_LIMIT) + "…"
      : post.content ?? "";

  const images = [post.image_url, post.image_url_2, post.image_url_3].filter(
    (u): u is string => !!u
  );

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <header style={header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...badge, background: `${color}40`, color }}>
              {precisionLabel(post.location_precision)}
            </span>
            <h2 style={title}>{post.title}</h2>
            {post.location_name && <div style={sub}>{post.location_name}</div>}
          </div>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Close">×</button>
        </header>

        {images.length > 0 && (
          <div style={imageRow}>
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`image-${i}`} style={image} />
            ))}
          </div>
        )}

        {body && <p style={bodyStyle}>{body}</p>}

        <Link href={postUrl(locale, post.id, post.slug)} style={{ ...linkBtn, background: `${color}CC` }}>
          全文を読む →
        </Link>
      </div>
    </div>
  );
}

function precisionLabel(p: PostDatum["location_precision"]): string {
  switch (p) {
    case "exact": return "投稿 · 正確";
    case "town": return "投稿 · 町単位";
    case "prefecture": return "投稿 · 県";
    default: return "投稿";
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
const sub: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 };
const closeBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.6)",
  fontSize: 28,
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
};
const imageRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  marginBottom: 12,
};
const image: React.CSSProperties = {
  width: 140,
  height: 140,
  objectFit: "cover",
  borderRadius: 8,
  flexShrink: 0,
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
