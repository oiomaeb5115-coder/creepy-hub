# creepy.hub

ホラーコンテンツ投稿・共有プラットフォームの Web 本体（Next.js 16 / React 19）。

ストーリー（怪談）投稿、Wiki（辞典）、コメント・通知・地図・動画・ノベル機能を提供する。iOS / Android アプリは本サイトを WebView で表示する。

## 構成

| ディレクトリ | 内容 |
|---|---|
| `app/` | App Router のルート定義（`[locale]` 配下に ja/en の各ページ、`api/` 配下にサーバ API） |
| `components/` | 再利用可能な React コンポーネント |
| `lib/` | ドメインロジック・外部サービス連携（Supabase / Cloudflare / Resend など） |
| `lib/__tests__/` | Vitest によるユニットテスト |
| `supabase/migrations/` | Supabase に当てる SQL マイグレーション |
| `scripts/` | データ補修・ノベル取り込み等の運用スクリプト |
| `locales/` | i18n 文言（ja / en） |

依存関係の詳細は [FILE_MAP.md](./FILE_MAP.md) を参照。

## 必須の環境変数

`.env.local` を作成し、以下を設定する。

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase プロジェクト URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key（RLS 経由のアクセス用）
- `SUPABASE_SERVICE_ROLE_KEY` — service role key（**サーバ専用、絶対にクライアントに露出させない**）

### Cloudflare Stream（動画アップロード・配信）
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_API_TOKEN`
- `NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` — `customer-XXXX` 形式のサブドメイン

### メール（Resend）
- `RESEND_API_KEY`

### 翻訳・AI
- `ANTHROPIC_API_KEY` — Claude 経由の翻訳
- `GOOGLE_TRANSLATE_API_KEY` — Google 翻訳のフォールバック

### その他
- `SITE_URL` — 本番 URL（OGP・メールリンク用）
- `CRON_SECRET` — Vercel Cron のリクエスト認証用ランダム文字列

`.env.local` は `.gitignore` 済み。本番値は Vercel の Environment Variables に設定する。

## ローカル開発

```bash
npm install
npm run dev        # http://localhost:3000
```

主要スクリプト:

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm start` | ビルド成果物の起動 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 型チェック（`tsc --noEmit`） |
| `npm test` | Vitest（`lib/__tests__/`） |
| `npm run test:watch` | Vitest watch モード |

## Supabase マイグレーション

`supabase/migrations/` 内の SQL を Supabase ダッシュボードの SQL Editor で順に実行する（または `supabase db push` を使う）。マイグレーション履歴は手動管理。

## CI

`.github/workflows/ci.yml` で push / PR ごとに以下を実行する。

- `npm run typecheck`（必須ゲート）
- `npm test`（必須ゲート）
- `npm run lint`（既存違反多数のため `continue-on-error: true`）

## セキュリティ・仕様メモ

- [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) — セキュリティ監査ログ
- [SENSITIVE_FEATURE_SPEC.md](./SENSITIVE_FEATURE_SPEC.md) — センシティブ画像機能の仕様
- [AD_IMPLEMENTATION_NOTES.md](./AD_IMPLEMENTATION_NOTES.md) — 広告周り

## 関連プロジェクト（リポジトリ外）

- `../creepy-map/` — 地図表示用の独立アプリ（React Leaflet）
- `../CreepyHub-iOS/` — iOS WebView アプリ（SwiftUI / XcodeGen）
- `../games/` — 単体 HTML ゲーム
