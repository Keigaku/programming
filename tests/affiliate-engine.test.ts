import { describe, expect, it, vi } from 'vitest';
import {
  buildAmazonAsinUrl,
  buildAmazonSearchUrl,
  buildAmazonSpecialProgramUrl,
  cleanSearchKeyword,
  resolveAmazonLink,
} from '@/lib/amazon/links';
import { runComplianceAudit } from '@/lib/compliance/audit';
import { getActiveCampaignEvent } from '@/lib/rakuten/calendar';
import {
  buildRakutenRankingEndpoint,
  buildRakutenSearchEndpoint,
  normalizeRakutenItem,
  RakutenApiClient,
} from '@/lib/rakuten/client';
import {
  calculateEffectivePrice,
  calculateRakutenCommissionYen,
  calculateYieldScore,
  simulateMonthlyRevenue,
} from '@/lib/scoring/yield';
import { countXWeightedLength, exportSnsQueueToCsv, generateSnsQueue } from '@/lib/sns/generator';
import { DEFAULT_1M_KPI_INPUT } from '@/config/site';
import type { AmazonSpecialProgram, DealItem, EditorialGuide } from '@/types/affiliate';

describe('Rakuten 2026 Commission & Yield Scoring Engine', () => {
  it('caps standard Rakuten genre items at 1,000 yen per unit', () => {
    const res = calculateRakutenCommissionYen({
      price: 55000, // 税抜50,000円 × 4% = 2,000円 -> 通常料率なので上限1,000円
      affiliateRate: 4.0,
      category: 'beauty',
    });
    expect(res.isRateUpUncapped).toBe(false);
    expect(res.estimatedCommissionYen).toBe(1000);
  });

  it('removes the 1,000 yen cap on Rakuten rate-up items (> genre baseline)', () => {
    const res = calculateRakutenCommissionYen({
      price: 22000, // 税抜20,000円 × 15% = 3,000円（上限免除！）
      affiliateRate: 15.0,
      category: 'beauty',
    });
    expect(res.isRateUpUncapped).toBe(true);
    expect(res.estimatedCommissionYen).toBe(3000);
  });

  it('computes effective price from tax-excluded point multiplier accurately', () => {
    const res = calculateEffectivePrice({ price: 11000, pointRate: 10 });
    expect(res.estimatedPointBack).toBe(1000);
    expect(res.effectivePrice).toBe(10000);
  });

  it('ranks uncapped high-rate, high-review items above low-rate items', () => {
    const highYield = calculateYieldScore({
      estimatedCommissionYen: 1500,
      isRateUpUncapped: true,
      affiliateRate: 15,
      pointRate: 10,
      reviewAverage: 4.7,
      reviewCount: 1200,
      postageFree: true,
    });
    const lowYield = calculateYieldScore({
      estimatedCommissionYen: 90,
      isRateUpUncapped: false,
      affiliateRate: 2,
      pointRate: 1,
      reviewAverage: 3.8,
      reviewCount: 12,
      postageFree: false,
    });
    expect(highYield).toBeGreaterThan(85);
    expect(lowYield).toBeLessThan(30);
  });

  it('reaches ~¥1,000,000/month with the default 4-pillar KPI plan', () => {
    const sim = simulateMonthlyRevenue(DEFAULT_1M_KPI_INPUT);
    expect(sim.totalMonthlyRevenueYen).toBeGreaterThanOrEqual(950000);
    expect(sim.totalMonthlyRevenueYen).toBeLessThanOrEqual(1050000);
    expect(sim.pillar3AmazonProgramYen).toBe(280000);
  });
});

