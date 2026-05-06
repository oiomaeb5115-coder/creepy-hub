# センシティブ画像モザイク機能 — 実装仕様書（v2：実コード調査反映版）

> 新しい Claude Code セッションにこのファイル全体を貼り付ければ、そのまま実装開始できる形式。  
> 作業ディレクトリ: `/Users/kawakangenryuu/Desktop/creepy.hub/creepy.hub`

---

## 0. 目的

年齢制限が必要な画像（R18 等）を保護するため、以下の 2 機能を実装する。

1. **モザイク機能** — センシティブフラグ付き画像は、投稿者以外には CSS ブラーでぼかして表示
2. **一時 reveal 機能** — 投稿者以外が明示的にクリックしたときだけ、一定時間（10 秒）モザイクを解除し、タイマー切れで自動再モザイク化

対象は **post（投稿）画像** と **file（＝ user_stories：Instagram 風 24 時間ストーリー）画像** の両方。

---

## 1. 実コード調査で判明している前提

### 1-1. DB
- テーブル名は **単数形** `post`（`posts` ではない）
- ストーリーは `user_stories`（`media_url text`, `media_type text check in ('image','video')`, `expires_at timestamptz`）
- 投稿者 ID カラムは **`user_id`**（`author_id` ではない）
- 画像は 3 枚まで: `image_url`, `image_url_2`, `image_url_3`
- マイグレーションファイルは `supabase/migrations/add_*.sql` という命名規則（タイムスタンプ prefix は使っていない）

### 1-2. 画面
- 投稿詳細: `app/[locale]/post/[id]/[slug]/page.tsx`（Server Component、`supabaseAdmin` 使用）
- 投稿新規: `app/[locale]/post/new/page.tsx`（**PostDrawer ではなく** こちら。Client Component、`supabase` クライアント使用）
- 投稿編集: `app/[locale]/post/[id]/edit/page.tsx`（Client Component、更新は `PATCH /api/post/[id]` 経由）
- 画像ギャラリー: `components/PostImageGallery.tsx`（Client Component）
- 投稿更新 API: `app/api/post/[id]/route.ts`（ホワイトリスト型：body から許可キーだけ `updateData` に流し込む）

### 1-3. クライアント／サーバー Supabase
- `lib/supabase.ts` — ブラウザ側用（anon key）
- `lib/supabaseAdmin.ts` — サーバー側用（service role）
- 詳細ページは **現状クライアント認証情報を取っていない**。`isOwner` 判定のためにサーバー側で Cookie セッションから `user_id` を取る必要がある → Supabase SSR helper（`@supabase/ssr`）を追加するか、`lib/apiAuth.ts` の実装を参考にする

### 1-4. i18n
- `locales/ja.json`, `locales/en.json`
- 投稿フォームのラベルは `postDrawer.*` の下にある（`labels.titleLabel` 等）
- 投稿詳細側は `dict.post.*` と `dict.common.*`

---

## 2. データモデル変更

### 2-1. マイグレーション新規作成

ファイル: `supabase/migrations/add_post_is_sensitive.sql`

```sql
-- 投稿にセンシティブフラグを追加
ALTER TABLE post
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_post_is_sensitive ON post(is_sensitive);

-- user_stories（file = ストーリー）にも同様に追加
ALTER TABLE user_stories
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;
```

### 2-2. ビュー再作成の注意

`add_post_with_counts_view.sql` と `update_posts_with_location_view_with_*.sql` で `posts_with_counts` 相当のビューがあると思われるので、**ビューで `post` 全カラムを引いているなら `is_sensitive` を含めるよう再作成**する必要あり。該当ビュー SQL を開いて、`SELECT ... FROM post` を `is_sensitive` も含むように更新。

### 2-3. 型定義
投稿の `PostRow` 型（`app/[locale]/post/[id]/[slug]/page.tsx` L107）に `is_sensitive: boolean | null;` を追加。ほかに `lib/` や共有型があればそこも。

---

## 3. 新規コンポーネント

### 3-1. `components/SensitiveImage.tsx`（Client）

