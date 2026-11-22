import type { CuratedAmazonMapping } from '@/types/affiliate';

export function getAmazonAssociateTag(): string {
  return (process.env.AMAZON_ASSOCIATE_TAG || 'yourtag-22').trim();
}

export function isAmazonTagConfigured(): boolean {
  const tag = getAmazonAssociateTag();
  return Boolean(tag) && tag !== 'yourtag-22';
}

/**
 * 公式アソシエイト特別プログラム（Audible / Amazonビジネス / Kindle+ 等）への
 * 規約準拠リンク生成。既存のクエリ文字列がある場合も安全に `tag=` を付与する。
 */
export function buildAmazonSpecialProgramUrl(
  officialBaseUrl: string,
  tag: string = getAmazonAssociateTag()
): string {
  const url = new URL(officialBaseUrl);
  url.searchParams.set('tag', tag);
  return url.toString();
}

/**
 * ASIN から正規の Amazon 商品ページ特別リンクを生成（API不要・非スクレイピング）。
 */
export function buildAmazonAsinUrl(
  asin: string,
  tag: string = getAmazonAssociateTag()
): string {
  const cleanAsin = asin.trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(cleanAsin)) {
    throw new Error(`Invalid ASIN format: ${asin}`);
  }
  return `https://www.amazon.co.jp/dp/${cleanAsin}?tag=${encodeURIComponent(tag)}&linkCode=ogi&th=1&psc=1`;
}

/**
 * 商品名から不要な装飾（【送料無料】、クーポン文言等）を除き、
 * Amazon 検索結果への規約準拠リンクを生成（Creators API 未解放時の楽天併置用）。
 */
export function cleanSearchKeyword(rawTitle: string): string {
  return rawTitle
    .replace(/【[^】]*】/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/★[^★]*★/g, ' ')
    .replace(/[0-9]+円OFF|クーポン|ポイント[0-9]+倍|送料無料|あす楽|公式|P[0-9]+倍|スーパーDEAL/gi, ' ')
    .replace(/[／/・|｜!！?？★☆♪◆◇■□●○※]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
}

export function buildAmazonSearchUrl(
  keyword: string,
  tag: string = getAmazonAssociateTag()
): string {
  const cleaned = cleanSearchKeyword(keyword) || keyword.trim().slice(0, 48);
  const url = new URL('https://www.amazon.co.jp/s');
  url.searchParams.set('k', cleaned);
  url.searchParams.set('tag', tag);
  return url.toString();
}

/**
 * 運営者の手動キュレーション情報（SiteStripe 短縮URL / 手動ASIN / カスタム検索語）を
 * 優先順で解決する。Amazonスクレイピングは一切行わない。
 */
export function resolveAmazonLink(params: {
  fallbackTitle: string;
  mapping?: CuratedAmazonMapping;
  tag?: string;
}): {
  url: string;
  linkType: 'sitestripe' | 'asin' | 'search';
  asin?: string;
} {
  const tag = params.tag ?? getAmazonAssociateTag();
  const mapping = params.mapping;

  if (mapping?.siteStripeUrl && /^https:\/\/(amzn\.to|www\.amazon\.co\.jp)\//.test(mapping.siteStripeUrl)) {
    return {
      url: mapping.siteStripeUrl,
      linkType: 'sitestripe',
      asin: mapping.asin,
    };
  }

  if (mapping?.asin && /^[A-Z0-9]{10}$/i.test(mapping.asin.trim())) {
    return {
      url: buildAmazonAsinUrl(mapping.asin, tag),
      linkType: 'asin',
      asin: mapping.asin.trim().toUpperCase(),
    };
  }

  const keyword = mapping?.customAmazonKeyword || params.fallbackTitle;
  return {
    url: buildAmazonSearchUrl(keyword, tag),
    linkType: 'search',
  };
}
