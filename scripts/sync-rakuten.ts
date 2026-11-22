import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  getRakutenApiConfig,
  isRakutenApiConfigured,
  RakutenApiClient,
} from '../src/lib/rakuten/client';
import {
  loadCuratedStore,
  loadDeals,
  regenerateAndSaveSnsQueue,
  saveDeals,
} from '../src/lib/data/store';

// .env.local を優先ロード（Next.jsと共通設定）
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

async function main() {
  const cfg = getRakutenApiConfig();
  console.log('=== トクラボ 楽天2026新API 同期エンジン ===');
  console.log(`Search API Version : ${cfg.searchVersion}`);
  console.log(`Ranking API Version: ${cfg.rankingVersion}`);
  console.log(`Affiliate ID       : ${cfg.affiliateId ? '設定済み' : '未設定（通常URLにフォールバック）'}`);

  if (!isRakutenApiConfigured(cfg)) {
    console.warn(
      '\n[WARN] RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定のため、ライブAPI呼び出しをスキップしました。'
    );
    console.warn('       .env.example を .env.local にコピーし、楽天キーを設定して再実行してください。');
    const existing = loadDeals();
    const snsQueue = regenerateAndSaveSnsQueue();
    console.log(
      `[OK] 現在のデータ（${existing.length}商品）から SNS投稿キュー（${snsQueue.length}件）を再生成しました。`
    );
    return;
  }

  const curated = loadCuratedStore();
  const client = new RakutenApiClient(cfg);

  console.log('\n全6戦略カテゴリから「料率アップ上限なし商品」＆「ランキング上位」を収集します...');
  const deals = await client.syncAllStrategicDeals(curated.mappings);

  if (deals.length === 0) {
    throw new Error('取得件数が0件でした。APIキーまたは接続元IP/ドメイン許可設定を確認してください。');
  }

  saveDeals(deals);
  const snsQueue = regenerateAndSaveSnsQueue();

  const rateUpCount = deals.filter((d) => d.isRateUpUncapped).length;
  const avgCommission = Math.round(
    deals.reduce((sum, d) => sum + d.estimatedRakutenCommission, 0) / deals.length
  );

  console.log('\n=== 同期完了 ===');
  console.log(`保存商品数               : ${deals.length} 件`);
  console.log(`うち料率アップ(上限撤廃) : ${rateUpCount} 件`);
  console.log(`平均推定報酬単価         : ¥${avgCommission.toLocaleString()} / 件`);
  console.log(`SNS投稿キュー生成数      : ${snsQueue.length} 件`);
  console.log('\n上位5件（Yield Score順）:');
  for (const item of deals.slice(0, 5)) {
    console.log(
      `  [Score ${item.yieldScore}] 料率${item.affiliateRate}%${item.isRateUpUncapped ? '(上限なし)' : ''} | 推定報酬¥${item.estimatedRakutenCommission} | ${item.shortTitle}`
    );
  }
}

main().catch((err) => {
  console.error('[ERROR] 楽天同期に失敗しました:', err);
  process.exit(1);
});
