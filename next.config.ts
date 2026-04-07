import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const csp = [
      "default-src 'self'",
      // ⚠ SECURITY: 'unsafe-inline' は XSS 保護を弱めるため要改善。
      // Next.js App Router はインラインスクリプトを生成するので nonce なしでは除去不可。
      // 対策: middleware.ts で nonce を生成し、script-src 'nonce-xxx' に移行すること。
      // 参考: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
      `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""} https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net`,
      // Tailwind CSS / Next.js がインラインスタイルを使用するため必要
      "style-src 'self' 'unsafe-inline'",
      // Supabase Storage・外部画像・アバタークロッパー用 blob: を許可
      "img-src 'self' https: blob:",
      // Supabase API・Cloudflare Workers AI への接続を許可
      "connect-src 'self' https://*.supabase.co https://api.cloudflare.com https://unpkg.com blob:",
      // ffmpeg.wasm の Web Worker 用
      "worker-src 'self' blob:",
      // フォント（必要に応じて追加）
      "font-src 'self'",
      // iframe 埋め込みを全面禁止（X-Frame-Options: DENY と同等）
      "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
      "frame-ancestors 'none'",
      // object タグを禁止
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
