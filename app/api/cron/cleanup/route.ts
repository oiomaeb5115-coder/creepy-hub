import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  // Vercel Cron からのリクエストのみ許可
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3日前のタイムスタンプ
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // 投稿のパージ
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

  console.log(
    `[cron/cleanup] purged: posts=${postsCount ?? 0}, wikis=${wikisCount ?? 0}, categories=${catsCount ?? 0}`
  );

  return NextResponse.json({
    purged: {
      posts: postsCount ?? 0,
      wikis: wikisCount ?? 0,
      categories: catsCount ?? 0,
    },
  });
}
