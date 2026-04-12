import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  // Vercel Cron からのリクエストのみ許可（タイミングアタック対策）
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const secret = process.env.CRON_SECRET ?? "";
  const valid =
    token.length > 0 &&
    secret.length > 0 &&
    token.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3日前のタイムスタンプ
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // 投稿のパージ（先に Stream 動画を削除してからDBレコード削除）
  const { data: postsToDelete } = await supabase
    .from("post")
    .select("id, stream_video_id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  // Cloudflare Stream 動画を削除
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfApiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (postsToDelete && cfAccountId && cfApiToken) {
    const streamIds = postsToDelete
      .map((p) => p.stream_video_id)
      .filter((id): id is string => !!id);

    await Promise.allSettled(
      streamIds.map((uid) =>
        fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${uid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${cfApiToken}` },
        })
      )
    );
  }

  const { count: postsCount, error: postsError } = await supabase
    .from("post")
    .delete({ count: "exact" })
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (postsError) {
    console.error("[cron/cleanup] posts error:", postsError.message);
  }

  // Wiki記事のパージ（全ロケール）
  const { count: wikisCount, error: wikisError } = await supabase
    .from("wiki_pages")
    .delete({ count: "exact" })
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (wikisError) {
    console.error("[cron/cleanup] wiki_pages error:", wikisError.message);
  }

  // カテゴリのパージ
  const { count: catsCount, error: catsError } = await supabase
    .from("story_categories")
    .delete({ count: "exact" })
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (catsError) {
    console.error("[cron/cleanup] story_categories error:", catsError.message);
  }

  // ── 期限切れストーリーのパージ ──
  let storiesCount = 0;
  const now = new Date().toISOString();

  // 1. 期限切れストーリーのメディアURLとStream IDを取得
  const { data: expiredStories } = await supabase
    .from("user_stories")
    .select("id, media_url, stream_video_id")
    .lt("expires_at", now);

  if (expiredStories && expiredStories.length > 0) {
    // 2a. Cloudflare Stream 動画を削除
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
    if (accountId && apiToken) {
      const streamIds = expiredStories
        .map((s) => s.stream_video_id)
        .filter((id): id is string => !!id);

      await Promise.allSettled(
        streamIds.map((uid) =>
          fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiToken}` },
          })
        )
      );
    }

    // 2b. Supabase Storage からファイル削除（レガシー）
    const filePaths = expiredStories
      .map((s) => {
        try {
          const url = new URL(s.media_url);
          const match = url.pathname.match(/\/story-media\/(.+)$/);
          return match ? match[1] : null;
        } catch {
          return null;
        }
      })
      .filter((p): p is string => p !== null);

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("story-media")
        .remove(filePaths);
      if (storageError) {
        console.error("[cron/cleanup] story-media storage error:", storageError.message);
      }
    }

    // 3. DBレコード削除
    const { count, error: storiesError } = await supabase
      .from("user_stories")
      .delete({ count: "exact" })
      .lt("expires_at", now);

    if (storiesError) {
      console.error("[cron/cleanup] user_stories error:", storiesError.message);
    }
    storiesCount = count ?? 0;
  }

  console.log(
    `[cron/cleanup] purged: posts=${postsCount ?? 0}, wikis=${wikisCount ?? 0}, categories=${catsCount ?? 0}, stories=${storiesCount}`
  );

  return NextResponse.json({
    purged: {
      posts: postsCount ?? 0,
      wikis: wikisCount ?? 0,
      categories: catsCount ?? 0,
      stories: storiesCount,
    },
  });
}
