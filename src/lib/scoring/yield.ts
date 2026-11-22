import {
  RAKUTEN_NORMAL_ITEM_CAP_YEN,
  RAKUTEN_STANDARD_GENRE_RATE,
} from '@/config/site';
import type {
  CategorySlug,
  KpiSimulationInput,
  KpiSimulationResult,
} from '@/types/affiliate';

/**
 * 楽天アフィリエイトの2026年ルールに基づき、1個販売あたりの推定報酬額（円）を算出。
 * - 通常料率（ジャンル基準以下）: 1商品1個あたり上限 1,000円
 * - 料率アップ対象商品（ショップ独自にジャンル基準を上回る料率を設定）: 1,000円上限＆同一ユーザー月3,000円上限なし
 */
export function isRakutenRateUpUncapped(
  affiliateRate: number,
  category: CategorySlug
): boolean {
  const standardRate = RAKUTEN_STANDARD_GENRE_RATE[category] ?? 4.0;
  // ジャンル通常料率（最大4%）を明確に上回る料率設定は料率アップ対象と判定
  return affiliateRate > standardRate + 0.05;
}

export function calculateRakutenCommissionYen(params: {
  price: number;
  affiliateRate: number;
  category: CategorySlug;
}): {
  estimatedCommissionYen: number;
  isRateUpUncapped: boolean;
} {
  const safePrice = Math.max(0, params.price);
  const safeRate = Math.max(0, params.affiliateRate);
  const uncapped = isRakutenRateUpUncapped(safeRate, params.category);
  // 税抜相当（税込÷1.1）ベースで保守的に試算
  const taxExcludedPrice = safePrice / 1.1;
  const rawCommission = Math.floor(taxExcludedPrice * (safeRate / 100));

  return {
    estimatedCommissionYen: uncapped
      ? rawCommission
      : Math.min(rawCommission, RAKUTEN_NORMAL_ITEM_CAP_YEN),
    isRateUpUncapped: uncapped,
  };
}

/**
 * 楽天市場の実質価格を計算（商品別ポイント倍率 + 最低SPU目安を加味しない純粋な商品別還元ベース）
 * ※ 誇大表示防止のため、確実に商品ページに記載される商品別ポイント倍率（pointRate）のみで算出。
 */
export function calculateEffectivePrice(params: {
  price: number;
  pointRate: number;
}): {
  estimatedPointBack: number;
  effectivePrice: number;
  effectiveDiscountPct: number;
} {
  const safePrice = Math.max(0, params.price);
  const safeMultiplier = Math.max(1, params.pointRate || 1);
  // 税抜100円につき1pt × pointRate 相当
  const estimatedPointBack = Math.floor((safePrice / 1.1 / 100) * safeMultiplier);
  const effectivePrice = Math.max(0, safePrice - estimatedPointBack);
  const effectiveDiscountPct =
    safePrice > 0 ? Math.round((estimatedPointBack / safePrice) * 1000) / 10 : 0;

  return {
    estimatedPointBack,
    effectivePrice,
    effectiveDiscountPct,
  };
}

/**
 * 収益期待値スコア（Yield Score: 0〜100）
 * 「売れる確度（レビュー数・評価・ポイント魅力・送料無料）」×「1件あたり報酬単価（料率アップ上限なし優遇）」
 */
export function calculateYieldScore(params: {
  estimatedCommissionYen: number;
  isRateUpUncapped: boolean;
  affiliateRate: number;
  pointRate: number;
  reviewAverage: number;
  reviewCount: number;
  postageFree: boolean;
}): number {
  // 1) 報酬単価インパクト (最大38点)
  const commissionScore = Math.min(38, (params.estimatedCommissionYen / 900) * 38);

  // 2) 料率アップ上限撤廃ボーナス (最大14点)
  const rateUpBonus = params.isRateUpUncapped
    ? Math.min(14, 6 + (params.affiliateRate - 4) * 0.6)
    : 0;

  // 3) 社会的証明・成約力 (レビュー件数×評価、最大28点)
  const reviewVolumeFactor = Math.min(1, Math.log10(Math.max(1, params.reviewCount) + 1) / 3.2);
  const ratingFactor = params.reviewAverage >= 4.0
    ? (params.reviewAverage - 3.5) / 1.5
    : Math.max(0, params.reviewAverage / 5) * 0.5;
  const socialProofScore = reviewVolumeFactor * ratingFactor * 28;

  // 4) ユーザーお得度（ポイント還元＋送料無料、最大20点）
  const pointScore = Math.min(15, Math.max(0, (params.pointRate - 1) * 1.1));
  const shippingScore = params.postageFree ? 5 : 0;

  const total = commissionScore + rateUpBonus + socialProofScore + pointScore + shippingScore;
  return Math.max(0, Math.min(100, Math.round(total)));
}

/**
 * 月100万円達成 KPI シミュレーター
 */
export function simulateMonthlyRevenue(input: KpiSimulationInput): KpiSimulationResult {
  const monthlyWebClicks = Math.round(input.monthlyWebPv * (input.webCtrPct / 100));
  const monthlySnsClicks = Math.round(input.dailySnsClicks * 30);
  const totalMonthlyClicks = monthlyWebClicks + monthlySnsClicks;

  const productConversions = Math.round(totalMonthlyClicks * (input.blendedCvrPct / 100));

  const shareTotal =
    Math.max(
      1,
      input.rakutenRateUpSharePct + input.rakutenEventSharePct + input.amazonProductSharePct
    );

  const p1Count = Math.round(productConversions * (input.rakutenRateUpSharePct / shareTotal));
  const p2Count = Math.round(productConversions * (input.rakutenEventSharePct / shareTotal));
  const p4Count = Math.max(0, productConversions - p1Count - p2Count);

  const pillar1RakutenRateUpYen = p1Count * input.rakutenRateUpAvgCommission;
  const pillar2RakutenEventYen = p2Count * input.rakutenEventAvgCommission;
  const pillar3AmazonProgramYen =
    input.amazonProgramMonthlyConversions * input.amazonProgramAvgBounty;
  const pillar4AmazonProductYen = p4Count * input.amazonProductAvgCommission;

  const totalMonthlyRevenueYen =
    pillar1RakutenRateUpYen +
    pillar2RakutenEventYen +
    pillar3AmazonProgramYen +
    pillar4AmazonProductYen;

  const totalConversions = productConversions + input.amazonProgramMonthlyConversions;
  const blendedEpcYen =
    totalMonthlyClicks > 0
      ? Math.round((totalMonthlyRevenueYen / totalMonthlyClicks) * 10) / 10
      : 0;

  const progressTo1MPercent = Math.round((totalMonthlyRevenueYen / 1_000_000) * 1000) / 10;

  return {
    monthlyWebClicks,
    monthlySnsClicks,
    totalMonthlyClicks,
    productConversions,
    programConversions: input.amazonProgramMonthlyConversions,
    totalConversions,
    pillar1RakutenRateUpYen,
    pillar2RakutenEventYen,
    pillar3AmazonProgramYen,
    pillar4AmazonProductYen,
    totalMonthlyRevenueYen,
    blendedEpcYen,
    progressTo1MPercent,
  };
}
