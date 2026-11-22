import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { ProgramShowcase } from '@/components/ProgramShowcase';
import { loadAmazonPrograms } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Amazon公式サブスク・無料体験キャンペーン徹底比較',
  description:
    'Audible、Kindle Unlimited、Amazonビジネス、Amazon Music Unlimited、Prime Student、Amazonプライムの公式無料体験＆特典を一覧比較。',
};

export default function ProgramsPage() {
  const programs = loadAmazonPrograms();

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Amazonの無料体験キャンペーンは期間中に解約できますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい。Audible、Kindle Unlimited、Amazon Music Unlimited、Amazonプライムはいずれもアカウント設定画面からオンラインでいつでも解約手続きが可能です。',
        },
      },
      {
        '@type': 'Question',
        name: 'Amazonビジネスは個人事業主や副業でも登録できますか？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'はい。法人企業だけでなく個人事業主・フリーランスの方も基本アカウント無料（年会費0円）で登録でき、インボイス対応領収書の一括取得や法人価格を利用できます。',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <section className="section" style={{ paddingBottom: '40px' }}>
        <div className="container">
          <p className="section-eyebrow">Amazon Official Programs</p>
          <h1 className="section-title" style={{ marginBottom: '12px' }}>
            Amazon公式キャンペーン・無料体験 徹底比較
          </h1>
          <p className="section-desc" style={{ marginBottom: '32px' }}>
            物販セール以上に節約・生産性インパクトが大きいのが、Amazon公式の無料体験・法人向けアカウントです。自分のアカウントが対象かどうかは、各公式ページへアクセスするだけで自動判定されます。
          </p>

          <ProgramShowcase programs={programs} />
        </div>
      </section>

      <section className="section section-band">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="section-eyebrow">Quick Comparison Matrix</p>
              <h2 className="section-title">目的別・早見比較表</h2>
            </div>
          </div>

          <div className="ops-panel data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>プログラム名</th>
                  <th>おすすめ対象</th>
                  <th>主なメリット</th>
                  <th>公式ページ</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.name}</td>
                    <td>{p.targetAudience}</td>
                    <td>{p.highlights[0]}</td>
                    <td>
                      <a
                        href={p.affiliateUrl}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        className="btn btn-amazon btn-sm"
                      >
                        詳細を見る
                        <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
