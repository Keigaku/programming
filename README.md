# トクラボ（TokuLab）— 楽天アフィリエイト × Amazonアソシエイト 月100万円 収益自動化プラットフォーム

2026年11月時点の最新仕様（**楽天ウェブサービス新ドメイン `openapi.rakuten.co.jp` + `accessKey` 認証**、**楽天「料率アップ（1,000円上限撤廃）」自動抽出**、**AmazonアソシエイトAPI未承認フェーズ準拠→30日10件達成でCreators API解放**）に完全対応した、**ハイブリッド型（SNS速報 × SEO比較メディア × Amazon公式特別プログラム）** の本番稼働システムです。

---

## 収益モデル概要（4本柱で月100万円）

| 柱 | 内容 | 単価目安 | 目標件数/月 | 月間目標 |
|---|---|---:|---:|---:|
| **柱① 楽天 料率アップ（上限なし）** | `affiliateRate >= 5%`（最大20%・1,000円上限免除）をAPI自動抽出 | ¥600 | 550件 | **¥330,000** |
| **柱② 楽天 セール・0と5のつく日** | ランキングAPI＋イベントカレンダー連動のまとめ買い導線 | ¥250 | 800件 | **¥200,000** |
| **柱③ Amazon 公式特別プログラム** | **API不要で即稼働**：Amazonビジネス(¥3,000)・Audible(¥2,000)・Kindle+(¥1,000)等 | ¥1,600 | 175件 | **¥280,000** |
| **柱④ Amazon 物販5〜8%＋高単価** | 食品8%・美容5%・上限撤廃ガジェット（初期は手動ASIN/SiteStripe→10件達成でCreators APIへ切替） | ¥475 | 400件 | **¥190,000** |
| **合計** | **加重平均 ¥519/件（約64件/日）** | **¥519** | **1,925件** | **¥1,000,000** |

詳細なフェーズ別ロードマップと日々の運用手順は [docs/PLAN_1M_YEN.md](docs/PLAN_1M_YEN.md) を参照してください。

---

## クイックスタート（3分で本番稼働）

### 1. 依存関係インストール & 環境変数設定

```bash
npm install
cp .env.example .env.local
```

`.env.local` に以下のキーを設定します：

- `RAKUTEN_APP_ID`: Rakuten Developers（2026年再登録後のUUID形式アプリID）
- `RAKUTEN_ACCESS_KEY`: `pk_` から始まるアクセスキー（HTTPヘッダ `accessKey` で安全に送信）
- `RAKUTEN_AFFILIATE_ID`: 楽天アフィリエイトID
- `AMAZON_ASSOCIATE_TAG`: AmazonアソシエイトのトラッキングID（例：`yourtag-22`）
- ※ 楽天アプリを **Webアプリ型** で登録している場合は `RAKUTEN_APP_ORIGIN` に許可ドメインを指定、**バックエンド型** の場合は実行元サーバーの固定IPを Rakuten Developers 側で許可登録してください。

### 2. 楽天2026 API ライブ同期 & SNS投稿キュー生成

```bash
# 楽天APIから全6戦略カテゴリの「料率アップ商品」＆「ランキング上位」を取得し Yield Score 算出
npm run sync:rakuten

# X / Threads 向け #PR 付与済み投稿キュー（JSON + CSV）を生成
npm run sns:generate

# 景品表示法PR表記・Amazon必須表記・楽天リンク併置の自動監査
npm run check:compliance
```

### 3. Webメディア & 運用コマンドスタジオを起動

```bash
npm run dev
```

- 公開トップページ: `http://localhost:3000/`
- 楽天高還元 × Amazon横断カタログ: `http://localhost:3000/deals`
- Amazon公式サブスク・無料体験特集（API不要の最強CPAページ）: `http://localhost:3000/programs`
- SEO徹底比較ガイド: `http://localhost:3000/guides`
- **運営コマンドスタジオ（KPIシミュレーター / ライブ同期 / 手動ASIN紐付け / Creators API 30日10件トラッカー / SNSワンクリックコピー）**: `http://localhost:3000/ops`

---

## 本番デプロイ & 自動化

1. **Vercel へデプロイ**: このリポジトリを Vercel に接続し、`.env.example` の環境変数を登録
2. **GitHub Actions 自動更新**: リポジトリの `Settings > Secrets` に `RAKUTEN_APP_ID` / `RAKUTEN_ACCESS_KEY` / `RAKUTEN_AFFILIATE_ID` / `AMAZON_ASSOCIATE_TAG` を登録すると、`.github/workflows/sync-deals.yml` が **6時間ごと** に最新商品とSNS投稿キューを自動更新します
3. **Amazon Creators API 解放（直近30日10件達成後）**: Associates Central で OAuth 2.0 認証情報を発行し、`.env.local` に `AMAZON_CREATORS_ENABLED="true"` とキーを設定するだけで `src/lib/amazon/creators-api.ts` が有効化されます

---

## 利用可能なコマンド一覧

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド検証 |
| `npm test` | Vitest ユニットテスト実行 |
| `npm run sync:rakuten` | 楽天2026 APIから料率アップ＆ランキング商品をライブ同期 |
| `npm run sns:generate` | X/Threads向けSNS投稿キュー（JSON + CSV）を生成 |
| `npm run post:x` | X投稿のドライラン確認（`--live` 付与＋X APIキー設定で実投稿） |
| `npm run check:compliance` | ステマ規制・楽天/Amazon規約の自動コンプライアンス監査 |
