import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { loadSnsQueue } from '../src/lib/data/store';

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function buildOAuth1Header(params: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: params.accessToken,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join('&');

  const signatureBase = [
    params.method.toUpperCase(),
    percentEncode(params.url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(params.consumerSecret)}&${percentEncode(
    params.accessTokenSecret
  )}`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');

  oauthParams.oauth_signature = signature;
  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
      .join(', ')
  );
}

async function main() {
  const isLive = process.argv.includes('--live');
  const slotArg = process.argv.find((a) => a.startsWith('--slot='))?.split('=')[1];

  const queue = loadSnsQueue().filter((p) => p.platform === 'x');
  const target = slotArg ? queue.find((p) => p.slot === slotArg) : queue[0];

  if (!target) {
    console.error('対象のX投稿ドラフトが見つかりません。先に npm run sns:generate を実行してください。');
    process.exit(1);
  }

  console.log(`=== X 投稿ツール（モード: ${isLive ? 'LIVE POST' : 'DRY RUN'}）===`);
  console.log(`スロット: ${target.slotLabel}`);
  console.log(`タイトル: ${target.title}`);
  console.log(`文字数  : ${target.weightedCharCount}/280 | #PR: ${target.hasPrDisclosure}\n`);
  console.log(target.body);

  if (!target.hasPrDisclosure || !target.isWithinXLimit) {
    console.error('\n[ERROR] #PR 表記または文字数制限を満たしていないため送信を中止しました。');
    process.exit(1);
  }

  if (!isLive) {
    console.log('\n[DRY RUN] 実際に投稿するには `--live` オプションを付けて実行してください。');
    return;
  }

  const consumerKey = process.env.X_API_KEY || '';
  const consumerSecret = process.env.X_API_SECRET || '';
  const accessToken = process.env.X_ACCESS_TOKEN || '';
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET || '';

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    console.error('[ERROR] X API v2 認証情報（X_API_KEY等）が .env.local に未設定です。');
    process.exit(1);
  }

  const endpoint = 'https://api.x.com/2/tweets';
  const authHeader = buildOAuth1Header({
    method: 'POST',
    url: endpoint,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: target.body }),
  });

  if (!res.ok) {
    console.error(`[ERROR] X API失敗 (${res.status}):`, await res.text());
    process.exit(1);
  }

  console.log('\n[SUCCESS] Xへの投稿が完了しました:', await res.json());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