```tsx
"use client";
/**
 * SensitiveImage
 * -----------------------------------------------------------------------------
 * ⚠️ 注意: CSS `filter: blur()` は見た目の保護に過ぎない。
 *  - DevTools から元画像 URL を開けば原寸で DL 可能
 *  - 本気で守るなら Supabase Storage `createSignedUrl()` + サーバー側で事前ぼかし派生を
 *    生成するのが正攻法
 *  - 本実装は第一段階として「通常閲覧での誤視認防止」＋「年齢ゲート」を目的とする
 * -----------------------------------------------------------------------------
 */
import { useEffect, useRef, useState } from "react";
import AgeGateModal from "./AgeGateModal";

type Dict = {
  reveal: string;
  hide: string;
  overlay: string;
  ageGatePrompt: string;
  ageGateConfirm: string;
  ageGateCancel: string;
};

type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  revealDurationMs?: number;
  dict: Dict;
  /** reveal 状態を外から制御したい場合（例: ライトボックス側と同期） */
  revealed?: boolean;
  onRevealChange?: (revealed: boolean) => void;
};

const AGE_STORAGE_KEY = "creepy.ageVerified";

export default function SensitiveImage({
  src,
  alt,
  className,
  style,
  revealDurationMs = 10_000,
  dict,
  revealed: revealedProp,
  onRevealChange,
}: Props) {
  const [internalRevealed, setInternalRevealed] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealed = revealedProp ?? internalRevealed;

  const setRevealed = (v: boolean) => {
    if (revealedProp === undefined) setInternalRevealed(v);
    onRevealChange?.(v);
  };

  useEffect(() => {
    if (!revealed) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), revealDurationMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [revealed, revealDurationMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestReveal = () => {
    if (typeof window !== "undefined" &&
        localStorage.getItem(AGE_STORAGE_KEY) === "yes") {
      setRevealed(true);
    } else {
      setShowGate(true);
    }
  };

  const onAgeConfirm = () => {
    localStorage.setItem(AGE_STORAGE_KEY, "yes");
    setShowGate(false);
    setRevealed(true);
  };

  return (
    <>
      <div
        className={className}
        style={{ position: "relative", overflow: "hidden", ...style }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "filter 0.2s ease, transform 0.2s ease",
            filter: revealed ? "none" : "blur(24px)",
            transform: revealed ? "none" : "scale(1.05)",
          }}
        />
        {!revealed && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); requestReveal(); }}
            style={overlayBtn}
            aria-label={dict.reveal}
          >
            <span style={{ fontSize: 28 }}>🔞</span>
            <span style={{ fontSize: 12, marginTop: 6, textAlign: "center", padding: "0 16px" }}>
              {dict.overlay}
            </span>
          </button>
        )}
        {revealed && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setRevealed(false); }}
            style={hideBtn}
          >
            {dict.hide}
          </button>
        )}
      </div>
      <AgeGateModal
        open={showGate}
        onConfirm={onAgeConfirm}
        onCancel={() => setShowGate(false)}
        dict={{
          prompt: dict.ageGatePrompt,
          confirm: dict.ageGateConfirm,
          cancel: dict.ageGateCancel,
        }}
      />
    </>
  );
}

const overlayBtn: React.CSSProperties = {
  position: "absolute", inset: 0, width: "100%", height: "100%",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  background: "rgba(0,0,0,0.35)", color: "#f0e0e0",
  border: "none", cursor: "pointer",
  backdropFilter: "blur(2px)",
};
const hideBtn: React.CSSProperties = {
  position: "absolute", top: 8, right: 8,
  background: "rgba(0,0,0,0.6)", color: "#f0e0e0",
  border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4,
  fontSize: 11, padding: "4px 10px", cursor: "pointer",
};
```

### 3-2. `components/AgeGateModal.tsx`（Client）

