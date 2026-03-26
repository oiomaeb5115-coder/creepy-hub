import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js のインラインスクリプト（nonce なし構成）に必要
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Supabase Storage・外部画像を許可
      "img-src 'self' data: https:",
      // Supabase API・Google Translate API への接続を許可
      "connect-src 'self' https://*.supabase.co https://translation.googleapis.com",
      // フォント（必要に応じて追加）
      "font-src 'self'",
      // iframe 埋め込みを全面禁止（X-Frame-Options: DENY と同等）
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
