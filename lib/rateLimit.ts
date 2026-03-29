/**
 * シンプルなインメモリレート制限ユーティリティ。
 * サーバーレス環境（Vercel）では関数インスタンスごとにメモリが独立するため
 * 完全な保護にはならないが、単一インスタンス内での連続攻撃を防ぐ。
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const stores = new Map<string, Map<string, RateLimitEntry>>();

type RateLimitConfig = {
  /** レート制限の識別名（例: "register", "reset-password"） */
  name: string;
  /** ウィンドウ時間（ミリ秒） */
  windowMs: number;
  /** ウィンドウ内の最大リクエスト数 */
  maxRequests: number;
};

/**
 * レート制限をチェックする。
 * @returns { allowed: true } または { allowed: false, retryAfterMs: number }
 */
export function checkRateLimit(
  config: RateLimitConfig,
  key: string
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  if (!stores.has(config.name)) {
    stores.set(config.name, new Map());
  }
  const store = stores.get(config.name)!;

  const now = Date.now();
  const entry = store.get(key);

  // 期限切れまたは初回 → リセット
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count < config.maxRequests) {
    entry.count++;
    return { allowed: true };
  }

  return { allowed: false, retryAfterMs: entry.resetAt - now };
}

/**
 * 古いエントリを定期的にクリーンアップ（メモリリーク防止）。
 * 各ストアで5分ごとに実行。
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }
}, CLEANUP_INTERVAL);