```tsx
"use client";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  dict: { prompt: string; confirm: string; cancel: string };
};

export default function AgeGateModal({ open, onConfirm, onCancel, dict }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div style={overlay} role="dialog" aria-modal="true" onClick={onCancel}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: 0, lineHeight: 1.6, color: "#e8d8d0" }}>{dict.prompt}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" onClick={onCancel} style={secondaryBtn}>{dict.cancel}</button>
          <button type="button" onClick={onConfirm} style={primaryBtn}>{dict.confirm}</button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
};
const card: React.CSSProperties = {
  background: "#1a0c10", border: "1px solid rgba(180,100,110,0.35)",
  borderRadius: 6, padding: 24, maxWidth: 380, width: "calc(100% - 40px)",
  color: "#e8d8d0",
};
const primaryBtn: React.CSSProperties = {
  padding: "8px 16px", background: "#6b1a22", border: "1px solid #8b3a42",
  color: "#f0e0e0", borderRadius: 4, cursor: "pointer", fontSize: 13,
};
const secondaryBtn: React.CSSProperties = {
  padding: "8px 16px", background: "transparent", border: "1px solid rgba(180,100,110,0.35)",
  color: "#b08888", borderRadius: 4, cursor: "pointer", fontSize: 13,
};
```

---

## 4. 既存ファイル改修

### 4-1. `components/PostImageGallery.tsx`

**追加する props:**
```ts
type PostImageGalleryProps = {
  imageUrls: string[];
  title: string;
  isSensitive?: boolean;   // ← 追加
  isOwner?: boolean;       // ← 追加
  sensitiveDict?: {        // ← 追加
    reveal: string; hide: string; overlay: string;
    ageGatePrompt: string; ageGateConfirm: string; ageGateCancel: string;
  };
};
```

**描画分岐（サムネイル側とライトボックス側の両方）:**

```tsx
const needsBlur = !!isSensitive && !isOwner;

// サムネイル
{needsBlur && sensitiveDict ? (
  <SensitiveImage
    src={url}
    alt={`${title} ${index + 1}`}
    className={styles.storyDetailImage}
    dict={sensitiveDict}
  />
) : (
  <img src={url} alt={...} className={styles.storyDetailImage} />
)}

// ライトボックス
{needsBlur && sensitiveDict ? (
  <SensitiveImage
    src={imageUrls[currentIndex]}
    alt={`${title} ${currentIndex + 1}`}
    className={styles.storyLightboxImage}
    dict={sensitiveDict}
  />
) : (
  <img src={imageUrls[currentIndex]} alt={...} className={styles.storyLightboxImage} />
)}
```

### 4-2. `app/[locale]/post/[id]/[slug]/page.tsx`

1. `select` リストに `is_sensitive` を追加（L164）
2. `PostRow` 型に `is_sensitive: boolean | null;` を追加
3. `OpenGraph.images` を `is_sensitive=true` なら空にする
4. **サーバー側で現在ユーザーを取得して `isOwner` を算出**

   supabase-ssr の cookies ベースクライアントを使う。参考実装:
   ```ts
   import { cookies } from "next/headers";
   import { createServerClient } from "@supabase/ssr";
   
   const cookieStore = await cookies();
   const supabaseSSR = createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     {
       cookies: {
         get: (n) => cookieStore.get(n)?.value,
         set: () => {},   // Server Component では書かない
         remove: () => {},
       },
     }
   );
   const { data: { user: currentUser } } = await supabaseSSR.auth.getUser();
   const isOwner = !!currentUser && currentUser.id === post.user_id;
   ```
   ※ `@supabase/ssr` がまだ入っていなければ `npm i @supabase/ssr` が必要。`lib/apiAuth.ts` に既に入っているか確認。

5. `<PostImageGallery />` 呼び出しに `isSensitive`, `isOwner`, `sensitiveDict` を渡す:
   ```tsx
   <PostImageGallery
     imageUrls={imageUrls}
     title={displayTitle}
     isSensitive={post.is_sensitive ?? false}
     isOwner={isOwner}
     sensitiveDict={{
       reveal: dict.sensitive.reveal,
       hide: dict.sensitive.hide,
       overlay: dict.sensitive.overlay,
       ageGatePrompt: dict.sensitive.ageGatePrompt,
       ageGateConfirm: dict.sensitive.ageGateConfirm,
       ageGateCancel: dict.sensitive.ageGateCancel,
     }}
   />
   ```

