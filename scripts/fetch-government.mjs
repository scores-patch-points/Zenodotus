#!/usr/bin/env node
// Fetch US government and legal documents (all public domain)
// Sources: Federal Register, CourtListener, GovInfo, Chronicling America
// Status: Public domain (federal works)
//
// Every document written here must clear the corpus word floor (MIN_WORDS).
// This fetcher used to save one-paragraph Federal Register abstracts, which are
// too thin to be priors; enforce-min-words.mjs deleted all nine of them. The
// floor is applied at the point of writing so they cannot come back.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { wordsIn, MIN_WORDS } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.join(__dirname, '..', '06-government-legal');
const MANIFEST_FILE = path.join(__dirname, '..', 'manifests', 'government-legal-manifest.json');

// FederalRegister.gov detects non-browser requests and, instead of a non-2xx
// status, serves a 200 "Request Access" CAPTCHA gate page — indistinguishable
// from a real document by status code or length alone (it's ~1KB of prose,
// well over the >100-char threshold below). Every fetch from this fetcher
// previously returned this page and it got saved as if it were the document
// text. Recognize it by content and skip rather than write it.
function isBlockPage(text) {
  return /aggressive automated scraping|Request Access|complete the CAPTCHA/i.test(text);
}

// Federal Register API
async function fetchFederalRegister(limit = 20) {
  console.log('\n--- Federal Register ---');
  const outputDir = path.join(BASE_DIR, 'federal-register');
  fs.mkdirSync(outputDir, { recursive: true });
  const texts = [];

  const res = await fetch(`https://www.federalregister.gov/api/v1/documents.json?per_page=${limit}&order=newest`);
  if (!res.ok) {
    console.log(`  Failed: ${res.status}`);
    return texts;
  }
  const data = await res.json();

  for (const doc of data.results.slice(0, limit)) {
    console.log(`  ${doc.title}`);
    const entry = {
      title: doc.title,
      type: doc.document_type,
      date: doc.public_inspection_date,
      agency: doc.agencies?.map(a => a.name).join(', ') || '',
      url: doc.html_url,
    };

    // Fetch full text
    let text = '';
    let contentType = '';
    try {
      const textRes = await fetch(doc.html_url);
      if (textRes.ok) {
        const html = await textRes.text();
        // Extract text content (basic - strip HTML tags)
        const stripped = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (isBlockPage(stripped)) {
          console.log(`    Blocked (CAPTCHA gate)`);
        } else if (wordsIn(stripped) >= MIN_WORDS) {
          text = stripped;
          contentType = 'full_text';
        } else {
          console.log(`    Full text is ${wordsIn(stripped)} words, below the ${MIN_WORDS}-word floor`);
        }
      }
    } catch (e) {
      console.log(`    Error fetching text: ${e.message}`);
    }
    // The abstract used to be saved as a fallback when the full-text page was
    // blocked. An abstract is a few hundred characters and never clears the
    // floor, so there is no fallback any more: no full text, no document.
    if (text) {
      const file = path.join(outputDir, `fr_${doc.id || doc.document_number}.txt`);
      fs.writeFileSync(file, text, 'utf8');
      entry.file = path.relative(path.join(__dirname, '..'), file);
      entry.chars = text.length;
      entry.content_type = contentType;
      texts.push(entry);
    } else {
      console.log(`    No content available`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return texts;
}

// CourtListener - recent Supreme Court opinions
async function fetchCourtListener(limit = 10) {
  console.log('\n--- CourtListener (Supreme Court) ---');
  const outputDir = path.join(BASE_DIR, 'courtlistener');
  fs.mkdirSync(outputDir, { recursive: true });
  const texts = [];

  const res = await fetch(`https://www.courtlistener.com/api/rest/v4/clusters/?court=scotus&order_by=-date_filed&format=json&page_size=${limit}`);
  if (!res.ok) {
    console.log(`  Failed: ${res.status}`);
    return texts;
  }
  const data = await res.json();

  for (const cluster of data.results) {
    console.log(`  ${cluster.case_name} (${cluster.date_filed})`);
    const entry = {
      case_name: cluster.case_name,
      docket_number: cluster.docket_number,
      date_filed: cluster.date_filed,
      court: cluster.docket?.court || 'scotus',
      url: `https://www.courtlistener.com${cluster.absolute_url}`,
    };

    // Get the main opinion text
    if (cluster.sub_opinions?.count > 0) {
      const opinion = cluster.sub_opinions.results?.[0];
      if (opinion?.text) {
        const text = opinion.text
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (wordsIn(text) >= MIN_WORDS) {
          const file = path.join(outputDir, `scotus_${cluster.id}.txt`);
          fs.writeFileSync(file, text, 'utf8');
          entry.file = path.relative(path.join(__dirname, '..'), file);
          entry.chars = text.length;
          texts.push(entry);
        }
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return texts;
}

// Library of Congress - sample from a collection
async function fetchLOC(limit = 10) {
  console.log('\n--- Library of Congress ---');
  const outputDir = path.join(BASE_DIR, 'library-of-congress');
  fs.mkdirSync(outputDir, { recursive: true });
  const texts = [];

  // Use the Congress.gov API for recent bills (public domain)
  const res = await fetch(`https://api.congress.gov/v3/bill?format=json&offset=0&limit=${limit}`);
  if (!res.ok) {
    console.log(`  Failed: ${res.status}`);
    return texts;
  }
  const data = await res.json();

  for (const bill of data.bills) {
    const title = `${bill.type} ${bill.number} - ${bill.updateDate}`;
    console.log(`  ${title}`);
    const entry = {
      title,
      type: bill.type,
      number: bill.number,
      congress: bill.congress,
      update_date: bill.updateDate,
      url: `https://www.congress.gov/bill/${bill.congress}-congress/${bill.type.toLowerCase()}/${bill.number}`,
    };

    // Try to fetch the text
    try {
      const textUrl = `https://api.congress.gov/v3/bill/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}/text?format=json`;
      const textRes = await fetch(textUrl);
      if (textRes.ok) {
        const textData = await textRes.json();
        if (textData.textVersions?.length > 0) {
          const version = textData.textVersions[0];
          if (version.formats?.length > 0) {
            const fmt = version.formats[0];
            if (fmt.url) {
              const contentRes = await fetch(fmt.url);
              if (contentRes.ok) {
                const content = await contentRes.text();
                const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (wordsIn(text) >= MIN_WORDS) {
                  const file = path.join(outputDir, `bill_${bill.congress}_${bill.type}${bill.number}.txt`);
                  fs.writeFileSync(file, text, 'utf8');
                  entry.file = path.relative(path.join(__dirname, '..'), file);
                  entry.chars = text.length;
                  texts.push(entry);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.log(`    Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return texts;
}

// Chronicling America - historic newspapers
async function fetchChroniclingAmerica(limit = 5) {
  console.log('\n--- Chronicling America (Historic Newspapers) ---');
  const outputDir = path.join(BASE_DIR, 'chronicling-america');
  fs.mkdirSync(outputDir, { recursive: true });
  const texts = [];

  const res = await fetch(`https://chroniclingamerica.loc.gov/search/pages/results/?date1=1900&date2=1910&format=json&rows=${limit}`);
  if (!res.ok) {
    console.log(`  Failed: ${res.status}`);
    return texts;
  }
  const data = await res.json();

  for (const item of data.items.slice(0, limit)) {
    console.log(`  ${item.title} (${item.date_issued})`);
    const entry = {
      title: item.title,
      date: item.date_issued,
      city: item.city,
      state: item.state,
      url: item.url,
    };

    // Fetch the page text (OCR)
    if (item.ocr_generated) {
      try {
        const ocrUrl = item.url.replace(/\/$/, '') + '/ocr.txt';
        const ocrRes = await fetch(ocrUrl);
        if (ocrRes.ok) {
          const text = await ocrRes.text();
          if (wordsIn(text) >= MIN_WORDS) {
            const file = path.join(outputDir, `news_${item.id || Date.now()}.txt`);
            fs.writeFileSync(file, text, 'utf8');
            entry.file = path.relative(path.join(__dirname, '..'), file);
            entry.chars = text.length;
            texts.push(entry);
          }
        }
      } catch (e) {
        console.log(`    Error: ${e.message}`);
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }

  return texts;
}

async function main() {
  console.log('=== US Government & Legal Corpus Fetcher ===\n');
  const manifest = {
    source: 'US Government & Legal',
    fetched_at: new Date().toISOString(),
    sections: {},
  };

  manifest.sections.federal_register = await fetchFederalRegister(10);
  manifest.sections.courtlistener = await fetchCourtListener(5);
  manifest.sections.library_of_congress = await fetchLOC(5);
  manifest.sections.chronicling_america = await fetchChroniclingAmerica(3);

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  let totalTexts = 0;
  for (const [key, texts] of Object.entries(manifest.sections)) {
    totalTexts += texts.length;
  }
  console.log(`\n=== Done: ${totalTexts} documents fetched ===`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch(console.error);
