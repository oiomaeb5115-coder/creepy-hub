# creepy.hub — ファイル依存関係マップ

## 1. レイヤー構造

```
[ブラウザ]
     │
     ▼
app/layout.tsx                    ← 全体の HTML ルート
     │
     ▼
app/[locale]/layout.tsx           ← 言語別共通ラッパー（nav・drawer・modal）
     │  使用: getDictionary, BottomNavProfileLink, PageTransition,
     │         PostDrawer, AuthDrawer, WelcomeVideoModal
     │
     ├─ app/[locale]/page.tsx (Home)
     ├─ app/[locale]/post/... (投稿系ページ)
     ├─ app/[locale]/wiki/... (Wiki系ページ)
     ├─ app/[locale]/account/... (アカウント系ページ)
     └─ app/[locale]/admin/...  など
          │
          ▼
     components/         ← UI パーツ（再利用可能なコンポーネント）
          │
          ▼
     lib/                ← ロジック・サービス（Supabase, Auth, 翻訳など）
          │
          ▼
     外部サービス: Supabase / Anthropic Claude / Resend / Cloudflare Workers AI

     ※ API ルート (app/api/) は上記とは別ルートで、
       クライアントコンポーネントから fetch() で呼ばれる
```

---

## 2. lib/ ファイル依存テーブル

| ファイル | 役割 | インポート元 (依存先) | どこから使われるか |
|---------|------|---------------------|-----------------|
| `lib/supabase.ts` | Supabase クライアント初期化 | — | `lib/auth.ts`, `lib/search.ts`, `lib/tags.ts`, 多数の page/component |
| `lib/auth.ts` | 認証キャッシュ・isAdmin・token取得 | `lib/supabase.ts` | `components/PostActionButtons.tsx`, `components/CategoryDeleteButton.tsx`, `app/[locale]/AuthDrawer.tsx`, `app/[locale]/PostDrawer.tsx` |
| `lib/apiAuth.ts` | APIルート用の管理者認証ヘルパー | `@supabase/ssr`, `next/headers` | `app/api/` 配下のルート各種 |
| `lib/getDictionary.ts` | i18n 辞書ロード（ja/en） | `locales/ja.json`, `locales/en.json` | `app/[locale]/layout.tsx`, ほぼすべての page |
| `lib/cfTranslate.ts` | Cloudflare Workers AI 翻訳 (70B+8B) | — | `app/api/translate/story/route.ts`, `app/api/translate/story-auto/route.ts`, `app/api/translate/wiki/route.ts`, `app/api/translate/wiki-auto/route.ts`, `app/api/category/create/route.ts` |
| `lib/slug.ts` | URL slug 生成 | — | `app/[locale]/PostDrawer.tsx`, `app/api/post/[id]/route.ts`, `scripts/backfill-slugs.ts` |
| `lib/postUrl.ts` | 投稿URL構築ヘルパー | — | 投稿リンクを含む全ページ・コンポーネント |
| `lib/search.ts` | 全文検索クエリ | `lib/supabase.ts` | `app/[locale]/search/page.tsx` |
| `lib/tags.ts` | タグ取得 | `lib/supabase.ts` | `app/[locale]/PostDrawer.tsx`, タグ関連ページ |
| `lib/genres.ts` | ジャンル定数配列 | — | カテゴリ作成フォームなど |
| `lib/wiki.ts` | Wiki HTML 生成 | — | wiki ページコンポーネント |
| `lib/wiki-autolink.ts` | Wiki 本文の自動リンク＋サニタイズ | — | `components/AutoLinkedwikiContent.tsx` |

---

## 3. components/ 依存テーブル

### 3-1. 投稿 (Post) 関連

| コンポーネント | インポート元 | 使われているページ |
|--------------|-------------|-----------------|
| `PostActionButtons.tsx` | `lib/supabase.ts`, `lib/auth.ts` | `app/[locale]/post/[id]/[slug]/page.tsx` |
| `PostBookmarkButton.tsx` | `lib/supabase.ts` | `app/[locale]/post/[id]/[slug]/page.tsx` |
| `PostComments.tsx` | `lib/supabase.ts` | `app/[locale]/post/[id]/[slug]/page.tsx` |
| `CommentTree.tsx` | — | `app/[locale]/post/[id]/[slug]/page.tsx` |
| `PostImageGallery.tsx` | — | `app/[locale]/post/[id]/[slug]/page.tsx` |
| `PostVoteButtons.tsx` | `lib/supabase.ts` | `app/[locale]/post/[id]/[slug]/page.tsx` |
| `PostReadTracker.tsx` | `lib/supabase.ts` | `app/[locale]/post/[id]/[slug]/page.tsx` |
| `PostRandomButton.tsx` | — | 投稿一覧系ページ |
| `TranslateButton.tsx` | `lib/postUrl.ts` | `app/[locale]/post/[id]/[slug]/page.tsx`, wiki 詳細ページ |
| `BackButton.tsx` | — | `app/[locale]/post/[id]/[slug]/page.tsx` など |

