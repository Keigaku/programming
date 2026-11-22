import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CATEGORY_MAP } from '@/config/site';
import { loadGuides } from '@/lib/data/store';

export const metadata: Metadata = {
  title: '徹底比較ガイド一覧',
  description:
    'Audible・Kindle Unlimited比較、個人事業主のAmazonビジネス活用、スキンケア・デスクガジェットの実質最安ガイド一覧。',
};

export default function GuidesIndexPage() {
  const guides = loadGuides();

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Editorial Guides</p>
            <h1 className="section-title">編集部 徹底比較ガイド一覧</h1>
            <p className="section-desc">
              購買直前の比較検討に特化した実践ガイド。楽天のポイント還元とAmazon公式特典の両面から、最も損しない選択肢を整理しています。
            </p>
          </div>
        </div>

        <div className="guides-grid">
          {guides.map((guide) => {
            const cat = CATEGORY_MAP[guide.category];
            return (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="guide-card"
              >
                <img
                  src={guide.heroImage}
                  alt={guide.title}
                  className="guide-card-img"
                />
                <div className="guide-card-body">
                  <div className="guide-card-meta">
                    {cat?.shortLabel} · 更新 {guide.updatedAt} · {guide.readingTimeMin}分
                  </div>
                  <h2 className="guide-card-title">{guide.title}</h2>
                  <p className="guide-card-sub">{guide.subtitle}</p>
                  <span className="guide-card-cta">
                    記事を読む <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
