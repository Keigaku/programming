import { NextResponse } from 'next/server';
import { loadCuratedStore, saveCuratedStore } from '@/lib/data/store';
import type { CuratedAmazonMapping } from '@/types/affiliate';

function checkOpsAuth(request: Request): boolean {
  const secret = (process.env.OPS_ADMIN_SECRET || '').trim();
  if (!secret) return true;
  const provided = request.headers.get('x-ops-secret') || '';
  return provided === secret;
}

export async function GET() {
  return NextResponse.json(loadCuratedStore());
}

export async function POST(request: Request) {
  if (!checkOpsAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      mapping?: Omit<CuratedAmazonMapping, 'updatedAt'>;
      qualifyingSalesLast30Days?: number;
      creatorsApiEnabled?: boolean;
    };

    const store = loadCuratedStore();
    const now = new Date().toISOString();

    if (body.mapping && body.mapping.itemCode) {
      const cleanAsin = body.mapping.asin?.trim().toUpperCase() || undefined;
      if (cleanAsin && !/^[A-Z0-9]{10}$/.test(cleanAsin)) {
        return NextResponse.json(
          { error: 'ASINは半角英数字10桁（例: B0CXXXXXX）で入力してください。' },
          { status: 400 }
        );
      }

      const siteStripeUrl = body.mapping.siteStripeUrl?.trim() || undefined;
      if (
        siteStripeUrl &&
        !/^https:\/\/(amzn\.to|www\.amazon\.co\.jp)\//.test(siteStripeUrl)
      ) {
        return NextResponse.json(
          { error: 'SiteStripe URLは https://amzn.to/... または https://www.amazon.co.jp/... 形式で入力してください。' },
          { status: 400 }
        );
      }

      const nextEntry: CuratedAmazonMapping = {
        itemCode: body.mapping.itemCode.trim(),
        asin: cleanAsin,
        siteStripeUrl,
        customAmazonKeyword: body.mapping.customAmazonKeyword?.trim() || undefined,
        editorialNote: body.mapping.editorialNote?.trim() || undefined,
        updatedAt: now,
      };

      const idx = store.mappings.findIndex((m) => m.itemCode === nextEntry.itemCode);
      if (idx >= 0) {
        store.mappings[idx] = nextEntry;
      } else {
        store.mappings.push(nextEntry);
      }
    }

    if (typeof body.qualifyingSalesLast30Days === 'number') {
      store.creatorsProgress.qualifyingSalesLast30Days = Math.max(
        0,
        Math.min(1000, Math.floor(body.qualifyingSalesLast30Days))
      );
      store.creatorsProgress.lastUpdatedAt = now;
    }

    if (typeof body.creatorsApiEnabled === 'boolean') {
      store.creatorsProgress.creatorsApiEnabled = body.creatorsApiEnabled;
      store.creatorsProgress.lastUpdatedAt = now;
    }

    saveCuratedStore(store);
    return NextResponse.json({ ok: true, store });
  } catch (err) {
    const message = err instanceof Error ? err.message : '保存エラー';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
