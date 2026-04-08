# 忍者AdMax 広告実装メモ

## これまで広告が表示されなかった原因と対処法

### 1. document.write がブロックされた
- **原因**: 忍者AdMaxのスクリプトは `document.write` を使用するが、Next.jsのクライアントコンポーネント内で動的に `<script>` を挿入する方式では `document.write` が使えない
- **対処**: `public/ads/` に独立したHTMLファイルを作成し、`<iframe src="/ads/xxx.html">` で読み込む方式に変更

### 2. CSP (Content-Security-Policy) でブロックされた

#### frame-ancestors 'none'
- **原因**: CSPの `frame-ancestors 'none'` が全ページに適用されており、自サイト内のiframeも含めて全てのframing（埋め込み）がブロックされた
- **対処**: `frame-ancestors 'self'` に変更。`X-Frame-Options` も `DENY` → `SAMEORIGIN` に変更

#### 広告用HTMLにもCSPが適用されていた
- **原因**: `next.config.ts` のヘッダー設定が `source: "/(.*)"` で全ページに適用されていたため、`/ads/*.html` にも厳しいCSPが掛かり、忍者AdMaxのスクリプトがブロックされた
- **対処**: `/ads/:path*` を別ルールに分離し、CSPを適用しないようにした

#### frame-src に広告配信ネットワークのドメインが不足
- **原因**: 忍者AdMaxは内部的に `criteo.com` や `amossp-sp.in` などの外部広告ネットワークを使用するが、CSPの `frame-src` に含まれていなかった
- **対処**: `frame-src` と `connect-src` に `https://*.criteo.com` と `https://*.amossp-sp.in` を追加

### 3. styled-jsx がSSRで正しく適用されなかった
- **原因**: `styled-jsx global` のCSSがSSR/クライアント間で正しく配信されず、SP広告の `display: none` が解除されなかった
- **対処**: `styled-jsx` をやめて `<style dangerouslySetInnerHTML>` に変更

### 4. SP広告枠（320×100）に在庫がなかった
- **原因**: 忍者AdMaxの管理画面では「配信中」だが、実際にはSP用320×100サイズの広告在庫がなく空白が表示された
- **対処**: SP用も300×250（レクタングル）に変更。300×250は業界標準で在庫が最も多い

## 現在の広告構成

### 広告枠一覧
| 用途 | サイズ | スクリプトURL |
|---|---|---|
| PC リーダーボード | 728×90 | `https://adm.shinobi.jp/s/a1dfbbec31ebeff55c80320fb7631c5b` |
| SP レクタングル | 300×250 | `https://adm.shinobi.jp/s/b53b0b96442033d888267ce4a1802427` |
| PC レクタングル | 300×250 | `https://adm.shinobi.jp/s/59fcb423fbdd78a61cd073fa1eb4c7a2` |

### 配置場所
| ページ | PC広告 | SP広告 |
|---|---|---|
| ホーム | 728×90（ヒーロー下） | 300×250 |
| 投稿詳細 | 300×250（記事下）+ 728×90（関連記事下） | 300×250 × 2箇所 |
| Wiki詳細 | 300×250（本文下） | 300×250 |

### ファイル構成
- `components/NinjaAd.tsx` — 広告コンポーネント（PC/SP自動切替）
- `public/ads/leaderboard.html` — PC用728×90
- `public/ads/sp-banner.html` — SP用300×250
- `public/ads/rectangle.html` — PC用300×250
- `next.config.ts` — CSPヘッダー設定

### 広告サービス移行時
The Moneytizer や AdSense に移行する場合:
1. `public/ads/` のHTMLファイル内のスクリプトを差し替え
2. `components/NinjaAd.tsx` のサイズ設定を必要に応じて変更
3. `next.config.ts` のCSPに新サービスのドメインを追加