### 3-2. カテゴリ関連

| コンポーネント | インポート元 | 使われているページ |
|--------------|-------------|-----------------|
| `CategoryDeleteButton.tsx` | `lib/supabase.ts`, `lib/auth.ts` | カテゴリ詳細・編集ページ |
| `CategoryEditButton.tsx` | `lib/supabase.ts` | カテゴリ詳細ページ |
| `CategoryReportButton.tsx` | `lib/supabase.ts` | カテゴリ詳細ページ |
| `FavoriteCategoryButton.tsx` | `lib/supabase.ts` | カテゴリ詳細ページ |
| `FavoriteSidebar.tsx` | `lib/supabase.ts` | ホーム・サイドバー |

### 3-3. Wiki 関連

| コンポーネント | インポート元 | 使われているページ |
|--------------|-------------|-----------------|
| `AutoLinkedwikiContent.tsx` | `lib/wiki-autolink.ts` | `app/[locale]/wiki/[slug]/page.tsx` |
| `WikiActionButtons.tsx` | `lib/supabase.ts`, `lib/auth.ts` | `app/[locale]/wiki/[slug]/page.tsx` |
| `WikiCategoryEditButton.tsx` | `lib/supabase.ts` | Wiki カテゴリ詳細ページ |
| `WikiCategoryReportButton.tsx` | `lib/supabase.ts` | Wiki カテゴリ詳細ページ |
| `WikiReadTracker.tsx` | `lib/supabase.ts` | `app/[locale]/wiki/[slug]/page.tsx` |
| `WikiRandomButton.tsx` | — | wiki 一覧ページ |

### 3-4. 認証・ナビ・共通

| コンポーネント | インポート元 | 使われているページ |
|--------------|-------------|-----------------|
| `AdminPendingSection.tsx` | `lib/supabase.ts`, `lib/auth.ts` | `app/[locale]/page.tsx` (Home) |
| `AuthHeader.tsx` | `lib/supabase.ts`, `lib/auth.ts` | layout 系 |
| `ProfileCard.tsx` | — | `app/[locale]/u/[username]/page.tsx` |
| `SearchBox.tsx` | — | 検索ページ・ヘッダー |
| `FollowButton.tsx` | `lib/supabase.ts` | ユーザープロフィールページ |
| `WelcomeVideoModal.tsx` | — | `app/[locale]/layout.tsx` |
| `AvatarUploder.tsx` | — | アカウント設定ページ |

---

## 4. app/[locale]/ ページ別コンポーネント依存

| ページ | インポートしている主なもの |
|-------|------------------------|
| `layout.tsx` | `getDictionary`, `BottomNavProfileLink`, `PageTransition`, `PostDrawer`, `AuthDrawer`, `WelcomeVideoModal` |
| `page.tsx` (Home) | `supabase`, `getDictionary`, `HomeAuthButtons`, `AdminPendingSection` |
| `post/[id]/page.tsx` | リダイレクト専用（slug付きURLへ301転送） |
| `post/[id]/[slug]/page.tsx` | `supabase`, `getDictionary`, `postUrl`, `PostImageGallery`, `PostComments`, `PostVoteButtons`, `CommentTree`, `PostBookmarkButton`, `BackButton`, `TranslateButton`, `PostActionButtons`, `PostReadTracker` |
| `post/[id]/edit/page.tsx` | `supabase`, `getDictionary`, `auth` |
| `wiki/[slug]/page.tsx` | `supabase`, `getDictionary`, `AutoLinkedwikiContent`, `WikiActionButtons`, `WikiReadTracker`, `TranslateButton` |
| `wiki/submit/page.tsx` | `getDictionary`, `WikiSubmitClient` |
| `category/create/page.tsx` | `getDictionary`, `CategoryCreateClient` |
| `wiki/category/create/page.tsx` | `getDictionary`, `WikiCategoryCreateClient` |
| `account/page.tsx` | `supabase`, `getDictionary`, `ProfileCard`, `AvatarUploder` |
| `u/[username]/page.tsx` | `supabase`, `getDictionary`, `ProfileCard`, `FollowButton` |
| `search/page.tsx` | `lib/search.ts`, `getDictionary`, `SearchBox` |
| `admin/page.tsx` | `supabase`, `lib/auth.ts` (isAdmin チェック), `getDictionary` |
| `login/page.tsx` | `AuthDrawer` (または直接フォーム) |
| `notifications/page.tsx` | `supabase`, `getDictionary` |
| `bookmark/page.tsx` | `supabase`, `getDictionary` |

