# Google AdSense 広告実装メモ

## 現在の広告構成

### パブリッシャー ID
- `ca-pub-6817166626712495`

### 広告ユニット
| 用途 | サイズ | data-ad-slot |
|---|---|---|
| PC リーダーボード | 728×90 | `5246186886`（レスポンシブユニットを固定枠で利用） |
| PC レクタングル | 300×250 | `5246186886`（同上） |
| SP レクタングル | 300×250 | `5246186886`（同上） |

> 単一のレスポンシブユニットを iframe 側で width/height を明示することで各サイズに固定して使い回している。サイズ別にユニットを分けたい場合は AdSense 管理画面で固定サイズの追加ユニットを作り、`public/ads/*.html` の `data-ad-slot` を差し替える。

### 配置場所
| ページ | PC広告 | SP広告 |
|---|---|---|
| ホーム | 728×90（ヒーロー下） | 300×250 |
| 投稿詳細 | 300×250（記事下）+ 728×90（関連記事下） | 300×250 × 2箇所 |
| Wiki詳細 | 300×250（本文下） | 300×250 |

### ファイル構成
- `components/AdSenseAd.tsx` — 広告コンポーネント（PC/SP自動切替の `ResponsiveAd` も export）
- `public/ads/leaderboard.html` — 728×90
- `public/ads/sp-banner.html` — 300×250（SP用）
- `public/ads/rectangle.html` — 300×250（PC用）
- `next.config.ts` — CSPヘッダー設定

### iframe 方式の理由
- 親ページの CSP（`script-src 'self' 'unsafe-inline' ...`）に縛られず、`/ads/:path*` だけ CSP 非適用にすることで AdSense スクリプトが自由に動作できるため。
- 過去に 忍者AdMax の `document.write` が React 環境で動かなかった経緯あり。AdSense は `document.write` を使わないが、CSP 隔離のメリットを活かして iframe 方式を維持している。

### CSP に含めている AdSense ドメイン（next.config.ts）
- `script-src`: `https://pagead2.googlesyndication.com`, `https://googleads.g.doubleclick.net`
- `connect-src`: 同上
- `frame-src`: `https://googleads.g.doubleclick.net`, `https://tpc.googlesyndication.com`

### ads.txt
- 配信元: `public/ads.txt`
- 内容: `google.com, pub-6817166626712495, DIRECT, f08c47fec0942fa0`
- AdSense 管理画面で 2026-05-18 にクロール・承認確認済み

## 過去の経緯（忍者AdMax 時代）

2026年初頭まで忍者AdMax を利用していた。当時のトラブルシューティング経験：

### 1. document.write がブロックされた
- 忍者AdMaxのスクリプトは `document.write` を使用するが、Next.jsのクライアントコンポーネント内で動的に `<script>` を挿入する方式では `document.write` が使えなかった
- 対処: `public/ads/` に独立したHTMLファイルを作成し、`<iframe src="/ads/xxx.html">` で読み込む方式に変更

### 2. CSP (Content-Security-Policy) の調整
- `frame-ancestors 'none'` → `'self'` に変更（自サイト内の iframe を許可）
- `/ads/:path*` を別ルールに分離し CSP 非適用に
- `frame-src` に広告配信ネットワークのドメインを追加

### 3. styled-jsx が SSR で正しく適用されなかった
- `styled-jsx global` の CSS が SSR/クライアント間で正しく配信されず
- 対処: `styled-jsx` をやめて `<style dangerouslySetInnerHTML>` に変更（現在も同方式）

### 4. SP広告枠（320×100）に在庫がなかった
- 忍者AdMaxの管理画面では「配信中」だが、実際にはSP用320×100サイズの広告在庫がなく空白
- 対処: SP用も300×250（レクタングル）に変更。300×250は業界標準で在庫が最も多い（AdSense でも同様）

## 広告サービスの再変更時

別サービスに移行する場合:
1. `public/ads/` のHTMLファイル内のスクリプト・`<ins>` タグを差し替え
2. `components/AdSenseAd.tsx` のサイズ設定を必要に応じて変更
3. `next.config.ts` のCSPに新サービスのドメインを追加（不要になった AdSense ドメインは削除）
