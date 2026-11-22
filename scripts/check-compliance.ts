import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { runComplianceAudit } from '../src/lib/compliance/audit';
import { loadAmazonPrograms, loadDeals, loadSnsQueue } from '../src/lib/data/store';

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

function main() {
  const deals = loadDeals();
  const programs = loadAmazonPrograms();
  const snsQueue = loadSnsQueue();

  const checks = runComplianceAudit({ deals, programs, snsQueue });
  console.log('=== トクラボ 規約・法令コンプライアンス自動監査 ===\n');

  let hasFailure = false;
  for (const item of checks) {
    const badge =
      item.status === 'pass' ? '[PASS]' : item.status === 'warn' ? '[WARN]' : '[FAIL]';
    console.log(`${badge} ${item.label}`);
    console.log(`       ${item.detail}`);
    if (item.status === 'fail') hasFailure = true;
  }

  console.log('');
  if (hasFailure) {
    console.error('[ERROR] 規約違反の恐れがある項目が見つかりました。修正してください。');
    process.exit(1);
  }
  console.log('[OK] 重大なコンプライアンス違反は検出されませんでした。');
}

main();
