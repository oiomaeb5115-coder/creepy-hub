"use client";

import { useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearAuthCache } from "@/lib/auth";

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
          await supabase.auth.setSession({ access_token, refresh_token });
          clearAuthCache();
          window.location.href = `/${locale}`;
          return;
        }
      }

      // PKCE flow: code in query params (?code=...)
      const code = searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        clearAuthCache();
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
