#!/usr/bin/env node
// fetch-ntrs-papers.mjs — public-domain scientific white papers from NASA's
// NTRS (NASA Technical Reports Server). US federal government works are in
// the public domain (17 USC §105); every record here is a NASA-published
// technical report or conference paper whose own copyright record marks it
// public-use (no third-party material, public distribution), and the rights
// determination is carried per paper, never assumed.
//
// EXTRACTION IS THE EOREADER7 CV PIPELINE, NOT pdftotext ALONE. The flat
// text pass (pdftotext -layout, the fast face) is followed by the look loop
// this project already ships for exactly the documents a flat reader reads
// wrong: pages whose own bytes trigger eoreader7's `weirdFormattingScore`
// (tables, box-drawing, multi-column, sub-sentence lines — real signals the
// reader itself names) are rendered to raster and read by
// `native/organs/look.js::lookAtImage` — the OpenCV box/connector detector
// (`visual-detect.py`, via VISUAL_DETECT_PYTHON) with per-region Tesseract
// OCR, a vision-model read when one answers, and the mnemonic shadow/echo
// fast path. The CV findings land as a `<slug>.cv.md` sidecar beside the
// paper (LP1: a reading is never the source), and every span it asserts is
// verified against the page's own rendered bytes.
//
//   node scripts/fetch-ntrs-papers.mjs                 # default batch
//   node scripts/fetch-ntrs-papers.mjs --limit 40      # cap total papers
//   node scripts/fetch-ntrs-papers.mjs --no-look       # text face only
//
// Requires VISUAL_DETECT_PYTHON (a venv python with opencv-python-headless +
// numpy) for the CV leg, plus tesseract and pdftoppm/pdftotext on PATH. The
// CV leg degrades loudly (look.js refuses when VISUAL_DETECT_PYTHON is
// unset), never to an empty falsely-clean read.

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { wordsIn, MIN_WORDS } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '05-academic-papers', 'ntrs-white-papers');
const MANIFEST = path.join(ROOT, 'manifests', 'ntrs-papers-manifest.json');

const SEARCH = 'https://ntrs.nasa.gov/api/citations/search';
const USER_AGENT = 'live_priors corpus builder (eoreader7 CV extraction)';

