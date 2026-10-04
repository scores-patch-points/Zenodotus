#!/usr/bin/env node
// Real human chat-log fetcher — the organic/community register of the corpus.
//
// Everything in the corpus until this script was written is *published* text:
// books, statutes, scripture, papers, source code — prose someone intended as
// a document. This script pulls the other register: **people typing at each
// other**, with typos, slang, dropped articles, emoticons, and whatever the
// keyboard fumbled, in the register the corpus's formal sources never carry.
// The point is not to archive the chats; it is to give the reading system a
// body of real, unedited human language to form priors over.
//
// Sources (all already-public research corpora or public services):
//
//   1. NUS SMS Corpus        — 55,835 English + 31,465 Chinese real text
//      messages contributed by volunteers (mostly Singapore, 2003-2010s);
//      Singlish, abbreviations, typos. Cite Chen & Kan (2013).
//      kite1988/nus-sms-corpus (GitHub mirror of WING-NUS distribution).
//   2. CoSEM                 — Corpus of Singapore English Messages, ~900k
//      lines of online text messages, 2016-2022, scrubbed/anonymized.
//      wdwgonzales/CoSEM (GitHub). Cite Gonzales et al. (2021).
//   3. Ubuntu IRC logs       — freenode/libera #ubuntu-family channel logs
//      served publicly by Canonical, 2004-2015. Real-time chat, mostly
//      technical support; #ubuntu-de/-es/-it/-pt/-zh carry other languages.
//      irclogs.ubuntu.com.
//   4. Enron email corpus    — 517,401 real workplace emails 1998-2002,
//      released by FERC during the Enron investigation; public domain.
//      SnowZeng/enron_mail (HF mirror of the CMU 2015 tarball).
//   5. LCCC                  — Large-scale Cleaned Chinese Conversation
//      corpus, real Weibo/Douban/PTT conversation, MIT.
//      thu-coai/CDial-GPT, HF mirror silver/lccc.
//
// Aggregation, not fragmentation: individual chat messages are 1-20 words and
// the corpus floor is MIN_WORDS=600, so this script groups messages into
// coherent documents — one person's SMS for a period, one IRC channel-day, one
// conversation thread, one mailbox's emails for a month — and enforces the
// floor on the assembled document, exactly as consolidate-media-catalogs.mjs
// folds short per-item metadata into catalogues. Nothing under the floor is
// saved; it is recorded under `rejected` in the manifest.
//
//   node scripts/fetch-chat-logs.mjs            # full pull
//   node scripts/fetch-chat-logs.mjs --skip big # skip Enron + LCCC (temp-heavy)
//   node scripts/fetch-chat-logs.mjs --only nus irc cosem enron lccc

import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';
import { wordsIn, countWords, sleep, MIN_WORDS } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '19-organic-community');
const MANIFEST_FILE = path.join(ROOT, 'manifests', 'chat-logs-manifest.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'live-priors-chat-'));

const UA = 'live_priors corpus builder';
const DOC_TARGET = 1500; // chunk chat messages until a document clears this (>> floor)

const ONLY = new Set();
const SKIP = new Set();
const raw = process.argv.slice(2);
for (let i = 0; i < raw.length; i++) {
  if ((raw[i] === '--only' || raw[i] === '--skip') && raw[i + 1]) {
    raw[i + 1].split(',').forEach(s => {
      if (!s.trim()) return;
      if (raw[i] === '--only') ONLY.add(s.trim());
      else SKIP.add(s.trim());
    });
    i++;
  }
}
const want = name => (ONLY.size ? ONLY.has(name) : !SKIP.has(name));

/** Binary download to a file, streamed (the Enron tarball is 443 MB). */
async function download(url, dest) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20 * 60 * 1000),
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  await pipeline(res.body, fs.createWriteStream(dest));
}

function unzip(zipPath, dir) {
  fs.mkdirSync(dir, { recursive: true });
  execSync(`unzip -o -q "${zipPath}" -d "${dir}"`, { stdio: 'ignore' });
}

function untar(tarPath, dir) {
  fs.mkdirSync(dir, { recursive: true });
  execSync(`tar -xzf "${tarPath}" -C "${dir}"`, { stdio: 'ignore' });
}