---

## 5. app/api/ ルートの依存

| API ルート | 呼ばれるケース | 使うライブラリ |
|-----------|--------------|--------------|
| `/api/auth/login` | `AuthDrawer` でログイン | `supabase`, `Resend` |
| `/api/auth/register` | `AuthDrawer` で登録 | `supabase` |
| `/api/auth/reset-password` | パスワードリセットフォーム | `supabase`, `Resend` |
| `/api/auth/unlock` | アカウントロック解除 | `supabase`, `lib/apiAuth.ts` |
| `/api/post/[id]` | 投稿取得・削除 | `supabase` |
| `/api/post/[id]/purge` | 永久削除 | `supabase`, `lib/apiAuth.ts` |
| `/api/post/[id]/restore` | 削除取り消し | `supabase`, `lib/apiAuth.ts` |
| `/api/post/random-exclude` | ランダム投稿取得 | `supabase` |
| `/api/category/create` | カテゴリ作成フォーム | `supabase` |
| `/api/category/[id]/approve` | 管理者が承認 | `supabase`, `lib/apiAuth.ts` |
| `/api/category/[id]/delete` | カテゴリ削除 | `supabase`, `lib/apiAuth.ts` |
| `/api/category/[id]/images` | 画像アップロード | `supabase` (Storage) |
| `/api/category/[id]/report` | カテゴリ報告 | `supabase` |
| `/api/wiki/[slug]` | Wiki取得・削除 | `supabase` |
| `/api/wiki/[slug]/purge` | Wiki永久削除 | `supabase`, `lib/apiAuth.ts` |
| `/api/wiki/random-exclude` | ランダムWiki取得 | `supabase` |
| `/api/wiki-category/create` | Wikiカテゴリ作成 | `supabase` |
| `/api/translate/story` | 投稿を英語に翻訳 | `lib/cfTranslate.ts` |
| `/api/translate/wiki` | WikiページをEN翻訳 | `lib/cfTranslate.ts` |
| `/api/notifications/count` | 通知バッジ数取得 | `supabase` |
| `/api/notifications/read` | 通知既読 | `supabase` |
| `/api/cron/cleanup` | 定期クリーンアップ | `supabase`, `lib/apiAuth.ts` |

---

## 6. 主要データフロー

### 認証フロー
```
AuthDrawer.tsx (client)
  → POST /api/auth/login or /register
    → supabase.auth.signIn / signUp
    → (ログイン失敗時) Resend でメール
  → clearAuthCache() (lib/auth.ts)
  → ページリロード
```

### 投稿作成フロー
```
PostDrawer.tsx (client)
  → getAllStoryTags() (lib/tags.ts → supabase)
  → 画像: POST /api/category/[id]/images → supabase Storage
  → 投稿: POST /api/category/create → supabase
  → 下書き: localStorage に自動保存
```

### 翻訳フロー
```
TranslateButton.tsx (client)
  → POST /api/translate/story (または /wiki)
    → lib/cfTranslate.ts → Cloudflare Workers AI (Llama 70B → 8B fallback)
    → 結果を post_translations テーブルに保存
  → ページ上の本文を翻訳後テキストで置換
```

### Wiki 自動リンクフロー
```
wiki/[slug]/page.tsx (server)
  → supabase から wiki データ取得
  → lib/wiki-autolink.ts → buildAutoLinkedHtml()
    → HTML サニタイズ + 他 Wiki ページへの自動リンク挿入
  → AutoLinkedwikiContent.tsx に渡してレンダリング
```
