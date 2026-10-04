#!/usr/bin/env node
// Fetch the Ancient Greek originals of the St. John's Western canon (the
// freshman/sophomore Greek core, plus the lyric poets) from Greek Wikisource
// (el.wikisource.org), read through the MediaWiki parse API so only the page's
// own text is stored — no navigation chrome.
//
// Wikisource splits the epics, histories and long prose works into one subpage
// per book; those are enumerated live with list=allpages and concatenated in
// Greek alphabetical order. A work that is a single page is fetched directly.
//
//   node scripts/fetch-greek-originals.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, sleep, slugify } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '11-multi-language', 'greek-originals');
const API = 'https://el.wikisource.org/w/api.php';

// Greek alphabet order, used to sort enumerated subpages.
const GREEK_UPPER = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'.split('');
const GREEK_LOWER = 'αβγδεζηθικλμνξοπρστυφχψω'.split('');

const WORKS = [
  // Epics — one file per work, 24 books each
  { slug: 'homer-iliad', title: 'Ὅμηρος, Ἰλιάς (Iliad, Ancient Greek)', prefix: 'Ιλιάς/', order: GREEK_UPPER },
  { slug: 'homer-odyssey', title: 'Ὅμηρος, Ὀδύσσεια (Odyssey, Ancient Greek)', prefix: 'Οδύσσεια/', order: GREEK_LOWER },

  // Tragedy — single pages
  { slug: 'aeschylus-agamemnon', title: 'Αἰσχύλος, Ἀγαμέμνων', page: 'Αγαμέμνων' },
  { slug: 'aeschylus-choephori', title: 'Αἰσχύλος, Χοηφόροι', page: 'Χοηφόροι' },
  { slug: 'aeschylus-eumenides', title: 'Αἰσχύλος, Εὐμενίδες', page: 'Ευμενίδες' },
  { slug: 'aeschylus-prometheus-bound', title: 'Αἰσχύλος, Προμηθεὺς Δεσμώτης', page: 'Προμηθεύς_Δεσμώτης' },
  { slug: 'sophocles-oedipus-rex', title: 'Σοφοκλῆς, Οἰδίπους Τύραννος', page: 'Οιδίπους_Τύραννος' },
  { slug: 'sophocles-oedipus-colonus', title: 'Σοφοκλῆς, Οἰδίπους ἐπὶ Κολωνῷ', page: 'Οιδίπους_επί_Κολωνώ' },
  { slug: 'sophocles-antigone', title: 'Σοφοκλῆς, Ἀντιγόνη', page: 'Αντιγόνη' },
  { slug: 'sophocles-philoctetes', title: 'Σοφοκλῆς, Φιλοκτήτης', page: 'Φιλοκτήτης' },
  { slug: 'sophocles-ajax', title: 'Σοφοκλῆς, Αἴας', page: 'Αίας' },
  { slug: 'euripides-hippolytus', title: 'Εὐριπίδης, Ἱππόλυτος', page: 'Ιππόλυτος' },
  { slug: 'euripides-bacchae', title: 'Εὐριπίδης, Βάκχαι', page: 'Βάκχαι' },
  { slug: 'euripides-medea', title: 'Εὐριπίδης, Μήδεια', page: 'Μήδεια' },
  { slug: 'aristophanes-clouds', title: 'Ἀριστοφάνης, Νεφέλαι', page: 'Νεφέλαι' },
  { slug: 'aristophanes-birds', title: 'Ἀριστοφάνης, Ὄρνιθες', page: 'Όρνιθες' },
  { slug: 'aristophanes-frogs', title: 'Ἀριστοφάνης, Βάτραχοι', page: 'Βάτραχοι' },

  // History — subpages
  { slug: 'herodotus-histories', title: 'Ἡρόδοτος, Ἱστορίαι', prefix: 'Ιστορίαι/', order: null },
  { slug: 'thucydides-history', title: 'Θουκυδίδης, Ἱστορία τοῦ Πελοποννησιακοῦ Πολέμου', prefix: 'Ιστορία του Πελοποννησιακού Πολέμου/', order: GREEK_UPPER },

  // Plato — Republic as subpages, dialogues as single pages
  { slug: 'plato-republic', title: 'Πλάτων, Πολιτεία', prefix: 'Πολιτεία/', order: GREEK_UPPER },
  { slug: 'plato-meno', title: 'Πλάτων, Μένων', page: 'Μένων' },
  { slug: 'plato-apology', title: 'Πλάτων, Ἀπολογία Σωκράτους', page: 'Απολογία' },
  { slug: 'plato-crito', title: 'Πλάτων, Κρίτων', page: 'Κρίτων' },
  { slug: 'plato-phaedo', title: 'Πλάτων, Φαίδων', page: 'Φαίδων' },
  { slug: 'plato-phaedrus', title: 'Πλάτων, Φαῖδρος', page: 'Φαίδρος' },
  { slug: 'plato-theaetetus', title: 'Πλάτων, Θεαίτητος', page: 'Θεαίτητος' },
  { slug: 'plato-sophist', title: 'Πλάτων, Σοφιστής', page: 'Σοφιστής' },
  { slug: 'plato-timaeus', title: 'Πλάτων, Τίμαιος', page: 'Τίμαιος' },
  { slug: 'plato-gorgias', title: 'Πλάτων, Γοργίας', page: 'Γοργίας_(Πλάτων)' },
  { slug: 'plato-symposium', title: 'Πλάτων, Συμπόσιον', page: 'Συμπόσιον_(Πλάτων)' },
  { slug: 'plato-parmenides', title: 'Πλάτων, Παρμενίδης', page: 'Παρμενίδης_(Πλάτων)' },

  // Aristotle — what Greek Wikisource carries
  { slug: 'aristotle-categories', title: 'Ἀριστοτέλης, Κατηγορίαι', page: 'Κατηγορίαι' },
  { slug: 'aristotle-poetics', title: 'Ἀριστοτέλης, Περὶ Ποιητικῆς', page: 'Περί_Ποιητικής' },
  { slug: 'aristotle-metaphysics', title: 'Ἀριστοτέλης, Μεταφυσικά', prefix: 'Μεταφυσικά/Βιβλίο ', order: null },
  { slug: 'aristotle-nicomachean-ethics', title: 'Ἀριστοτέλης, Ἠθικὰ Νικομάχεια', prefix: 'Ηθικά_Νικομάχεια/', order: null },
  { slug: 'aristotle-politics', title: 'Ἀριστοτέλης, Πολιτικά', prefix: 'Πολιτικά/', order: GREEK_UPPER },
  { slug: 'aristotle-de-anima', title: 'Ἀριστοτέλης, Περὶ Ψυχῆς', prefix: 'Περί_ψυχής/', order: GREEK_UPPER },

  // Lyric poetry — the Greek poetry the seminar reads. Sappho's poems are
  // short individual lyrics; they are combined into one document (the way a
  // fragmentary corpus is read) so the collection clears the 600-word floor
  // while every poem is preserved whole.
  { slug: 'sappho-poems', title: 'Σαπφώ, ποιήματα καὶ ἀποσπάσματα (Sappho, poems and fragments)', pages: ['Ύμνος_προς_την_Αφροδίτη', 'Ύμνοι_και_Επιθαλάμια', 'Επιγράμματα_Σαπφούς', 'Άλλος_θεός_μου_φαίνεται_εκείνος'] },
  { slug: 'pindar-olympian-odes', title: 'Πίνδαρος, Ὀλυμπιόνικοι', page: 'Ολυμπιόνικοι' },
  { slug: 'pindar-pythian-odes', title: 'Πίνδαρος, Πυθιόνικαι', page: 'Πυθιόνικοι' },
  { slug: 'pindar-nemean-odes', title: 'Πίνδαρος, Νεμεόνικοι', page: 'Νεμεόνικοι' },
  { slug: 'pindar-isthmian-odes', title: 'Πίνδαρος, Ἰσθμιόνικοι', page: 'Ισθμιόνικοι' },

  // Hellenistic / Roman-era Greek
  { slug: 'epictetus-enchiridion', title: 'Ἐπίκτητος, Ἐγχειρίδιον', page: 'Εγχειρίδιον' },
  { slug: 'epictetus-discourses', title: 'Ἐπίκτητος, Διατριβαί', prefix: 'Διατριβαί/', order: null },
  { slug: 'plotinus-enneads', title: 'Πλωτῖνος, Ἐννεάδες', prefix: 'Εννεάδες/', order: null },
];

