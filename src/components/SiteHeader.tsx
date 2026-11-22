import Link from 'next/link';
import { SITE_CONFIG } from '@/config/site';

export function SiteHeader() {
  return (
    <>
      <div className="pr-topbar" role="note" aria-label="広告表記">
        <div className="container pr-topbar-inner">
          <div>
            <span className="pr-badge">PR</span>
            <span>{SITE_CONFIG.prDisclosureShort}</span>
          </div>
          <span>価格・ポイント倍率は常に変動します</span>
        </div>
      </div>

      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand-mark" id="brand-logo-link">
            <span className="brand-title">{SITE_CONFIG.name}</span>
            <span className="brand-sub">{SITE_CONFIG.englishName}</span>
          </Link>

          <nav className="header-nav" aria-label="メインナビゲーション">
            <Link href="/deals" className="nav-link" id="nav-deals">
              高還元カタログ
            </Link>
            <Link href="/programs" className="nav-link" id="nav-programs">
              Amazon公式特典
            </Link>
            <Link href="/guides" className="nav-link" id="nav-guides">
              徹底比較ガイド
            </Link>
            <Link href="/ops" className="nav-link nav-link-ops" id="nav-ops">
              運用スタジオ
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
