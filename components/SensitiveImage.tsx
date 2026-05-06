"use client";
/**
 * SensitiveImage
 * -----------------------------------------------------------------------------
 * 注意: CSS `filter: blur()` は見た目の保護に過ぎない。
 *  - DevTools から元画像 URL を開けば原寸で DL 可能
 *  - 本気で守るなら Supabase Storage `createSignedUrl()` + サーバー側で事前ぼかし派生を
 *    生成するのが正攻法
 *  - 本実装は第一段階として「通常閲覧での誤視認防止」＋「年齢ゲート」を目的とする
 * -----------------------------------------------------------------------------
 */
import { useEffect, useRef, useState } from "react";
import AgeGateModal from "./AgeGateModal";

type Dict = {
  reveal: string;
  hide: string;
  overlay: string;
  ageGatePrompt: string;
  ageGateConfirm: string;
  ageGateCancel: string;
};

type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  revealDurationMs?: number;
  dict: Dict;
  /** reveal 状態を外から制御したい場合（例: ライトボックス側と同期） */
  revealed?: boolean;
  onRevealChange?: (revealed: boolean) => void;
};

const AGE_STORAGE_KEY = "creepy.ageVerified";

export default function SensitiveImage({
  src,
  alt,
  className,
  style,
  revealDurationMs = 10_000,
  dict,
  revealed: revealedProp,
  onRevealChange,
}: Props) {
  const [internalRevealed, setInternalRevealed] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealed = revealedProp ?? internalRevealed;

  const setRevealed = (v: boolean) => {
    if (revealedProp === undefined) setInternalRevealed(v);
    onRevealChange?.(v);
  };

  useEffect(() => {
    if (!revealed) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), revealDurationMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
     
  }, [revealed, revealDurationMs]);

  const requestReveal = () => {
    if (typeof window !== "undefined" &&
        localStorage.getItem(AGE_STORAGE_KEY) === "yes") {
      setRevealed(true);
    } else {
      setShowGate(true);
    }
  };

  const onAgeConfirm = () => {
    try { localStorage.setItem(AGE_STORAGE_KEY, "yes"); } catch { /* ignore */ }
    setShowGate(false);
    setRevealed(true);
  };

  return (
    <>
      <div
        className={className}
        style={{ position: "relative", overflow: "hidden", ...style }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "filter 0.2s ease, transform 0.2s ease",
            filter: revealed ? "none" : "blur(24px)",
            transform: revealed ? "none" : "scale(1.05)",
          }}
        />
        {!revealed && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); requestReveal(); }}
            style={overlayBtn}
            aria-label={dict.reveal}
          >
            <span style={{ fontSize: 28 }}>🔞</span>
            <span style={{ fontSize: 12, marginTop: 6, textAlign: "center", padding: "0 16px" }}>
              {dict.overlay}
            </span>
          </button>
        )}
        {revealed && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setRevealed(false); }}
            style={hideBtn}
          >
            {dict.hide}
          </button>
        )}
      </div>
      <AgeGateModal
        open={showGate}
        onConfirm={onAgeConfirm}
        onCancel={() => setShowGate(false)}
        dict={{
          prompt: dict.ageGatePrompt,
          confirm: dict.ageGateConfirm,
          cancel: dict.ageGateCancel,
        }}
      />
    </>
  );
}

const overlayBtn: React.CSSProperties = {
  position: "absolute", inset: 0, width: "100%", height: "100%",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  background: "rgba(0,0,0,0.35)", color: "#f0e0e0",
  border: "none", cursor: "pointer",
  backdropFilter: "blur(2px)",
};
const hideBtn: React.CSSProperties = {
  position: "absolute", top: 8, right: 8,
  background: "rgba(0,0,0,0.6)", color: "#f0e0e0",
  border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4,
  fontSize: 11, padding: "4px 10px", cursor: "pointer",
  zIndex: 2,
};
