import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SITE_CONFIG, STRATEGIC_CATEGORIES } from '@/config/site';
import { DealExplorer } from '@/components/DealExplorer';
import { EventBanner } from '@/components/EventBanner';
import { ProgramShowcase } from '@/components/ProgramShowcase';
import {
  loadAmazonPrograms,
  loadDeals,
  loadGuides,
} from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const deals = loadDeals();
  const programs = loadAmazonPrograms();
  const guides = loadGuides();

  const maxPointRate = deals.reduce((m, d) => Math.max(m, d.pointRate), 10);
  const lastUpdated = deals[0]?.fetchedAt
    ? new Date(deals[0].fetchedAt).toLocaleDateString('ja-JP')
    : '本日更新';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <EventBanner />

      {/* Editorial Hero */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div>
            <p className="hero-kicker">Rakuten API × Amazon Official Perks</p>
            <h1 className="hero-title">
              定価ではなく、
              <br />
              「実質最安」で選ぶ暮らしの道具。
            </h1>
            <p className="hero-lead">
              楽天市場のポイント高還元データと、Amazonの公式キャンペーン・無料体験特典を毎日横断チェック。美容・日用品・ガジェット・読書の「本当に損しない買い方」だけを厳選して届けます。
            </p>

            <div className="hero-actions">
              <Link href="/deals" className="btn btn-primary" id="hero-cta-deals">
                本日の高還元ランキングを見る
                <ArrowRight size={16} />
              </Link>
              <Link href="/programs" className="btn btn-secondary" id="hero-cta-programs">
                Amazon公式無料体験を比較
              </Link>
            </div>

            <div className="hero-metrics">
              <div>
                <div className="metric-value">最大 {maxPointRate}倍</div>
                <div className="metric-label">楽天ポイント還元モデル</div>
              </div>
              <div>
                <div className="metric-value">{programs.length} 特典</div>
                <div className="metric-label">Amazon公式キャンペーン</div>
              </div>
              <div>
                <div className="metric-value">{lastUpdated}</div>
                <div className="metric-label">最新データ同期日</div>
              </div>
            </div>
          </div>

          <div className="hero-visual-frame">
            <img
              src="/images/hero-editorial.jpg"
              alt="厳選されたスキンケア・ワイヤレスヘッドホン・コーヒー・書籍が並ぶ朝のワークデスク"
              className="hero-visual-img"
            />
            <div className="hero-visual-caption">
              <span>編集部セレクション｜楽天高還元 × Amazon比較カタログ</span>
              <span className="mono-num">UPDATED DAILY</span>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Categories */}
      <section className="section" aria-labelledby="heading-categories">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-eyebrow">Categories</p>
              <h2 className="section-title" id="heading-categories">
                高還元・比較需要の高い6ジャンル
              </h2>
            </div>
            <Link href="/deals" className="section-link">
              全カテゴリ一覧へ <ArrowRight size={15} />
            </Link>
          </div>

          <div className="category-grid">
            {STRATEGIC_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/deals?category=${cat.slug}`}
                className="category-tile"
                id={`home-cat-${cat.slug}`}
              >
                <img src={cat.heroImage} alt={cat.label} className="category-tile-img" />
                <div className="category-tile-body">
                  <h3 className="category-tile-name">{cat.shortLabel}</h3>
                  <p className="category-tile-meta">高還元・比較対象</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live High-Return Deals */}
      <section className="section section-band" aria-labelledby="heading-deals">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-eyebrow">Live Ranking &amp; Point Return</p>
              <h2 className="section-title" id="heading-deals">
                本日の楽天高還元 × Amazon横断比較
              </h2>
              <p className="section-desc">
                商品別ポイント還元を加味した「実質価格目安」とレビュー評価で厳選。ワンクリックで楽天とAmazonの条件を見比べられます。
              </p>
            </div>
            <Link href="/deals" className="section-link">
              すべての商品を見る <ArrowRight size={15} />
            </Link>
          </div>

          <DealExplorer deals={deals} limit={6} />
        </div>
      </section>

      {/* Amazon Official Special Programs */}
      <section className="section" aria-labelledby="heading-programs">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-eyebrow">Amazon Official Campaigns</p>
              <h2 className="section-title" id="heading-programs">
                まずチェックしたいAmazon公式・無料体験特典
              </h2>
              <p className="section-desc">
                聴く読書（Audible）、電子書籍読み放題（Kindle Unlimited）、事業用経費を効率化するAmazonビジネスまで。対象アカウントなら0円で試せる公式プログラム一覧です。
              </p>
            </div>
            <Link href="/programs" className="section-link">
              全特典の徹底比較へ <ArrowRight size={15} />
            </Link>
          </div>

          <ProgramShowcase programs={programs.slice(0, 3)} />
        </div>
      </section>

      {/* Editorial Comparison Guides */}
      <section className="section section-band" aria-labelledby="heading-guides">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-eyebrow">Editorial Guides</p>
              <h2 className="section-title" id="heading-guides">
                買い物の失敗をなくす徹底比較ガイド
              </h2>
              <p className="section-desc">
                楽天のイベント日とAmazonのタイムセール・公式特典をどう使い分けるか、ジャンル別に分かりやすく整理しました。
              </p>
            </div>
            <Link href="/guides" className="section-link">
              ガイド一覧へ <ArrowRight size={15} />
            </Link>
          </div>

          <div className="guides-grid">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="guide-card"
                id={`home-guide-${guide.slug}`}
              >
                <img
                  src={guide.heroImage}
                  alt={guide.title}
                  className="guide-card-img"
                />
                <div className="guide-card-body">
                  <div className="guide-card-meta">
                    更新 {guide.updatedAt} · 読了目安 {guide.readingTimeMin}分
                  </div>
                  <h3 className="guide-card-title">{guide.title}</h3>
                  <p className="guide-card-sub">{guide.subtitle}</p>
                  <span className="guide-card-cta">
                    比較記事を読む <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
