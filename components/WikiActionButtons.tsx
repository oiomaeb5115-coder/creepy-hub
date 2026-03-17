"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getIsAdmin, getAccessToken } from "@/lib/auth";

type Labels = {
  edit?: string;
  delete?: string;
  deleting?: string;
  deleteConfirm?: string;
  deleteFailed?: string;
};

type Props = {
  slug: string;
  authorId: string | null;
  locale: string;
  labels?: Labels;
};

export default function WikiActionButtons({ slug, authorId, locale, labels }: Props) {
  const [canEdit, setCanEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const t = {
    edit: labels?.edit ?? "編集",
    delete: labels?.delete ?? "削除",
    deleting: labels?.deleting ?? "削除中...",
    deleteConfirm: labels?.deleteConfirm ?? "このWiki記事を削除しますか？この操作は取り消せません。",
    deleteFailed: labels?.deleteFailed ?? "削除失敗: ",
  };

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const isAuthor = session.user.id === authorId;
      const isAdmin = await getIsAdmin();
      setCanEdit(isAuthor || isAdmin);
    };
    check();
  }, [authorId]);

  if (!canEdit) return null;

  const handleDelete = async () => {
    if (!confirm(t.deleteConfirm)) return;
    setDeleting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/wiki/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const json = await res.json();
        alert(`${t.deleteFailed}${json.error}`);
        return;
      }
      router.push(`/${locale}/wiki`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <a href={`/${locale}/wiki/${slug}/edit`} style={editStyle}>
        {t.edit}
      </a>
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={deleteStyle}
      >
        {deleting ? t.deleting : t.delete}
      </button>
    </div>
  );
}

const base: React.CSSProperties = {
  padding: "5px 12px",
  fontSize: 12,
  cursor: "pointer",
  borderRadius: 4,
  textDecoration: "none",
  display: "inline-block",
  border: "1px solid",
};

const editStyle: React.CSSProperties = {
  ...base,
  background: "rgba(216, 216, 216, 0.08)",
  borderColor: "rgba(216, 216, 216, 0.3)",
  color: "#d8d8d8",
};

const deleteStyle: React.CSSProperties = {
  ...base,
  background: "rgba(216, 216, 216, 0.05)",
  borderColor: "rgba(216, 216, 216, 0.2)",
  color: "#d8d8d8",
};
