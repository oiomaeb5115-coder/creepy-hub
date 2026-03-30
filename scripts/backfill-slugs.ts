/**
 * 既存投稿のslugを一括生成するスクリプト。
 *
 * 実行方法: npx tsx scripts/backfill-slugs.ts
 *
 * 1. 英語翻訳タイトルがあればそこからslugを生成
 * 2. 元タイトルに英字が含まれていればそこから生成
 * 3. どちらもなければスキップ（slugはnullのまま）
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateSlug(title: string): string | null {
  if (!title) return null;
  if (!/[a-zA-Z]/.test(title)) return null;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return slug || null;
}

async function main() {
  // slug未設定の投稿を取得
  const { data: posts, error } = await supabase
    .from("post")
    .select("id, title")
    .is("slug", null)
    .eq("is_published", true);

  if (error) {
    console.error("投稿の取得に失敗:", error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("slug未設定の投稿はありません。");
    return;
  }

  console.log(`${posts.length} 件の投稿を処理します...\n`);

  // 英語翻訳を一括取得
  const postIds = posts.map((p) => p.id);
  const { data: translations } = await supabase
    .from("post_translations")
    .select("post_id, title")
    .in("post_id", postIds)
    .eq("locale", "en");

  const translationMap = new Map<number, string>();
  for (const tr of translations ?? []) {
    if (tr.title) translationMap.set(tr.post_id, tr.title);
  }

  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    // 英語翻訳タイトルを優先、なければ元タイトル
    const enTitle = translationMap.get(post.id);
    const slug = generateSlug(enTitle ?? "") ?? generateSlug(post.title ?? "");

    if (!slug) {
      console.log(`  [SKIP] #${post.id} "${post.title}" → slug生成不可（英字なし）`);
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("post")
      .update({ slug })
      .eq("id", post.id);

    if (updateError) {
      console.error(`  [ERROR] #${post.id}: ${updateError.message}`);
    } else {
      console.log(`  [OK] #${post.id} "${post.title}" → /${slug}`);
      updated++;
    }
  }

  console.log(`\n完了: ${updated} 件更新, ${skipped} 件スキップ`);
}

main();
