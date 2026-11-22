import { CATEGORY_MAP, STRATEGIC_CATEGORIES } from '@/config/site';
import { resolveAmazonLink } from '@/lib/amazon/links';
import {
  calculateEffectivePrice,
  calculateRakutenCommissionYen,
  calculateYieldScore,
} from '@/lib/scoring/yield';
import type {
  CategorySlug,
  CuratedAmazonMapping,
  DealItem,
} from '@/types/affiliate';

export interface RakutenApiConfig {
  applicationId: string;
  accessKey: string;
  affiliateId: string;
  searchVersion: string;
  rankingVersion: string;
  appOrigin?: string;
  minIntervalMs?: number;
}

export interface RakutenRawItem {
  itemCode?: string;
  itemName?: string;
  catchcopy?: string;
  itemPrice?: number;
  pointRate?: number;
  affiliateRate?: number;
  reviewAverage?: number;
  reviewCount?: number;
  postageFlag?: number; // 0: 送料別, 1: 送料込
  availability?: number;
  itemUrl?: string;
  affiliateUrl?: string;
  shopName?: string;
  shopCode?: string;
  mediumImageUrls?: Array<string | { imageUrl: string }>;
  rank?: number;
}

export function getRakutenApiConfig(): RakutenApiConfig {
  return {
    applicationId: (process.env.RAKUTEN_APP_ID || '').trim(),
    accessKey: (process.env.RAKUTEN_ACCESS_KEY || '').trim(),
    affiliateId: (process.env.RAKUTEN_AFFILIATE_ID || '').trim(),
    searchVersion: (process.env.RAKUTEN_SEARCH_API_VERSION || '20260701').trim(),
    rankingVersion: (process.env.RAKUTEN_RANKING_API_VERSION || '20220601').trim(),
    appOrigin: (process.env.RAKUTEN_APP_ORIGIN || '').trim() || undefined,
    minIntervalMs: 1600, // 2026年新基盤では1秒間隔でも429報告あり -> 1.6秒以上を厳守
  };
}

export function isRakutenApiConfigured(
  cfg: RakutenApiConfig = getRakutenApiConfig()
): boolean {
  return Boolean(cfg.applicationId && cfg.accessKey);
}

/**
 * 2026年移行後の楽天ウェブサービス新ドメインURLビルダー
 * 旧 app.rakuten.co.jp/services/api/ は2026年5月廃止済み。
 */
export function buildRakutenSearchEndpoint(version: string = '20260701'): string {
  return `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/${version}`;
}

export function buildRakutenRankingEndpoint(version: string = '20220601'): string {
  return `https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/${version}`;
}

/**
 * 楽天アフィリエイトURL生成（APIのaffiliateUrlが返らない場合の公式フォールバック）
 */
export function buildRakutenAffiliateFallbackUrl(
  itemUrl: string,
  affiliateId: string
): string {
  if (!affiliateId) return itemUrl;
  const encoded = encodeURIComponent(itemUrl);
  return `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encoded}&m=${encoded}`;
}

function extractImageUrl(
  raw: RakutenRawItem['mediumImageUrls'],
  fallbackImage: string
): string {
  if (!raw || raw.length === 0) return fallbackImage;
  const first = raw[0];
  const url = typeof first === 'string' ? first : first?.imageUrl;
  if (!url) return fallbackImage;
  // サムネイル128x128を高解像度表示用（400x400）へ安全に置換
  return url.replace(/\?_ex=\d+x\d+/, '?_ex=400x400');
}

