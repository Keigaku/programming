import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, ExternalLink } from 'lucide-react';
import { CATEGORY_MAP, SITE_CONFIG } from '@/config/site';
import { buildAmazonAsinUrl, buildAmazonSearchUrl } from '@/lib/amazon/links';
import {
  loadAmazonPrograms,
  loadDeals,
  loadGuideBySlug,
  loadGuides,
} from '@/lib/data/store';
import { buildRakutenAffiliateFallbackUrl, getRakutenApiConfig } from '@/lib/rakuten/client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = loadGuideBySlug(slug);
  if (!guide) return { title: '記事が見つかりません' };

  return {
    title: guide.title,
    description: guide.subtitle,
    openGraph: {
      title: guide.title,
      description: guide.subtitle,
      type: 'article',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      images: [{ url: guide.heroImage }],
    },
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = loadGuideBySlug(slug);
  if (!guide) notFound();

  const deals = loadDeals();
  const programs = loadAmazonPrograms();
  const relatedGuides = loadGuides().filter((g) => g.slug !== guide.slug).slice(0, 2);
  const recProgram = programs.find((p) => p.id === guide.recommendedProgramId);
  const rakutenCfg = getRakutenApiConfig();
  const cat = CATEGORY_MAP[guide.category];

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.subtitle,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    image: `${SITE_CONFIG.url}${guide.heroImage}`,
    author: { '@type': 'Organization', name: SITE_CONFIG.name },
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <article className="article-wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <nav style={{ fontSize: '0.82rem', color: 'var(--ink-tertiary)', marginBottom: '16px' }}>
        <Link href="/">ホーム</Link> / <Link href="/guides">比較ガイド</Link> /{' '}
        <span>{cat?.shortLabel}</span>
      </nav>

      <header>
        <p className="section-eyebrow">
          {cat?.label} · 更新日 {guide.updatedAt} · 読了目安 {guide.readingTimeMin}分
        </p>
        <h1 className="hero-title" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.35rem)' }}>
          {guide.title}
        </h1>
        <p className="hero-lead" style={{ maxWidth: 'none', marginBottom: '12px' }}>
          {guide.subtitle}
        </p>
      </header>

      <img src={guide.heroImage} alt={guide.title} className="article-hero-img" />

      <div className="article-body">
        <p
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '8px',
            color: 'var(--ink-primary)',
          }}
        >
          {guide.lead}
        </p>

        {guide.sections.map((sec) => (
          <section key={sec.heading}>
            <h2>{sec.heading}</h2>
            {sec.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </section>
        ))}

        {/* Picks with compliant Rakuten + Amazon dual CTAs */}
        <section>
          <h2>編集部のおすすめ厳選ピックアップ</h2>
          {guide.picks.map((pick) => {
            const matchedDeal = pick.rakutenItemCode
              ? deals.find((d) => d.itemCode === pick.rakutenItemCode)
              : undefined;
            const rakutenFallback = buildRakutenAffiliateFallbackUrl(
              `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(pick.rakutenKeyword)}/`,
              rakutenCfg.affiliateId
            );
            const rakutenUrl = matchedDeal?.rakutenAffiliateUrl || rakutenFallback;
            const amazonUrl = pick.amazonAsin
              ? buildAmazonAsinUrl(pick.amazonAsin)
              : matchedDeal?.amazonUrl || buildAmazonSearchUrl(pick.amazonKeyword);

            return (
              <div className="pick-card" key={pick.name}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    marginBottom: '8px',
                  }}
                >
                  <span className="event-tag">PICK #{pick.rank}</span>
                  <span className="mono-num" style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                    {pick.priceEstimate}
                  </span>
                </div>

                <h3 className="serif-heading" style={{ fontSize: '1.25rem', margin: '0 0 6px' }}>
                  {pick.name}
                </h3>
                <p style={{ margin: '0 0 10px', fontWeight: 700, color: 'var(--rakuten)', fontSize: '0.9rem' }}>
                  {pick.verdict}
                </p>
                <p style={{ margin: '0 0 12px', fontSize: '0.88rem' }}>
                  <strong>こんな人におすすめ：</strong>
                  {pick.bestFor}
                </p>

                <ul className="program-list" style={{ marginBottom: '16px' }}>
                  {pick.pros.map((pro) => (
                    <li key={pro}>
                      <Check size={15} className="program-check" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>

                <div className="deal-cta-group">
                  <a
                    href={rakutenUrl}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    className="btn btn-rakuten btn-sm"
                  >
                    楽天市場で価格・還元を見る
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href={amazonUrl}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    className="btn btn-amazon btn-sm"
                  >
                    Amazonで条件を比較する
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </section>

        {/* Contextual Amazon Official Program CTA */}
        {recProgram && (
          <section
            style={{
              marginTop: '36px',
              padding: '24px',
              backgroundColor: 'var(--amazon-soft)',
              border: '1px solid #f0d7a8',
              borderRadius: '12px',
            }}
          >
            <p className="section-eyebrow" style={{ color: 'var(--amazon)' }}>
              Recommended Official Perk
            </p>
            <h2 style={{ marginTop: 0, borderBottom: 'none', paddingBottom: 0 }}>
              あわせて確認したい公式特典：{recProgram.name}
            </h2>
            <p style={{ color: 'var(--ink-primary)' }}>{recProgram.summary}</p>
            <a
              href={recProgram.affiliateUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="btn btn-amazon"
            >
              {recProgram.ctaLabel}
              <ExternalLink size={15} />
            </a>
          </section>
        )}

        {/* FAQs */}
        {guide.faqs.length > 0 && (
          <section>
            <h2>よくある質問</h2>
            {guide.faqs.map((faq) => (
              <div className="faq-item" key={faq.question}>
                <h3 style={{ margin: '0 0 6px', fontSize: '0.98rem' }}>Q. {faq.question}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>A. {faq.answer}</p>
              </div>
            ))}
          </section>
        )}

        {/* Related Guides */}
        {relatedGuides.length > 0 && (
          <section style={{ marginTop: '48px' }}>
            <h2>あわせて読みたい比較ガイド</h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              {relatedGuides.map((rg) => (
                <Link
                  key={rg.slug}
                  href={`/guides/${rg.slug}`}
                  className="ops-panel"
                  style={{ display: 'block', padding: '16px 20px' }}
                >
                  <div style={{ fontWeight: 700 }}>{rg.title}</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                    {rg.subtitle}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
