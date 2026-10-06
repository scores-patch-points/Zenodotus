#!/usr/bin/env node
// Fetch the Opera Omnia of Thomas Aquinas (d. 1274) in the ORIGINAL Latin —
// the Corpus Thomisticum (Enrique Alarcón's revision of Roberto Busa's
// magnetic-tape digitization, in turn the Leonine text). The whole corpus is
// served as one HTML page per question/division, chained by prev/next links,
// so we walk each part's question chain from its first question until the
// next-link leaves the part.
//
// One file per major work, frontmatter-carrying, resumed per work.
//
//   node scripts/fetch-aquinas-latin.mjs [--part prim|primsec|secsec|tert] [--limit 1]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, '11-multi-language', 'latin-originals');
const BASE = 'https://www.corpusthomisticum.org/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) eo-corpus/1.0';

// part -> { start: first 'sthNNNN.html', name: latin label }
const summaParts = []; // defined in main()

async function getPage(num) {
  const url = `${BASE}sth${num}.html`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) });
      if (res.status === 429) { await sleep(20000 + attempt * 30000); continue; }
      if (!res.ok) { console.error(`  ${num}: HTTP ${res.status}`); return null; }
      const buf = await res.arrayBuffer();
      const text = new TextDecoder('latin1').decode(buf);
      return text;
    } catch (e) { console.error(`  ${num}: ${e.message}`); await sleep(20000 * (attempt + 1)); }
  }
}

function extractBody(html) {
  // Strip scripts/forms/styles (the nav-select lives in a <SCRIPT>), then cut
  // everything before the Leonine banner, then render paragraphs as newlines.
  let text = html.replace(/<SCRIPT[\s\S]*?<\/SCRIPT>/gi, ' ');
  text = text.replace(/<FORM[\s\S]*?<\/FORM>/gi, ' ');
  text = text.replace(/<STYLE[\s\S]*?<\/STYLE>/gi, ' ');
  const banner = text.indexOf('Textum Leoninum');
  text = banner !== -1 ? text.slice(banner) : text.slice(text.indexOf('<BODY') + 5);
  text = text.replace(/<SCRIPT[\s\S]*?<\/SCRIPT>/gi, ' ');
  text = text.replace(/<FORM[\s\S]*?<\/FORM>/gi, ' ');
  text = text.replace(/<[HPRD][^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ').replace(/&ordf;/g, 'ª').replace(/&aelig;/g, 'æ').replace(/&eacute;/g, 'é').replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n+/g, '\n');
  return text.trim();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const argPart = (process.argv.find(a => a.startsWith('--part=')) ?? '').split('=')[1];
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : Infinity;

  // Summa Theologiae parts: starts verified live. Each part chains via the
  // 'age ultra' (next) link; the last question of a part links to the first
  // of the next part, so we stop when the next number no longer shares the
  // part's leading digit.
  const summaParts = [
    { key: '1', start: '1001', label: 'Prima Pars', file: 'summa-theologiae-prima-pars.txt' },
    { key: '2', start: '2001', label: 'Prima Secundae', file: 'summa-theologiae-prima-secundae.txt' },
    { key: '3', start: '3001', label: 'Secunda Secundae', file: 'summa-theologiae-secunda-secundae.txt' },
    { key: '4', start: '4001', label: 'Tertia Pars', file: 'summa-theologiae-tertia-pars.txt' },
  ];
  const toRun = summaParts.filter(p => !argPart || p.key === argPart);
  let done = 0;
  for (const part of toRun) {
    if (done >= limit) break;
    const out = path.join(OUT_DIR, part.file);
    if (fs.existsSync(out)) { console.log(`skip ${part.file}`); done++; continue; }
    console.log(`== ${part.label}`);
    const divs = [];
    let num = part.start;
    let guard = 0;
    while (num && guard < 1000) {
      const html = await getPage(num);
      if (!html) break;
      const txt = extractBody(html);
      // question header: "[28232] Iª q. 1 pr. ..."
      const head = txt.slice(0, 140);
      divs.push(`\n## ${head}\n\n${txt.slice(txt.indexOf(' ', txt.indexOf(']')) + 1)}`);
      const nextM = html.match(/HREF="sth(\d{4})\.html"[^>]*>[^<]*<IMG[^>]*ALT="age ultra"/);
      const next = nextM ? nextM[1] : null;
      if (next && next.startsWith(part.key)) num = next;
      else num = null;
      guard++;
      await sleep(1200);
    }
    const fm = [
      '---',
      `title: S. Thomae de Aquino, Summa Theologiae — ${part.label} (Latin)`,
      'collection: 11-multi-language/latin-originals',
      'source: Corpus Thomisticum — textum Leoninum (1888) automato translatum a Roberto Busa SJ, denuo recognovit Enrique Alarcón',
      `source_url: ${BASE}sth${part.start}.html`,
      'format: Latin (Leonine text)',
      'license: public domain (textus Leoninus 1888; Thomae opera publica) — corpusthomisticum.org text',
      '---',
      '',
    ].join('\n');
    fs.writeFileSync(out, fm + divs.join('\n') + '\n');
    console.log(`  ${part.label}: ${divs.length} divisions -> ${out}`);
    done++;
    await sleep(3000);
  }
}

main().catch(console.error);