function shortenTitle(title: string): string {
  const cleaned = title
    .replace(/【[^】]{1,22}】/g, '')
    .replace(/\[[^\]]{1,22}\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const base = cleaned || title.trim();
  return base.length > 42 ? `${base.slice(0, 41)}…` : base;
}

export function normalizeRakutenItem(params: {
  raw: RakutenRawItem;
  category: CategorySlug;
  affiliateId: string;
  curatedMap?: Map<string, CuratedAmazonMapping>;
  fetchedAt?: string;
}): DealItem | null {
  const { raw, category, affiliateId } = params;
  const price = Number(raw.itemPrice ?? 0);
  const title = (raw.itemName ?? '').trim();
  const itemUrl = (raw.itemUrl ?? '').trim();
  if (!title || !itemUrl || price <= 0) return null;

  const itemCode =
    (raw.itemCode || `${raw.shopCode || 'shop'}:${Buffer.from(title).toString('hex').slice(0, 12)}`).trim();
  const pointRate = Math.max(1, Number(raw.pointRate ?? 1));
  const affiliateRate = Math.max(1, Number(raw.affiliateRate ?? 2));
  const reviewAverage = Number(raw.reviewAverage ?? 0);
  const reviewCount = Number(raw.reviewCount ?? 0);
  const postageFree = Number(raw.postageFlag ?? 0) === 1;

  const { estimatedPointBack, effectivePrice } = calculateEffectivePrice({
    price,
    pointRate,
  });

  const { estimatedCommissionYen, isRateUpUncapped } = calculateRakutenCommissionYen({
    price,
    affiliateRate,
    category,
  });

  const yieldScore = calculateYieldScore({
    estimatedCommissionYen,
    isRateUpUncapped,
    affiliateRate,
    pointRate,
    reviewAverage,
    reviewCount,
    postageFree,
  });

  const rakutenAffiliateUrl =
    (raw.affiliateUrl && raw.affiliateUrl.trim()) ||
    buildRakutenAffiliateFallbackUrl(itemUrl, affiliateId);

  const curated = params.curatedMap?.get(itemCode);
  const amazonResolved = resolveAmazonLink({
    fallbackTitle: title,
    mapping: curated,
  });

  const tags: string[] = [];
  if (isRateUpUncapped) tags.push(`料率アップ ${affiliateRate}%`);
  if (pointRate >= 10) tags.push(`ポイント${pointRate}倍`);
  else if (pointRate >= 5) tags.push(`ポイント${pointRate}倍`);
  if (postageFree) tags.push('送料無料');
  if (reviewAverage >= 4.4 && reviewCount >= 50) tags.push(`高評価 ★${reviewAverage.toFixed(1)}`);
  if (raw.rank && raw.rank <= 10) tags.push(`楽天ランキング${raw.rank}位`);

  const categoryMeta = CATEGORY_MAP[category];
  return {
    id: `${category}-${itemCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    itemCode,
    title,
    shortTitle: shortenTitle(title),
    catchcopy: (raw.catchcopy || categoryMeta.description).trim().slice(0, 90),
    category,
    shopName: (raw.shopName || '楽天市場ショップ').trim(),
    shopCode: (raw.shopCode || 'rakuten').trim(),
    price,
    pointRate,
    estimatedPointBack,
    effectivePrice,
    affiliateRate,
    isRateUpUncapped,
    estimatedRakutenCommission: estimatedCommissionYen,
    yieldScore,
    reviewAverage,
    reviewCount,
    postageFree,
    imageUrl: extractImageUrl(raw.mediumImageUrls, categoryMeta.heroImage),
    rakutenAffiliateUrl,
    rakutenItemUrl: itemUrl,
    amazonUrl: amazonResolved.url,
    amazonLinkType: amazonResolved.linkType,
    amazonAsin: amazonResolved.asin,
    rank: raw.rank,
    tags,
    fetchedAt: params.fetchedAt || new Date().toISOString(),
    source: 'rakuten_live',
  };
}

export class RakutenApiClient {
  private lastRequestAt = 0;
  private readonly cfg: RakutenApiConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(cfg: RakutenApiConfig = getRakutenApiConfig(), fetchImpl: typeof fetch = fetch) {
    this.cfg = cfg;
    this.fetchImpl = fetchImpl;
  }

  private async throttle(): Promise<void> {
    const minInterval = this.cfg.minIntervalMs ?? 1600;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private async requestJson<T>(
    endpoint: string,
    query: Record<string, string | number | undefined>
  ): Promise<T> {
    if (!this.cfg.applicationId || !this.cfg.accessKey) {
      throw new Error(
        'RAKUTEN_APP_ID と RAKUTEN_ACCESS_KEY が未設定です。.env.local を設定してください。'
      );
    }

    const searchParams = new URLSearchParams();
    searchParams.set('applicationId', this.cfg.applicationId);
    searchParams.set('format', 'json');
    searchParams.set('formatVersion', '2');
    if (this.cfg.affiliateId) {
      searchParams.set('affiliateId', this.cfg.affiliateId);
    }

    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') {
        searchParams.set(k, String(v));
      }
    }

    const url = `${endpoint}?${searchParams.toString()}`;
    const headers: Record<string, string> = {
      // 2026年新仕様: accessKey はログ漏洩防止のため HTTP ヘッダ送信を標準採用
      accessKey: this.cfg.accessKey,
      'User-Agent': 'TokuLab-AffiliateEngine/1.0',
    };

    if (this.cfg.appOrigin) {
      headers.Origin = this.cfg.appOrigin;
      headers.Referer = `${this.cfg.appOrigin.replace(/\/$/, '')}/`;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.throttle();
      const res = await this.fetchImpl(url, { headers });

      if (res.status === 429 && attempt < 2) {
        const waitMs = 2500 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        let hint = '';
        if (res.status === 403) {
          hint =
            '（accessKeyのコピー漏れ、またはRakuten Developersの許可IP/許可Webサイト設定を確認してください）';
        } else if (res.status === 404) {
          hint = '（RAKUTEN_SEARCH_API_VERSION 等のバージョン番号を確認してください）';
        }
        throw new Error(`楽天APIエラー ${res.status}${hint}: ${body.slice(0, 300)}`);
      }

      return (await res.json()) as T;
    }

    throw new Error('楽天APIレート制限(429)によりリトライ上限に達しました');
  }

  /**
   * 料率アップ（-affiliateRate）またはレビュー件数順で高収益商品を検索
   */
  async searchHighYieldItems(params: {
    keyword?: string;
    genreId?: string;
    sort?: '-affiliateRate' | '-reviewCount' | 'standard' | '+itemPrice';
    minPrice?: number;
    maxPrice?: number;
    hits?: number;
    pointRateFlag?: 0 | 1;
  }): Promise<RakutenRawItem[]> {
    const endpoint = buildRakutenSearchEndpoint(this.cfg.searchVersion);
    const data = await this.requestJson<{ Items?: RakutenRawItem[] }>(endpoint, {
      keyword: params.keyword,
      genreId: params.genreId,
      sort: params.sort ?? '-affiliateRate',
      minPrice: params.minPrice ?? 1500,
      maxPrice: params.maxPrice,
      hits: params.hits ?? 15,
      hasReviewFlag: 1,
      pointRateFlag: params.pointRateFlag,
      availability: 1,
    });
    return data.Items ?? [];
  }

  /**
   * ジャンル別の売れ筋リアルタイムランキングを取得
   */
  async fetchRankingItems(params: {
    genreId?: string;
    period?: 'realtime' | 'daily';
  }): Promise<RakutenRawItem[]> {
    const endpoint = buildRakutenRankingEndpoint(this.cfg.rankingVersion);
    const data = await this.requestJson<{ Items?: RakutenRawItem[] }>(endpoint, {
      genreId: params.genreId,
      period: params.period ?? 'realtime',
    });
    return data.Items ?? [];
  }

  /**
   * 全戦略カテゴリから「料率アップ商品」＋「ランキング上位商品」を横断収集し、
   * Yield Score 順にソート＆重複排除して返す。
   */
  async syncAllStrategicDeals(
    curatedMappings: CuratedAmazonMapping[] = []
  ): Promise<DealItem[]> {
    const curatedMap = new Map(curatedMappings.map((m) => [m.itemCode, m]));
    const dedup = new Map<string, DealItem>();
    const fetchedAt = new Date().toISOString();

    for (const cat of STRATEGIC_CATEGORIES) {
      // 1) 料率アップ優先検索（1,000円上限免除の稼げる商品を発掘）
      const rateUpItems = await this.searchHighYieldItems({
        keyword: cat.rakutenKeywords[0],
        sort: '-affiliateRate',
        minPrice: cat.slug === 'furusato' ? 8000 : 1800,
        hits: 10,
      });

      // 2) 売れ筋ランキング上位（CVRが高い鉄板商品）
      let rankingItems: RakutenRawItem[] = [];
      try {
        rankingItems = await this.fetchRankingItems({
          genreId: cat.rakutenGenreId,
          period: 'realtime',
        });
      } catch {
        // 一部ジャンルIDがランキング非対応の場合はキーワードレビュー順でフォールバック
        rankingItems = await this.searchHighYieldItems({
          keyword: cat.rakutenKeywords[1] || cat.rakutenKeywords[0],
          sort: '-reviewCount',
          minPrice: 1500,
          hits: 8,
        });
      }

      const combined = [...rateUpItems, ...rankingItems.slice(0, 8)];
      for (const raw of combined) {
        const normalized = normalizeRakutenItem({
          raw,
          category: cat.slug,
          affiliateId: this.cfg.affiliateId,
          curatedMap,
          fetchedAt,
        });
        if (!normalized) continue;
        // 最低限の品質フィルタ（レビュー評価が低すぎる商品を除外）
        if (normalized.reviewCount >= 5 && normalized.reviewAverage < 3.6) continue;

        const existing = dedup.get(normalized.itemCode);
        if (!existing || normalized.yieldScore > existing.yieldScore) {
          dedup.set(normalized.itemCode, normalized);
        }
      }
    }

    return Array.from(dedup.values()).sort((a, b) => b.yieldScore - a.yieldScore);
  }
}
