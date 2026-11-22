import type { CategoryMeta, CategorySlug, KpiSimulationInput } from '@/types/affiliate';

export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'トクラボ',
  englishName: 'TokuLab',
  tagline: '楽天ポイント還元 × Amazon公式特典で、毎日の買い物を「実質最安」に。',
  description:
    '楽天市場のリアルタイム高還元・ランキングデータとAmazon公式キャンペーンを横断比較。日用品・美容・ガジェット・サブスクの「本当に得する買い方」を毎日更新する比較メディアです。',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com').replace(/\/$/, ''),
  prDisclosureShort: 'PR｜本サイトはアフィリエイト広告（楽天・Amazonアソシエイト）を利用しています',
  amazonAssociatesNotice:
    'Amazonのアソシエイトとして、トクラボは適格販売により収入を得ています。',
  rakutenAttribution: 'Supported by Rakuten Developers',
  priceDisclaimer:
    '掲載の価格・ポイント倍率・キャンペーン内容はデータ取得時点の情報です。最新の条件は必ずリンク先の販売ページにてご確認ください。',
} as const;

/**
 * 2026年 楽天市場の通常ジャンル料率基準（これを超える設定 = ショップ独自の料率アップ対象）
 * 料率アップ対象商品は「1商品1,000円上限」「同一ユーザー月3,000円上限」の対象外となるため最優先で狙う。
 */
export const RAKUTEN_STANDARD_GENRE_RATE: Record<CategorySlug, number> = {
  beauty: 4.0,
  daily: 4.0,
  gourmet: 4.0,
  gadget: 2.0,
  furusato: 4.0,
  reading: 3.0,
};

export const RAKUTEN_NORMAL_ITEM_CAP_YEN = 1000;

/**
 * 2026年 Amazonアソシエイト日本版 標準紹介料率（紹介料上限1,000円は廃止済み）
 */
export const AMAZON_CATEGORY_RATES_2026: Record<CategorySlug, number> = {
  beauty: 5.0, // ドラッグストア・ビューティー・コスメ
  daily: 5.0, // ドラッグストア・日用品
  gourmet: 8.0, // 食品&飲料・お酒
  gadget: 2.0, // PC・家電・カメラ（単価が高いため上限廃止の恩恵大）
  furusato: 2.0, // Amazonふるさと納税
  reading: 8.0, // Kindle本 8% / 紙の本 3% + Audible ¥2,000 特別プログラム
};

export const STRATEGIC_CATEGORIES: CategoryMeta[] = [
  {
    slug: 'beauty',
    label: '美容・スキンケア',
    shortLabel: '美容・コスメ',
    description:
      '楽天の料率アップ（10〜20%・上限なし）とスーパーDEALが最も豊富な主力ジャンル。Amazonも5%の高料率。',
    rakutenGenreId: '100939', // 美容・コスメ・香水
    rakutenKeywords: ['美容液', '化粧水 公式', 'クレンジング', 'シャンプー セット'],
    amazonCategoryRate: 5.0,
    typicalRateUpPct: 12.0,
    heroImage: '/images/cat-beauty.jpg',
  },
  {
    slug: 'daily',
    label: '日用品・ドラッグストア',
    shortLabel: '日用品',
    description:
      '0と5のつく日・お買い物マラソンのまとめ買い需要が圧倒的。リピート性が高くSNS速報のCVRが最上位。',
    rakutenGenreId: '215783', // 日用品雑貨・文房具・手芸
    rakutenKeywords: ['洗剤 詰め替え まとめ買い', '炭酸水 24本', 'タオル 今治', 'おむつ まとめ買い'],
    amazonCategoryRate: 5.0,
    typicalRateUpPct: 8.0,
    heroImage: '/images/cat-daily.jpg',
  },
  {
    slug: 'gourmet',
    label: '食品・お取り寄せグルメ',
    shortLabel: '食品・飲料',
    description:
      'Amazon紹介料率8%の超高料率カテゴリ。楽天でも訳あり・大容量グルメやコーヒー豆の料率アップが豊富。',
    rakutenGenreId: '100227', // 食品
    rakutenKeywords: ['コーヒー豆 自家焙煎', 'プロテイン', 'ミックスナッツ 大容量', '訳あり スイーツ'],
    amazonCategoryRate: 8.0,
    typicalRateUpPct: 10.0,
    heroImage: '/images/cat-gourmet.jpg',
  },
  {
    slug: 'gadget',
    label: 'ガジェット・デスク環境',
    shortLabel: 'ガジェット',
    description:
      '商品単価1〜10万円クラス。Amazonは1,000円上限廃止済みのため高単価比較記事の利益効率が抜群。',
    rakutenGenreId: '100026', // パソコン・周辺機器
    rakutenKeywords: ['ワイヤレスイヤホン ノイズキャンセリング', 'モバイルバッテリー 大容量', 'モニターライト', 'キーボード メカニカル'],
    amazonCategoryRate: 2.0,
    typicalRateUpPct: 6.0,
    heroImage: '/images/cat-gadget.jpg',
  },
  {
    slug: 'furusato',
    label: 'ふるさと納税・返礼品',
    shortLabel: 'ふるさと納税',
    description:
      '寄付単価1〜3万円の高単価ジャンル。楽天お買い物マラソンと買い回り相性が最強で年末に爆発。',
    rakutenGenreId: '566382', // ふるさと納税（該当ジャンルまたはキーワード併用）
    rakutenKeywords: ['ふるさと納税 いくら', 'ふるさと納税 米', 'ふるさと納税 ハンバーグ', 'ふるさと納税 帆立'],
    amazonCategoryRate: 2.0,
    typicalRateUpPct: 4.0,
    heroImage: '/images/cat-furusato.jpg',
  },
  {
    slug: 'reading',
    label: '読書・耳学・ビジネス',
    shortLabel: '読書・学び',
    description:
      'Audible無料体験（¥2,000/件）・Amazonビジネス（¥3,000/件）・Kindle Unlimited（¥1,000/件）の最強CPA柱。',
    rakutenGenreId: '200162', // 本・雑誌・コミック
    rakutenKeywords: ['ビジネス書 ベストセラー', '投資 入門書', 'プログラミング 本'],
    amazonCategoryRate: 8.0,
    typicalRateUpPct: 5.0,
    heroImage: '/images/cat-reading.jpg',
  },
];

export const CATEGORY_MAP: Record<CategorySlug, CategoryMeta> = STRATEGIC_CATEGORIES.reduce(
  (acc, item) => {
    acc[item.slug] = item;
    return acc;
  },
  {} as Record<CategorySlug, CategoryMeta>
);

export const DEFAULT_1M_KPI_INPUT: KpiSimulationInput = {
  monthlyWebPv: 150000,
  webCtrPct: 18.0,
  dailySnsClicks: 700,
  blendedCvrPct: 3.65,
  rakutenRateUpSharePct: 31.5,
  rakutenRateUpAvgCommission: 600,
  rakutenEventSharePct: 45.7,
  rakutenEventAvgCommission: 250,
  amazonProgramMonthlyConversions: 175,
  amazonProgramAvgBounty: 1600,
  amazonProductSharePct: 22.8,
  amazonProductAvgCommission: 475,
};
