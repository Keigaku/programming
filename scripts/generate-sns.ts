import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { exportSnsQueueToCsv } from '../src/lib/sns/generator';
import { regenerateAndSaveSnsQueue } from '../src/lib/data/store';

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

function main() {
  const queue = regenerateAndSaveSnsQueue();
  const csv = exportSnsQueueToCsv(queue);
  const csvPath = path.join(process.cwd(), 'data', 'sns-queue.csv');
  fs.writeFileSync(csvPath, `\uFEFF${csv}\n`, 'utf-8'); // BOM付UTF-8（Excel/スプレッドシート文字化け防止）

  console.log(`=== SNS投稿キュー生成完了（合計 ${queue.length} 件）===`);
  console.log(`JSON: data/sns-queue.json`);
  console.log(`CSV : data/sns-queue.csv\n`);

  for (const post of queue) {
    console.log(`--- [${post.platform.toUpperCase()}] ${post.slotLabel} | ${post.title} ---`);
    console.log(post.body);
    console.log(
      `(加重文字数: ${post.weightedCharCount}/280 | #PR: ${post.hasPrDisclosure ? 'OK' : 'NG'} | 想定EPC: ¥${post.estimatedEpcYen})\n`
    );
  }
}

main();
