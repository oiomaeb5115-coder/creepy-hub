"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getIsAdmin } from "@/lib/auth";

type Props = { locale: string };

type PendingCategory = {
  id: number;
  name: string;
  slug: string;
  created_at: string | null;
};

export default function AdminPendingSection({ locale }: Props) {
  const [pending, setPending] = useState<PendingCategory[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isAdmin = await getIsAdmin();
      if (!isAdmin) return;

      const { data } = await supabase
        .from("story_categories")
        .select("id, name, slug, created_at")
        .eq("is_user_created", true)
        .eq("approved", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        setPending(data as PendingCategory[]);
        setShow(true);
      }
    };

    init();
  }, []);

  if (!show) return null;

  return (
    <section
      style={{
        background: "rgba(40, 10, 15, 0.88)",
        border: "1px solid rgba(200, 80, 90, 0.35)",
        borderRadius: 8,
        padding: "16px 20px",
        marginBottom: 80,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 12,
            color: "#e0c0c8",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          ADMIN ｜ 審査待ちカテゴリ（{pending.length}件）
        </h3>
        <Link
          href={`/${locale}/admin`}
          style={{ fontSize: 12, color: "#b08888", textDecoration: "none" }}
        >
          → 管理画面へ
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {pending.map((cat) => (
          <div
            key={cat.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "#c8b0b4",
              padding: "6px 0",
              borderBottom: "1px solid rgba(200,80,90,0.1)",
            }}
          >
            <span>{cat.name}</span>
            <span style={{ color: "#7a6060", fontSize: 11 }}>
              {cat.created_at
                ? new Date(cat.created_at).toLocaleDateString("ja-JP")
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
