'use client';

import { useMemo, useState } from 'react';
import { STRATEGIC_CATEGORIES } from '@/config/site';
import type { CategorySlug, DealItem } from '@/types/affiliate';
import { DealCard } from './DealCard';

interface DealExplorerProps {
  deals: DealItem[];
  initialCategory?: CategorySlug | 'all';
  limit?: number;
}

type SortKey = 'recommended' | 'point_desc' | 'price_asc' | 'review_desc';

export function DealExplorer({
  deals,
  initialCategory = 'all',
  limit,
}: DealExplorerProps) {
  const [category, setCategory] = useState<CategorySlug | 'all'>(initialCategory);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recommended');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = deals.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.shopName.toLowerCase().includes(q) ||
        item.catchcopy.toLowerCase().includes(q)
      );
    });

    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'point_desc':
          return b.pointRate - a.pointRate || b.estimatedPointBack - a.estimatedPointBack;
        case 'price_asc':
          return a.effectivePrice - b.effectivePrice;
        case 'review_desc':
          return b.reviewAverage - a.reviewAverage || b.reviewCount - a.reviewCount;
        case 'recommended':
        default:
          return b.yieldScore - a.yieldScore;
      }
    });

    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
  }, [deals, category, query, sortBy, limit]);

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-tabs" role="tablist" aria-label="カテゴリ絞り込み">
          <button
            type="button"
            role="tab"
            id="filter-cat-all"
            aria-selected={category === 'all'}
            className={`filter-tab ${category === 'all' ? 'filter-tab-active' : ''}`}
            onClick={() => setCategory('all')}
          >
            すべて ({deals.length})
          </button>
          {STRATEGIC_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              role="tab"
              id={`filter-cat-${cat.slug}`}
              aria-selected={category === cat.slug}
              className={`filter-tab ${category === cat.slug ? 'filter-tab-active' : ''}`}
              onClick={() => setCategory(cat.slug)}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>

        <div className="filter-controls">
          <input
            type="search"
            id="deal-search-input"
            className="input-field"
            placeholder="商品名・ショップ名で検索…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="商品検索"
          />
          <select
            id="deal-sort-select"
            className="select-field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            aria-label="並び替え"
          >
            <option value="recommended">おすすめ・還元バランス順</option>
            <option value="point_desc">ポイント倍率が高い順</option>
            <option value="review_desc">レビュー評価が高い順</option>
            <option value="price_asc">実質価格が安い順</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="ops-panel"
          style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--ink-secondary)' }}
        >
          該当する商品が見つかりませんでした。検索語またはカテゴリを変更してお試しください。
        </div>
      ) : (
        <div className="deals-grid">
          {filtered.map((deal, idx) => (
            <DealCard key={deal.id} deal={deal} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
