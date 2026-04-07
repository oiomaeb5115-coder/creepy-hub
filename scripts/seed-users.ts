/**
 * ダミーアカウント一括生成スクリプト。
 *
 * 実行方法: npx tsx --env-file=.env.local scripts/seed-users.ts [件数]
 *
 * 例: npx tsx --env-file=.env.local scripts/seed-users.ts 15
 *     (デフォルト: 10件)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISPLAY_NAMES = [
  "やみねこ",
  "深淵のささやき",
  "ゴースト探偵",
  "呪いの館住人",
  "真夜中の散歩者",
  "怪談コレクター",
  "霧の中の影",
  "廃墟マニア",
  "心霊スポット巡り",
  "百物語の語り部",
  "闇夜のカラス",
  "ポルターガイスト",
  "怨念リサーチャー",
  "地下室の住人",
  "黄昏の旅人",
  "不気味ちゃん",
  "ノイズだらけ",
  "深夜徘徊部",
  "異界の観測者",
  "都市伝説マスター",
  "幽霊屋敷の管理人",
  "暗黒メルヘン",
  "夜霧のストーカー",
  "禁忌の探求者",
  "ミッドナイトラジオ",
  "恐怖新聞の配達員",
  "学校の怪談係",
  "おばけ好き",
  "ホラー中毒",
  "深海のサイレン",
];

const BIOS = [
  "怖い話が好きです。",
  "心霊スポット巡りが趣味。",
  "ホラー映画は毎週観てます。",
  "怪談についていろいろ調べてます。",
  "廃墟探索にハマってます。",
  "夜中に散歩するのが日課。",
  "都市伝説を集めています。",
  "怖い体験をシェアしたい。",
  "",
  "",
];

const PASSWORD = "CreepyHub2024!seed";

function generateRandomUsername(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `user_${n}`;
}

async function findUniqueUsername(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateRandomUsername();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("ユニークなユーザー名を生成できませんでした");
}

async function main() {
  const count = Math.min(parseInt(process.argv[2] || "10", 10), DISPLAY_NAMES.length);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("環境変数が設定されていません。--env-file=.env.local を付けて実行してください。");
    process.exit(1);
  }

  console.log(`\n=== ダミーアカウント生成: ${count}件 ===\n`);
  console.log(`パスワード: ${PASSWORD}\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < count; i++) {
    const email = `dummy${i + 1}@creepyhub.local`;
    const displayName = DISPLAY_NAMES[i % DISPLAY_NAMES.length];
    const bio = BIOS[i % BIOS.length];

    // 既存チェック
    const { data: existing } = await supabase.auth.admin.listUsers();
    const alreadyExists = existing?.users?.some((u) => u.email === email);
    if (alreadyExists) {
      console.log(`[SKIP] ${email} (既に存在)`);
      skipped++;
      continue;
    }

    // ユーザー作成
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });

    if (userError || !userData.user) {
      console.error(`[FAIL] ${email}: ${userError?.message}`);
      failed++;
      continue;
    }

    // プロフィール作成
    const username = await findUniqueUsername();
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      username,
      display_name: displayName,
      bio: bio || null,
      is_public: true,
    });

    if (profileError) {
      console.error(`[FAIL] プロフィール作成失敗 ${email}: ${profileError.message}`);
      failed++;
      continue;
    }

    console.log(`[OK] ${email} → ${username} (${displayName})`);
    created++;
  }

  console.log(`\n=== 完了: 作成=${created} スキップ=${skipped} 失敗=${failed} ===\n`);
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
