import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const csp = [
      "default-src 'self'",
      // ⚠ SECURITY: 'unsafe-inline' は XSS 保護を弱めるため要改善。
      // Next.js App Router はインラインスクリプトを生成するので nonce なしでは除去不可。
      // 対策: middleware.ts で nonce を生成し、script-src 'nonce-xxx' に移行すること。
      // 参考: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
      `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ""} https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adm.shinobi.jp`,
      // Tailwind CSS / Next.js がインラインスタイルを使用するため必要
      "style-src 'self' 'unsafe-inline'",
      // Supabase Storage・外部画像・アバタークロッパー用 blob: を許可
      // MapLibre の NavigationControl が data: URL の SVG アイコンを使うため data: も許可
      "img-src 'self' https: blob: data:",
      // Supabase API・Cloudflare Workers AI への接続を許可
      // MapLibre の CARTO dark basemap タイル取得用に basemaps.cartocdn.com を追加
      "connect-src 'self' https://*.supabase.co https://api.cloudflare.com https://unpkg.com https://*.shinobi.jp https://*.criteo.com https://*.amossp-sp.in https://*.cloudflarestream.com https://upload.videodelivery.net https://*.basemaps.cartocdn.com blob:",
      // browser-image-compression の Web Worker 用
      "worker-src 'self' blob:",
      // フォント（必要に応じて追加）
      "font-src 'self'",
      // iframe: 自サイトからの埋め込みのみ許可（広告用）
      "frame-src 'self' blob: https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.shinobi.jp https://*.criteo.com https://*.amossp-sp.in https://*.cloudflarestream.com",
      "frame-ancestors 'self'",
      // 音声・動画ソース（Supabase Storage の VOICEROID 音声等）
      "media-src 'self' https://*.supabase.co",
      // object タグを禁止
      "object-src 'none'",
    ].join("; ");

    return [
      // 広告用HTMLはCSPを緩和（忍者AdMaxのスクリプトが動作するため）
      {
        source: "/ads/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/((?!ads/).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
