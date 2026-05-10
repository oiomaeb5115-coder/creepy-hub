"use client";

import { useEffect, useRef, Suspense } from "react";
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
  const handledRef = useRef(false);

  useEffect(() => {
    // Guard: ensure this effect only processes the callback once per mount.
    // React StrictMode or Next.js navigation may otherwise re-run useEffect
    // and cause the second pass to land on the fallback after the first
    // pass has already consumed/cleaned the URL tokens.
    if (handledRef.current) return;
    handledRef.current = true;

    const isNewAccount = (createdAt: string | undefined): boolean => {
      if (!createdAt) return false;
      return Date.now() - new Date(createdAt).getTime() < 2 * 60 * 1000;
    };

    const typeParam = searchParams.get("type");
    const isRegisterFlow = typeParam === "register";

    // Read hash directly from href to bypass possible Android WebView quirks
    // where window.location.hash may report empty even when the URL has #...
    const href = window.location.href;
    const hashIdx = href.indexOf("#");
    const rawHash = hashIdx >= 0 ? href.substring(hashIdx + 1) : "";

    const handleCallback = async () => {
      // 0. If a session is already established (e.g. callback re-mounted after
      //    a successful first pass), skip straight to home.
      try {
        const { data: { session: existing } } = await supabase.auth.getSession();
        if (existing) {
          window.location.href = `/${locale}`;
          return;
        }
      } catch {
        // fall through to normal handling
      }

      // 1. Implicit flow: tokens in URL fragment (#access_token=...)
      // Use manual split parsing as a fallback in case URLSearchParams behaves
      // unexpectedly in this Android WebView. We try URLSearchParams first,
      // then fall back to manual key=value parsing on '&' boundaries.
      const parseHash = (h: string): Record<string, string> => {
        const out: Record<string, string> = {};
        try {
          const sp = new URLSearchParams(h);
          sp.forEach((v, k) => { out[k] = v; });
          if (out.access_token) return out;
        } catch { /* fall through to manual */ }
        // Manual fallback
        for (const part of h.split("&")) {
          const eq = part.indexOf("=");
          if (eq < 0) continue;
          const k = decodeURIComponent(part.substring(0, eq));
          const v = decodeURIComponent(part.substring(eq + 1));
          out[k] = v;
        }
        return out;
      };

      if (rawHash) {
        const parsed = parseHash(rawHash);
        const access_token = parsed.access_token;
        const refresh_token = parsed.refresh_token;
        if (access_token && refresh_token) {
          try {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              console.error("[auth/callback] setSession error:", error);
              window.location.href = `/${locale}/login?err=${encodeURIComponent("setSession:" + error.message)}`;
              return;
            }
            if (!data.session) {
              window.location.href = `/${locale}/login?err=${encodeURIComponent("setSession:no-session")}`;
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
            console.error("[auth/callback] setSession threw:", e);
            window.location.href = `/${locale}/login?err=${encodeURIComponent("setSession-throw:" + msg)}`;
            return;
          }
        }
        // Hash present but tokens missing — surface what keys we did find
        const foundKeys = Object.keys(parsed).join(",") || "(none)";
        const head = rawHash.substring(0, 60);
        const diag = `hash-no-tokens;found=${foundKeys};hashHead=${head}`;
        window.location.href = `/${locale}/login?err=${encodeURIComponent(diag)}`;
        return;
      }

      // 2. PKCE flow: code in query params (?code=...)
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

      // 3. Fallback (no code, no hash) — include diagnostic URL info
      const queryKeys = Array.from(searchParams.keys()).join(",") || "(none)";
      const hashPresent = rawHash ? `len=${rawHash.length}` : "absent";
      const diag = `no-code-no-hash;keys=${queryKeys};hash=${hashPresent};url=${href}`;
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
