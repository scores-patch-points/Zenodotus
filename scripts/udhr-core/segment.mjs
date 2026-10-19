// udhr-core/segment.mjs — split one UDHR edition into preamble + 30 articles by BYTE range.
// Pure: (text) -> { method, units, front, confidence } | { gap: reason }. No I/O, no model.
// Article NUMBER is only the alignment key (an index shared by every edition); no language is the authority.
import { createHash } from "node:crypto";

// Paragraph count of each article in the OHCHR English text. Used only as a soft prior for the
// structural fallback, never as a requirement.
export const TEMPLATE = [1,2,1,1,1,1,1,1,1,1,2,1,2,2,2,3,2,1,1,2,3,1,4,1,2,3,2,1,3,1];
export const HEADER_LINES = 4;
export const ARTICLES = 30;

export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Blocks after the 4-line OHCHR header: runs of consecutive non-blank lines, with byte offsets of their trimmed text,
 *  the indent of their first line and the number of blank lines before them. */
export function blocksOf(text) {
  const buf = Buffer.from(text, "utf8");
  const blocks = [];
  let pos = 0, lineNo = 0, blanks = 0, open = false;
  for (const raw of text.split("\n")) {
    const lineBytes = Buffer.byteLength(raw, "utf8");
    if (lineNo >= HEADER_LINES) {
      if (!raw.trim()) { blanks++; open = false; }
      else {
        const lead = raw.length - raw.trimStart().length, trimmed = raw.trim();
        const start = pos + Buffer.byteLength(raw.slice(0, lead), "utf8"), end = start + Buffer.byteLength(trimmed, "utf8");
        if (open) { const b = blocks.at(-1); b.text += " " + trimmed; b.chars = [...b.text].length; b.end = end; }
        else { blocks.push({ text: trimmed, chars: [...trimmed].length, start, end, indent: lead, blanksBefore: blanks }); open = true; }
        blanks = 0;
      }
    }
    pos += lineBytes + 1;
    lineNo++;
  }
  return { blocks, bytes: buf.length };
}

const digitsOf = (s) => {
  let d = "";
  for (const c of s) if (/\p{Nd}/u.test(c)) d += String(digitValue(c));
  return d === "" ? null : parseInt(d, 10);
};
// Value of a Unicode decimal digit: find its zero by walking back through consecutive code points.
function digitValue(c) {
  const cp = c.codePointAt(0);
  let z = cp;
  while (/\p{Nd}/u.test(String.fromCodePoint(z - 1)) && cp - (z - 1) < 10) z--;
  return cp - z;
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] || 1; };

/** Tier L: the rendering's own layout. Blank runs of >= GAP lines separate the preamble and each article:
 *  31 groups = [title+preamble] + 30 articles; 30 groups = [title+article 1] + 29 articles (edition has no preamble). */
export const GAP = 4;
function layout(blocks) {
  const groups = [];
  blocks.forEach((b, i) => { if (!groups.length || b.blanksBefore >= GAP) groups.push([]); groups.at(-1).push(i); });
  if (groups.length !== ARTICLES && groups.length !== ARTICLES + 1) return null;
  const titled = blocks[0]?.indent === 0, g0 = titled ? groups[0].slice(1) : groups[0];
  if (g0.length < 2 || groups.slice(1).some((g) => g.length < 2)) return null;   // every unit is a heading + at least one paragraph
  const rest = groups.slice(1).map((g) => g[0]);
  return groups.length === ARTICLES + 1 ? { pre: g0[0], art: rest } : { pre: null, art: [g0[0], ...rest] };
}

/** Tier A: headings that carry the article number 1..30 in order. */
function numbered(blocks) {
  const heads = [];
  blocks.forEach((b, i) => { if (b.chars <= 40) { const n = digitsOf(b.text); if (n != null) heads.push([i, n]); } });
  if (heads.length !== ARTICLES || heads.some(([, n], k) => n !== k + 1)) return null;
  return heads.map(([i]) => i);
}

