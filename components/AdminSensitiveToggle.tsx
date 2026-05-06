"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIsAdmin, getAccessToken } from "@/lib/auth";

type Labels = {
  adminLabel: string;
  on: string;
  off: string;
  updating: string;
  updateError: string;
};

type Props = {
  postId: number;
  initialIsSensitive: boolean;
  labels: Labels;
};

export default function AdminSensitiveToggle({ postId, initialIsSensitive, labels }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSensitive, setIsSensitive] = useState(initialIsSensitive);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    getIsAdmin().then((v) => { if (!cancelled) setIsAdmin(v); });
    return () => { cancelled = true; };
  }, []);

  if (!isAdmin) return null;

  const handleClick = async () => {
    const next = !isSensitive;
    setUpdating(true);
    setIsSensitive(next);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/post/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_sensitive: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`${labels.updateError}: ${json.error ?? res.status}`);
        setIsSensitive(!next);
        return;
      }
      router.refresh();
    } catch (e) {
      alert(`${labels.updateError}: ${e instanceof Error ? e.message : String(e)}`);
      setIsSensitive(!next);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={updating}
      style={btnStyle}
      title={labels.adminLabel}
    >
      {updating ? labels.updating : `${labels.adminLabel} ${isSensitive ? labels.off : labels.on}`}
    </button>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "5px 12px",
  fontSize: 12,
  cursor: "pointer",
  borderRadius: 4,
  display: "inline-block",
  background: "rgba(180, 100, 60, 0.15)",
  border: "1px solid rgba(200, 130, 80, 0.4)",
  color: "#e8c8a8",
};
