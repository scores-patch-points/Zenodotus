#!/usr/bin/env node
// Fold per-item media metadata records into one catalog document per collection.
//
// 07-images-media/ and 10-audio-music/ were stored one JSON record per artwork,
// photograph or recording. A single accession record is 30-90 words: too thin
// to be a prior, and 500 of them dominate the corpus by file count while
// carrying almost no text. The information is worth keeping, so rather than
// deleting the records outright this collapses each collection into one catalog
// document — which is both a usable prior and a faithful index of what the
// collection holds.
//
// Run this BEFORE enforce-min-words.mjs --prune, which is what removes the
// per-item records once their content has been folded in.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, MIN_WORDS } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MANIFEST_FILE = path.join(ROOT, 'manifests', 'media-catalogs-manifest.json');

const COLLECTIONS = [
  {
    dir: '07-images-media/nasa',
    title: 'NASA Image and Video Library',
    institution: 'National Aeronautics and Space Administration',
    licence: 'Public domain (US federal work)',
    fields: ['nasa_id', 'title', 'date_created', 'center', 'photographer', 'media_type', 'keywords', 'description'],
  },
  {
    dir: '07-images-media/met-museum',
    title: 'The Metropolitan Museum of Art Open Access Collection',
    institution: 'The Metropolitan Museum of Art, New York',
    licence: 'CC0 1.0 (open access records)',
    fields: ['objectID', 'title', 'artist', 'date', 'culture', 'period', 'medium', 'dimensions', 'department', 'classification', 'creditLine', 'objectURL'],
  },
];

// Every 10-audio-music subdirectory holds Internet Archive item records in the
// same shape, so they share one field list.
const AUDIO_FIELDS = ['identifier', 'title', 'creator', 'date', 'subjects', 'license', 'mediatype', 'collection', 'download_url'];

function audioCollections() {
  const base = path.join(ROOT, '10-audio-music');
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({
      dir: `10-audio-music/${d.name}`,
      title: `Internet Archive audio collection: ${d.name.replace(/-/g, ' ')}`,
      institution: 'Internet Archive',
      licence: 'Per-item; see the license field of each record',
      fields: AUDIO_FIELDS,
    }));
}

function renderValue(v) {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) return v.filter(x => x != null && x !== '').join(', ') || null;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function buildCatalog(collection) {
  const dir = path.join(ROOT, collection.dir);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  if (!files.length) return null;

  const lines = [
    collection.title,
    `Institution: ${collection.institution}`,
    `Rights: ${collection.licence}`,
    `Items catalogued: ${files.length}`,
    '',
    'This document is the consolidated catalogue of a collection that was',
    'previously stored as one metadata record per item. Each entry below is one',
    'item, with the fields the source made available.',
    '',
  ];

  let entries = 0;
  for (const f of files) {
    let record;
    try {
      record = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch {
      continue;
    }
    entries++;
    lines.push(`--- ${entries}. ${renderValue(record.title) || f.replace(/\.json$/, '')}`);
    for (const field of collection.fields) {
      if (field === 'title') continue;
      const v = renderValue(record[field]);
      if (v) lines.push(`${field}: ${v}`);
    }
    lines.push('');
  }

  return { text: lines.join('\n').trim() + '\n', entries };
}

function main() {
  console.log('=== Consolidating media metadata into collection catalogues ===\n');
  const manifest = {
    source: 'Media collection catalogues',
    built_at: new Date().toISOString(),
    note:
      'Per-item metadata records were folded into one catalogue document per ' +
      'collection so that every prior clears the corpus word floor.',
    catalogues: [],
  };

  for (const collection of [...COLLECTIONS, ...audioCollections()]) {
    const built = buildCatalog(collection);
    if (!built) {
      console.log(`  ${collection.dir}: nothing to consolidate`);
      continue;
    }
    const words = wordsIn(built.text);
    const out = path.join(ROOT, `${collection.dir}-catalog.txt`);
    if (words < MIN_WORDS) {
      console.log(`  ${collection.dir}: catalogue is ${words} words, below the floor — skipped`);
      continue;
    }
    fs.writeFileSync(out, built.text, 'utf8');
    manifest.catalogues.push({
      collection: collection.dir,
      title: collection.title,
      institution: collection.institution,
      licence: collection.licence,
      items: built.entries,
      file: path.relative(ROOT, out),
      words,
    });
    console.log(`  ${collection.dir}: ${built.entries} items -> ${words} words`);
  }

  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== ${manifest.catalogues.length} catalogues written ===`);
}

main();