function yaml(fm) {
  return '---\n' + Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`).join('\n') + '\n---\n';
}

function writeDoc(relDir, name, fm, lines) {
  const dir = path.join(OUT, relDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  const body = lines.join('\n');
  fs.writeFileSync(file, yaml(fm) + '\n' + body + '\n', 'utf8');
  const words = wordsIn(body, file);
  if (words < MIN_WORDS) {
    fs.rmSync(file, { force: true });
    return { short: true, words };
  }
  return { words, file: path.relative(ROOT, file) };
}

/**
 * Chunk a message stream into documents of ~DOC_TARGET words. A message is
 * `{ line, w }` where `w` is its own word count. Tails under the floor merge
 * into the previous document; a single group that cannot reach the floor is
 * reported short.
 */
function chunkToDocs(items, { target = DOC_TARGET, min = MIN_WORDS } = {}) {
  const docs = [];
  let cur = [];
  let curW = 0;
  for (const it of items) {
    cur.push(it);
    curW += it.w;
    if (curW >= target) {
      docs.push(cur);
      cur = [];
      curW = 0;
    }
  }
  if (cur.length) {
    if (docs.length && curW >= min) docs.push(cur);
    else docs[docs.length - 1] = [...(docs[docs.length - 1] || []), ...cur];
  }
  return docs.filter(d => d.length);
}

// ---------------------------------------------------------------------------
// 1. NUS SMS Corpus (English + Chinese)
// ---------------------------------------------------------------------------
async function fetchNusSms(m) {
  const urls = {
    en: 'https://raw.githubusercontent.com/kite1988/nus-sms-corpus/master/smsCorpus_en_xml_2015.03.09_all.zip',
    zh: 'https://raw.githubusercontent.com/kite1988/nus-sms-corpus/master/smsCorpus_zh_xml_2015.03.09.zip',
  };
  const cap = { en: 25, zh: 20 };
  for (const lang of ['en', 'zh']) {
    const zip = path.join(TMP, `nus_${lang}.zip`);
    const xml = path.join(TMP, `nus_${lang}.xml`);
    console.log(`\n== NUS SMS (${lang}) ==`);
    await download(urls[lang], zip);
    unzip(zip, TMP);
    const f = fs.readdirSync(TMP).find(n => n.includes(lang) && n.endsWith('.xml'));
    const raw = fs.readFileSync(path.join(TMP, f), 'utf8');
    const blockRe = /<message id="\d+">([\s\S]*?)<\/message>/g;
    const byGroup = new Map(); // contributor__year -> [{line, w}]
    let block;
    while ((block = blockRe.exec(raw))) {
      const b = block[1];
      const text = (b.match(/<text>([\s\S]*?)<\/text>/) || [])[1] || '';
      if (!text.trim()) continue;
      const collector = (b.match(/<collectionMethod collector="([^"]*)/) || [])[1] || 'unknown';
      const time = (b.match(/time="([^"]*)"/) || [])[1] || '';
      const year = (time.match(/^(\d{4})/) || [])[1] || 'unknown';
      const country = (b.match(/<country>([^<]*)<\/country>/) || [])[1] || 'unknown';
      const key = `${collector}__${year}`;
      if (!byGroup.has(key)) byGroup.set(key, { collector, year, country, items: [] });
      const g = byGroup.get(key);
      g.items.push({ line: text.replace(/\s+/g, ' ').trim(), w: countWords(text) });
    }
    let kept = 0;
    const order = [...byGroup.keys()].sort();
    for (const key of order) {
      if (kept >= cap[lang]) { m.rejected.push({ source: 'nus-sms', lang, reason: 'doc_cap', group: key }); continue; }
      const g = byGroup.get(key);
      const docs = chunkToDocs(g.items);
      for (let i = 0; i < docs.length; i++) {
        if (kept >= cap[lang]) { m.rejected.push({ source: 'nus-sms', lang, reason: 'doc_cap', group: key }); break; }
        const lines = docs[i].map(it => it.line);
        const r = writeDoc(`nus-sms/${lang}`, `${slug(g.collector)}-${g.year}-${String(i).padStart(3, '0')}.txt`,
          {
            source: 'NUS SMS Corpus', lang, contributor: g.collector, year: g.year,
            country: g.country, messages: lines.length, license: 'Research use; cite Chen & Kan (2013)',
          }, lines);
        if (r.short) { m.rejected.push({ source: 'nus-sms', lang, group: key, reason: 'under_600_words', words: r.words }); continue; }
        kept++;
        m.documents.push({ source: 'nus-sms', lang, contributor: g.collector, year: g.year, messages: lines.length, words: r.words, file: r.file });
        console.log(`  ${g.collector}/${g.year} #${i} — ${r.words} words, ${lines.length} msgs`);
      }
    }
  }
}

