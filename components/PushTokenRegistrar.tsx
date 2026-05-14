"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isIOSApp } from "@/lib/isIOSApp";
import { isAndroidApp } from "@/lib/isCreepyHubApp";

type Platform = "ios" | "android";

type WindowWithBridges = Window & {
  __onPushToken?: (token: string, platform: Platform) => void;
  AndroidPush?: { requestToken: () => void };
  webkit?: {
    messageHandlers?: {
      requestPushToken?: { postMessage: (msg: unknown) => void };
    };
  };
};

async function registerToken(token: string, platform: Platform) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken || !token) return;

  try {
    await fetch("/api/push/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform }),
    });
  } catch (err) {
    console.error("[push] register failed", err);
  }
}

function requestNativeToken() {
  const w = window as WindowWithBridges;
  if (isIOSApp()) {
    w.webkit?.messageHandlers?.requestPushToken?.postMessage({});
  } else if (isAndroidApp()) {
    w.AndroidPush?.requestToken();
  }
}

export default function PushTokenRegistrar() {
  useEffect(() => {
    if (!isIOSApp() && !isAndroidApp()) return;

    const w = window as WindowWithBridges;
    w.__onPushToken = (token, platform) => {
      void registerToken(token, platform);
    };

    let triggered = false;
    const triggerIfSession = async () => {
      if (triggered) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        triggered = true;
        requestNativeToken();
      }
    };

    void triggerIfSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !triggered) {
        triggered = true;
        requestNativeToken();
      }
    });

    return () => {
      subscription.unsubscribe();
      delete w.__onPushToken;
    };
  }, []);

  return null;
}
