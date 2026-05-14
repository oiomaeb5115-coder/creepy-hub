"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AndroidAuthBridge = {
  onSession?: (json: string) => void;
  onLogout?: () => void;
};

declare global {
  interface Window {
    __creepyHubNavigate?: (path: string) => void;
    __creepyHubLogout?: (locale: string) => void;
    __creepyHubOpenAuth?: (modal: "login" | "register") => void;
    __creepyHubSignInWithGoogle?: (idToken: string, nonce: string) => void;
    AndroidAuth?: AndroidAuthBridge;
  }
}

type ProfileRow = {
  avatar_url: string | null;
  display_name: string | null;
  username: string | null;
  role: string | null;
};

type NotifCount = { unread?: number; pendingCategories?: number };

/**
 * Bridges Web-side Next.js state to the native Android shell.
 *
 *   - `window.__creepyHubNavigate(path)` — used by native toolbar / drawer
 *      taps to do a client-side route push instead of a full WebView reload.
 *   - Pushes Supabase session + profile + notification count into the native
 *     `AuthBridge` (`window.AndroidAuth`) on every auth state change.
 *
 * Only mounted inside the native shell (gated by `isAppShell` in
 * `layout.tsx`), so it's a no-op for browser users.
 */
export default function NativeBridge() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    window.__creepyHubNavigate = (path: string) => {
      try {
        router.push(path);
      } catch {
        window.location.href = path;
      }
    };
    window.__creepyHubLogout = (locale: string) => {
      void (async () => {
        try {
          await supabase.auth.signOut();
        } finally {
          window.location.href = `/${locale}`;
        }
      })();
    };
    window.__creepyHubOpenAuth = (modal: "login" | "register") => {
      const search = new URLSearchParams(window.location.search);
      search.set("modal", modal);
      const target = `${pathname}?${search.toString()}`;
      try {
        router.replace(target);
      } catch {
        window.location.href = target;
      }
    };
    window.__creepyHubSignInWithGoogle = (idToken: string, nonce: string) => {
      void (async () => {
        try {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: idToken,
            nonce,
          });
          if (error) {
            console.error("[NativeBridge] signInWithIdToken failed:", error);
          }
          // onAuthStateChange will fire and push the new session to AuthBridge.
        } catch (err) {
          console.error("[NativeBridge] signInWithIdToken threw:", err);
        }
      })();
    };
    return () => {
      if (window.__creepyHubNavigate) delete window.__creepyHubNavigate;
      if (window.__creepyHubLogout) delete window.__creepyHubLogout;
      if (window.__creepyHubOpenAuth) delete window.__creepyHubOpenAuth;
      if (window.__creepyHubSignInWithGoogle) delete window.__creepyHubSignInWithGoogle;
    };
  }, [router, pathname]);

  useEffect(() => {
    let cancelled = false;

    const push = async () => {
      const bridge = window.AndroidAuth;
      if (!bridge) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session?.user) {
          bridge.onLogout?.();
          return;
        }

        const userId = session.user.id;
        const accessToken = session.access_token;

        const [profileRes, notifRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("avatar_url, display_name, username, role")
            .eq("id", userId)
            .single(),
          fetch("/api/notifications/count", {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
            .then((r) => (r.ok ? (r.json() as Promise<NotifCount>) : null))
            .catch(() => null),
        ]);
        if (cancelled) return;

        const profile = (profileRes.data ?? {}) as Partial<ProfileRow>;
        const notif = notifRes ?? {};
        const payload = {
          loggedIn: true,
          accessToken,
          userId,
          displayName: profile.display_name ?? null,
          username: profile.username ?? null,
          avatarUrl: profile.avatar_url ?? null,
          isAdmin: profile.role === "admin",
          notificationCount:
            (notif.unread ?? 0) + (notif.pendingCategories ?? 0),
        };
        bridge.onSession?.(JSON.stringify(payload));
      } catch {
        // Network or auth glitch — ignore; next state change will retry.
      }
    };

    push();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      push();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
