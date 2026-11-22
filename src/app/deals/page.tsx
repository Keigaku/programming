import type { Metadata } from 'next';
import { CATEGORY_MAP, SITE_CONFIG } from '@/config/site';
import { DealExplorer } from '@/components/DealExplorer';
import { EventBanner } from '@/components/EventBanner';
import { loadDeals } from '@/lib/data/store';
import type { CategorySlug } from '@/types/affiliate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '楽天高還元・実質最安カタログ',
  description:
    '楽天市場のポイント高還元商品とAmazonを横並び比較。実質価格・レビュー評価・ジャンル別に今狙い目の商品を検索できます。',
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const rawCat = params.category as CategorySlug | undefined;
  const initialCategory: CategorySlug | 'all' =
    rawCat && CATEGORY_MAP[rawCat] ? rawCat : 'all';

  const deals = loadDeals();

  return (
    <>
      <EventBanner />
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-eyebrow">Live Comparison Catalog</p>
              <h1 className="section-title">楽天高還元 × Amazon 比較カタログ</h1>
              <p className="section-desc">
                {SITE_CONFIG.priceDisclaimer}
              </p>
            </div>
          </div>

          <DealExplorer deals={deals} initialCategory={initialCategory} />
        </div>
      </section>
    </>
  );
}
