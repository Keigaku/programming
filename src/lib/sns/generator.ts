import { SITE_CONFIG } from '@/config/site';
import { buildAmazonSpecialProgramUrl } from '@/lib/amazon/links';
import { getActiveCampaignEvent } from '@/lib/rakuten/calendar';
import type {
  AmazonSpecialProgram,
  DealItem,
  EditorialGuide,
  SnsPlatform,
  SnsPostDraft,
  SnsSlot,
} from '@/types/affiliate';

const SLOT_LABELS: Record<SnsSlot, string> = {
  morning_0730: '朝 07:30（通勤・情報収集タイム）',
  noon_1215: '昼 12:15（ランチ・スマホ閲覧ピーク）',
  evening_1930: '夜 19:30（帰宅・比較検討タイム）',
  night_2130: '夜 21:30（購入CVR最大ピーク）',
};

/**
 * X (旧Twitter) の加重文字数カウント仕様に準拠
 * - URL は一律 23 文字換算
 * - ASCII 半角文字は 1、全角日本語・絵文字は 2 カウント（上限 280）
 */
export function countXWeightedLength(text: string): number {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlRegex) ?? [];
  const withoutUrls = text.replace(urlRegex, '');
  let count = urls.length * 23;

  for (const ch of withoutUrls) {
    const code = ch.codePointAt(0) ?? 0;
    count += code <= 0x007f ? 1 : 2;
  }
  return count;
}

function fitToXLimit(lines: string[], url: string): string {
  const suffix = `\n${url}\n#PR`;
  const maxBodyWeight = 280 - countXWeightedLength(suffix) - 2;

  let body = lines.join('\n').trim();
  while (countXWeightedLength(body) > maxBodyWeight && body.length > 20) {
    body = `${body.slice(0, body.length - 4)}…`;
  }
  return `${body}${suffix}`;
}

