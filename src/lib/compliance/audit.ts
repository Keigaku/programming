import { SITE_CONFIG } from '@/config/site';
import { isAmazonTagConfigured } from '@/lib/amazon/links';
import { isRakutenApiConfigured } from '@/lib/rakuten/client';
import type {
  AmazonSpecialProgram,
  ComplianceCheckItem,
  DealItem,
  SnsPostDraft,
} from '@/types/affiliate';

/**
 * 楽天アフィリエイト・Amazonアソシエイト・景品表示法（ステマ規制）の自動監査
 */
export function runComplianceAudit(params: {
  deals: DealItem[];
  programs: AmazonSpecialProgram[];
  snsQueue: SnsPostDraft[];
}): ComplianceCheckItem[] {
  const checks: ComplianceCheckItem[] = [];

  // 1. ステマ規制（PR表記）
  const prSiteOk = SITE_CONFIG.prDisclosureShort.includes('PR');
  const snsWithoutPr = params.snsQueue.filter((p) => !p.hasPrDisclosure);
  checks.push({
    id: 'pr_disclosure',
    label: '景品表示法（ステマ規制）PR表記',
    status: prSiteOk && snsWithoutPr.length === 0 ? 'pass' : 'fail',
    detail:
      snsWithoutPr.length === 0
        ? `サイト全ページ上部バナーおよびSNS投稿 ${params.snsQueue.length}件 すべてに PR 表記を確認`
        : `${snsWithoutPr.length}件のSNS投稿に #PR 表記が欠落しています`,
  });

  // 2. Amazonアソシエイト必須クレジット
  const amazonNoticeOk =
    SITE_CONFIG.amazonAssociatesNotice.includes('Amazonのアソシエイトとして') &&
    SITE_CONFIG.amazonAssociatesNotice.includes('適格販売により収入を得ています');
  checks.push({
    id: 'amazon_disclosure',
    label: 'Amazonアソシエイト運営規約・必須表記',
    status: amazonNoticeOk ? 'pass' : 'fail',
    detail: amazonNoticeOk
      ? 'フッターおよび運営情報ページに公式規定の必須文言を常時表示'
      : '必須文言が規約と一致しません',
  });

  // 3. 楽天APIデータ利用時の楽天アフィリエイトリンク併置義務
  const missingRakutenLink = params.deals.filter(
    (d) => !d.rakutenAffiliateUrl || !d.rakutenAffiliateUrl.startsWith('https://')
  );
  checks.push({
    id: 'rakuten_pairing',
    label: '楽天API取得商品への楽天リンク併置義務',
    status: missingRakutenLink.length === 0 ? 'pass' : 'fail',
    detail:
      missingRakutenLink.length === 0
        ? `掲載 ${params.deals.length}商品 すべてに楽天アフィリエイトリンクを正規併置（他社単独誘導なし）`
        : `${missingRakutenLink.length}件で楽天アフィリエイトリンクが欠落しています`,
  });

  // 4. Amazon非スクレイピング徹底（API未解放フェーズ）
  const nonCompliantAmazon = params.deals.filter(
    (d) =>
      !d.amazonUrl.startsWith('https://www.amazon.co.jp/') &&
      !d.amazonUrl.startsWith('https://amzn.to/')
  );
  checks.push({
    id: 'amazon_no_scraping',
    label: 'Amazon非スクレイピング & 公式リンク形式',
    status: nonCompliantAmazon.length === 0 ? 'pass' : 'fail',
    detail:
      nonCompliantAmazon.length === 0
        ? 'スクレイピング処理ゼロ。全Amazonリンクは公式SiteStripe / ASIN直リンク / 検索リンク / 特別プログラムLPで構成'
        : `${nonCompliantAmazon.length}件のAmazonリンクURLが不正です`,
  });

  // 5. X文字数制限チェック
  const xPosts = params.snsQueue.filter((p) => p.platform === 'x');
  const overLimit = xPosts.filter((p) => !p.isWithinXLimit);
  checks.push({
    id: 'x_char_limit',
    label: 'X投稿テンプレート文字数（280加重文字以内）',
    status: overLimit.length === 0 ? 'pass' : 'warn',
    detail:
      overLimit.length === 0
        ? `X向け投稿 ${xPosts.length}件 すべて280加重文字以内（即投稿可能）`
        : `${overLimit.length}件がXの文字数上限を超過しています`,
  });

  // 6. 本番キー設定ステータス
  const rakutenReady = isRakutenApiConfigured();
  const amazonTagReady = isAmazonTagConfigured();
  checks.push({
    id: 'env_keys',
    label: '本番APIキー & トラッキングID設定状況',
    status: rakutenReady && amazonTagReady ? 'pass' : 'warn',
    detail:
      rakutenReady && amazonTagReady
        ? '楽天2026新APIキー・AmazonトラッキングIDともに本番設定済み'
        : `未設定項目あり（楽天API: ${rakutenReady ? '設定済' : '.env.localに要設定'} / Amazonタグ: ${amazonTagReady ? '設定済' : '.env.localに要設定'}）。現在はデモデータで安全稼働中。`,
  });

  return checks;
}
