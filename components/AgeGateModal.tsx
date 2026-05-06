"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  dict: { prompt: string; confirm: string; cancel: string };
};

export default function AgeGateModal({ open, onConfirm, onCancel, dict }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div style={overlay} role="dialog" aria-modal="true" onClick={onCancel}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: 0, lineHeight: 1.6, color: "#e8d8d0" }}>{dict.prompt}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" onClick={onCancel} style={secondaryBtn}>{dict.cancel}</button>
          <button type="button" onClick={onConfirm} style={primaryBtn}>{dict.confirm}</button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
};
const card: React.CSSProperties = {
  background: "#1a0c10", border: "1px solid rgba(180,100,110,0.35)",
  borderRadius: 6, padding: 24, maxWidth: 380, width: "calc(100% - 40px)",
  color: "#e8d8d0",
};
const primaryBtn: React.CSSProperties = {
  padding: "8px 16px", background: "#6b1a22", border: "1px solid #8b3a42",
  color: "#f0e0e0", borderRadius: 4, cursor: "pointer", fontSize: 13,
};
const secondaryBtn: React.CSSProperties = {
  padding: "8px 16px", background: "transparent", border: "1px solid rgba(180,100,110,0.35)",
  color: "#b08888", borderRadius: 4, cursor: "pointer", fontSize: 13,
};
