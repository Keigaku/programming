import { ExternalLink, Star } from 'lucide-react';
import { CATEGORY_MAP } from '@/config/site';
import type { DealItem } from '@/types/affiliate';

interface DealCardProps {
  deal: DealItem;
  index?: number;
}

export function DealCard({ deal, index }: DealCardProps) {
  const cat = CATEGORY_MAP[deal.category];
  const discountPct =
    deal.price > 0 ? Math.round((deal.estimatedPointBack / deal.price) * 100) : 0;

  return (
    <article className="deal-card" id={`deal-card-${deal.id}`}>
      <div className="deal-media">
        <img
          src={deal.imageUrl}
          alt={deal.shortTitle}
          className="deal-img"
          loading="lazy"
        />
        {typeof index === 'number' && (
          <span className="deal-rank-badge">#{String(index + 1).padStart(2, '0')}</span>
        )}
        {deal.pointRate >= 5 && (
          <span className="deal-point-badge">ポイント {deal.pointRate}倍</span>
        )}
      </div>

      <div className="deal-body">
        <div className="deal-meta-row">
          <span>{cat?.shortLabel ?? deal.category}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Star size={13} fill="#d97706" color="#d97706" />
            <strong className="mono-num" style={{ color: 'var(--ink-primary)' }}>
              {deal.reviewAverage > 0 ? deal.reviewAverage.toFixed(2) : '—'}
            </strong>
            <span>({deal.reviewCount.toLocaleString()}件)</span>
          </span>
        </div>

        <h3 className="deal-title">{deal.shortTitle}</h3>
        <p className="deal-catchcopy">{deal.catchcopy}</p>

        <div className="deal-price-box">
          <div className="deal-effective-row">
            <span className="deal-effective-label">楽天 実質価格目安</span>
            <span className="deal-effective-price">
              ¥{deal.effectivePrice.toLocaleString()}
            </span>
          </div>
          <div className="deal-list-price">
            <span className="mono-num">販売価格 ¥{deal.price.toLocaleString()}</span>
            <span className="deal-point-save mono-num">
              約{deal.estimatedPointBack.toLocaleString()}pt還元（{discountPct}%相当）
            </span>
          </div>
        </div>

        <div className="deal-tags">
          {deal.postageFree && <span className="tag-chip tag-chip-jade">送料無料</span>}
          <span className="tag-chip">{deal.shopName}</span>
          {deal.amazonLinkType !== 'search' && (
            <span className="tag-chip">Amazon直リンク対応</span>
          )}
        </div>

        <div className="deal-cta-group">
          <a
            href={deal.rakutenAffiliateUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="btn btn-rakuten btn-sm"
            id={`cta-rakuten-${deal.id}`}
          >
            楽天で見る
            <ExternalLink size={14} />
          </a>
          <a
            href={deal.amazonUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="btn btn-amazon btn-sm"
            id={`cta-amazon-${deal.id}`}
          >
            Amazonで比較
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </article>
  );
}
