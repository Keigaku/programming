import { NextResponse } from 'next/server';
import { isAmazonTagConfigured } from '@/lib/amazon/links';
import { isCreatorsApiReady } from '@/lib/amazon/creators-api';
import {
  getRakutenApiConfig,
  isRakutenApiConfigured,
  RakutenApiClient,
} from '@/lib/rakuten/client';
import {
  loadCuratedStore,
  loadDeals,
  regenerateAndSaveSnsQueue,
  saveDeals,
} from '@/lib/data/store';

function checkOpsAuth(request: Request): boolean {
  const secret = (process.env.OPS_ADMIN_SECRET || '').trim();
  if (!secret) return true;
  const provided = request.headers.get('x-ops-secret') || '';
  return provided === secret;
}

export async function GET() {
  const cfg = getRakutenApiConfig();
  const deals = loadDeals();
  return NextResponse.json({
    rakutenConfigured: isRakutenApiConfigured(cfg),
    rakutenAffiliateIdConfigured: Boolean(cfg.affiliateId),
    rakutenSearchVersion: cfg.searchVersion,
    rakutenRankingVersion: cfg.rankingVersion,
    amazonTagConfigured: isAmazonTagConfigured(),
    amazonCreatorsApiReady: isCreatorsApiReady(),
    currentDealCount: deals.length,
    rateUpUncappedCount: deals.filter((d) => d.isRateUpUncapped).length,
    lastFetchedAt: deals[0]?.fetchedAt ?? null,
    dataSource: deals[0]?.source ?? 'seed_demo',
  });
}

export async function POST(request: Request) {
  if (!checkOpsAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cfg = getRakutenApiConfig();
  if (!isRakutenApiConfigured(cfg)) {
    return NextResponse.json(
      {
        error:
          'RAKUTEN_APP_ID と RAKUTEN_ACCESS_KEY が .env.local に未設定です。キーを設定後、サーバーを再起動して再実行してください。',
        rakutenConfigured: false,
      },
      { status: 400 }
    );
  }

  try {
    const curated = loadCuratedStore();
    const client = new RakutenApiClient(cfg);
    const deals = await client.syncAllStrategicDeals(curated.mappings);
    if (deals.length === 0) {
      return NextResponse.json(
        { error: '楽天APIから商品を取得できませんでした（0件）。接続元IP/ドメイン許可を確認してください。' },
        { status: 502 }
      );
    }

    saveDeals(deals);
    const snsQueue = regenerateAndSaveSnsQueue();

    return NextResponse.json({
      ok: true,
      syncedCount: deals.length,
      rateUpUncappedCount: deals.filter((d) => d.isRateUpUncapped).length,
      snsGeneratedCount: snsQueue.length,
      fetchedAt: deals[0]?.fetchedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '同期エラーが発生しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