function cleanHtml(html) {
  // NOTE: tables are deliberately NOT stripped — Wikisource lays most drama
  // and several dialogues out in tables, so removing them deletes the text
  // (this was caught live: stripping tables reduced Sophocles' Antigone to
  // 1,247 chars of navigation chrome). Only script/style and the marked
  // chrome blocks are removed; everything else is flattened by tag-stripping.
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*(headertemplate|ws-noexport|noprint|catlinks|printfooter|mw-editsection)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, ' ')
    .replace(/<span[^>]*class="[^"]*(mw-editsection)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, ' ')
    .replace(/<sup[^>]*class="[^"]*reference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function apiGet(params, retries = 4) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'live_priors corpus builder (educational corpus)' } });
      if (res.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
      if (res.ok) return await res.json();
    } catch { /* retry */ }
    await sleep(1500);
  }
  return null;
}

async function parsePage(page) {
  const data = await apiGet({ action: 'parse', page, prop: 'text', redirects: '1' });
  const html = data?.parse?.text?.['*'];
  if (!html) return null;
  const text = cleanHtml(html);
  return text.length ? text : null;
}

async function subpages(prefix) {
  const data = await apiGet({ action: 'query', list: 'allpages', apprefix: prefix, aplimit: '500' });
  return (data?.query?.allpages || []).map(p => p.title);
}

