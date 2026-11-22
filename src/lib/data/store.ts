import fs from 'node:fs';
import path from 'node:path';
import {
  buildAmazonSpecialProgramUrl,
  getAmazonAssociateTag,
  resolveAmazonLink,
} from '@/lib/amazon/links';
import { generateSnsQueue } from '@/lib/sns/generator';
import type {
  AmazonSpecialProgram,
  CuratedAmazonMapping,
  CuratedCatalogStore,
  DealItem,
  EditorialGuide,
  SnsPostDraft,
} from '@/types/affiliate';

const DATA_DIR = path.join(process.cwd(), 'data');
const DEALS_FILE = path.join(DATA_DIR, 'synced-deals.json');
const CURATED_FILE = path.join(DATA_DIR, 'curated-catalog.json');
const PROGRAMS_FILE = path.join(DATA_DIR, 'amazon-programs.json');
const GUIDES_FILE = path.join(DATA_DIR, 'guides.json');
const SNS_QUEUE_FILE = path.join(DATA_DIR, 'sns-queue.json');

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

export function loadCuratedStore(): CuratedCatalogStore {
  return readJsonFile<CuratedCatalogStore>(CURATED_FILE, {
    mappings: [],
    creatorsProgress: {
      qualifyingSalesLast30Days: 0,
      targetSales: 10,
      creatorsApiEnabled: false,
      lastUpdatedAt: new Date().toISOString(),
    },
  });
}

export function saveCuratedStore(store: CuratedCatalogStore): void {
  writeJsonFile(CURATED_FILE, store);
}

/**
 * 同期済み商品一覧を読み込み、現在の AMAZON_ASSOCIATE_TAG および
 * 運営者の手動 ASIN / SiteStripe マッピングをリアルタイム適用して返す。
 */
export function loadDeals(): DealItem[] {
  const rawDeals = readJsonFile<DealItem[]>(DEALS_FILE, []);
  const curated = loadCuratedStore();
  const mappingByCode = new Map<string, CuratedAmazonMapping>(
    curated.mappings.map((m) => [m.itemCode, m])
  );
  const tag = getAmazonAssociateTag();

  return rawDeals
    .map((deal) => {
      const mapping = mappingByCode.get(deal.itemCode);
      const resolved = resolveAmazonLink({
        fallbackTitle: deal.shortTitle || deal.title,
        mapping,
        tag,
      });
      return {
        ...deal,
        amazonUrl: resolved.url,
        amazonLinkType: resolved.linkType,
        amazonAsin: resolved.asin,
      };
    })
    .sort((a, b) => b.yieldScore - a.yieldScore);
}

export function saveDeals(deals: DealItem[]): void {
  writeJsonFile(DEALS_FILE, deals);
}

export interface HydratedAmazonProgram extends AmazonSpecialProgram {
  affiliateUrl: string;
}

export function loadAmazonPrograms(): HydratedAmazonProgram[] {
  const raw = readJsonFile<AmazonSpecialProgram[]>(PROGRAMS_FILE, []);
  const tag = getAmazonAssociateTag();
  return raw.map((p) => ({
    ...p,
    affiliateUrl: buildAmazonSpecialProgramUrl(p.officialBaseUrl, tag),
  }));
}

export function loadGuides(): EditorialGuide[] {
  return readJsonFile<EditorialGuide[]>(GUIDES_FILE, []);
}

export function loadGuideBySlug(slug: string): EditorialGuide | undefined {
  return loadGuides().find((g) => g.slug === slug);
}

export function loadSnsQueue(): SnsPostDraft[] {
  const existing = readJsonFile<SnsPostDraft[]>(SNS_QUEUE_FILE, []);
  if (existing.length > 0) return existing;

  const generated = generateSnsQueue({
    deals: loadDeals(),
    programs: loadAmazonPrograms(),
    guides: loadGuides(),
  });
  return generated;
}

export function saveSnsQueue(queue: SnsPostDraft[]): void {
  writeJsonFile(SNS_QUEUE_FILE, queue);
}

export function regenerateAndSaveSnsQueue(): SnsPostDraft[] {
  const generated = generateSnsQueue({
    deals: loadDeals(),
    programs: loadAmazonPrograms(),
    guides: loadGuides(),
  });
  saveSnsQueue(generated);
  return generated;
}
