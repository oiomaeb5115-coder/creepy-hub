"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Labels = {
  reportAccepted?: string;
  reportLoginRequired?: string;
  report?: string;
  reporting?: string;
  retry?: string;
};

type Props = {
  categoryId: number;
  labels?: Labels;
};

export default function CategoryReportButton({ categoryId, labels }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error" | "notLoggedIn">(
    "idle"
  );

  const t = {
    reportAccepted: labels?.reportAccepted ?? "報告を受け付けました",
    reportLoginRequired: labels?.reportLoginRequired ?? "報告にはログインが必要です",
    report: labels?.report ?? "このカテゴリを報告",
    reporting: labels?.reporting ?? "送信中...",
    retry: labels?.retry ?? "再試行",
  };

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
        setStatus("done");
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
    return <span style={labelStyle}>{t.reportAccepted}</span>;
  }
  if (status === "notLoggedIn") {
    return <span style={labelStyle}>{t.reportLoginRequired}</span>;
  }

  return (
    <button
      onClick={handleReport}
      disabled={status === "loading"}
      style={buttonStyle}
    >
      {status === "loading" ? t.reporting : status === "error" ? t.retry : t.report}
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