function slug(s) {
  return String(s).normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'unknown';
}

// ---------------------------------------------------------------------------
// 2. CoSEM — Corpus of Singapore English Messages
// ---------------------------------------------------------------------------
async function fetchCosem(m) {
  const zip = path.join(TMP, 'cosem.zip');
  const dir = path.join(TMP, 'cosem');
  console.log('\n== CoSEM ==');
  await download('https://raw.githubusercontent.com/wdwgonzales/CoSEM/main/corpus_COSEM_v5.zip', zip);
  unzip(zip, dir);
  const convs = new Map(); // convID -> items
  const lineRe = /^<<COSEM:([^-]+)-\d+-(\d{2})(SGCH)([MF])(\d{2})-(\d{4})>>\t(.*)$/;
  const files = [];
  const walk = d => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.txt$/.test(n)) files.push(p); } };
  walk(dir);
  let total = 0;
  for (const f of files) {
    for (const rawLine of fs.readFileSync(f, 'utf8').split('\n')) {
      const line = rawLine.replace(/[\u202a\u202b\u202c\u200e\u200f\ufeff]/g, '').trim();
      if (!line) continue;
      const mt = lineRe.exec(line);
      if (!mt) continue;
      const convID = mt[1];
      const year = mt[6];
      const msg = mt[7].trim();
      if (!msg) continue;
      if (!convs.has(convID)) convs.set(convID, { items: [], years: new Set() });
      const c = convs.get(convID);
      c.items.push({ line: msg, w: countWords(msg), year });
      c.years.add(year);
      total++;
    }
  }
  let kept = 0;
  const cap = 40;
  const order = [...convs.keys()].sort();
  for (const convID of order) {
    if (kept >= cap) { m.rejected.push({ source: 'cosem', reason: 'doc_cap', conversation: convID }); continue; }
    const c = convs.get(convID);
    const docs = chunkToDocs(c.items);
    for (let i = 0; i < docs.length; i++) {
      if (kept >= cap) { m.rejected.push({ source: 'cosem', reason: 'doc_cap', conversation: convID }); break; }
      const lines = docs[i].map(it => it.line);
      const years = [...new Set(docs[i].map(it => it.year))].sort();
      const r = writeDoc('cosem', `${slug(convID)}-${String(i).padStart(3, '0')}.txt`,
        { source: 'CoSEM', lang: 'en', conversation: convID, period: `${years[0]}-${years[years.length - 1]}`, messages: lines.length, license: 'Openly distributed research corpus; cite Gonzales et al. (2021)' },
        lines);
      if (r.short) { m.rejected.push({ source: 'cosem', conversation: convID, reason: 'under_600_words', words: r.words }); continue; }
      kept++;
      m.documents.push({ source: 'cosem', lang: 'en', conversation: convID, period: `${years[0]}-${years[years.length - 1]}`, messages: lines.length, words: r.words, file: r.file });
      console.log(`  conv ${convID} #${i} — ${r.words} words, ${lines.length} msgs`);
    }
  }
  console.log(`  ${files.length} chunk files, ${total} message lines, ${kept} docs`);
}

// ---------------------------------------------------------------------------
// 3. Ubuntu IRC logs (2004-2015)
// ---------------------------------------------------------------------------
const IRC_CHANNELS = ['#ubuntu', '#ubuntu-offtopic', '#kubuntu', '#xubuntu', '#ubuntu-server',
  '#ubuntu-de', '#ubuntu-es', '#ubuntu-it', '#ubuntu-pt', '#ubuntu-zh'];
const IRC_DAYS = [[3, 15], [7, 15], [11, 15]];