/** Tier B: choose preamble heading + 30 article headings by DP: short blocks, paragraph counts near the template. */
function structural(blocks) {
  const n = blocks.length;
  if (n < 2 * (ARTICLES + 1) - 1) return null;
  const med = median(blocks.map((b) => b.chars));
  const hc = (i) => Math.min(1, blocks[i].chars / med);           // heading cost: long blocks are not headings
  const W = 0.6;                                                    // weight of a paragraph-count miss
  const K = ARTICLES + 1;                                           // heading 0 = preamble, 1..30 = articles
  // best[k][i] = min cost placing heading k at block i; heading 0 may sit at block 0 or 1 (title optional)
  const INF = 1e9, best = Array.from({ length: K }, () => new Float64Array(n).fill(INF)), from = Array.from({ length: K }, () => new Int32Array(n).fill(-1));
  for (const i of [0, 1]) if (i < n) best[0][i] = hc(i);
  for (let k = 1; k < K; k++) {
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < i; j++) {
        if (best[k - 1][j] >= INF) continue;
        const cnt = i - j - 1;                                       // blocks between heading k-1 and heading k
        const pen = k - 1 === 0 ? (cnt < 1 ? 5 : 0) : W * Math.abs(cnt - TEMPLATE[k - 2]) + (cnt < 1 ? 5 : 0);
        const c = best[k - 1][j] + pen + hc(i);
        if (c < best[k][i]) { best[k][i] = c; from[k][i] = j; }
      }
    }
  }
  let bi = -1, bc = INF;
  for (let i = 1; i < n; i++) {
    const cnt = n - i - 1, c = best[K - 1][i] + W * Math.abs(cnt - TEMPLATE[ARTICLES - 1]) + (cnt < 1 ? 5 : 0);
    if (c < bc) { bc = c; bi = i; }
  }
  if (bi < 0) return null;
  const path = new Array(K); let i = bi;
  for (let k = K - 1; k >= 0; k--) { path[k] = i; i = from[k][i]; }
  return path;                                                       // path[0] = preamble heading, path[1..30] = articles
}

/** Segment an edition: layout first, then the digit-numbered headings, then the structural DP. */
export function segmentEdition(text) {
  const { blocks, bytes } = blocksOf(text);
  if (blocks.length < 2 * ARTICLES) return { gap: `too few blocks (${blocks.length}) to hold a preamble and ${ARTICLES} articles`, bytes };
  let method, pre, art;
  const num = numbered(blocks), lay = layout(blocks);
  if (lay) { method = "layout"; ({ pre, art } = lay); }
  else if (num) {
    method = "numbered"; art = num;
    pre = art[0] >= 3 ? 1 : art[0] === 2 ? 0 : null;   // fewer than a heading + paragraph before Article 1: no preamble
  } else {
    method = "structural";
    const p = structural(blocks);
    if (!p) return { gap: "no structural segmentation fits", bytes };
    pre = p[0]; art = p.slice(1);
  }
  // independent cue: when headings carry digits 1..30 they must be the layout's headings
  const numberCheck = !num ? "n/a" : art.every((h, k) => h === num[k]) ? "agrees" : "disagrees";
  const heads = pre == null ? art : [pre, ...art], units = [], off = pre == null ? 1 : 0;
  heads.forEach((h, k) => {
    const next = k + 1 < heads.length ? heads[k + 1] : blocks.length;
    const paras = blocks.slice(h + 1, next);
    if (!paras.length) return;
    units.push({
      unit: k + off === 0 ? "preamble" : `article:${k + off}`,
      heading: { start: blocks[h].start, end: blocks[h].end },
      range: { unit: "byte", start: blocks[h].start, end: blocks[next - 1].end },
      paragraphs: paras.map((b) => [b.start, b.end]),
    });
  });
  if (units.length !== heads.length) return { gap: `segmented ${units.length} of ${heads.length} units`, bytes };
  const matched = units.filter((u) => u.unit !== "preamble" && u.paragraphs.length === TEMPLATE[+u.unit.slice(8) - 1]).length;
  const med = median(blocks.map((b) => b.chars));
  const headRatio = heads.reduce((s, h) => s + Math.min(1, blocks[h].chars / med), 0) / heads.length;
  return {
    method, numberCheck, units, bytes,
    preamble: pre != null,
    title: pre > 0 ? { start: blocks[0].start, end: blocks[0].end } : null,
    confidence: { templateMatches: matched, of: ARTICLES, meanHeadingRatio: Math.round(headRatio * 1000) / 1000 },
  };
}