6. OGP 差し替え（`generateMetadata` 内）:
   ```ts
   ...(post.image_url && !post.is_sensitive ? { images: [{ url: post.image_url }] } : {}),
   ```

### 4-3. `app/[locale]/post/new/page.tsx`

- state 追加:
  ```ts
  const [isSensitive, setIsSensitive] = useState(false);
  ```
- 下書きの `localStorage` JSON にも `isSensitive` を含める（保存＆復元）
- 画像セクションの下あたりにトグル UI:
  ```tsx
  <div style={groupStyle}>
    <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="checkbox"
        checked={isSensitive}
        onChange={(e) => setIsSensitive(e.target.checked)}
      />
      <span>{labels.sensitiveToggle ?? "センシティブな内容"}</span>
    </label>
    <small style={slugHintStyle}>{labels.sensitiveToggleHelp}</small>
  </div>
  ```
- `supabase.from("post").insert([{ ..., is_sensitive: isSensitive }])`

### 4-4. `app/[locale]/post/[id]/edit/page.tsx`

- state 追加 `const [isSensitive, setIsSensitive] = useState(false);`
- 初期ロードの `select` に `is_sensitive` を追加し、`setIsSensitive(post.is_sensitive ?? false)`
- UI トグル追加（new ページと同様）
- PATCH body に `is_sensitive: isSensitive` を含める

### 4-5. `app/api/post/[id]/route.ts`

`PATCH` ハンドラのホワイトリスト:

1. 分割代入に `is_sensitive` を追加:
   ```ts
   const { title, content, category_id, image_url, ..., is_sensitive } = body;
   ```
2. バリデーション:
   ```ts
   if (is_sensitive !== undefined && typeof is_sensitive !== "boolean") {
     return NextResponse.json({ error: "is_sensitive が不正です" }, { status: 400 });
   }
   ```
3. `updateData` 詰め込み:
   ```ts
   if (is_sensitive !== undefined) updateData.is_sensitive = is_sensitive;
   ```

### 4-6. `user_stories` 側（file 扱い）

- `components/StoryCreator.tsx` にセンシティブトグルを追加し `user_stories.insert({... is_sensitive })`
- `components/StoryViewer.tsx` で現在ユーザーを取って `isOwner` を算出し、`!isOwner && is_sensitive` なら `<SensitiveImage>` ラップ
- ストーリーは画面全体表示なので、オーバーレイ UI はサイズだけ調整（`width:100%; height:100%`）

### 4-7. 他の画像露出点（任意だが推奨）

- `related posts` グリッド（`post/[id]/[slug]/page.tsx` L515-539）のサムネイルにも `is_sensitive` を反映すると、遷移前でも保護できる
- ホーム（`app/[locale]/page.tsx`）の新着怪談、`HomeContentTabs.tsx` も同様に検討
- これらは `is_sensitive` を select に追加し、`SensitiveImage` もしくは簡易 blur でカバー

---

## 5. i18n 追加

### `locales/ja.json`（ルート直下にキーを追加）

```jsonc
"sensitive": {
  "label": "センシティブ",
  "toggle": "センシティブな内容",
  "toggleHelp": "18歳未満に不適切な内容が含まれる場合にONにしてください",
  "reveal": "一時的に表示",
  "hide": "再度隠す",
  "overlay": "センシティブな画像です。タップで一時表示",
  "ageGatePrompt": "このコンテンツは18歳以上を対象としています。あなたは18歳以上ですか？",
  "ageGateConfirm": "はい（18歳以上）",
  "ageGateCancel": "いいえ"
}
```

### `locales/en.json`

```jsonc
"sensitive": {
  "label": "Sensitive",
  "toggle": "Sensitive content",
  "toggleHelp": "Turn on if this content is inappropriate for users under 18",
  "reveal": "Reveal temporarily",
  "hide": "Hide again",
  "overlay": "Sensitive image. Tap to reveal temporarily",
  "ageGatePrompt": "This content is intended for users aged 18 or older. Are you 18 or older?",
  "ageGateConfirm": "Yes (18+)",
  "ageGateCancel": "No"
}
```

### 型

`lib/getDictionary.ts` の `Dictionary` 型に `sensitive: { ... }` を追加。

