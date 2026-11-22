export type CategorySlug =
  | 'beauty'
  | 'daily'
  | 'gourmet'
  | 'gadget'
  | 'furusato'
  | 'reading';

export interface CategoryMeta {
  slug: CategorySlug;
  label: string;
  shortLabel: string;
  description: string;
  rakutenGenreId: string;
  rakutenKeywords: string[];
  amazonCategoryRate: number; // % (2026 Japan standard rate)
  typicalRateUpPct: number; // % on Rakuten rate-up shops
  heroImage: string;
}

export interface DealItem {
  id: string;
  itemCode: string;
  title: string;
  shortTitle: string;
  catchcopy: string;
  category: CategorySlug;
  shopName: string;
  shopCode: string;
  price: number;
  pointRate: number; // e.g., 10 means 10x points (~10% return incl base)
  estimatedPointBack: number; // yen equivalent
  effectivePrice: number; // price - estimatedPointBack
  affiliateRate: number; // Rakuten affiliate % (e.g., 2, 4, 8, 15, 20)
  isRateUpUncapped: boolean; // true when shop offers rate-up above standard genre cap -> NO 1,000 yen cap!
  estimatedRakutenCommission: number; // yen per unit sold
  yieldScore: number; // 0-100 composite profitability + conversion score
  reviewAverage: number;
  reviewCount: number;
  postageFree: boolean;
  imageUrl: string;
  rakutenAffiliateUrl: string;
  rakutenItemUrl: string;
  amazonUrl: string;
  amazonLinkType: 'sitestripe' | 'asin' | 'search';
  amazonAsin?: string;
  rank?: number;
  tags: string[];
  fetchedAt: string; // ISO timestamp
  source: 'rakuten_live' | 'seed_demo';
}

export interface CuratedAmazonMapping {
  itemCode: string;
  asin?: string;
  siteStripeUrl?: string;
  customAmazonKeyword?: string;
  editorialNote?: string;
  updatedAt: string;
}

export interface CreatorsApiProgress {
  qualifyingSalesLast30Days: number;
  targetSales: number; // 10 sales in 30 days for Amazon Creators API
  creatorsApiEnabled: boolean;
  lastUpdatedAt: string;
}

export interface CuratedCatalogStore {
  mappings: CuratedAmazonMapping[];
  creatorsProgress: CreatorsApiProgress;
}

export interface AmazonSpecialProgram {
  id: string;
  name: string;
  badge: string;
  headline: string;
  summary: string;
  targetAudience: string;
  rewardYen: number; // Official Japan bounty (500 - 3,000 yen)
  rewardNote: string;
  officialBaseUrl: string;
  ctaLabel: string;
  highlights: string[];
  conversionTips: string;
  priority: 1 | 2 | 3;
  image: string;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideProductPick {
  rank: number;
  name: string;
  verdict: string;
  priceEstimate: string;
  rakutenKeyword: string;
  rakutenItemCode?: string;
  amazonAsin?: string;
  amazonKeyword: string;
  bestFor: string;
  pros: string[];
}

export interface EditorialGuide {
  slug: string;
  title: string;
  subtitle: string;
  category: CategorySlug;
  publishedAt: string;
  updatedAt: string;
  readingTimeMin: number;
  heroImage: string;
  targetKeywords: string[];
  lead: string;
  sections: {
    heading: string;
    body: string[];
  }[];
  picks: GuideProductPick[];
  recommendedProgramId?: string;
  faqs: GuideFaq[];
}

export type SnsPlatform = 'x' | 'threads' | 'line';
export type SnsSlot = 'morning_0730' | 'noon_1215' | 'evening_1930' | 'night_2130';

export interface SnsPostDraft {
  id: string;
  platform: SnsPlatform;
  slot: SnsSlot;
  slotLabel: string;
  pillar: 'rakuten_rate_up' | 'rakuten_event' | 'amazon_program' | 'guide_promo';
  title: string;
  body: string;
  url: string;
  weightedCharCount: number;
  isWithinXLimit: boolean;
  estimatedEpcYen: number;
  hasPrDisclosure: boolean;
  createdAt: string;
}

export interface KpiSimulationInput {
  monthlyWebPv: number;
  webCtrPct: number;
  dailySnsClicks: number;
  blendedCvrPct: number;
  rakutenRateUpSharePct: number;
  rakutenRateUpAvgCommission: number;
  rakutenEventSharePct: number;
  rakutenEventAvgCommission: number;
  amazonProgramMonthlyConversions: number;
  amazonProgramAvgBounty: number;
  amazonProductSharePct: number;
  amazonProductAvgCommission: number;
}

export interface KpiSimulationResult {
  monthlyWebClicks: number;
  monthlySnsClicks: number;
  totalMonthlyClicks: number;
  productConversions: number;
  programConversions: number;
  totalConversions: number;
  pillar1RakutenRateUpYen: number;
  pillar2RakutenEventYen: number;
  pillar3AmazonProgramYen: number;
  pillar4AmazonProductYen: number;
  totalMonthlyRevenueYen: number;
  blendedEpcYen: number;
  progressTo1MPercent: number;
}

export interface ComplianceCheckItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}
