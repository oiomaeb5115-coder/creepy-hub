/**
 * 不正な文字（/, :, ?, # 等）を含むslugを修正するスクリプト。
 *
 * 実行方法: npx tsx scripts/fix-bad-slugs.ts
 *
 * 対象: slugに [a-z0-9-] 以外の文字を含む投稿
 * 処理: タイトルからslugを再生成、英字なしの場合はnullに設定
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// .env.local を手動で読み込み
const envPath = resolve(__dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^\s*([\w]+)\s*=\s*(.+?)\s*$/);
  if (match) process.env[match[1]] = match[2];
}

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
  const { data: posts, error } = await supabase
    .from("post")
    .select("id, title, slug")
    .not("slug", "is", null);

  if (error) {
    console.error("投稿の取得に失敗:", error.message);
    process.exit(1);
  }

  // slug に不正文字を含む投稿を抽出
  const badPosts = (posts ?? []).filter((p) => p.slug && !/^[a-z0-9-]+$/.test(p.slug));

  if (badPosts.length === 0) {
    console.log("不正なslugを持つ投稿はありません。");
    return;
  }

  console.log(`${badPosts.length} 件の不正slug投稿を修正します...\n`);

  // 英語翻訳を一括取得
  const postIds = badPosts.map((p) => p.id);
  const { data: translations } = await supabase
    .from("post_translations")
    .select("post_id, title")
    .in("post_id", postIds)
    .eq("locale", "en");

  const translationMap = new Map<number, string>();
  for (const tr of translations ?? []) {
    if (tr.title) translationMap.set(tr.post_id, tr.title);
  }

  let fixed = 0;

  for (const post of badPosts) {
    const enTitle = translationMap.get(post.id);
    const newSlug = generateSlug(enTitle ?? "") ?? generateSlug(post.title ?? "");

    const { error: updateError } = await supabase
      .from("post")
      .update({ slug: newSlug })
      .eq("id", post.id);

    if (updateError) {
      console.error(`  [ERROR] #${post.id}: ${updateError.message}`);
    } else {
      console.log(`  [FIXED] #${post.id} "${post.slug}" → ${newSlug ?? "(null)"}`);
      fixed++;
    }
  }

  console.log(`\n完了: ${fixed} 件修正`);
}

main();
