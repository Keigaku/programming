import { NextResponse } from 'next/server';
import { loadDeals } from '@/lib/data/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const onlyRateUp = searchParams.get('rateUp') === 'true';
  const query = (searchParams.get('q') || '').trim().toLowerCase();

  let deals = loadDeals();
  if (category && category !== 'all') {
    deals = deals.filter((d) => d.category === category);
  }
  if (onlyRateUp) {
    deals = deals.filter((d) => d.isRateUpUncapped);
  }
  if (query) {
    deals = deals.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.shopName.toLowerCase().includes(query) ||
        d.catchcopy.toLowerCase().includes(query)
    );
  }

  return NextResponse.json({
    count: deals.length,
    items: deals,
  });
}