async function fetchIrc(m) {
  console.log('\n== Ubuntu IRC logs ==');
  let kept = 0;
  for (const ch of IRC_CHANNELS) {
    const chSlug = slug(ch);
    const perYear = new Map();
    for (let y = 2004; y <= 2015; y++) {
      for (const [mo, da] of IRC_DAYS) {
        const url = `https://irclogs.ubuntu.com/${y}/${String(mo).padStart(2, '0')}/${String(da).padStart(2, '0')}/${encodeURIComponent(ch)}.txt`;
        let res;
        try {
          res = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { 'User-Agent': UA } });
        } catch {
          m.rejected.push({ source: 'ubuntu-irc', channel: ch, date: `${y}-${mo}-${da}`, reason: 'fetch_failed' });
          continue;
        }
        if (res.status === 404) { m.rejected.push({ source: 'ubuntu-irc', channel: ch, date: `${y}-${mo}-${da}`, reason: 'not_found' }); continue; }
        if (!res.ok) { m.rejected.push({ source: 'ubuntu-irc', channel: ch, date: `${y}-${mo}-${da}`, reason: `http_${res.status}` }); continue; }
        const lines = [];
        for (const l of (await res.text()).split('\n')) {
          const mt = /^\[\d{2}:\d{2}\] <(\S+)> (.*)$/.exec(l) || /^\[\d{2}:\d{2}\] \* (\S+) (.*)$/.exec(l);
          if (!mt) continue; // drop client/server state lines ("=== ...") and blank lines
          lines.push(`<${mt[1]}> ${mt[2].trim()}`);
        }
        if (!lines.length) { m.rejected.push({ source: 'ubuntu-irc', channel: ch, date: `${y}-${mo}-${da}`, reason: 'no_message_lines' }); continue; }
        if (perYear.get(y) >= 2) { m.rejected.push({ source: 'ubuntu-irc', channel: ch, date: `${y}-${mo}-${da}`, reason: 'per_year_cap' }); continue; }
        const words = countWords(lines.join('\n'));
        if (words < MIN_WORDS) { m.rejected.push({ source: 'ubuntu-irc', channel: ch, date: `${y}-${mo}-${da}`, reason: 'under_600_words', words }); continue; }
        const r = writeDoc(`ubuntu-irc/${chSlug}`, `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}.txt`,
          { source: 'Ubuntu IRC logs', channel: ch, date: `${y}-${mo}-${da}`, lang: ircLang(ch), messages: lines.length, license: 'Publicly served by Canonical; real-time support chat' },
          lines);
        if (r.short) { m.rejected.push({ source: 'ubuntu-irc', channel: ch, date: `${y}-${mo}-${da}`, reason: 'under_600_words', words: r.words }); continue; }
        perYear.set(y, (perYear.get(y) || 0) + 1);
        kept++;
        m.documents.push({ source: 'ubuntu-irc', lang: ircLang(ch), channel: ch, date: `${y}-${mo}-${da}`, messages: lines.length, words: r.words, file: r.file });
        console.log(`  ${ch} ${y}-${mo}-${da} — ${r.words} words, ${lines.length} lines`);
        await sleep(300);
      }
    }
  }
  console.log(`  ${kept} channel-day docs`);
}

function ircLang(ch) {
  const map = { '#ubuntu-de': 'de', '#ubuntu-es': 'es', '#ubuntu-it': 'it', '#ubuntu-pt': 'pt', '#ubuntu-zh': 'zh' };
  return map[ch] || 'en';
}

// ---------------------------------------------------------------------------
// 4. Enron email corpus (1998-2002, public domain)
// ---------------------------------------------------------------------------
const ENRON_MAILBOXES = ['skilling-j', 'lay-k', 'corman-s', 'arnold-j', 'allen-p', 'bass-e', 'germany-c', 'dasovich-j', 'farmer-d', 'kean-s'];

