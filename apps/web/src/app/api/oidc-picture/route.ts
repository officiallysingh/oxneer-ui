import { NextRequest, NextResponse } from 'next/server';

// Only Google's avatar CDN hosts are allowed — this endpoint proxy-fetches an
// arbitrary caller-supplied URL, so an open allowlist would be an SSRF vector.
const ALLOWED_HOSTS = new Set([
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
]);

const MAX_BYTES = 3 * 1024 * 1024; // 3MB

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 400 });
  }

  try {
    // Redirects are refused: following one would leave the host allowlist.
    const res = await fetch(parsed.toString(), { redirect: 'error' });
    if (!res.ok || !res.body) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 });
    }
    const declaredLength = Number(res.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }
    const buf = await readBodyWithLimit(res.body, MAX_BYTES);
    if (!buf) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }
    const dataUrl = `data:${contentType};base64,${buf.toString('base64')}`;
    return NextResponse.json({ dataUrl });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
}

/** Reads a response body, giving up (null) as soon as it passes `maxBytes`. */
async function readBodyWithLimit(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Buffer | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