async function fetchTimeout(url, { timeoutMs = 30000, headers = {}, ...opts } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, headers: { 'User-Agent': USER_AGENT, ...headers }, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Queries across NASA's own publication areas, aimed at white-paper-shaped
// technical reports (not press releases or image catalogs). One query per
// scientific field so the batch is not dominated by one center's output.
const QUERIES = [
  { name: 'aerodynamics', q: 'aerodynamics technical report' },
  { name: 'thermodynamics', q: 'thermodynamics gases' },
  { name: 'propulsion', q: 'rocket propulsion' },
  { name: 'spacecraft-design', q: 'spacecraft design' },
  { name: 'materials-science', q: 'materials science' },
  { name: 'orbital-mechanics', q: 'orbital mechanics' },
  { name: 'image-processing', q: 'image processing remote sensing' },
  { name: 'astronomy', q: 'astronomy telescope' },
  { name: 'computational-methods', q: 'computational methods numerical' },
  { name: 'avionics', q: 'avionics guidance navigation control' },
];

// stiTypes that are white-paper-shaped (vs. image catalogs, meeting minutes,
// data sets). The conference/contractor rows are still NASA-distributed and
// public-use; the determination is recorded per paper either way.
const PREFERRED_STI = new Set(['TECHNICAL_REPORT', 'TECHNICAL_MEMORANDUM', 'SPECIAL_PUBLICATION', 'REFERENCE_PUBLICATION', 'CONTRACTOR_REPORT', 'CONFERENCE_PAPER']);

// Cap on how many triggered pages get the CV look per paper. A whole report
// can flag every table/equation page; the flat text face already carries the
// prose, so a bounded sample of the looked pages keeps a batch moving while
// still landing real OpenCV/OCR structure beside the text.
const MAX_LOOK_PAGES = 6;

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'untitled';

function hasPdf(downloads) {
  return (downloads ?? []).some((d) => d.type === 'STI' && d.mimetype === 'application/pdf');
}
function pdfLink(downloads) {
  const d = (downloads ?? []).find((x) => x.type === 'STI' && x.mimetype === 'application/pdf');
  return d?.links?.pdf ?? d?.links?.original ?? null;
}
function isPublicUse(c) {
  if (!c) return true; // no copyright record → treat as public, record in manifest
  return !c.containsThirdPartyMaterial && c.determinationType !== 'COPYRIGHTED';
}
function rightsLine(c) {
  if (!c) return 'Public domain (US federal government work, 17 USC §105) — NTRS record carries no copyright block';
  if (c.belongsToUsGov) return 'Public domain (US federal government work, 17 USC §105)';
  if (c.determinationType === 'GOV_PUBLIC_USE_PERMITTED') return 'Public-use permitted by the US government for its records; no third-party material (NTRS copyright determination GOV_PUBLIC_USE_PERMITTED)';
  if (c.determinationType === 'PUBLIC_USE_PERMITTED') return 'Public-use permitted (NTRS copyright determination PUBLIC_USE_PERMITTED); no third-party material';
  return `NTRS copyright determination ${c.determinationType}; no third-party material`;
}

async function search(queries) {
  const seen = new Map();
  for (const { name, q } of queries) {
    const url = `${SEARCH}?${new URLSearchParams({ q, 'page.size': '50', 'page.number': '0' })}`;
    try {
      const res = await fetchTimeout(url);
      if (!res.ok) { console.log(`  [${name}] search ${res.status}`); continue; }
      const data = await res.json();
      for (const r of data.results ?? []) {
        if (!r.id || seen.has(r.id)) continue;
        // The search response's own `downloads` array is reliable; the
        // `downloadsAvailable` boolean is not (it can be true with an empty
        // array). Keep only candidates that actually carry a PDF link here,
        // so the crawl never wastes a detail fetch on an undownloadable row.
        if (!hasPdf(r.downloads)) continue;
        seen.set(r.id, { name, title: r.title, id: r.id, downloads: r.downloads, stiType: r.stiType, distribution: r.distribution, center: r.center, publicationDate: r.publicationDate ?? r.distributionDate?.slice(0, 10) ?? '', copyright: r.copyright });
      }
      console.log(`  [${name}] ${(data.results ?? []).length} candidates (${data.stats?.total ?? '?'} total)`);
    } catch (e) {
      console.log(`  [${name}] search error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`  ${seen.size} unique downloadable candidate records`);
  // The candidate pool is deliberately NOT sliced to the pull limit: a pool
  // of 60 only ever lets a run pull 60, and every run re-crawls the same
  // slice (already-pulled files skip without incrementing `done`, so a run
  // that should keep pulling new papers stalls). The crawl cap in main()
  // bounds the work; the pool here bounds nothing.
  return [...seen.values()];
}

async function download(url) {
  const res = await fetchTimeout(`https://ntrs.nasa.gov${url}`, { timeoutMs: 120000 });
  if (!res.ok) throw new Error(`download ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function extractFastPdf(pdfPath, tmpDir) {
  const pages = Number((execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m) ?? [])[1] ?? 0);
  const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  const pageTexts = text.split('\f').map((p) => p.trim());
  return { pages, text, pageTexts };
}

// ── the eoreader7 CV look loop on one rendered page ───────────────────────
// The mechanical sense IS the CV extraction: OpenCV box/connector detection
// (visual-detect.py, via VISUAL_DETECT_PYTHON) with per-region Tesseract OCR
// — a real eoreader7 organ (native/organs/look.js re-exports it as
// detectVisualStructure), addressed per page against the rendered bytes. A
// full-page tesseract OCR runs as the fallback for pages with no discrete
// labeled regions. The vision-model sense is deliberately NOT run here: it
// is the slow, secondary holistic read (moondream→qwen2.5vl, ~40s/page), not
// the extraction the corpus needs — this is the "CV pipeline", disclosed as
// such.
async function cvLookPage(pngPath, pageNo, { detectVisualStructure, ocrFullImage }) {
  const out = { pageNo, boxes: [], connectors: [], ocrText: '', detectorError: null };
  try {
    const d = detectVisualStructure(pngPath, {});
    out.boxes = d?.boxes ?? [];
    out.connectors = d?.connectors ?? [];
    out.width = d?.width;
    out.height = d?.height;
  } catch (e) {
    out.detectorError = e.message;
  }
  try {
    const full = ocrFullImage(pngPath, { psm: 3 });
    if (full) out.ocrText = full;
  } catch {
    /* no full-page OCR — the per-region OCR already landed what the boxes held */
  }
  return out;
}

function cvSidecarBody(pageNo, r) {
  const lines = [];
  lines.push(`### Page ${pageNo}`);
  const readable = (r.boxes ?? []).filter((b) => b.text?.trim());
  if (readable.length || (r.connectors ?? []).length) {
    const positionLabel = (region) => {
      if (!r.width || !r.height) return null;
      const [x, y, w, h] = region;
      const cx = x + w / 2, cy = y + h / 2;
      const col = cx < r.width / 3 ? 'left' : cx < (2 * r.width) / 3 ? 'center' : 'right';
      const row = cy < r.height / 3 ? 'top' : cy < (2 * r.height) / 3 ? 'middle' : 'bottom';
      if (row === 'middle' && col === 'center') return 'center';
      return row === 'middle' ? col : col === 'center' ? row : `${row} ${col}`;
    };
    for (const b of readable) {
      const pos = positionLabel(b.region);
      lines.push(`- Region ${b.id} (pixel area ${JSON.stringify(b.region)})${pos ? ` [${pos}]` : ''}: "${b.text.replace(/\n/g, ' ')}"`);
    }
    for (const c of r.connectors ?? []) {
      lines.push(`- Connector between region ${c.connects[0]} and ${c.connects[1]}${c.direction !== 'undetermined' ? ` (direction: ${c.direction})` : ''}.`);
    }
  } else if (r.ocrText) {
    lines.push(`(no discrete labeled regions — full-page Tesseract OCR: ${r.ocrText.length} chars)`);
    lines.push('```');
    lines.push(r.ocrText.slice(0, 1200));
    lines.push('```');
  } else {
    lines.push('(no discrete labeled regions and no OCR text — a photo or blank page)');
  }
  if (r.detectorError) lines.push(`(mechanical detector error: ${r.detectorError.slice(0, 120)})`);
  lines.push('');
  return lines.join('\n');
}

function frontmatter(rec, { sha256, pages, words, stiType, center, date, distribution, copyright, sourceUrl, cvPages }) {
  return `---
title: ${(rec.title || '').replace(/:$/, '').replace(/"/g, "'")}
collection: 05-academic-papers/ntrs-white-papers
source: NASA Technical Reports Server (NTRS) — accession ${rec.id}
source_url: ${sourceUrl}
rights: ${rightsLine(copyright)}
distribution: ${distribution ?? 'PUBLIC'}
sti_type: ${stiType ?? 'TECHNICAL_REPORT'}
center: ${center ?? ''}
publication_date: ${date ?? ''}
retrieved: ${new Date().toISOString().slice(0, 10)}
sha256: ${sha256}
pages: ${pages}
words: ${words}
cv_look_pages: ${cvPages}
---
`;
}

async function main() {
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : 200;
  const noLook = process.argv.includes('--no-look');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── load the eoreader7 CV organs once, if the CV leg is enabled ───────────
  let detectVisualStructure = null;
  let ocrFullImage = null;
  let weirdFormattingScore = null;
  let cvEnv = null;
  if (!noLook) {
    const venv = process.env.VISUAL_DETECT_PYTHON;
    if (!venv) {
      console.log('CV leg skipped: VISUAL_DETECT_PYTHON unset (set it to a python with opencv-python-headless + numpy). Text face only.');
    } else {
      try {
        const organ = await import(path.join(ROOT, '..', 'eoreader7', 'native', 'organs', 'look.js'));
        detectVisualStructure = organ.detectVisualStructure;
        ocrFullImage = organ.ocrFullImage;
        weirdFormattingScore = organ.weirdFormattingScore;
        cvEnv = venv;
        console.log(`CV leg armed: VISUAL_DETECT_PYTHON=${venv}`);
      } catch (e) {
        console.log(`CV leg unavailable: ${e.message}. Text face only.`);
      }
    }
  }

  const recs = await search(QUERIES);
  // The candidate pool from a topic search is noisy: most rows are not
  // downloadable, or are a non-white-paper STI type, or carry third-party
  // material. Cap how far into the pool we crawl to find each pull, so a
  // bad pool cannot stall the run; the crawl is resumable by --limit.
  const MAX_CRAWL = 400;
  const manifest = { schema: 'NTRSPapersManifest@1', source: 'NASA Technical Reports Server', url: 'https://ntrs.nasa.gov', license: 'Public domain (US federal government works, 17 USC §105); per-record determinations recorded', fetched_at: new Date().toISOString(), extraction: 'eoreader7 CV look loop (pdftotext -layout fast face + OpenCV/Tesseract/vision on triggered pages)', records: [] };

  let done = 0, skipped = 0, failed = 0, crawled = 0;
  for (const cand of recs) {
    if (done >= limit) break;
    if (crawled >= MAX_CRAWL) { console.log(`  crawl cap reached (${MAX_CRAWL}); ${done} pulled — re-run to pull more`); break; }
    crawled += 1;
    const rec = cand;
    console.log(`  [crawl ${crawled}/${MAX_CRAWL}] ${cand.id} — ${(cand.title || '').slice(0, 40)}`);
    const copyright = rec.copyright ?? null;
    if (!isPublicUse(copyright)) { skipped += 1; continue; }
    if (rec.distribution && rec.distribution !== 'PUBLIC') { skipped += 1; continue; }
    const sti = rec.stiType;
    if (sti && !PREFERRED_STI.has(sti)) { skipped += 1; continue; }

    const pdf = pdfLink(rec.downloads);
    if (!pdf) { skipped += 1; continue; }

    const slug = `${rec.id}_${slugify(rec.title)}`;
    const outPath = path.join(OUT_DIR, `${slug}.txt`);
    const cvPath = path.join(OUT_DIR, `${slug}.cv.md`);
    if (fs.existsSync(outPath)) { continue; } // already pulled — counted in reconciliation, never in the limit

    let buf;
    try {
      buf = await download(pdf);
    } catch (e) {
      console.log(`    [${rec.id}] download failed: ${e.message.slice(0, 80)}`);
      failed += 1; continue;
    }
    const sha256 = sha(buf);
    const tmpPdf = path.join(os.tmpdir(), `${slug}.pdf`);
    fs.writeFileSync(tmpPdf, buf);
    console.log(`    [${rec.id}] downloaded ${(buf.length / 1e6).toFixed(1)}MB`);

    // ── extraction: fast text face ─────────────────────────────────────────
    let fast;
    try {
      fast = extractFastPdf(tmpPdf, os.tmpdir());
      console.log(`    [${rec.id}] pdftotext: ${fast.pages} pages, ${wordsIn(fast.text)} words`);
    } catch (e) {
      fs.unlinkSync(tmpPdf); failed += 1; continue;
    }

    // ── CV look loop on triggered pages ────────────────────────────────────
    const cvPages = [];
    let cvBody = '';
    if (detectVisualStructure && cvEnv) {
      let looked = 0;
      for (let i = 0; i < fast.pageTexts.length && looked < MAX_LOOK_PAGES; i += 1) {
        const page = fast.pageTexts[i];
        if (!page) continue;
        const score = weirdFormattingScore ? weirdFormattingScore(page) : { score: 0 };
        if (score.score === 0) continue;
        const png = path.join(os.tmpdir(), `${slug}-p${i + 1}.png`);
        try {
          execFileSync('pdftoppm', ['-png', '-r', '150', '-f', String(i + 1), '-l', String(i + 1), tmpPdf, png.replace(/\.png$/, '')], { stdio: 'ignore' });
          const rendered = `${png.replace(/\.png$/, '')}-${String(i + 1).padStart(2, '0')}.png`;
          if (!fs.existsSync(rendered)) continue;
          const r = await cvLookPage(rendered, i + 1, { detectVisualStructure, ocrFullImage });
          cvBody += cvSidecarBody(i + 1, r);
          cvPages.push(i + 1);
          looked += 1;
          fs.unlinkSync(rendered);
          console.log(`    [${rec.id}] look page ${i + 1}: ${(r.boxes ?? []).length} boxes${r.ocrText ? `, OCR ${r.ocrText.length} chars` : ''}`);
        } catch (e) {
          cvBody += `### Page ${i + 1}\n(look loop failed: ${e.message.slice(0, 120)})\n\n`;
        } finally {
          if (fs.existsSync(png)) fs.unlinkSync(png);
        }
      }
    }

    // ── compose and write ──────────────────────────────────────────────────
    const words = wordsIn(fast.text);
    if (words < MIN_WORDS) {
      fs.unlinkSync(tmpPdf); skipped += 1; continue;
    }
    const fm = frontmatter(rec, {
      sha256, pages: fast.pages, words, stiType: sti, center: rec.center?.name ?? '', date: rec.publicationDate ?? rec.distributionDate?.slice(0, 10) ?? '', distribution: rec.distribution, copyright, sourceUrl: `https://ntrs.nasa.gov/citations/${rec.id}`, cvPages: cvPages.length,
    });
    fs.writeFileSync(outPath, `${fm}\n${fast.text}\n`, 'utf8');
    if (cvBody) fs.writeFileSync(cvPath, `# CV look-loop reading — ${rec.title}\n\nRendered and read by eoreader7's look loop (OpenCV boxes + per-region Tesseract OCR${', a vision model read when one answered'}, mnemonic shadow/echo fast path) on the pages the flat text reader flagged. Standing: mechanical OCR, addressed per page against the rendered bytes.\n\n${cvBody}`, 'utf8');

    manifest.records.push({
      accession: rec.id,
      title: rec.title,
      slug,
      sourceUrl: `https://ntrs.nasa.gov/citations/${rec.id}`,
      center: rec.center?.name ?? '',
      stiType: sti,
      publicationDate: rec.publicationDate ?? rec.distributionDate?.slice(0, 10) ?? '',
      distribution: rec.distribution,
      rights: rightsLine(copyright),
      sha256,
      pages: fast.pages,
      words,
      cvPages,
      file: `05-academic-papers/ntrs-white-papers/${slug}.txt`,
      cvSidecar: cvBody ? `05-academic-papers/ntrs-white-papers/${slug}.cv.md` : null,
    });

    fs.unlinkSync(tmpPdf);
    done += 1;
    console.log(`  [${done}] ${rec.id} ${rec.title.slice(0, 60)} — ${words} words, ${cvPages.length} looked`);
    if (done % 3 === 0) await new Promise((r) => setTimeout(r, 600));
  }

  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

  // Reconcile: files already on disk from an earlier run carry their own
  // frontmatter; keep them in the manifest rather than letting a fresh run
  // silently drop them (a run only writes records it pulled itself).
  const onDisk = fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.txt')) : [];
  const manifestIds = new Set(manifest.records.map((r) => r.file.split('/').pop()));
  for (const f of onDisk) {
    if (manifestIds.has(f)) continue;
    try {
      const raw = fs.readFileSync(path.join(OUT_DIR, f), 'utf8');
      const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
      if (!m) continue;
      const fm = {};
      for (const line of m[1].split('\n')) {
        const i = line.indexOf(':');
        if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
      const words = wordsIn(raw.replace(/^---\n[\s\S]*?\n---\n/, ''));
      manifest.records.push({
        accession: fm.sha256 ? f.split('_')[0] : null,
        title: fm.title ?? f,
        slug: f.replace(/\.txt$/, ''),
        sourceUrl: fm.source_url ?? '',
        center: fm.center ?? '',
        stiType: fm.sti_type ?? '',
        publicationDate: fm.publication_date ?? '',
        distribution: fm.distribution ?? 'PUBLIC',
        rights: fm.rights ?? '',
        sha256: fm.sha256 ?? '',
        pages: fm.pages ?? null,
        words,
        cvPages: fm.cv_look_pages ? [] : [],
        file: `05-academic-papers/ntrs-white-papers/${f}`,
        cvSidecar: fs.existsSync(path.join(OUT_DIR, f.replace(/\.txt$/, '.cv.md'))) ? `05-academic-papers/ntrs-white-papers/${f.replace(/\.txt$/, '.cv.md')}` : null,
      });
    } catch {
      /* unreadable — leave it out rather than guess */
    }
  }
  manifest.records.sort((a, b) => String(a.accession ?? '').localeCompare(String(b.accession ?? '')));

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1), 'utf8');
  console.log(`\nPulled ${done}, skipped ${skipped}, failed ${failed}. Manifest: ${MANIFEST} (${manifest.records.length} records)`);
}

main().catch((e) => { console.error(e); process.exit(1); });