'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_1M_KPI_INPUT } from '@/config/site';
import { simulateMonthlyRevenue } from '@/lib/scoring/yield';
import type {
  ComplianceCheckItem,
  CuratedCatalogStore,
  DealItem,
  KpiSimulationInput,
  SnsPostDraft,
} from '@/types/affiliate';
import type { HydratedAmazonProgram } from '@/lib/data/store';

interface OpsStudioProps {
  initialDeals: DealItem[];
  initialPrograms: HydratedAmazonProgram[];
  initialSnsQueue: SnsPostDraft[];
  initialCurated: CuratedCatalogStore;
  initialCompliance: ComplianceCheckItem[];
  apiStatus: {
    rakutenConfigured: boolean;
    rakutenAffiliateIdConfigured: boolean;
    rakutenSearchVersion: string;
    amazonTagConfigured: boolean;
    amazonCreatorsApiReady: boolean;
  };
}

export function OpsStudio({
  initialDeals,
  initialPrograms,
  initialSnsQueue,
  initialCurated,
  initialCompliance,
  apiStatus,
}: OpsStudioProps) {
  const [kpiInput, setKpiInput] = useState<KpiSimulationInput>(DEFAULT_1M_KPI_INPUT);
  const [deals, setDeals] = useState<DealItem[]>(initialDeals);
  const [snsQueue, setSnsQueue] = useState<SnsPostDraft[]>(initialSnsQueue);
  const [curated, setCurated] = useState<CuratedCatalogStore>(initialCurated);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync & action feedback
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Amazon ASIN / SiteStripe mapping form
  const [selectedItemCode, setSelectedItemCode] = useState<string>(
    initialDeals[0]?.itemCode ?? ''
  );
  const [asinInput, setAsinInput] = useState('');
  const [siteStripeInput, setSiteStripeInput] = useState('');
  const [customKwInput, setCustomKwInput] = useState('');
  const [sales30d, setSales30d] = useState<number>(
    initialCurated.creatorsProgress.qualifyingSalesLast30Days
  );

  const sim = useMemo(() => simulateMonthlyRevenue(kpiInput), [kpiInput]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setErrorMsg('クリップボードへのコピーに失敗しました。手動でテキストを選択してください。');
    }
  };

  const handleLiveSync = async () => {
    setSyncing(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '同期に失敗しました');
      } else {
        setStatusMsg(
          `楽天2026 API同期完了：${data.syncedCount}商品取得（うち料率アップ上限なし ${data.rateUpUncappedCount}件）／SNS投稿 ${data.snsGeneratedCount}件を再生成しました。`
        );
        const [dealsRes, snsRes] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/sns'),
        ]);
        const dealsJson = await dealsRes.json();
        const snsJson = await snsRes.json();
        if (dealsJson.items) setDeals(dealsJson.items);
        if (snsJson.items) setSnsQueue(snsJson.items);
      }
    } catch {
      setErrorMsg('通信エラーが発生しました。');
    } finally {
      setSyncing(false);
    }
  };

  const handleRegenerateSns = async () => {
    setStatusMsg(null);
    setErrorMsg(null);
    const res = await fetch('/api/sns', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.items) {
      setSnsQueue(data.items);
      setStatusMsg(`SNS投稿キュー（${data.count}件）を最新データで再生成しました。`);
    } else {
      setErrorMsg('SNS投稿キューの再生成に失敗しました。');
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);

    const res = await fetch('/api/curated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mapping: {
          itemCode: selectedItemCode,
          asin: asinInput || undefined,
          siteStripeUrl: siteStripeInput || undefined,
          customAmazonKeyword: customKwInput || undefined,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'Amazonリンク紐付けの保存に失敗しました。');
      return;
    }

    setCurated(data.store);
    const dealsRes = await fetch('/api/deals');
    const dealsJson = await dealsRes.json();
    if (dealsJson.items) setDeals(dealsJson.items);
    setAsinInput('');
    setSiteStripeInput('');
    setCustomKwInput('');
    setStatusMsg(`商品（${selectedItemCode}）のAmazon公式リンク紐付けを保存しました。`);
  };

  const handleSaveSalesProgress = async () => {
    setStatusMsg(null);
    setErrorMsg(null);
    const res = await fetch('/api/curated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qualifyingSalesLast30Days: sales30d,
      }),
    });
    const data = await res.json();
    if (res.ok && data.store) {
      setCurated(data.store);
      setStatusMsg(
        sales30d >= 10
          ? '直近30日10件達成！Amazon Associates CentralからCreators API (OAuth 2.0) の認証情報を発行してください。'
          : `Amazon適格販売カウントを更新しました（現在 ${sales30d}/10 件）。`
      );
    }
  };

  const rateUpDeals = deals.filter((d) => d.isRateUpUncapped);
  const progressRatio = Math.min(
    100,
    Math.round((curated.creatorsProgress.qualifyingSalesLast30Days / 10) * 100)
  );

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      {(statusMsg || errorMsg) && (
        <div
          className="ops-panel"
          style={{
            borderColor: errorMsg ? 'var(--rakuten)' : 'var(--jade)',
            backgroundColor: errorMsg ? 'var(--rakuten-soft)' : 'var(--jade-soft)',
            padding: '14px 18px',
          }}
        >
          <strong style={{ color: errorMsg ? 'var(--rakuten)' : 'var(--jade)' }}>
            {errorMsg ? errorMsg : statusMsg}
          </strong>
        </div>
      )}

      {/* 1. APIステータス & アクションバー */}
      <section className="ops-panel" aria-label="API連携ステータス">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 className="ops-panel-title">API接続・データ同期コントロール</h2>
            <p className="ops-panel-sub" style={{ marginBottom: 0 }}>
              楽天2026新API（<code>openapi.rakuten.co.jp</code> / v{apiStatus.rakutenSearchVersion}
              ）とAmazonリンク生成のリアルタイム状態
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              id="btn-sync-rakuten"
              className="btn btn-rakuten btn-sm"
              onClick={handleLiveSync}
              disabled={syncing}
            >
              <RefreshCw size={15} />
              {syncing ? '楽天API同期中…' : '楽天2026 API ライブ同期を実行'}
            </button>
            <button
              type="button"
              id="btn-regen-sns"
              className="btn btn-secondary btn-sm"
              onClick={handleRegenerateSns}
            >
              <Sparkles size={15} />
              SNS投稿キュー再生成
            </button>
            <a
              href="/api/sns?format=csv"
              className="btn btn-primary btn-sm"
              id="btn-download-sns-csv"
            >
              <Download size={15} />
              SNS予約投稿CSV出力
            </a>
          </div>
        </div>

        <div className="kpi-summary-bar" style={{ marginTop: '20px', marginBottom: 0 }}>
          <div className="kpi-tile">
            <div className="kpi-tile-label">楽天 2026新API</div>
            <div className="kpi-tile-num" style={{ fontSize: '1.05rem' }}>
              <span
                className={`status-pill ${
                  apiStatus.rakutenConfigured ? 'status-pass' : 'status-warn'
                }`}
              >
                {apiStatus.rakutenConfigured ? '本番キー設定済' : '.env.local 未設定 (デモ中)'}
              </span>
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile-label">Amazon トラッキングID</div>
            <div className="kpi-tile-num" style={{ fontSize: '1.05rem' }}>
              <span
                className={`status-pill ${
                  apiStatus.amazonTagConfigured ? 'status-pass' : 'status-warn'
                }`}
              >
                {apiStatus.amazonTagConfigured ? '本番タグ稼働中' : 'サンプルタグ (要設定)'}
              </span>
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile-label">Amazon Creators API</div>
            <div className="kpi-tile-num" style={{ fontSize: '1.05rem' }}>
              <span
                className={`status-pill ${
                  apiStatus.amazonCreatorsApiReady ? 'status-pass' : 'status-warn'
                }`}
              >
                {apiStatus.amazonCreatorsApiReady
                  ? 'OAuth 2.0 稼働中'
                  : `解放待ち (${curated.creatorsProgress.qualifyingSalesLast30Days}/10件)`}
              </span>
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile-label">楽天 料率アップ(上限なし)</div>
            <div className="kpi-tile-num">
              {rateUpDeals.length} / {deals.length} 商品
            </div>
          </div>
        </div>
      </section>

      {/* 2. 月100万円 KPIインタラクティブシミュレーター */}
      <section className="ops-panel" aria-label="月100万円KPIシミュレーター">
        <h2 className="ops-panel-title">月100万円達成 KPIシミュレーター（4本柱ポートフォリオ）</h2>
        <p className="ops-panel-sub">
          PV・SNSクリック・CVR・Amazon特別プログラム成約数を動かし、現実的な必要トラフィックを逆算できます。
        </p>

        <div className="kpi-summary-bar">
          <div className="kpi-tile kpi-tile-accent">
            <div className="kpi-tile-label">予測月間収益（合計）</div>
            <div className="kpi-tile-num" id="sim-total-revenue">
              ¥{sim.totalMonthlyRevenueYen.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.85 }}>
              目標100万円に対して {sim.progressTo1MPercent}%
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile-label">月間リンククリック数</div>
            <div className="kpi-tile-num">{sim.totalMonthlyClicks.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginTop: '4px' }}>
              Web {sim.monthlyWebClicks.toLocaleString()} + SNS {sim.monthlySnsClicks.toLocaleString()}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile-label">月間合計成約数</div>
            <div className="kpi-tile-num">{sim.totalConversions.toLocaleString()} 件</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginTop: '4px' }}>
              物販 {sim.productConversions}件 + 特別PG {sim.programConversions}件
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile-label">想定 EPC（1クリック収益）</div>
            <div className="kpi-tile-num">¥{sim.blendedEpcYen}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)', marginTop: '4px' }}>
              1日あたり {Math.round(sim.totalMonthlyClicks / 30).toLocaleString()} クリック
            </div>
          </div>
        </div>

        <div className="ops-grid-2">
          <div className="slider-grid">
            <div className="slider-item">
              <label htmlFor="sim-pv">
                <span>Web月間PV</span>
                <span className="mono-num">{kpiInput.monthlyWebPv.toLocaleString()} PV</span>
              </label>
              <input
                id="sim-pv"
                type="range"
                min={10000}
                max={400000}
                step={10000}
                value={kpiInput.monthlyWebPv}
                onChange={(e) =>
                  setKpiInput({ ...kpiInput, monthlyWebPv: Number(e.target.value) })
                }
              />
            </div>

            <div className="slider-item">
              <label htmlFor="sim-sns">
                <span>SNSリンク遷移/日</span>
                <span className="mono-num">{kpiInput.dailySnsClicks} クリック/日</span>
              </label>
              <input
                id="sim-sns"
                type="range"
                min={50}
                max={2000}
                step={50}
                value={kpiInput.dailySnsClicks}
                onChange={(e) =>
                  setKpiInput({ ...kpiInput, dailySnsClicks: Number(e.target.value) })
                }
              />
            </div>

            <div className="slider-item">
              <label htmlFor="sim-cvr">
                <span>物販合算CVR</span>
                <span className="mono-num">{kpiInput.blendedCvrPct.toFixed(2)}%</span>
              </label>
              <input
                id="sim-cvr"
                type="range"
                min={1.0}
                max={8.0}
                step={0.15}
                value={kpiInput.blendedCvrPct}
                onChange={(e) =>
                  setKpiInput({ ...kpiInput, blendedCvrPct: Number(e.target.value) })
                }
              />
            </div>

            <div className="slider-item">
              <label htmlFor="sim-prog">
                <span>Amazon特別PG成約/月</span>
                <span className="mono-num">{kpiInput.amazonProgramMonthlyConversions} 件</span>
              </label>
              <input
                id="sim-prog"
                type="range"
                min={10}
                max={400}
                step={5}
                value={kpiInput.amazonProgramMonthlyConversions}
                onChange={(e) =>
                  setKpiInput({
                    ...kpiInput,
                    amazonProgramMonthlyConversions: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="slider-item">
              <label htmlFor="sim-rateup">
                <span>柱① 楽天料率アップ単価</span>
                <span className="mono-num">¥{kpiInput.rakutenRateUpAvgCommission}</span>
              </label>
              <input
                id="sim-rateup"
                type="range"
                min={200}
                max={1500}
                step={50}
                value={kpiInput.rakutenRateUpAvgCommission}
                onChange={(e) =>
                  setKpiInput({
                    ...kpiInput,
                    rakutenRateUpAvgCommission: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="slider-item">
              <label htmlFor="sim-bounty">
                <span>柱③ Amazon特別PG平均単価</span>
                <span className="mono-num">¥{kpiInput.amazonProgramAvgBounty}</span>
              </label>
              <input
                id="sim-bounty"
                type="range"
                min={500}
                max={3000}
                step={100}
                value={kpiInput.amazonProgramAvgBounty}
                onChange={(e) =>
                  setKpiInput({
                    ...kpiInput,
                    amazonProgramAvgBounty: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="pillar-bars" style={{ marginTop: 0 }}>
            {[
              {
                label: '柱① 楽天 料率アップ（上限なし）',
                value: sim.pillar1RakutenRateUpYen,
                color: '#b91c1c',
              },
              {
                label: '柱② 楽天 セール・0と5のつく日まとめ買い',
                value: sim.pillar2RakutenEventYen,
                color: '#dc2626',
              },
              {
                label: '柱③ Amazon 公式特別プログラム（API不要）',
                value: sim.pillar3AmazonProgramYen,
                color: '#b45309',
              },
              {
                label: '柱④ Amazon 物販5〜8%＋高単価（上限撤廃）',
                value: sim.pillar4AmazonProductYen,
                color: '#232f3e',
              },
            ].map((p) => {
              const pct =
                sim.totalMonthlyRevenueYen > 0
                  ? Math.round((p.value / sim.totalMonthlyRevenueYen) * 100)
                  : 0;
              return (
                <div key={p.label}>
                  <div className="pillar-row-top">
                    <span>{p.label}</span>
                    <span className="mono-num">
                      ¥{p.value.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Amazon Creators API 解放トラッカー & 手動SiteStripe/ASINリンク紐付け */}
      <div className="ops-grid-2">
        <section className="ops-panel">
          <h2 className="ops-panel-title">Amazon Creators API 解放トラッカー</h2>
          <p className="ops-panel-sub">
            2026年移行後のAmazon Creators API（旧PA-API 5.0後継）を利用するには、
            <strong>直近30日間に10件以上の適格販売</strong> が必要です。まずはAPI不要の特別プログラム（Audible/Kindle/ビジネス）と手動ASINリンクで最速突破しましょう。
          </p>

          <div style={{ marginBottom: '18px' }}>
            <div className="pillar-row-top">
              <span>直近30日の適格販売 進捗</span>
              <span className="mono-num">
                {curated.creatorsProgress.qualifyingSalesLast30Days} / 10 件 ({progressRatio}%)
              </span>
            </div>
            <div className="progress-track" style={{ height: '14px' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${progressRatio}%`,
                  backgroundColor: progressRatio >= 100 ? 'var(--jade)' : 'var(--amazon)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="sales-30d-input" style={{ fontSize: '0.84rem', fontWeight: 600 }}>
              現在の30日販売件数:
            </label>
            <input
              id="sales-30d-input"
              type="number"
              min={0}
              max={1000}
              className="input-field"
              style={{ width: '96px' }}
              value={sales30d}
              onChange={(e) => setSales30d(Number(e.target.value))}
            />
            <button
              type="button"
              id="btn-save-sales30d"
              className="btn btn-primary btn-sm"
              onClick={handleSaveSalesProgress}
            >
              進捗を保存
            </button>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '6px',
              fontSize: '0.82rem',
            }}
          >
            <strong>即効突破におすすめのAPI不要プログラム上位：</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
              {initialPrograms.slice(0, 3).map((p) => (
                <li key={p.id}>
                  {p.name} — <strong className="mono-num">¥{p.rewardYen.toLocaleString()}/件</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="ops-panel">
          <h2 className="ops-panel-title">Amazon 公式リンク / ASIN 手動紐付け</h2>
          <p className="ops-panel-sub">
            API未解放フェーズでも、アソシエイト・ツールバー（SiteStripe）で作成した短縮URLやASINを楽天商品に紐付けると、該当カードの「Amazonで比較」ボタンが検索リンクから直リンクへ昇格します。
          </p>

          <form onSubmit={handleSaveMapping} style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label
                htmlFor="curated-item-select"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}
              >
                対象の楽天商品
              </label>
              <select
                id="curated-item-select"
                className="select-field"
                style={{ width: '100%' }}
                value={selectedItemCode}
                onChange={(e) => setSelectedItemCode(e.target.value)}
              >
                {deals.map((d) => (
                  <option key={d.itemCode} value={d.itemCode}>
                    [{d.affiliateRate}% / 報酬¥{d.estimatedRakutenCommission}] {d.shortTitle}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label
                  htmlFor="curated-asin-input"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}
                >
                  Amazon ASIN（10桁・任意）
                </label>
                <input
                  id="curated-asin-input"
                  type="text"
                  className="input-field"
                  style={{ width: '100%' }}
                  placeholder="例: B0CXXXXXX1"
                  value={asinInput}
                  onChange={(e) => setAsinInput(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="curated-kw-input"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}
                >
                  Amazon検索語の上書き（任意）
                </label>
                <input
                  id="curated-kw-input"
                  type="text"
                  className="input-field"
                  style={{ width: '100%' }}
                  placeholder="例: Sony WH-1000XM5"
                  value={customKwInput}
                  onChange={(e) => setCustomKwInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="curated-sitestripe-input"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}
              >
                アソシエイト・ツールバー生成URL（amzn.to 等・最優先）
              </label>
              <input
                id="curated-sitestripe-input"
                type="url"
                className="input-field"
                style={{ width: '100%' }}
                placeholder="https://amzn.to/..."
                value={siteStripeInput}
                onChange={(e) => setSiteStripeInput(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-amazon btn-sm" id="btn-save-amazon-mapping">
              Amazon公式リンク紐付けを保存
            </button>
          </form>
        </section>
      </div>

      {/* 4. 楽天 料率アップ＆推定報酬テーブル */}
      <section className="ops-panel">
        <h2 className="ops-panel-title">楽天API 収益期待値（Yield Score）ランキング一覧</h2>
        <p className="ops-panel-sub">
          通常商品（1商品1,000円上限）ではなく、<strong>料率アップ対象（上限撤廃・最大20%）</strong> を自動判定して上位表示しています。
        </p>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>商品名 / ショップ</th>
                <th>価格 / ポイント</th>
                <th>楽天料率</th>
                <th>推定報酬/個</th>
                <th>Amazonリンク形式</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id}>
                  <td className="mono-num" style={{ fontWeight: 700 }}>
                    {d.yieldScore}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{d.shortTitle}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-tertiary)' }}>
                      {d.shopName} · <code>{d.itemCode}</code>
                    </div>
                  </td>
                  <td className="mono-num">
                    ¥{d.price.toLocaleString()}
                    <div style={{ fontSize: '0.75rem', color: 'var(--jade)' }}>
                      P{d.pointRate}倍（実質¥{d.effectivePrice.toLocaleString()}）
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        d.isRateUpUncapped ? 'status-pass' : 'status-warn'
                      }`}
                    >
                      {d.affiliateRate}% {d.isRateUpUncapped ? '上限なし' : '通常上限'}
                    </span>
                  </td>
                  <td className="mono-num" style={{ fontWeight: 700, color: 'var(--rakuten)' }}>
                    ¥{d.estimatedRakutenCommission.toLocaleString()}
                  </td>
                  <td>
                    <span className="tag-chip">
                      {d.amazonLinkType === 'sitestripe'
                        ? 'SiteStripe直リンク'
                        : d.amazonLinkType === 'asin'
                          ? `ASIN (${d.amazonAsin})`
                          : '検索リンク（規約準拠）'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. SNS投稿ジェネレーター（ワンクリックコピー） */}
      <section className="ops-panel">
        <h2 className="ops-panel-title">SNS速報投稿キュー（X / Threads｜#PR自動付与・280加重文字以内）</h2>
        <p className="ops-panel-sub">
          毎日4スロット（朝7:30 / 昼12:15 / 夜19:30 / 夜21:30）に合わせて最適化された投稿文。ワンクリックでコピー、または上部のCSV出力から予約投稿ツールへ一括取り込み可能です。
        </p>

        <div className="sns-card-grid">
          {snsQueue.map((post) => (
            <div className="sns-card" key={post.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span className="tag-chip" style={{ marginRight: '6px' }}>
                    {post.platform.toUpperCase()}
                  </span>
                  <strong style={{ fontSize: '0.84rem' }}>{post.slotLabel}</strong>
                </div>
                <span
                  className={`status-pill ${
                    post.isWithinXLimit && post.hasPrDisclosure ? 'status-pass' : 'status-warn'
                  }`}
                >
                  {post.weightedCharCount}/280 · 想定EPC ¥{post.estimatedEpcYen}
                </span>
              </div>

              <pre className="sns-pre">{post.body}</pre>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--ink-tertiary)' }}>
                  {post.title}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopy(post.id, post.body)}
                >
                  {copiedId === post.id ? (
                    <>
                      <Check size={14} /> コピー済み
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> 投稿文をコピー
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. コンプライアンス自動監査 */}
      <section className="ops-panel">
        <h2 className="ops-panel-title">規約・ステマ規制 自動コンプライアンス監査</h2>
        <p className="ops-panel-sub">
          アカウント停止を防ぐため、公開前に <code>npm run check:compliance</code> でも同じ検証が実行できます。
        </p>

        <div style={{ display: 'grid', gap: '10px' }}>
          {initialCompliance.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              {c.status === 'pass' ? (
                <CheckCircle2 size={18} color="var(--jade)" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : c.status === 'warn' ? (
                <ShieldAlert size={18} color="var(--amazon)" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <ShieldCheck size={18} color="var(--rakuten)" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