function sortSubpages(titles, order) {
  if (!order) return titles.slice().sort((a, b) => a.localeCompare(b, 'el'));
  const key = t => {
    const last = t.split('/').filter(Boolean).pop() || '';
    const ch = last[0];
    const i = order.indexOf(ch);
    return i === -1 ? 999 : i;
  };
  return titles.slice().sort((a, b) => key(a) - key(b) || a.localeCompare(b, 'el'));
}

async function pull(work, manifest) {
  process.stdout.write(`  ${work.slug}... `);
  let parts = [];
  if (work.pages) {
    for (const p of work.pages) {
      const t = await parsePage(p);
      if (t) parts.push({ title: p, text: t });
      await sleep(450);
    }
  } else if (work.page) {
    const t = await parsePage(work.page);
    if (t) parts = [{ title: work.page, text: t }];
    await sleep(500);
  } else {
    const titles = sortSubpages(await subpages(work.prefix), work.order);
    if (!titles.length) {
      console.log(`NO SUBPAGES for prefix "${work.prefix}"`);
      manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'no_subpages', prefix: work.prefix });
      return;
    }
    for (const title of titles) {
      const t = await parsePage(title);
      if (t) parts.push({ title, text: t });
      await sleep(450);
    }
  }

  const body = parts.map(p => `${p.title}\n\n${p.text}`).join('\n\n' + '─'.repeat(60) + '\n\n');
  const words = wordsIn(body);
  if (!parts.length || words < 600) {
    console.log(`too short (${words} words)`);
    manifest.rejected.push({ slug: work.slug, title: work.title, reason: 'under_600_words', words });
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${work.slug}.txt`);
  const sourceRef = work.pages
    ? work.pages.map(p => `https://el.wikisource.org/wiki/${encodeURIComponent(p)}`).join(' ')
    : `https://el.wikisource.org/wiki/${encodeURIComponent(work.page || work.prefix)}`;
  const header = [
    '---',
    `title: ${work.title}`,
    `collection: 11-multi-language/greek-originals`,
    `source: Greek Wikisource (el.wikisource.org)`,
    `source_url: ${sourceRef}`,
    `format: Ancient Greek (polytonic)`,
    `license: public domain`,
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(file, header + body + '\n', 'utf8');
  manifest.pulled.push({ slug: work.slug, title: work.title, words, parts: parts.length, file: path.relative(ROOT, file) });
  console.log(`ok (${words} words, ${parts.length} part${parts.length > 1 ? 's' : ''})`);
}

async function main() {
  const only = (process.argv[2] === '--only')
    ? new Set((process.argv[3] || '').split(',').filter(Boolean))
    : null;

  console.log('=== Greek Originals Fetcher (el.wikisource.org) ===\n');
  const manifest = {
    source: 'Greek Wikisource (el.wikisource.org) via the MediaWiki parse API',
    license: 'Public domain',
    format: 'Ancient Greek, polytonic',
    fetched_at: new Date().toISOString(),
    pulled: [],
    rejected: [],
  };

  for (const w of WORKS) {
    if (only && !only.has(w.slug)) continue;
    await pull(w, manifest);
  }

  const manifestFile = path.join(ROOT, 'manifests', 'greek-originals-manifest.json');
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n=== Done: ${manifest.pulled.length} pulled, ${manifest.rejected.length} rejected ===`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch(console.error);