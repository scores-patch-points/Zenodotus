#!/usr/bin/env node
// Fetch Wikipedia article texts (CC BY-SA)
// Source: https://en.wikipedia.org/w/api.php
// License: CC BY-SA 4.0

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '02-encyclopedic', 'wikipedia');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'wikipedia-manifest.json');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_BASE = 'https://en.wikipedia.org/w/api.php';

// Curated set of articles across domains for structural diversity
const ARTICLES = [
  // Philosophy
  'Epistemology', 'Ontology', 'Ethics', 'Metaphysics', 'Logic',
  'Plato', 'Aristotle', 'Immanuel Kant', 'Friedrich Nietzsche', 'Ludwig Wittgenstein',

  // Science
  'Quantum mechanics', 'General relativity', 'Evolution', 'Thermodynamics', 'Entropy',
  'DNA', 'Cell biology', 'Neuroscience', 'Chemistry', 'Mathematics',

  // History
  'Roman Empire', 'Byzantine Empire', 'Ming dynasty', 'Mongol Empire', 'Industrial Revolution',
  'World War I', 'World War II', 'Cold War', 'Renaissance', 'Enlightenment',

  // Literature
  'Novel', 'Poetry', 'Drama', 'Epic poetry', 'Tragedy',
  'William Shakespeare', 'Homer', 'Dante Alighieri', 'Johann Wolfgang von Goethe', 'Leo Tolstoy',

  // Religion
  'Buddhism', 'Hinduism', 'Islam', 'Judaism', 'Christianity',
  'Taoism', 'Confucianism', 'Zoroastrianism', 'Sikhism', 'Jainism',

  // Music
  'Music theory', 'Harmony', 'Counterpoint', 'Raga', 'Maqam',
  'Classical music', 'Jazz', 'Folk music', 'Opera', 'Symphony',

  // Mathematics
  'Number theory', 'Topology', 'Group theory', 'Calculus', 'Linear algebra',
  'Probability', 'Statistics', 'Graph theory', 'Category theory', 'Set theory',

  // Computer Science
  'Algorithm', 'Computational complexity theory', 'Artificial intelligence', 'Machine learning',
  'Compiler', 'Operating system', 'Database', 'Network protocol', 'Cryptography',

  // Linguistics
  'Syntax', 'Semantics', 'Phonology', 'Morphology', 'Pragmatics',
  'Indo-European languages', 'Sino-Tibetan languages', 'Afroasiatic languages', 'Language acquisition', 'Translation',
];

async function fetchArticle(title) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    format: 'json',
    titles: title,
  });

  const url = `${API_BASE}?${params}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'live_priors corpus builder (https://github.com/live_priors; corpus@livepriors.org)',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (page.missing) return null;
    const revision = page.revisions?.[0];
    return {
      title: page.title,
      pageid: page.pageid,
      content: revision?.slots?.main?.['*'] || '',
    };
  } catch (e) {
    return null;
  }
}

function stripWikiMarkup(wikitext) {
  // Basic wiki markup stripping
  let text = wikitext
    .replace(/\{\{[^}]*\}\}/g, '')           // templates
    .replace(/\[\[File:[^\]]*\]\]/g, '')      // file links
    .replace(/\[\[Image:[^\]]*\]\]/g, '')     // image links
    .replace(/\[\[Category:[^\]]*\]\]/g, '')  // categories
    .replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, '$1$2')  // wikilinks
    .replace(/'''(.+?)'''/g, '$1')            // bold
    .replace(/''(.+?)''/g, '$1')              // italic
    .replace(/\*+/g, '')                       // bullets
    .replace(/#+/g, '')                        // numbered lists
    .replace(/={2,}(.+?)={2,}/g, '\n$1\n')    // section headers
    .replace(/<!--[\s\S]*?-->/g, '')           // comments
    .replace(/\|[^=]*=/g, '')                  // table/infobox params
    .replace(/<[\/]?[a-z]+[^>]*>/gi, '')       // HTML tags
    .replace(/\n{3,}/g, '\n\n')                // collapse blank lines
    .trim();
  return text;
}

async function main() {
  console.log('=== Wikipedia Corpus Fetcher ===\n');
  const manifest = {
    source: 'Wikipedia',
    url: 'https://en.wikipedia.org',
    api: 'https://en.wikipedia.org/w/api.php',
    license: 'CC BY-SA 4.0',
    fetched_at: new Date().toISOString(),
    articles: [],
  };

  for (const title of ARTICLES) {
    console.log(`Fetching: ${title}...`);
    const article = await fetchArticle(title);
    if (article && article.content.length > 100) {
      const cleaned = stripWikiMarkup(article.content);
      if (cleaned.length > 100) {
        const file = path.join(OUTPUT_DIR, `${title.replace(/ /g, '_')}.txt`);
        fs.writeFileSync(file, cleaned, 'utf8');
        manifest.articles.push({
          title: article.title,
          pageid: article.pageid,
          raw_chars: article.content.length,
          cleaned_chars: cleaned.length,
          file: path.relative(path.join(__dirname, '..'), file),
        });
        console.log(`  Saved: ${cleaned.length} chars`);
      }
    } else {
      console.log(`  Failed or too short`);
    }
    await new Promise(r => setTimeout(r, 300)); // Rate limit courtesy
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.articles.length} articles fetched ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
