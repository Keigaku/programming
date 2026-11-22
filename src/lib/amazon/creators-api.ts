/**
 * Amazon Creators API (旧 PA-API 5.0 の 2026年5月完全後継) 連携アダプター
 *
 * 利用解放条件（2026年時点公式仕様）:
 * - Amazonアソシエイト有効アカウントであること
 * - 過去30日間に10件以上の適格販売を達成していること
 * - Associates Central > Creators API から OAuth 2.0 認証情報
 *   (Credential ID / Credential Secret) を発行済みであること
 *
 * ※ API承認前にAmazonのHTMLをスクレイピングすることは規約違反のため禁止。
 *    未承認フェーズでは `isCreatorsApiEnabled() === false` となり、
 *    src/lib/amazon/links.ts の公式リンク生成のみを使用します。
 */

export interface CreatorsApiConfig {
  enabled: boolean;
  credentialId: string;
  credentialSecret: string;
  associateTag: string;
  region: 'fe' | 'na' | 'eu';
}

export interface CreatorsItemOffer {
  asin: string;
  title: string;
  priceYen: number | null;
  detailPageUrl: string;
  imageUrl?: string;
  availabilityMessage?: string;
  fetchedAt: string;
}

export function getCreatorsApiConfig(): CreatorsApiConfig {
  return {
    enabled: process.env.AMAZON_CREATORS_ENABLED === 'true',
    credentialId: (process.env.AMAZON_CREATORS_CREDENTIAL_ID || '').trim(),
    credentialSecret: (process.env.AMAZON_CREATORS_CREDENTIAL_SECRET || '').trim(),
    associateTag: (process.env.AMAZON_ASSOCIATE_TAG || '').trim(),
    region: (process.env.AMAZON_CREATORS_REGION as 'fe' | 'na' | 'eu') || 'fe',
  };
}

export function isCreatorsApiReady(): boolean {
  const cfg = getCreatorsApiConfig();
  return Boolean(cfg.enabled && cfg.credentialId && cfg.credentialSecret && cfg.associateTag);
}

/**
 * OAuth 2.0 トークン取得（Creators API 解放後に自動稼働）
 * リージョン別トークンエンドポイント（JP = fe）
 */
const TOKEN_ENDPOINTS: Record<'fe' | 'na' | 'eu', string> = {
  fe: 'https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token',
  na: 'https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token',
  eu: 'https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token',
};

const API_BASE_ENDPOINTS: Record<'fe' | 'na' | 'eu', string> = {
  fe: 'https://creatorsapi.amazon/catalog/v1',
  na: 'https://creatorsapi.amazon/catalog/v1',
  eu: 'https://creatorsapi.amazon/catalog/v1',
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function fetchCreatorsAccessToken(
  cfg: CreatorsApiConfig = getCreatorsApiConfig()
): Promise<string> {
  if (!cfg.enabled || !cfg.credentialId || !cfg.credentialSecret) {
    throw new Error(
      'Amazon Creators API は未有効化です。過去30日10件販売を達成し、.env.local に認証情報を設定してください。'
    );
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken;
  }

  const basic = Buffer.from(`${cfg.credentialId}:${cfg.credentialSecret}`).toString('base64');
  const res = await fetch(TOKEN_ENDPOINTS[cfg.region], {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'creatorsapi/default',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Creators API OAuth失敗 (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

/**
 * ASIN一覧から最新の価格・公式商品URLを取得（Creators API 解放後のみ実行）
 */
export async function getCreatorsItemsByAsin(
  asins: string[],
  cfg: CreatorsApiConfig = getCreatorsApiConfig()
): Promise<CreatorsItemOffer[]> {
  if (!isCreatorsApiReady() || asins.length === 0) {
    return [];
  }

  const token = await fetchCreatorsAccessToken(cfg);
  const res = await fetch(`${API_BASE_ENDPOINTS[cfg.region]}/getItems`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-marketplace': 'www.amazon.co.jp',
    },
    body: JSON.stringify({
      itemIds: asins.slice(0, 10),
      itemIdType: 'ASIN',
      partnerTag: cfg.associateTag,
      partnerType: 'Associates',
      resources: [
        'itemInfo.title',
        'offersV2.listings.price',
        'offersV2.listings.availability',
        'images.primary.medium',
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Creators API getItems失敗 (${res.status}): ${body}`);
  }

  const json = (await res.json()) as {
    itemsResult?: {
      items?: Array<{
        asin: string;
        detailPageURL?: string;
        itemInfo?: { title?: { displayValue?: string } };
        offersV2?: {
          listings?: Array<{
            price?: { money?: { amount?: number } };
            availability?: { message?: string };
          }>;
        };
        images?: { primary?: { medium?: { url?: string } } };
      }>;
    };
  };

  const fetchedAt = new Date().toISOString();
  return (json.itemsResult?.items ?? []).map((item) => ({
    asin: item.asin,
    title: item.itemInfo?.title?.displayValue ?? item.asin,
    priceYen: item.offersV2?.listings?.[0]?.price?.money?.amount ?? null,
    detailPageUrl:
      item.detailPageURL ?? `https://www.amazon.co.jp/dp/${item.asin}?tag=${cfg.associateTag}`,
    imageUrl: item.images?.primary?.medium?.url,
    availabilityMessage: item.offersV2?.listings?.[0]?.availability?.message,
    fetchedAt,
  }));
}
