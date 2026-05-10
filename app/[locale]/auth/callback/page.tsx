"use client";

import { useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearAuthCache } from "@/lib/auth";

async function ensureSafeUsername(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .single();

  const current: string | null = (profile as { username: string | null } | null)?.username ?? null;
  const displayName: string | null = (profile as { display_name: string | null } | null)?.display_name ?? null;

  // display_name にメールアドレスが入っている場合はクリア
  if (displayName && displayName.includes("@")) {
    await supabase
      .from("profiles")
      .update({ display_name: null })
      .eq("id", userId);
  }

  if (current && !current.includes("@")) return;

  for (let i = 0; i < 5; i++) {
    const n = Math.floor(100000 + Math.random() * 900000);
    const candidate = `user_${n}`;
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!existing) {
      await supabase.from("profiles").upsert({ id: userId, username: candidate, display_name: null });
      return;
    }
  }
}

function CallbackInner() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const searchParams = useSearchParams();

  useEffect(() => {
    const isNewAccount = (createdAt: string | undefined): boolean => {
      if (!createdAt) return false;
      return Date.now() - new Date(createdAt).getTime() < 2 * 60 * 1000;
    };

    const typeParam = searchParams.get("type");
    const isRegisterFlow = typeParam === "register";

    const handleCallback = async () => {
      // Implicit flow: tokens in URL fragment (#access_token=...)
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { data } = await supabase.auth.setSession({ access_token, refresh_token });
          clearAuthCache();
          if (data.session?.user?.id) {
            await ensureSafeUsername(data.session.user.id);
          }
          const registered = isRegisterFlow || isNewAccount(data.session?.user?.created_at);
          window.location.href = registered ? `/${locale}?registered=true` : `/${locale}`;
          return;
        }
      }

      // PKCE flow: code in query params (?code=...)
      const code = searchParams.get("code");
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[auth/callback] exchangeCodeForSession error:", error);
            window.location.href = `/${locale}/login?err=${encodeURIComponent("exchange:" + error.message)}`;
            return;
          }
          if (!data.session) {
            console.error("[auth/callback] exchangeCodeForSession returned no session");
            window.location.href = `/${locale}/login?err=${encodeURIComponent("exchange:no-session")}`;
            return;
          }
          clearAuthCache();
          if (data.session.user?.id) {
            await ensureSafeUsername(data.session.user.id);
          }
          const registered = isRegisterFlow || isNewAccount(data.session.user?.created_at);
          window.location.href = registered ? `/${locale}?registered=true` : `/${locale}`;
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[auth/callback] exchangeCodeForSession threw:", e);
          window.location.href = `/${locale}/login?err=${encodeURIComponent("throw:" + msg)}`;
          return;
        }
      }

      // Fallback (no code, no hash) — include diagnostic URL info
      const fullUrl = window.location.href;
      const queryKeys = Array.from(searchParams.keys()).join(",") || "(none)";
      const diag = `no-code-no-hash;keys=${queryKeys};url=${fullUrl}`;
      window.location.href = `/${locale}/login?err=${encodeURIComponent(diag)}`;
    };

    handleCallback();
  }, [locale, searchParams]);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
