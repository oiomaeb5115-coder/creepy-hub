"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  categoryId: number;
};

export default function CategoryReportButton({ categoryId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error" | "notLoggedIn">(
    "idle"
  );

  const handleReport = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setStatus("notLoggedIn");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch(`/api/category/${categoryId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (res.status === 409) {
        setStatus("done"); // 既に報告済み
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return <span style={labelStyle}>報告を受け付けました</span>;
  }
  if (status === "notLoggedIn") {
    return <span style={labelStyle}>報告にはログインが必要です</span>;
  }

  return (
    <button
      onClick={handleReport}
      disabled={status === "loading"}
      style={buttonStyle}
    >
      {status === "loading" ? "送信中..." : status === "error" ? "再試行" : "このカテゴリを報告"}
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 12,
  background: "transparent",
  border: "1px solid rgba(180, 80, 80, 0.35)",
  color: "#b07070",
  borderRadius: 6,
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#7a6a60",
};
