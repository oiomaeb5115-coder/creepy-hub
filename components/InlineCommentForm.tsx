"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import CommentIcon from "@/components/icons/CommentIcon";

type Props = {
  postId: number;
  locale?: string;
  initialCount?: number;
  postTitle?: string | null;
};

export default function InlineCommentForm({ postId, locale = "ja", initialCount = 0, postTitle }: Props) {
  const isEn = locale === "en";
  const [count, setCount] = useState(initialCount);
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // 展開時にだけセッションを問い合わせる
  useEffect(() => {
    if (!expanded || authChecked) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });
    return () => { cancelled = true; };
  }, [expanded, authChecked]);

  // 展開時に body スクロールをロックし、Esc で閉じる
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    if (textareaRef.current) textareaRef.current.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const close = () => {
    setExpanded(false);
    setContent("");
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (!userId) {
      alert(isEn ? "Login required to comment." : "コメントするにはログインが必要です。");
      return;
    }
    setPosting(true);
    try {
      const { error } = await supabase.from("post_comments").insert([
        {
          post_id: postId,
          user_id: userId,
          parent_id: null,
          content: trimmed,
        },
      ]);
      if (error) {
        alert((isEn ? "Failed to post comment: " : "コメント投稿に失敗しました: ") + error.message);
        return;
      }
      setContent("");
      setExpanded(false);
      setCount((c) => c + 1);
    } finally {
      setPosting(false);
    }
  };

  const triggerButton = (
    <button
      type="button"
      className="stat-icon"
      onClick={(e) => { stop(e); setExpanded(true); }}
      onMouseDown={stop}
      title={isEn ? "Write a comment" : "コメントする"}
      aria-label={isEn ? "Comment" : "コメント"}
      style={{
        padding: 0,
        background: "transparent",
        border: "none",
        font: "inherit",
        cursor: "pointer",
        textDecoration: "underline",
        textDecorationColor: "rgba(161,102,108,0.45)",
        textDecorationThickness: 1,
        textUnderlineOffset: 4,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e05c6a"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ""; }}
    >
      <CommentIcon />
      <span>{count}</span>
    </button>
  );

  const sheet = expanded && mounted ? createPortal(
    <div
      onClick={(e) => { e.stopPropagation(); }}
      onMouseDown={(e) => { e.stopPropagation(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={close}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEn ? "Write a comment" : "コメントを書く"}
        style={{
          position: "relative",
          background: "rgba(14,5,7,0.98)",
          borderTop: "1px solid rgba(161,102,108,0.35)",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          padding: "14px 16px calc(14px + env(safe-area-inset-bottom)) 16px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 -12px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* drag handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(180,140,140,0.35)" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", color: "#9a8880" }}>
              {isEn ? "WRITE A COMMENT" : "コメントを書く"}
            </p>
            {postTitle && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "#c8b8b0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {isEn ? "On: " : "対象: "}
                {postTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={isEn ? "Close" : "閉じる"}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 999,
              border: "1px solid rgba(177,110,115,0.28)",
              background: "rgba(50,15,20,0.72)",
              color: "#c0b5a8",
              fontSize: 16,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            authChecked && !userId
              ? (isEn ? "Login required to comment." : "コメントするにはログインが必要です。")
              : (isEn ? "Write a comment..." : "コメントを書く...")
          }
          disabled={posting || (authChecked && !userId)}
          rows={5}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(165,99,104,0.32)",
            background: "rgba(10,3,5,0.96)",
            color: "#e0d8d0",
            fontSize: 15,
            lineHeight: 1.6,
            minHeight: 140,
            maxHeight: "40vh",
            resize: "vertical",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={submit}
          disabled={posting || !content.trim() || (authChecked && !userId)}
          style={{
            width: "100%",
            minHeight: 48,
            padding: "0 18px",
            border: "1px solid rgba(var(--accent-rgb), 0.55)",
            background: "rgba(var(--accent-rgb), 0.18)",
            color: "#ffded8",
            fontFamily: '"Impact", "Anton", "装甲明朝", "Soukou Mincho", sans-serif',
            fontSize: 13,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: posting || !content.trim() ? "not-allowed" : "pointer",
            opacity: posting || !content.trim() || (authChecked && !userId) ? 0.45 : 1,
            transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s, color 0.18s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            if (el.disabled) return;
            el.style.background = "rgba(var(--accent-rgb), 0.32)";
            el.style.borderColor = "rgba(var(--accent-rgb), 0.8)";
            el.style.boxShadow = "0 0 18px rgba(var(--accent-rgb), 0.25)";
            el.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(var(--accent-rgb), 0.18)";
            el.style.borderColor = "rgba(var(--accent-rgb), 0.55)";
            el.style.boxShadow = "none";
            el.style.color = "#ffded8";
          }}
        >
          {posting
            ? (isEn ? "POSTING..." : "送信中...")
            : (isEn ? "POST COMMENT" : "コメントを送信")}
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {triggerButton}
      {sheet}
    </>
  );
}
