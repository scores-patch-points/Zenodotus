#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '02-encyclopedic', '1911-britannica');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_BASE = 'https://en.wikisource.org/w/api.php';

const ARTICLES = [
  '1911_Encyclop%C3%A6dia_Britannica/Philosophy',
  '1911_Encyclop%C3%A6dia_Britannica/Mathematics',
  '1911_Encyclop%C3%A6dia_Britannica/Physics',
  '1911_Encyclop%C3%A6dia_Britannica/Chemistry',
  '1911_Encyclop%C3%A6dia_Britannica/Biology',
  '1911_Encyclop%C3%A6dia_Britannica/Evolution',
  '1911_Encyclop%C3%A6dia_Britannica/Astronomy',
  '1911_Encyclop%C3%A6dia_Britannica/Geometry',
  '1911_Encyclop%C3%A6dia_Britannica/Algebra',
  '1911_Encyclop%C3%A6dia_Britannica/Logic',
  '1911_Encyclop%C3%A6dia_Britannica/Ethics',
  '1911_Encyclop%C3%A6dia_Britannica/Aesthetics',
  '1911_Encyclop%C3%A6dia_Britannica/Architecture',
  '1911_Encyclop%C3%A6dia_Britannica/Painting',
  '1911_Encyclop%C3%A6dia_Britannica/Sculpture',
  '1911_Encyclop%C3%A6dia_Britannica/Music',
  '1911_Encyclop%C3%A6dia_Britannica/Poetry',
  '1911_Encyclop%C3%A6dia_Britannica/Drama',
  '1911_Encyclop%C3%A6dia_Britannica/History',
  '1911_Encyclop%C3%A6dia_Britannica/Geography',
  '1911_Encyclop%C3%A6dia_Britannica/Athens',
  '1911_Encyclop%C3%A6dia_Britannica/Rome',
  '1911_Encyclop%C3%A6dia_Britannica/Egypt',
  '1911_Encyclop%C3%A6dia_Britannica/India',
  '1911_Encyclop%C3%A6dia_Britannica/China',
  '1911_Encyclop%C3%A6dia_Britannica/Japan',
  '1911_Encyclop%C3%A6dia_Britannica/Greece',
  '1911_Encyclop%C3%A6dia_Britannica/Arabia',
  '1911_Encyclop%C3%A6dia_Britannica/English_Literature',
  '1911_Encyclop%C3%A6dia_Britannica/French_Literature',
  '1911_Encyclop%C3%A6dia_Britannica/German_Literature',
  '1911_Encyclop%C3%A6dia_Britannica/Latin_Literature',
  '1911_Encyclop%C3%A6dia_Britannica/Greek_Literature',
  '1911_Encyclop%C3%A6dia_Britannica/Christianity',
  '1911_Encyclop%C3%A6dia_Britannica/Buddhism',
  '1911_Encyclop%C3%A6dia_Britannica/Islam',
  '1911_Encyclop%C3%A6dia_Britannica/Hinduism',
  '1911_Encyclop%C3%A6dia_Britannica/Mythology',
  '1911_Encyclop%C3%A6dia_Britannica/Electricity',
  '1911_Encyclop%C3%A6dia_Britannica/Magnetism',
  '1911_Encyclop%C3%A6dia_Britannica/Steam_engine',
  '1911_Encyclop%C3%A6dia_Britannica/Telegraph',
  '1911_Encyclop%C3%A6dia_Britannica/Telephone',
  '1911_Encyclop%C3%A6dia_Britannica/Photography',
  '1911_Encyclop%C3%A6dia_Britannica/Language',
  '1911_Encyclop%C3%A6dia_Britannica/Education',
  '1911_Encyclop%C3%A6dia_Britannica/Law',
  '1911_Encyclop%C3%A6dia_Britannica/Economics',
  '1911_Encyclop%C3%A6dia_Britannica/Politics',
  '1911_Encyclop%C3%A6dia_Britannica/Sociology',
];

async function fetchPage(title) {
  const params = new URLSearchParams({
    action: 'parse',
    page: decodeURIComponent(title),
    prop: 'text',
    format: 'json',
    redirects: '1',
  });
  try {
    const res = await fetch(`${API_BASE}?${params}`, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.parse?.text?.['*'] || null;
  } catch (e) {
    return null;
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('=== 1911 Britannica Fetcher ===\n');
  const manifest = {
    source: '1911 Encyclopædia Britannica (via Wikisource)',
    url: 'https://en.wikisource.org',
    license: 'Public domain',
    fetched_at: new Date().toISOString(),
    articles: [],
  };

  for (const title of ARTICLES) {
    const decoded = decodeURIComponent(title);
    console.log(`Fetching: ${decoded}...`);
    const html = await fetchPage(title);
    if (html) {
      const text = stripHtml(html);
      if (text.length > 200) {
        const shortName = decoded.split('/').pop().replace(/[^a-zA-Z0-9]/g, '_');
        const file = path.join(OUTPUT_DIR, `EB1911_${shortName}.txt`);
        fs.writeFileSync(file, text, 'utf8');
        manifest.articles.push({
          title: decoded,
          chars: text.length,
          file: path.relative(path.join(__dirname, '..'), file),
        });
        console.log(`  Saved: ${text.length} chars`);
      } else {
        console.log(`  Too short`);
      }
    } else {
      console.log(`  Failed`);
    }
    await new Promise(r => setTimeout(r, 400));
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'britannica-1911-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.articles.length} articles fetched ===`);
}

main().catch(console.error);