async function fetchEnron(m) {
  const tar = path.join(TMP, 'enron.tar.gz');
  const dir = path.join(TMP, 'enron');
  console.log('\n== Enron email corpus (443MB download) ==');
  const localTar = process.argv.find((a, i) => process.argv[i - 1] === '--enron-local');
  if (localTar) {
    console.log('  using local tarball:', localTar);
    fs.copyFileSync(localTar, tar);
  } else {
    await download('https://huggingface.co/datasets/SnowZeng/enron_mail/resolve/main/enron_mail_20150507.tar.gz', tar);
  }
  console.log('  downloaded, extracting...');
  untar(tar, dir);
  // Layout is maildir/<mailbox>/<folder>/<n>. — the tarball root itself is the
  // maildir (confirmed by inspecting the archive: `maildir/blair-l/...`).
  const mailRoot = fs.readdirSync(dir).map(n => path.join(dir, n)).find(n => fs.statSync(n).isDirectory());
  const mailDir = mailRoot;
  let kept = 0;
  for (const mb of ENRON_MAILBOXES) {
    const mbDir = path.join(mailDir, mb);
    if (!fs.existsSync(mbDir)) { m.rejected.push({ source: 'enron', mailbox: mb, reason: 'mailbox_missing' }); continue; }
    // (mailbox, yyyy-mm) -> [{line, w}]
    const months = new Map();
    const emails = [];
    const walk = d => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else emails.push(p); } };
    walk(mbDir);
    if (!emails.length) { m.rejected.push({ source: 'enron', mailbox: mb, reason: 'no_emails' }); continue; }
    for (const ef of emails) {
      const txt = fs.readFileSync(ef, 'utf8').replace(/\r\n/g, '\n');
      const date = (txt.match(/^Date:\s*(.+)$/m) || [])[1] || '';
      const from = (txt.match(/^From:\s*(.+)$/m) || [])[1] || 'unknown';
      const subject = (txt.match(/^Subject:\s*(.+)$/m) || [])[1] || '(no subject)';
      const ym = (date.match(/\b(\d{1,2})\s+(\w{3})\s+(\d{4})\b/) && (() => {
        const [, d, mon, y] = date.match(/\b(\d{1,2})\s+(\w{3})\s+(\d{4})\b/);
        const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        return MON[mon] ? `${y}-${MON[mon]}` : null;
      })()) || 'unknown';
      const body = (txt.split(/\n\n/, 2)[1] || '').trim();
      if (!body) continue;
      const line = `-- ${date} | ${from} | ${subject}\n${body}`;
      if (!months.has(ym)) months.set(ym, { items: [], date: ym });
      months.get(ym).items.push({ line, w: countWords(body) });
    }
    const cap = 6;
    let written = 0;
    for (const ym of [...months.keys()].sort()) {
      if (written >= cap) break;
      const g = months.get(ym);
      const docs = chunkToDocs(g.items);
      for (let i = 0; i < docs.length; i++) {
        if (written >= cap) break;
        const lines = docs[i].map(it => it.line);
        const r = writeDoc(`enron/${mb}`, `${ym}-${String(i).padStart(3, '0')}.txt`,
          { source: 'Enron email corpus', lang: 'en', mailbox: mb, period: ym, emails: lines.length, license: 'Public domain (FERC release)' },
          lines);
        if (r.short) { m.rejected.push({ source: 'enron', mailbox: mb, period: ym, reason: 'under_600_words', words: r.words }); continue; }
        written++; kept++;
        m.documents.push({ source: 'enron', lang: 'en', mailbox: mb, period: ym, emails: lines.length, words: r.words, file: r.file });
        console.log(`  ${mb} ${ym} #${i} — ${r.words} words, ${lines.length} emails`);
      }
    }
  }
  console.log(`  ${kept} mailbox-period docs`);
}

