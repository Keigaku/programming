import { NextResponse } from 'next/server';
import { exportSnsQueueToCsv } from '@/lib/sns/generator';
import { loadSnsQueue, regenerateAndSaveSnsQueue } from '@/lib/data/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const queue = loadSnsQueue();

  if (format === 'csv') {
    const csv = `\uFEFF${exportSnsQueueToCsv(queue)}\n`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="tokulab-sns-queue.csv"',
      },
    });
  }

  return NextResponse.json({
    count: queue.length,
    items: queue,
  });
}

export async function POST() {
  const queue = regenerateAndSaveSnsQueue();
  return NextResponse.json({
    ok: true,
    count: queue.length,
    items: queue,
  });
}
