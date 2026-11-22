export interface ActiveCampaignEvent {
  code: string;
  title: string;
  subtitle: string;
  urgencyLabel: string;
  snsHookPrefix: string;
  isHighConversionDay: boolean;
  recommendedAction: string;
}

/**
 * 日本時間（JST）ベースで楽天市場・Amazonの高CVRイベント日を自動判定する。
 * 0と5のつく日 / 1日ワンダフルデー / 18日ご愛顧感謝デー / 3・6・9・12月のスーパーSALE期
 */
export function getActiveCampaignEvent(now: Date = new Date()): ActiveCampaignEvent {
  // UTC -> JST (+9h)
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();

  const isSuperSaleMonth = month === 3 || month === 6 || month === 9 || month === 12;
  const isSuperSaleWindow = isSuperSaleMonth && day >= 4 && day <= 11;
  const isZeroFiveDay = day % 5 === 0;
  const isWonderfulDay = day === 1;
  const isIchibaDay = day === 18;
  const isBlackFridayWindow = month === 11 && day >= 20 && day <= 30;

  if (isSuperSaleWindow) {
    return {
      code: 'rakuten_super_sale',
      title: '楽天スーパーSALE 開催ウィンドウ',
      subtitle: '年4回の最大還元イベント。買い回り＋料率アップ商品で実質割引が最大化する時期です。',
      urgencyLabel: '最優先セール期',
      snsHookPrefix: '【スーパーSALE注目】',
      isHighConversionDay: true,
      recommendedAction: '日用品・美容・ふるさと納税のまとめ買い＋エントリー導線を集中配信',
    };
  }

  if (isBlackFridayWindow) {
    return {
      code: 'amazon_black_friday',
      title: 'Amazon ブラックフライデー・年末セール注目期',
      subtitle: 'Amazon高単価ガジェット＋Audible/Kindle無料体験キャンペーンの成約率が年間ピーク。',
      urgencyLabel: '大型セール期',
      snsHookPrefix: '【ブラックフライデー注目】',
      isHighConversionDay: true,
      recommendedAction: 'Amazon公式特別プログラム（Audible/Kindle/ビジネス）と高単価ガジェット比較を最優先露出',
    };
  }

  if (isZeroFiveDay) {
    return {
      code: 'rakuten_zero_five',
      title: `本日${day}日は「毎月5と0のつく日」`,
      subtitle: '楽天カード利用＋エントリーでポイント還元アップ。日用品・高還元コスメの買い時です。',
      urgencyLabel: '本日限定イベント',
      snsHookPrefix: `【本日${day}日は0と5のつく日】`,
      isHighConversionDay: true,
      recommendedAction: '料率アップ（5〜20%）商品＋ポイント10倍以上の日用品をXへ5〜8投稿',
    };
  }

  if (isWonderfulDay) {
    return {
      code: 'rakuten_wonderful_day',
      title: '毎月1日「ワンダフルデー」',
      subtitle: '全ショップ対象ポイントアップ＋リピート購入特典の日。消耗品の補充に最適です。',
      urgencyLabel: '毎月1日限定',
      snsHookPrefix: '【毎月1日ワンダフルデー】',
      isHighConversionDay: true,
      recommendedAction: 'リピート消耗品（洗剤・飲料・コスメ詰め替え）を中心に配信',
    };
  }

  if (isIchibaDay) {
    return {
      code: 'rakuten_ichiba_day',
      title: '毎月18日「楽天市場ご愛顧感謝デー」',
      subtitle: 'ポイント支払いでも還元対象。単品の高単価商品・料率アップ商品の購入に最適。',
      urgencyLabel: '毎月18日限定',
      snsHookPrefix: '【本日18日ご愛顧感謝デー】',
      isHighConversionDay: true,
      recommendedAction: '1点買いの高単価コスメ・ガジェット（料率アップ対象）を重点訴求',
    };
  }

  const nextZeroFive = Math.ceil((day + 0.1) / 5) * 5;
  const daysUntilNext = nextZeroFive <= 30 ? nextZeroFive - day : 5;

  return {
    code: 'regular_value_hunting',
    title: '高還元ピックアップ＆Amazon公式無料体験特集',
    subtitle: `次の「5と0のつく日」まであと約${daysUntilNext}日。通常日は楽天の料率アップ商品とAmazon無料体験（Audible・Kindle等）で安定収益を積み上げます。`,
    urgencyLabel: '毎日更新',
    snsHookPrefix: '【本日の高還元チェック】',
    isHighConversionDay: false,
    recommendedAction: 'Audible（¥2,000）・Amazonビジネス（¥3,000）訴求＋楽天料率アップ厳選3投稿',
  };
}
