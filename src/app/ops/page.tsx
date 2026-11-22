import type { Metadata } from 'next';
import { OpsStudio } from '@/components/OpsStudio';
import { isAmazonTagConfigured } from '@/lib/amazon/links';
import { isCreatorsApiReady } from '@/lib/amazon/creators-api';
import { runComplianceAudit } from '@/lib/compliance/audit';
import {
  loadAmazonPrograms,
  loadCuratedStore,
  loadDeals,
  loadSnsQueue,
} from '@/lib/data/store';
import { getRakutenApiConfig, isRakutenApiConfigured } from '@/lib/rakuten/client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '運営コマンドスタジオ（月100万KPI & 自動同期）',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OpsPage() {
  const deals = loadDeals();
  const programs = loadAmazonPrograms();
  const snsQueue = loadSnsQueue();
  const curated = loadCuratedStore();
  const compliance = runComplianceAudit({ deals, programs, snsQueue });
  const rakutenCfg = getRakutenApiConfig();

  return (
    <>
      <div className="ops-banner">
        <div className="container">
          <p className="section-eyebrow" style={{ color: '#a8a29e' }}>
            Operator Command Center · noindex
          </p>
          <h1 className="serif-heading" style={{ margin: '0 0 8px', fontSize: 'clamp(1.6rem, 2.6vw, 2.1rem)' }}>
            月100万円 収益化コマンドスタジオ
          </h1>
          <p style={{ margin: 0, color: '#d6d0c4', fontSize: '0.92rem', maxWidth: '72ch' }}>
            楽天2026新API（料率アップ上限撤廃）のライブ同期、Amazon手動ASIN/SiteStripe紐付け、Creators API（30日10件）解放進捗、SNS投稿量産、規約監査を1画面で実行します。
          </p>
        </div>
      </div>

      <section className="section" style={{ paddingTop: '32px' }}>
        <div className="container">
          <OpsStudio
            initialDeals={deals}
            initialPrograms={programs}
            initialSnsQueue={snsQueue}
            initialCurated={curated}
            initialCompliance={compliance}
            apiStatus={{
              rakutenConfigured: isRakutenApiConfigured(rakutenCfg),
              rakutenAffiliateIdConfigured: Boolean(rakutenCfg.affiliateId),
              rakutenSearchVersion: rakutenCfg.searchVersion,
              amazonTagConfigured: isAmazonTagConfigured(),
              amazonCreatorsApiReady: isCreatorsApiReady(),
            }}
          />
        </div>
      </section>
    </>
  );
}