### 投稿フォーム用の追加キー

`postDrawer` セクションに以下を追加（new / edit で参照）:

```jsonc
"sensitiveToggle": "センシティブな内容",
"sensitiveToggleHelp": "18歳未満に不適切な内容が含まれる場合にONにしてください"
```

---

## 6. 実装順（新セッションでの手順）

1. `FILE_MAP.md` と `SENSITIVE_FEATURE_SPEC.md` を読む
2. `supabase/migrations/add_post_is_sensitive.sql` を作成
3. `components/AgeGateModal.tsx` を作成
4. `components/SensitiveImage.tsx` を作成
5. `locales/ja.json` / `locales/en.json` に `sensitive.*` 追加
6. `lib/getDictionary.ts` の型更新
7. `components/PostImageGallery.tsx` を props 追加＋条件ラップに改修
8. `app/[locale]/post/[id]/[slug]/page.tsx` で
   - `is_sensitive` select に追加
   - SSR で `isOwner` 算出
   - PostImageGallery に props 渡す
   - OGP 分岐
9. `app/[locale]/post/new/page.tsx` にトグル追加＋ insert に `is_sensitive`
10. `app/[locale]/post/[id]/edit/page.tsx` にトグル追加＋ PATCH に `is_sensitive`
11. `app/api/post/[id]/route.ts` の PATCH にホワイトリスト追加＋バリデーション
12. `user_stories` 側（StoryCreator / StoryViewer）に同様の対応
13. `npm run build` で型・ビルド確認
14. 実DB にマイグレーションを流す（Supabase コンソール or CLI）

---

## 7. 動作確認チェックリスト

- [ ] マイグレーションが通り `post.is_sensitive`, `user_stories.is_sensitive` が追加されている
- [ ] 新規投稿でトグル ON にして投稿 → DB に `is_sensitive=true` で保存される
- [ ] 別ユーザーで詳細ページを開く → 画像がぼかされ、オーバーレイが表示される
- [ ] オーバーレイクリック → 初回なら年齢ゲートが出る
- [ ] 「はい」でゲート閉じ、画像が表示される
- [ ] 10 秒後に自動で再モザイク化される
- [ ] ライトボックス（画像クリック拡大）でも同じ挙動
- [ ] 投稿者本人で見るとモザイクなし
- [ ] 編集ページでトグルの変更が保存される
- [ ] user_stories でも同じ挙動
- [ ] `is_sensitive=true` のとき OGP に画像が含まれない
- [ ] `npm run build` 成功
- [ ] ja/en の文言がロケールで正しく切り替わる

---

## 8. セキュリティ注意（コードコメントにも明記）

- CSS blur は見た目の目隠しに過ぎない。DevTools から元 URL に直アクセスすれば原寸画像は取得可能。
- 完全な保護には:
  - Supabase Storage の `createSignedUrl()` で有限時間の URL を発行
  - サーバー側で事前にぼかした派生画像を生成して「デフォルトで返す画像」を差し替え
  - 年齢確認済みユーザーだけに本体 URL を返す API 経路を別途用意
- 今回は第一段階の UX 施策として CSS ブラー＋年齢ゲート＋UI 制御を実装する。

---

## 9. 制約・メモ

- `@supabase/ssr` が未導入の場合は `npm i @supabase/ssr` が必要（`lib/apiAuth.ts` で使われていれば既にあり）
- `posts_with_counts` 等のビューは再作成する必要あり（`is_sensitive` を含むよう）
- コミットは 1 機能 1 コミットで分割推奨（migration → components → pages → api の順）
- コメント・メッセージは日本語 OK

---

## 10. 新セッションへの最初のメッセージ（コピペ用）

> プロジェクトルート `/Users/kawakangenryuu/Desktop/creepy.hub/creepy.hub` にある `SENSITIVE_FEATURE_SPEC.md` を読んで、そこに記述されているセンシティブ画像モザイク機能を実装してください。  
> セクション 6 の実装順どおりに進めてください。途中で不明点があれば止めて質問してください。最後に `npm run build` で動作確認し、変更ファイル一覧と要約をまとめてください。
