"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getIsAdmin, getAccessToken } from "@/lib/auth";

type Props = {
  type: "story" | "wiki";
  id?: number;
  slug?: string;
  locale: string;
  hasTranslation: boolean;
  labels: {
    translateButton: string;
    translating: string;
    translateDone: string;
    translateError: string;
    viewInEnglish: string;
    viewInJapanese: string;
  };
};

export default function TranslateButton({
  type,
  id,
  slug,
  locale,
  hasTranslation,
  labels,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getIsAdmin().then(setIsAdmin);
  }, []);

  // 英語版が存在する場合は言語切り替えリンクを表示（全ユーザー向け）
  if (locale === "ja" && hasTranslation) {
    const href =
      type === "story" ? `/en/post/${id}` : `/en/wiki/${slug}`;
    return (
      <a href={href} style={linkStyle}>
        {labels.viewInEnglish}
      </a>
    );
  }

  if (locale === "en") {
    const href =
      type === "story" ? `/ja/post/${id}` : `/ja/wiki/${slug}`;
    return (
      <a href={href} style={linkStyle}>
        {labels.viewInJapanese}
      </a>
    );
  }

  // 未翻訳 → 管理者のみ翻訳ボタンを表示
  if (!isAdmin) return null;

  const handleTranslate = async () => {
    setStatus("loading");
    try {
      const token = await getAccessToken();
      const body = type === "story" ? { postId: id } : { slug };
      const res = await fetch(`/api/translate/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  const label =
    status === "loading"
      ? labels.translating
      : status === "done"
      ? labels.translateDone
      : status === "error"
      ? labels.translateError
      : labels.translateButton;

  return (
    <button
      onClick={handleTranslate}
      disabled={status === "loading" || status === "done"}
      style={buttonStyle}
    >
      {label}
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  background: "rgba(40, 10, 15, 0.85)",
  border: "1px solid rgba(180, 100, 110, 0.4)",
  color: "#d4a0a8",
  cursor: "pointer",
  borderRadius: 4,
};

const linkStyle: React.CSSProperties = {
  ...buttonStyle,
  textDecoration: "none",
  display: "inline-block",
};
