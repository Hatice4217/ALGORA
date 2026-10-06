// ===================================
// GECICI TANILAMA ENDPOINT'I — B1 Upstash kurulum debug'u
// ===================================
// Yalnızca booleans + hostname + hata mesajları döner (token ASLA sızdırılmaz).
// Teşhis tamamlanınca SONRAKİ commit'te SİLİNECEK.
// ===================================
import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const urlInfo = url
    ? {
        set: true,
        length: url.length,
        startsHttps: url.startsWith('https://'),
        hasQuote: url.includes('"') || url.includes("'"),
        hasTrailingSlash: url.endsWith('/'),
        hostname: url.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      }
    : { set: false };

  const tokenInfo = token
    ? {
        set: true,
        length: token.length,
        hasQuote: token.includes('"') || token.includes("'"),
        hasSpace: /\s/.test(token),
      }
    : { set: false };

  let pipelineTest: Record<string, unknown>;
  if (url && token) {
    try {
      const response = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', 'rl:diag:temp'],
          ['EXPIRE', 'rl:diag:temp', '60', 'NX'],
          ['TTL', 'rl:diag:temp'],
        ]),
        signal: AbortSignal.timeout(3000),
      });
      const body = await response.json().catch(() => null);
      pipelineTest = {
        httpOk: response.ok,
        httpStatus: response.status,
        body: JSON.stringify(body).slice(0, 200),
      };
      // temizle
      await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([['DEL', 'rl:diag:temp']]),
      }).catch(() => undefined);
    } catch (error) {
      pipelineTest = { error: (error as Error)?.message ?? String(error) };
    }
  } else {
    pipelineTest = { skipped: 'env eksik' };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    urlInfo,
    tokenInfo,
    pipelineTest,
  });
}