export function generateSnsQueue(params: {
  deals: DealItem[];
  programs: AmazonSpecialProgram[];
  guides: EditorialGuide[];
  now?: Date;
}): SnsPostDraft[] {
  const now = params.now ?? new Date();
  const createdAt = now.toISOString();
  const event = getActiveCampaignEvent(now);
  const drafts: SnsPostDraft[] = [];

  // 1) 柱① 楽天「料率アップ＆高還元」トップ商品から X / Threads 用投稿を生成
  const topRateUpDeals = [...params.deals]
    .sort((a, b) => b.yieldScore - a.yieldScore)
    .slice(0, 4);

  const dealSlots: SnsSlot[] = ['noon_1215', 'evening_1930', 'night_2130', 'morning_0730'];

  topRateUpDeals.forEach((deal, idx) => {
    const slot = dealSlots[idx % dealSlots.length];
    const pointText =
      deal.pointRate >= 5
        ? `ポイント${deal.pointRate}倍（約${deal.estimatedPointBack.toLocaleString()}pt還元）`
        : '高評価レビュー多数';
    const shippingText = deal.postageFree ? '送料無料' : '在庫あり';
    const reviewText =
      deal.reviewCount > 0 ? `★${deal.reviewAverage.toFixed(1)}（${deal.reviewCount.toLocaleString()}件）` : '';

    const xBody = fitToXLimit(
      [
        `${event.snsHookPrefix} ${deal.shortTitle.slice(0, 32)}`,
        `定価${deal.price.toLocaleString()}円 → 実質${deal.effectivePrice.toLocaleString()}円目安`,
        `・${pointText} / ${shippingText}`,
        reviewText ? `・評価 ${reviewText}` : '',
        '※価格・還元は変動するためリンク先で確認',
      ].filter(Boolean),
      deal.rakutenAffiliateUrl
    );

    const weighted = countXWeightedLength(xBody);
    drafts.push({
      id: `sns-x-deal-${idx + 1}`,
      platform: 'x',
      slot,
      slotLabel: SLOT_LABELS[slot],
      pillar: deal.isRateUpUncapped ? 'rakuten_rate_up' : 'rakuten_event',
      title: `[楽天] ${deal.shortTitle}`,
      body: xBody,
      url: deal.rakutenAffiliateUrl,
      weightedCharCount: weighted,
      isWithinXLimit: weighted <= 280,
      estimatedEpcYen: Math.round(deal.estimatedRakutenCommission * 0.045 * 10) / 10,
      hasPrDisclosure: xBody.includes('#PR'),
      createdAt,
    });
  });

  // 2) 柱③ Amazon公式特別プログラム（API不要・単価1,000〜3,000円）の集中投下投稿
  const topPrograms = [...params.programs]
    .sort((a, b) => b.rewardYen - a.rewardYen)
    .slice(0, 3);

  const programSlots: SnsSlot[] = ['morning_0730', 'evening_1930', 'night_2130'];

  topPrograms.forEach((prog, idx) => {
    const url = buildAmazonSpecialProgramUrl(prog.officialBaseUrl);
    const slot = programSlots[idx % programSlots.length];
    const shortName = prog.name.replace(/（[^）]*）/g, '').trim();
    const xBody = fitToXLimit(
      [
        `【Amazon公式特典】${shortName}`,
        `・${(prog.highlights[0] ?? prog.headline).slice(0, 36)}`,
        `・${(prog.highlights[1] ?? '無料期間中の解約手続きもOK').slice(0, 36)}`,
        '対象アカウントか公式ページで確認▼',
      ],
      url
    );

    const weighted = countXWeightedLength(xBody);
    drafts.push({
      id: `sns-x-prog-${prog.id}`,
      platform: 'x',
      slot,
      slotLabel: SLOT_LABELS[slot],
      pillar: 'amazon_program',
      title: `[Amazon特別] ${prog.name}（単価¥${prog.rewardYen.toLocaleString()}）`,
      body: xBody,
      url,
      weightedCharCount: weighted,
      isWithinXLimit: weighted <= 280,
      estimatedEpcYen: Math.round(prog.rewardYen * 0.035 * 10) / 10,
      hasPrDisclosure: xBody.includes('#PR'),
      createdAt,
    });
  });

  // 3) 自社比較ガイドへの送客（SEO＋SNSのハイブリッド循環 / Threads & LINE向け長文）
  const featuredGuide = params.guides[0];
  if (featuredGuide) {
    const guideUrl = `${SITE_CONFIG.url}/guides/${featuredGuide.slug}`;
    const threadsBody = [
      `【保存版】${featuredGuide.title}`,
      '',
      featuredGuide.lead,
      '',
      '楽天のポイント還元込み実質価格とAmazon公式特典を横並びで比較しました。買い回り前のチェックリストにどうぞ▼',
      guideUrl,
      '',
      '#PR #お得情報 #楽天購入品 #Amazonおすすめ',
    ].join('\n');

    drafts.push({
      id: `sns-threads-guide-${featuredGuide.slug}`,
      platform: 'threads' as SnsPlatform,
      slot: 'night_2130',
      slotLabel: SLOT_LABELS.night_2130,
      pillar: 'guide_promo',
      title: `[比較記事] ${featuredGuide.title}`,
      body: threadsBody,
      url: guideUrl,
      weightedCharCount: countXWeightedLength(threadsBody),
      isWithinXLimit: countXWeightedLength(threadsBody) <= 280,
      estimatedEpcYen: 24.5,
      hasPrDisclosure: threadsBody.includes('#PR'),
      createdAt,
    });
  }

  return drafts;
}

/**
 * Buffer / SocialDog / スプレッドシート一括予約投稿用 CSV を生成
 */
export function exportSnsQueueToCsv(drafts: SnsPostDraft[]): string {
  const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const header = [
    'id',
    'platform',
    'slot',
    'pillar',
    'title',
    'body',
    'url',
    'weighted_chars',
    'has_pr',
    'estimated_epc_yen',
  ].join(',');

  const rows = drafts.map((d) =>
    [
      d.id,
      d.platform,
      d.slot,
      d.pillar,
      d.title,
      d.body,
      d.url,
      String(d.weightedCharCount),
      String(d.hasPrDisclosure),
      String(d.estimatedEpcYen),
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [header, ...rows].join('\n');
}
