#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '03-oer-textbooks', 'openstax');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function fetchOpenStaxBooks() {
  const url = 'https://openstax.org/api/cms/1/books?is_ap=false';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'live_priors corpus builder',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      const fallback = 'https://openstax.org/api/cms/1/books';
      const res2 = await fetch(fallback, {
        headers: { 'User-Agent': 'live_priors corpus builder' },
      });
      if (!res2.ok) return [];
      return res2.json();
    }
    return res.json();
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log('=== OpenStax Textbook Fetcher ===\n');
  const manifest = {
    source: 'OpenStax',
    url: 'https://openstax.org',
    license: 'CC BY 4.0',
    fetched_at: new Date().toISOString(),
    books: [],
  };

  const books = await fetchOpenStaxBooks();
  console.log(`Found ${books.length} books`);

  for (const book of books) {
    const entry = {
      id: book.id,
      title: book.title || '',
      slug: book.slug || '',
      description: (book.description || '').replace(/<[^>]+>/g, '').substring(0, 300),
      subjects: book.book_subjects || book.subjects || [],
      cover_url: book.cover_url || '',
      webview_url: book.webview_url || book.html_url || '',
      pdf_url: book.pdf_url || '',
      license_text: book.license_text || book.license_name || '',
      authors: (book.authors || []).map(a => ({
        name: a.name || '',
        university: a.university_name || '',
      })),
      created: book.created || '',
      updated: book.updated || '',
    };

    manifest.books.push(entry);
    const safeName = (book.slug || book.title || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const file = path.join(OUTPUT_DIR, `${safeName}.json`);
    fs.writeFileSync(file, JSON.stringify(entry, null, 2), 'utf8');
    console.log(`  ${entry.title}`);
  }

  const manifestFile = path.join(__dirname, '..', 'manifests', 'openstax-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n=== Done: ${manifest.books.length} books cataloged ===`);
}

main().catch(console.error);
