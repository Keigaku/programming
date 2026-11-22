import Link from 'next/link';
import { SITE_CONFIG } from '@/config/site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <p className="footer-brand">
              {SITE_CONFIG.name} / {SITE_CONFIG.englishName}
            </p>
            <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: 1.75 }}>
              {SITE_CONFIG.description}
            </p>
          </div>

          <div>
            <h2 className="footer-heading">コンテンツ</h2>
            <ul className="footer-links">
              <li>
                <Link href="/deals">楽天高還元・実質最安カタログ</Link>
              </li>
              <li>
                <Link href="/programs">Amazon公式サブスク・無料体験特集</Link>
              </li>
              <li>
                <Link href="/guides">編集部 徹底比較ガイド一覧</Link>
              </li>
              <li>
                <Link href="/ops">運営者向け コマンドスタジオ</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="footer-heading">サイトポリシー・規約</h2>
            <ul className="footer-links">
              <li>
                <Link href="/legal#operator">運営者情報</Link>
              </li>
              <li>
                <Link href="/legal#advertising">広告掲載・PR表記ポリシー</Link>
              </li>
              <li>
                <Link href="/legal#disclaimer">免責事項・価格データについて</Link>
              </li>
              <li>
                <Link href="/legal#privacy">プライバシーポリシー</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-disclosures">
          <p className="footer-amazon-mandatory" style={{ margin: 0 }}>
            {SITE_CONFIG.amazonAssociatesNotice}
          </p>
          <p style={{ margin: 0 }}>
            {SITE_CONFIG.priceDisclaimer}
          </p>
          <p style={{ margin: 0, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>
              <a
                href="https://webservice.rakuten.co.jp/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'underline' }}
              >
                {SITE_CONFIG.rakutenAttribution}
              </a>
            </span>
            <span>© {new Date().getFullYear()} {SITE_CONFIG.name}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
