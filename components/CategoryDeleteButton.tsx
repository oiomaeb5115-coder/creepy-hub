"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";

type Labels = {
  deleteConfirm?: string;
  deleteFailed?: string;
  deleting?: string;
  deleted?: string;
};

type Props = {
  categoryId: number;
  deleteApiPath: string;
  redirectTo: string;
  label?: string;
  labels?: Labels;
};

export default function CategoryDeleteButton({
  categoryId,
  deleteApiPath,
  redirectTo,
  label,
  labels,
}: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const router = useRouter();

  const t = {
    deleteConfirm: labels?.deleteConfirm ?? "このカテゴリを削除しますか？この操作は元に戻せません。",
    deleteFailed: labels?.deleteFailed ?? "削除に失敗しました",
    deleting: labels?.deleting ?? "削除中...",
    deleted: labels?.deleted ?? "削除済",
    buttonLabel: label ?? (labels?.deleted ? "Delete Category" : "カテゴリを削除"),
  };

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") setIsAdmin(true);
    };
    check();
  }, []);

  if (!isAdmin) return null;

  const handleDelete = async () => {
    if (!window.confirm(t.deleteConfirm)) return;

    setStatus("loading");
    try {
      const token = await getAccessToken();
      const res = await fetch(deleteApiPath, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setStatus("done");
        router.push(redirectTo);
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? t.deleteFailed);
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={status === "loading" || status === "done"}
      style={{
        minHeight: "46px",
        padding: "0 18px",
        border: "1px solid rgba(200, 60, 60, 0.4)",
        background: "rgba(80, 10, 10, 0.7)",
        color: "#e09090",
        fontWeight: 700,
        cursor: status === "loading" || status === "done" ? "default" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
      }}
    >
      {status === "loading" ? t.deleting : status === "done" ? t.deleted : t.buttonLabel}
    </button>
  );
}
