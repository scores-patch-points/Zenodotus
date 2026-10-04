// Shared helpers for corpus fetchers.
//
// Word counting is the corpus-wide quality gate (MIN_WORDS), so it has to be
// honest about scripts that do not delimit words with spaces. Splitting on
// whitespace scores a 3,000-character Chinese or Japanese text at a handful of
// "words" and would delete it as too short. Han/Kana/Hangul/Thai runs are
// therefore counted per codepoint instead.

export const MIN_WORDS = 600;

const UNSPACED =
  /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯฀-๿]/g;

/** Approximate word count that works for spaced and unspaced scripts alike. */
export function countWords(text) {
  if (!text) return 0;
  const unspaced = text.match(UNSPACED)?.length ?? 0;
  const spaced = text.replace(UNSPACED, ' ').split(/\s+/).filter(Boolean).length;
  // Unspaced scripts average ~1.5 characters per word; the divisor keeps a
  // Chinese text and its English translation within the same order of size.
  return spaced + Math.round(unspaced / 1.5);
}

/** Strip YAML frontmatter, markup and entities so counts reflect prose. */
export function toPlainText(text, { file = '' } = {}) {
  let out = text;
  if (file.endsWith('.json')) {
    try {
      out = JSON.stringify(JSON.parse(out)).replace(/["{}[\],:]/g, ' ');
    } catch {
      /* not valid JSON — fall through and treat it as text */
    }
  }
  return out
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');
}

export function wordsIn(text, file = '') {
  return countWords(toPlainText(text, { file }));
}

/**
 * GET a URL, returning null on any non-200 rather than throwing. Probing large
 * identifier spaces means most requests are expected 404s.
 */
export async function get(url, { retries = 2, timeoutMs = 45000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': 'live_priors corpus builder' },
      });
      if (res.status === 404) return null;
      if (!res.ok) {
        if (attempt === retries) return null;
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return await res.text();
    } catch {
      if (attempt === retries) return null;
      await sleep(500 * 2 ** attempt);
    }
  }
  return null;
}

/**
 * Like `get`, but refuses documents larger than `maxBytes` without downloading
 * them. Consolidated legal codes run to several megabytes; a handful of them
 * would dominate the corpus on disk and in every downstream scan.
 */
export async function getBounded(url, maxBytes, { timeoutMs = 45000 } = {}) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) {
      res.body?.cancel();
      return null;
    }
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > maxBytes) {
      res.body?.cancel();
      return { oversize: true, bytes: declared };
    }
    const text = await res.text();
    if (text.length > maxBytes) return { oversize: true, bytes: text.length };
    return { text };
  } catch {
    return null;
  }
}

/** Existence check without transferring the body. */
export async function exists(url, { timeoutMs = 25000 } = {}) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Run `worker` over `items` with bounded concurrency, preserving input order in
 * the returned array. Sequential fetching of thousands of candidates is the
 * difference between a two-minute and a two-hour build.
 */
export async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

export function slugify(s, max = 80) {
  return (
    String(s)
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max) || 'untitled'
  );
}
