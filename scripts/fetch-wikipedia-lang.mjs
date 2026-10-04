#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '11-multi-language', 'wikipedia-lang');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const LANG_ARTICLES = [
  { lang: 'fr', title: 'Philosophie' },
  { lang: 'fr', title: 'Révolution_française' },
  { lang: 'fr', title: 'Albert_Einstein' },
  { lang: 'fr', title: 'Littérature_française' },
  { lang: 'fr', title: 'Musique_classique' },
  { lang: 'de', title: 'Philosophie' },
  { lang: 'de', title: 'Johann_Wolfgang_von_Goethe' },
  { lang: 'de', title: 'Quantenmechanik' },
  { lang: 'de', title: 'Römische_Geschichte' },
  { lang: 'de', title: 'Deutsche_Literatur' },
  { lang: 'es', title: 'Filosofía' },
  { lang: 'es', title: 'Miguel_de_Cervantes' },
  { lang: 'es', title: 'Revolución_Mexicana' },
  { lang: 'es', title: 'Física_cuántica' },
  { lang: 'es', title: 'Literatura_española' },
  { lang: 'it', title: 'Filosofia' },
  { lang: 'it', title: 'Dante_Alighieri' },
  { lang: 'it', title: 'Rinascimento' },
  { lang: 'it', title: 'Letteratura_italiana' },
  { lang: 'la', title: 'Philosophia' },
  { lang: 'la', title: 'Roma_antiqua' },
  { lang: 'pt', title: 'Filosofia' },
  { lang: 'pt', title: 'Luís_Vaz_de_Camões' },
  { lang: 'pt', title: 'Literatura_brasileira' },
  { lang: 'nl', title: 'Filosofie' },
  { lang: 'nl', title: 'Nederlandse_Literatuur' },
  { lang: 'sv', title: 'Filosofi' },
  { lang: 'sv', title: 'Svensk_litteratur' },
  { lang: 'fi', title: 'Filosofia' },
  { lang: 'fi', title: 'Suomen_kirjallisuus' },
  { lang: 'pl', title: 'Filozofia' },
  { lang: 'pl', title: 'Literatura_polska' },
  { lang: 'ru', title: 'Философия' },
  { lang: 'ru', title: 'Русская_литература' },
  { lang: 'zh', title: '哲学' },
  { lang: 'zh', title: '中国文学' },
  { lang: 'ja', title: '哲学' },
  { lang: 'ja', title: '日本文学' },
  { lang: 'ar', title: 'فلسفة' },
  { lang: 'ar', title: 'أدب_عربي' },
  { lang: 'hi', title: 'दर्शनशास्त्र' },
  { lang: 'hi', title: 'हिन्दी_साहित्य' },
  { lang: 'tr', title: 'Felsefe' },
  { lang: 'tr', title: 'Türk_edebiyatı' },
  { lang: 'ko', title: '철학' },
  { lang: 'ko', title: '한국_문학' },
  { lang: 'el', title: 'Φιλοσοφία' },
  { lang: 'el', title: 'Αρχαία_Ελλάδα' },
  { lang: 'he', title: 'פילוסופיה' },
  { lang: 'fa', title: 'فلسفه' },
];

async function fetchArticle(lang, title) {
  const apiBase = `https://${lang}.wikipedia.org/w/api.php`;
  const params = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    format: 'json',
    titles: title.replace(/_/g, ' '),
  });
  try {
    const res = await fetch(`${apiBase}?${params}`, {
      headers: { 'User-Agent': 'live_priors corpus builder' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (page.missing) return null;
    return {
      title: page.title,
      pageid: page.pageid,
      content: page.revisions?.[0]?.slots?.main?.['*'] || '',
    };
  } catch (e) {
    return null;
  }
}

function stripWikiMarkup(wikitext) {
  return wikitext
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[File:[^\]]*\]\]/g, '')
    .replace(/\[\[Image:[^\]]*\]\]/g, '')
    .replace(/\[\[Category:[^\]]*\]\]/g, '')
    .replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, '$1$2')
    .replace(/'''(.+?)'''/g, '$1')
    .replace(/''(.+?)''/g, '$1')
    .replace(/\*+/g, '')
    .replace(/#+/g, '')
    .replace(/={2,}(.+?)={2,}/g, '\n$1\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\|[^=]*=/g, '')
    .replace(/<[\/]?[a-z]+[^>]*>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  console.log('=== Wikipedia Multi-Language Fetcher ===\n');
  const manifest = {
    source: 'Wikipedia (Multi-Language)',
    url: 'https://www.wikipedia.org',
    license: 'CC BY-SA 4.0',
    fetched_at: new Date().toISOString(),
    articles: [],
  };

  for (const { lang, title } of LANG_ARTICLES) {
    console.log(`[${lang}] ${title}...`);
    const article = await fetchArticle(lang, title);
    if (article && article.content.length > 200) {
      const cleaned = stripWikiMarkup(article.content);
      if (cleaned.length > 200) {
        const langDir = path.join(OUTPUT_DIR, lang);
        fs.mkdirSync(langDir, { recursive: true });
        const file = path.join(langDir, `${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)}.txt`);
        fs.writeFileSync(file, cleaned, 'utf8');
        manifest.articles.push({
          lang,
          title: article.title,
          pageid: article.pageid,
          chars: cleaned.length,
          file: path.relative(path.join(__dirname, '..'), file),
        });
        console.log(`  Saved: ${cleaned.length} chars`);
      }
    } else {
      console.log(`  Failed or too short`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'wikipedia-lang-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.articles.length} articles in ${new Set(manifest.articles.map(a => a.lang)).size} languages ===`);
}

main().catch(console.error);
