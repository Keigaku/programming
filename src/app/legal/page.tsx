import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: '運営者情報・広告掲載ポリシー・免責事項',
  description: `${SITE_CONFIG.name}の運営者情報、アフィリエイト広告表記（景品表示法ステマ規制対応）、Amazonアソシエイト表記、プライバシーポリシー。`,
};

export default function LegalPage() {
  return (
    <article className="article-wrap">
      <p className="section-eyebrow">Site Policy &amp; Disclosure</p>
      <h1 className="hero-title" style={{ fontSize: '2rem', marginBottom: '28px' }}>
        運営者情報・広告ポリシー・免責事項
      </h1>

      <div className="article-body">
        <section id="operator">
          <h2>運営者情報</h2>
          <p>
            サイト名：{SITE_CONFIG.name}（{SITE_CONFIG.englishName}）
            <br />
            サイトURL：{SITE_CONFIG.url}
            <br />
            運営目的：楽天市場の公開APIデータおよびAmazon公式キャンペーン情報をもとに、生活者が「ポイント還元を含めた実質価格」と公式特典を分かりやすく比較できる情報メディアの提供。
          </p>
        </section>

        <section id="advertising">
          <h2>広告掲載・アフィリエイトプログラム表記（景品表示法対応）</h2>
          <p>
            当サイトは、景品表示法（ステルスマーケティング規制）に基づき、アフィリエイト広告を含むページおよびSNS投稿に「PR」または広告利用の明示を行っております。
          </p>
          <p>
            <strong>{SITE_CONFIG.amazonAssociatesNotice}</strong>
          </p>
          <p>
            また、当サイトは楽天アフィリエイトプログラムおよび楽天ウェブサービス（Rakuten Developers）を利用し、楽天市場の商品情報・リンクを掲載しています。
          </p>
        </section>

        <section id="disclaimer">
          <h2>免責事項・価格およびポイント還元データについて</h2>
          <p>{SITE_CONFIG.priceDisclaimer}</p>
          <p>
            当サイトが掲載する「実質価格目安」は、楽天ウェブサービスAPIから取得した販売価格および商品別ポイント倍率に基づく参考試算値です。SPU（スーパーポイントアッププログラム）、クーポン、送料、在庫状況、キャンペーンのエントリー条件はユーザーごとの条件や時期により異なります。商品のご購入・各種サービスへのご登録に関する最終判断は、必ずリンク先の公式販売ページにて条件をご確認のうえ行ってください。
          </p>
        </section>

        <section id="privacy">
          <h2>プライバシーポリシー</h2>
          <p>
            当サイトでは、アクセス解析および広告成果計測のためにCookie（クッキー）を使用する場合があります。Cookieには氏名・住所・メールアドレス・電話番号などの個人を特定する情報は含まれません。ブラウザの設定によりCookieを無効にすることも可能です。
          </p>
        </section>
      </div>
    </article>
  );
}
