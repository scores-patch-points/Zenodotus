#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '01-literature-books', 'wikisource');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const API_BASE = 'https://en.wikisource.org/w/api.php';

const WORKS = [
  'The_Gettysburg_Address',
  'United_States_Declaration_of_Independence',
  'Constitution_of_the_United_States_of_America',
  'Abraham_Lincoln%27s_Second_Inaugural_Address',
  'Emancipation_Proclamation',
  'The_Absolute_at_Large',
  'The_Adventures_of_Sherlock_Holmes',
  'A_Christmas_Carol',
  'The_War_of_the_Worlds',
  'The_Time_Machine',
  'Flatland',
  'The_Yellow_Wallpaper',
  'The_Legend_of_Sleepy_Hollow',
  'Rip_Van_Winkle',
  'The_Scarlet_Letter',
  'Walden',
  'Civil_Disobedience',
  'The_Annabel_Lee',
  'The_Raven',
  'Ozymandias',
  'Ode_to_a_Nightingale',
  'Ode_on_a_Grecian_Urn',
  'The_Rime_of_the_Ancient_Mariner',
  'Kubla_Khan',
  'Songs_of_Innocence_and_of_Experience',
  'The_Tiger',
  'The_Lamb',
  'Do_not_go_gentle_into_that_good_night',
  'The_Love_Song_of_J._Alfred_Prufrock',
  'The_Waste_Land',
  'Howl_(poem)',
  'I_Wandered_Lonely_as_a_Cloud',
  'Ode_to_the_West_Wind',
  'Prometheus_Unbound_(Shelley)',
  'Paradise_Lost',
  'Paradise_Regained',
  'Samson_Agonistes',
  'Pride_and_Prejudice/Chapter_1',
  'Thus_Spake_Zarathustra',
  'The_King_James_Bible',
];

async function fetchPage(title) {
  const params = new URLSearchParams({
    action: 'parse',
    page: decodeURIComponent(title),
    prop: 'text',
    format: 'json',
    redirects: '1',
  });
  const url = `${API_BASE}?${params}`;
  try {
    const res = await fetch(url, {
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
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

async function main() {
  console.log('=== Wikisource Fetcher ===\n');
  const manifest = {
    source: 'Wikisource',
    url: 'https://en.wikisource.org',
    license: 'Public domain / CC BY-SA',
    fetched_at: new Date().toISOString(),
    works: [],
  };

  for (const title of WORKS) {
    const decoded = decodeURIComponent(title);
    console.log(`Fetching: ${decoded}...`);
    const html = await fetchPage(title);
    if (html) {
      const text = stripHtml(html);
      if (text.length > 200) {
        const file = path.join(OUTPUT_DIR, `${decoded.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)}.txt`);
        fs.writeFileSync(file, text, 'utf8');
        manifest.works.push({
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

  const manifestFile = path.join(__dirname, '..', 'manifests', 'wikisource-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.works.length} works fetched ===`);
}

main().catch(console.error);
