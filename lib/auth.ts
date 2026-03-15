import { supabase } from "./supabase";

type AuthCache = {
  isAdmin: boolean;
  token: string | null;
  userId: string | null;
  resolvedAt: number;
};

// モジュールスコープで1回だけ解決し、5分間キャッシュ
let cache: AuthCache | null = null;
let pending: Promise<AuthCache> | null = null;

async function resolveAuth(): Promise<AuthCache> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return { isAdmin: false, token: null, userId: null, resolvedAt: Date.now() };
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  return {
    isAdmin: data?.role === "admin",
    token: session.access_token,
    userId: session.user.id,
    resolvedAt: Date.now(),
  };
}

function getCache(): Promise<AuthCache> {
  const TTL = 5 * 60 * 1000; // 5分
  if (cache && Date.now() - cache.resolvedAt < TTL) {
    return Promise.resolve(cache);
  }
  if (!pending) {
    pending = resolveAuth().then((result) => {
      cache = result;
      pending = null;
      return result;
    });
  }
  return pending;
}

/** 認証キャッシュをリセット（ログイン・ログアウト時に呼ぶ） */
export function clearAuthCache() {
  cache = null;
  pending = null;
}

/** ログイン中ユーザーの role が "admin" かどうかを返す */
export async function getIsAdmin(): Promise<boolean> {
  return (await getCache()).isAdmin;
}

/** ログイン中ユーザーの JWT アクセストークンを返す */
export async function getAccessToken(): Promise<string | null> {
  return (await getCache()).token;
}
