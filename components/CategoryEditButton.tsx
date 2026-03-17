"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Props = {
  categoryId: number;
  createdBy: string | null;
  slug: string;
  locale: string;
  label?: string;
};

export default function CategoryEditButton({ categoryId: _categoryId, createdBy, slug, locale, label }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const isCreator = createdBy === session.user.id;
      if (isCreator) {
        setShow(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        setShow(true);
      }
    };

    check();
  }, [createdBy]);

  if (!show) return null;

  return (
    <Link
      href={`/${locale}/category/${slug}/edit`}
      style={{
        minHeight: "46px",
        padding: "0 18px",
        border: "1px solid rgba(170, 108, 112, 0.32)",
        background: "rgba(48, 18, 22, 0.78)",
        color: "#f5f1eb",
        fontWeight: 700,
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
      }}
    >
      {label ?? "画像設定"}
    </Link>
  );
}