// ---------------------------------------------------------------------------
// 5. LCCC — Large-scale Cleaned Chinese Conversation (Weibo etc., MIT)
// ---------------------------------------------------------------------------
async function fetchLccc(m) {
  const gz = path.join(TMP, 'lccc_base_train.jsonl.gz');
  console.log('\n== LCCC (Chinese conversation, 370MB download) ==');
  await download('https://huggingface.co/datasets/silver/lccc/resolve/main/lccc_base_train.jsonl.gz', gz);
  const rl = readline.createInterface({
    input: fs.createReadStream(gz).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });
  let kept = 0;
  const cap = 40;
  let docsWritten = 0;
  let cur = [];
  let curW = 0;
  let batch = 0;
  let batchLines = [];
  let read = 0;
  const flush = () => {
    if (!batchLines.length) return;
    const lines = batchLines;
    const r = writeDoc('lccc', `lccc-${String(batch).padStart(5, '0')}.txt`,
      { source: 'LCCC (Large-scale Cleaned Chinese Conversation)', lang: 'zh', batch, dialogues: cur.length, messages: lines.length, license: 'MIT (thu-coai)' },
      lines);
    if (r.short) { m.rejected.push({ source: 'lccc', batch, reason: 'under_600_words', words: r.words }); }
    else { kept++; m.documents.push({ source: 'lccc', lang: 'zh', batch, dialogues: cur.length, messages: lines.length, words: r.words, file: r.file }); console.log(`  batch ${batch} — ${r.words} words, ${cur.length} dialogues`); }
    batch++;
    cur = [];
    curW = 0;
    batchLines = [];
    docsWritten++;
  };
  for await (const line of rl) {
    if (!line.trim()) continue;
    let dialogue;
    try { dialogue = JSON.parse(line); } catch { m.rejected.push({ source: 'lccc', reason: 'parse_failed' }); continue; }
    if (!Array.isArray(dialogue) || !dialogue.length) continue;
    const text = dialogue.filter(s => typeof s === 'string' && s.trim()).join('\n');
    if (!text.trim()) continue;
    read++;
    cur.push(dialogue);
    curW += countWords(text);
    batchLines.push(text);
    if (curW >= DOC_TARGET) flush();
    if (docsWritten >= cap) break;
  }
  if (cur.length && docsWritten < cap) flush();
  console.log(`  ${kept} docs from ${read} dialogues`);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Real Human Chat Log Fetcher ===');
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = {
    source: 'NUS SMS Corpus, CoSEM, Ubuntu IRC logs (irclogs.ubuntu.com), Enron email corpus (FERC/CMU), LCCC (thu-coai)',
    purpose: 'Real, unedited human typing — typos, slang, informal register — across languages and time periods, as reading material for the corpus\'s language priors.',
    fetched_at: new Date().toISOString(),
    documents: [],
    rejected: [],
  };

  if (want('nus')) await fetchNusSms(manifest);
  if (want('cosem')) await fetchCosem(manifest);
  if (want('irc')) await fetchIrc(manifest);
  if (want('enron')) await fetchEnron(manifest);
  if (want('lccc')) await fetchLccc(manifest);

  // A partial re-run (--only/--skip) replaces the re-run sources' entries but
  // keeps the other sources' rows: a partial run must never erase the rest of
  // the manifest the way a fresh full build can. Documents and rejections both
  // carry the source TAG (e.g. `nus-sms`); the display name lives in the
  // category README/ATTRIBUTION.
  const SOURCE_TAGS = ['nus-sms', 'cosem', 'ubuntu-irc', 'enron', 'lccc'];
  if (ONLY.size || SKIP.size) {
    try {
      const prev = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
      for (const tag of SOURCE_TAGS) {
        if (want(tag === 'nus-sms' ? 'nus' : tag === 'ubuntu-irc' ? 'irc' : tag)) continue;
        manifest.documents.push(...prev.documents.filter(d => d.source === tag));
        manifest.rejected.push(...prev.rejected.filter(r => r.source === tag));
      }
    } catch { /* no prior manifest — nothing to merge */ }
  }

  const bySource = {};
  for (const d of manifest.documents) bySource[d.source] = (bySource[d.source] || 0) + 1;

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  const readme = `# 19-organic-community — real human chat logs

This register holds **people typing at each other**, unedited: text messages,
IRC support channels, and workplace email, with the typos, slang, dropped
articles and keyboard fumbles the corpus's formal sources never carry. It is
the organic/community corner of the corpus (category 16 in eoPriors's catalog;
the number \`19\` keeps it clear of the locally repurposed \`16-wordplay\`).

Nothing here is a transcript written for an audience. Every document is an
aggregation of short messages that individually would fall under the corpus's
600-word floor — one person's SMS for a period, one IRC channel-day, one
conversation thread, one mailbox's emails for a month — built by
\`scripts/fetch-chat-logs.mjs\`, which enforces the floor on the assembled
document the same way \`consolidate-media-catalogs.mjs\` folds short media
metadata into catalogues.

## Sources

| Directory | What it is | Language(s) | Period | License/terms |
|---|---|---|---|---|
| \`nus-sms/en/\`, \`nus-sms/zh/\` | Real personal SMS contributed by volunteers (Singapore, mostly students) — Singlish, abbreviations, typos | English, Chinese | 2003-2015 | Research use; cite Chen & Kan (2013). Contributor IDs are anonymous |
| \`cosem/\` | Corpus of Singapore English Messages — online text messages, scrubbed/anonymized | English (colloquial Singlish) | 2016-2022 | Openly distributed research corpus; cite Gonzales et al. (2021) |
| \`ubuntu-irc/\` | Ubuntu IRC support-channel logs served publicly by Canonical | English + de/es/it/pt/zh channels | 2004-2015 | Publicly served logs |
| \`enron/\` | Real workplace emails released by FERC during the Enron investigation | English | 1998-2002 | Public domain (US federal record) |
| \`lccc/\` | Large-scale Cleaned Chinese Conversation corpus — real Weibo/Douban/PTT conversation | Chinese | 2010s | MIT (thu-coai) |

## Reading notes

- **Register.** These are the informal registers the corpus lacked: SMS
  abbreviations (\`hav\`, \`ur\`, \`n\`), Singlish (\`oso\`, \`wat\`, \`lah\`), IRC
  shorthand, email ellipsis. Typos are preserved — that is the point.
- **Privacy.** The sources are already-public research corpora that were
  scrubbed or anonymized to varying degrees (CoSEM and NUS SMS carry anonymous
  IDs; Enron was released by FERC; IRC logs are public; LCCC is a cleaned
  public corpus). They are read here as language documents, not re-published
  as private correspondence.
- **Aggregation, not fabrication.** A document groups real messages; the
  grouping (contributor, conversation, channel-day, mailbox-month) is declared
  in each file's frontmatter and in \`manifests/chat-logs-manifest.json\`.
  Nothing was rewritten, summarized or generated.

Every file carries a YAML frontmatter block with its source, language, period,
license and grouping. The full manifest, including everything fetched and
rejected (404s, under-floor batches, caps), is \`manifests/chat-logs-manifest.json\`.
`;

  fs.writeFileSync(path.join(OUT, 'README.md'), readme, 'utf8');

  const attrib = `# Attribution and rights — 19-organic-community

This register holds real human chat logs pulled as reading material. Every
document's provenance, license and grouping is recorded in
\`manifests/chat-logs-manifest.json\`; this file is what each source's own
terms require.

Generated alongside \`scripts/fetch-chat-logs.mjs\`; do not edit by hand.

| Directory | Source | Required attribution / terms |
|---|---|---|
| \`nus-sms/\` | NUS SMS Corpus, National University of Singapore (Chen & Kan). GitHub mirror: \`kite1988/nus-sms-corpus\`. | Cite Tao Chen and Min-Yen Kan (2013), "Creating a Live, Public Short Message Service Corpus: The NUS SMS Corpus", *Language Resources and Evaluation* 47(2), 299-355. Contributors consented to public release; IDs are anonymous. |
| \`cosem/\` | Corpus of Singapore English Messages (CoSEM). \`wdwgonzales/CoSEM\`. | Cite Gonzales, W. D. W., Hiramoto, M., Leimgruber, J. R. E., & Lim, J. J. (2021), "The Corpus of Singapore English Messages (CoSEM)", *World Englishes*. The corpus team requests tact with any unscrubbed private information. |
| \`ubuntu-irc/\` | Ubuntu IRC logs, served by Canonical at irclogs.ubuntu.com (freenode/libera #ubuntu-family channels). | Logs are user-generated content served publicly; IRC nicknames are not personal identifiers. Times are UTC. |
| \`enron/\` | Enron Email Dataset, released by the US Federal Energy Regulatory Commission during its investigation; distributed by CMU (CALO project). Mirror: \`SnowZeng/enron_mail\` (HF). | Public domain (US federal record). CMU requests sensitivity to the privacy of the individuals involved. |
| \`lccc/\` | LCCC — Large-scale Cleaned Chinese Conversation corpus, THU CoAI group (Wang et al., NLPCC 2020). MIT. HF mirror: \`silver/lccc\`. | MIT license; cite Wang et al. (2020), "A Large-Scale Chinese Short-Text Conversation Dataset". |
`;

  fs.writeFileSync(path.join(OUT, 'ATTRIBUTION.md'), attrib, 'utf8');

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n=== Done: ${manifest.documents.length} documents, ${manifest.rejected.length} rejected`);
  console.log('By source:', JSON.stringify(bySource));
  console.log('Manifest: manifests/chat-logs-manifest.json');
}

main().catch(e => { console.error(e); process.exit(1); });