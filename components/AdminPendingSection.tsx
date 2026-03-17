"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getIsAdmin } from "@/lib/auth";

type Labels = {
  adminSection?: string;
  adminLink?: string;
  storyLabel?: string;
  wikiLabel?: string;
};

type Props = {
  locale: string;
  labels?: Labels;
};

type PendingCategory = {
  id: number;
  name: string;
  slug: string;
  created_at: string | null;
  type: "story" | "wiki";
};

export default function AdminPendingSection({ locale, labels }: Props) {
  const [pending, setPending] = useState<PendingCategory[]>([]);
  const [show, setShow] = useState(false);

  const t = {
    adminSection: labels?.adminSection ?? "ADMIN ｜ 審査待ちカテゴリ（{count}件）",
    adminLink: labels?.adminLink ?? "→ 管理画面へ",
    storyLabel: labels?.storyLabel ?? "[STORY]",
    wikiLabel: labels?.wikiLabel ?? "[WIKI]",
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isAdmin = await getIsAdmin();
      if (!isAdmin) return;

      const [storyCatsResult, wikiCatsResult] = await Promise.all([
        supabase
          .from("story_categories")
          .select("id, name, slug, created_at")
          .eq("is_user_created", true)
          .eq("approved", false)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("categories")
          .select("id, name, slug, created_at")
          .eq("is_user_created", true)
          .eq("is_active", false)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const combined: PendingCategory[] = [
        ...((storyCatsResult.data ?? []) as Omit<PendingCategory, "type">[]).map((c) => ({ ...c, type: "story" as const })),
        ...((wikiCatsResult.data ?? []) as Omit<PendingCategory, "type">[]).map((c) => ({ ...c, type: "wiki" as const })),
      ];

      if (combined.length > 0) {
        setPending(combined);
        setShow(true);
      }
    };

    init();
  }, []);

  if (!show) return null;

  const sectionTitle = t.adminSection.replace("{count}", String(pending.length));

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
          {sectionTitle}
        </h3>
        <Link
          href={`/${locale}/admin`}
          style={{ fontSize: 12, color: "#b08888", textDecoration: "none" }}
        >
          {t.adminLink}
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
            <span>
              {cat.name}
              <span style={{ marginLeft: 6, fontSize: 10, color: cat.type === "wiki" ? "#8ab0c8" : "#c8a0a8", letterSpacing: "0.08em" }}>
                {cat.type === "wiki" ? t.wikiLabel : t.storyLabel}
              </span>
            </span>
            <span style={{ color: "#7a6060", fontSize: 11 }}>
              {cat.created_at
                ? new Date(cat.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ja-JP")
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
