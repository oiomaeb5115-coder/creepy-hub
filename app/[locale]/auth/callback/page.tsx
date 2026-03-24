"use client";

import { useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearAuthCache } from "@/lib/auth";

async function ensureSafeUsername(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  const current: string | null = (profile as { username: string | null } | null)?.username ?? null;
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
      await supabase.from("profiles").upsert({ id: userId, username: candidate });
      return;
    }
  }
}

function CallbackInner() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const searchParams = useSearchParams();

  useEffect(() => {
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
          window.location.href = `/${locale}`;
          return;
        }
      }

      // PKCE flow: code in query params (?code=...)
      const code = searchParams.get("code");
      if (code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code);
        clearAuthCache();
        if (data.session?.user?.id) {
          await ensureSafeUsername(data.session.user.id);
        }
        window.location.href = `/${locale}`;
        return;
      }

      // Fallback
      window.location.href = `/${locale}/login`;
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