describe('Rakuten 2026 API Client (openapi.rakuten.co.jp + accessKey header)', () => {
  it('uses the 2026 migrated openapi.rakuten.co.jp endpoints', () => {
    expect(buildRakutenSearchEndpoint('20260701')).toBe(
      'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701'
    );
    expect(buildRakutenRankingEndpoint('20220601')).toBe(
      'https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601'
    );
  });

  it('sends accessKey in HTTP headers (not query) and retries once on 429', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Items: [
              {
                itemCode: 'shop:123',
                itemName: 'テスト美容液 50ml',
                itemPrice: 11000,
                pointRate: 10,
                affiliateRate: 15,
                reviewAverage: 4.6,
                reviewCount: 300,
                postageFlag: 1,
                itemUrl: 'https://item.rakuten.co.jp/shop/123/',
                affiliateUrl: 'https://hb.afl.rakuten.co.jp/hgc/aff123/?pc=test',
                shopName: 'テスト公式ショップ',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const client = new RakutenApiClient(
      {
        applicationId: 'uuid-test-app',
        accessKey: 'pk_secret_test',
        affiliateId: 'aff123',
        searchVersion: '20260701',
        rankingVersion: '20220601',
        minIntervalMs: 1,
      },
      fetchMock as unknown as typeof fetch
    );

    const items = await client.searchHighYieldItems({ keyword: '美容液' });
    expect(items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toContain('https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701');
    expect(String(calledUrl)).toContain('applicationId=uuid-test-app');
    expect(String(calledUrl)).not.toContain('pk_secret_test'); // Never leak accessKey in URL query
    expect((init as RequestInit).headers).toMatchObject({
      accessKey: 'pk_secret_test',
    });

    const normalized = normalizeRakutenItem({
      raw: items[0],
      category: 'beauty',
      affiliateId: 'aff123',
    });
    expect(normalized?.isRateUpUncapped).toBe(true);
    expect(normalized?.estimatedRakutenCommission).toBe(1500);
  });
});

describe('Compliant Amazon Associates Link Builder (No Scraping)', () => {
  it('appends tag cleanly to Amazon special program URLs with or without existing query params', () => {
    expect(
      buildAmazonSpecialProgramUrl('https://www.amazon.co.jp/b/?node=5816607051', 'mytag-22')
    ).toBe('https://www.amazon.co.jp/b/?node=5816607051&tag=mytag-22');

    expect(
      buildAmazonSpecialProgramUrl('https://www.amazon.co.jp/tryAB', 'mytag-22')
    ).toBe('https://www.amazon.co.jp/tryAB?tag=mytag-22');
  });

  it('builds valid ASIN direct URLs and rejects invalid ASINs', () => {
    expect(buildAmazonAsinUrl('b09xyz1234', 'mytag-22')).toContain(
      'https://www.amazon.co.jp/dp/B09XYZ1234?tag=mytag-22'
    );
    expect(() => buildAmazonAsinUrl('bad', 'mytag-22')).toThrow();
  });

  it('prioritizes SiteStripe > ASIN > cleaned search keyword', () => {
    expect(cleanSearchKeyword('【送料無料】ポイント10倍 ビタミンC美容液 50ml')).toBe(
      'ビタミンC美容液 50ml'
    );

    const viaSiteStripe = resolveAmazonLink({
      fallbackTitle: 'テスト商品',
      tag: 'mytag-22',
      mapping: {
        itemCode: 's:1',
        siteStripeUrl: 'https://amzn.to/3example',
        asin: 'B09XYZ1234',
        updatedAt: '2026-11-22T00:00:00Z',
      },
    });
    expect(viaSiteStripe.linkType).toBe('sitestripe');
    expect(viaSiteStripe.url).toBe('https://amzn.to/3example');

    const viaSearch = resolveAmazonLink({
      fallbackTitle: '【公式】スペシャルティコーヒー豆',
      tag: 'mytag-22',
    });
    expect(viaSearch.linkType).toBe('search');
    expect(viaSearch.url).toBe(buildAmazonSearchUrl('スペシャルティコーヒー豆', 'mytag-22'));
  });
});

describe('Campaign Calendar, SNS Generator & Compliance Auditor', () => {
  it('detects 0 and 5 days accurately in JST', () => {
    // 2026-10-15 12:00 JST = 2026-10-15T03:00:00Z
    const evt = getActiveCampaignEvent(new Date('2026-10-15T03:00:00Z'));
    expect(evt.code).toBe('rakuten_zero_five');
    expect(evt.isHighConversionDay).toBe(true);
  });

  it('generates #PR compliant X posts within 280 weighted chars and valid CSV', () => {
    const sampleDeal: DealItem = {
      id: 'beauty-1',
      itemCode: 'shop:1',
      title: '【公式】ボタニカル高保湿美容液 50ml',
      shortTitle: 'ボタニカル高保湿美容液 50ml',
      catchcopy: '高還元モデル',
      category: 'beauty',
      shopName: 'テスト公式',
      shopCode: 'test',
      price: 11000,
      pointRate: 15,
      estimatedPointBack: 1500,
      effectivePrice: 9500,
      affiliateRate: 15,
      isRateUpUncapped: true,
      estimatedRakutenCommission: 1500,
      yieldScore: 95,
      reviewAverage: 4.7,
      reviewCount: 1000,
      postageFree: true,
      imageUrl: '/images/cat-beauty.jpg',
      rakutenAffiliateUrl: 'https://hb.afl.rakuten.co.jp/hgc/aff123/?pc=https%3A%2F%2Fexample.com',
      rakutenItemUrl: 'https://item.rakuten.co.jp/test/1/',
      amazonUrl: 'https://www.amazon.co.jp/s?k=%E7%BE%8E%E5%AE%B9%E6%B6%B2&tag=mytag-22',
      amazonLinkType: 'search',
      tags: ['料率アップ 15%'],
      fetchedAt: '2026-11-22T00:00:00Z',
      source: 'rakuten_live',
    };

    const sampleProgram: AmazonSpecialProgram = {
      id: 'audible',
      name: 'Amazon Audible',
      badge: '¥2,000/件',
      headline: '聴く読書が無料体験対象',
      summary: '20万作品以上聴き放題',
      targetAudience: 'ビジネス層',
      rewardYen: 2000,
      rewardNote: '2000円',
      officialBaseUrl: 'https://www.amazon.co.jp/b/?node=5816607051',
      ctaLabel: '確認する',
      highlights: ['30日間無料体験', 'オフライン再生対応'],
      conversionTips: '朝投稿が効く',
      priority: 1,
      image: '/images/cat-reading.jpg',
    };

    const sampleGuide: EditorialGuide = {
      slug: 'test-guide',
      title: 'テスト比較ガイド',
      subtitle: '概要',
      category: 'reading',
      publishedAt: '2026-11-22',
      updatedAt: '2026-11-22',
      readingTimeMin: 5,
      heroImage: '/images/cat-reading.jpg',
      targetKeywords: ['Audible'],
      lead: '比較リード文',
      sections: [],
      picks: [],
      faqs: [],
    };

    const queue = generateSnsQueue({
      deals: [sampleDeal],
      programs: [sampleProgram],
      guides: [sampleGuide],
    });

    expect(queue.length).toBeGreaterThanOrEqual(3);
    for (const post of queue) {
      expect(post.hasPrDisclosure).toBe(true);
      expect(post.body).toContain('#PR');
      if (post.platform === 'x') {
        expect(post.isWithinXLimit).toBe(true);
        expect(countXWeightedLength(post.body)).toBeLessThanOrEqual(280);
      }
    }

    const csv = exportSnsQueueToCsv(queue);
    expect(csv).toContain('platform,slot,pillar');
    expect(csv).toContain('#PR');

    const audit = runComplianceAudit({
      deals: [sampleDeal],
      programs: [sampleProgram],
      snsQueue: queue,
    });
    expect(audit.find((c) => c.id === 'pr_disclosure')?.status).toBe('pass');
    expect(audit.find((c) => c.id === 'amazon_disclosure')?.status).toBe('pass');
    expect(audit.find((c) => c.id === 'rakuten_pairing')?.status).toBe('pass');
    expect(audit.find((c) => c.id === 'amazon_no_scraping')?.status).toBe('pass');
  });
});
