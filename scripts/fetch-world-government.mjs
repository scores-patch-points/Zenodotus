#!/usr/bin/env node
// World government & legal corpus fetcher.
//
// The pre-existing fetch-government.mjs pulls US federal sources only, and most
// of what it saved were one-paragraph Federal Register abstracts. This fetcher
// covers primary legislation published by national institutions across ~30
// jurisdictions, plus two multi-country instruments, and keeps only documents
// that clear the corpus-wide MIN_WORDS floor.
//
// Three sections:
//   world-legislation/  national statute books, one directory per jurisdiction
//   un-udhr/            the UDHR as published by OHCHR, in every encoded language
//   world-factbook/     CIA World Factbook country profiles (public domain)
//
// Licences differ by publisher and are recorded per section in the manifest and
// in 06-government-legal/ATTRIBUTION.md. Official legal texts are outside
// copyright in several of these jurisdictions (DE §5 UrhG, US 17 USC §105,
// KR §7); the rest are open government licences that require attribution.
//
// Sources are read from the legalize.dev mirrors, which republish each
// publisher's official feed as Markdown with YAML frontmatter. Those mirrors
// expose no directory index, so candidate identifiers are generated from each
// publisher's own numbering scheme and probed; misses are ordinary 404s.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBounded, get, mapPool, wordsIn, MIN_WORDS } from './lib/corpus-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE_DIR = path.join(ROOT, '06-government-legal');
const MANIFEST_FILE = path.join(ROOT, 'manifests', 'world-government-manifest.json');
const RAW = 'https://raw.githubusercontent.com';

// Per-document ceiling. A few consolidated codes exceed 1 MB and would
// outweigh every other document in the corpus.
const MAX_DOC_BYTES = 500_000;
// Documents kept per jurisdiction. Breadth across publishers matters more than
// depth in any one statute book.
const PER_JURISDICTION = Number(process.env.PER_JURISDICTION || 20);
// Ceiling on bytes kept per jurisdiction, so one statute book cannot dominate
// the corpus on disk.
const PER_JURISDICTION_BYTES = Number(process.env.PER_JURISDICTION_BYTES || 2_000_000);
// Ceiling on identifiers probed per jurisdiction, so a sparse numbering scheme
// cannot stall the run.
const PROBE_BUDGET = Number(process.env.PROBE_BUDGET || 2600);
const CONCURRENCY = 16;

// ---------------------------------------------------------------- candidates

const range = (a, b, step = 1) => {
  const out = [];
  for (let i = a; i <= b; i += step) out.push(i);
  return out;
};
const pad = (n, w) => String(n).padStart(w, '0');

/** Interleave several candidate streams so breadth comes before depth. */
function interleave(...lists) {
  const out = [];
  for (let i = 0; i < Math.max(...lists.map(l => l.length)); i++) {
    for (const l of lists) if (i < l.length) out.push(l[i]);
  }
  return out;
}

/**
 * Round-robin a per-year candidate generator across years, so the first batches
 * sample the whole span rather than exhausting the oldest year first.
 */
function scanYears(years, perYear) {
  return interleave(...years.map(perYear));
}

/** Vary the trailing integer of a known-good identifier. */
function neighbours(seed, spread) {
  const m = seed.match(/^(.*?)(\d+)(\.md)$/);
  if (!m) return [];
  const [, head, digits, tail] = m;
  const n = Number(digits);
  const out = [];
  for (let d = 1; d <= spread; d++) {
    for (const v of [n + d, n - d]) {
      if (v > 0) out.push(`${head}${pad(v, digits.length)}${tail}`);
    }
  }
  return out;
}

// Jurisdictions are keyed by the legalize-dev repository suffix. `seeds` are
// identifiers verified to exist; `scan` walks the publisher's numbering scheme.
// legalize-ee, -ie, -kr and -lt are omitted: their READMEs document no
// resolvable filename convention (the Estonian example identifiers 404) and no
// probe pattern resolved against them.
const JURISDICTIONS = [
  {
    cc: 'uk',
    name: 'United Kingdom',
    institution: 'The National Archives — legislation.gov.uk',
    licence: 'Open Government Licence v3.0',
    attribution:
      '© Crown and database right. Derived from content available under the Open Government Licence v3.0 from legislation.gov.uk.',
    candidates: () =>
      interleave(
        // Acts with the widest downstream citation, first.
        [
          'uk/ukpga-1998-42.md', // Human Rights Act 1998
          'uk/ukpga-2018-12.md', // Data Protection Act 2018
          'uk/ukpga-2010-15.md', // Equality Act 2010
          'uk/ukpga-2000-36.md', // Freedom of Information Act 2000
          'uk/ukpga-2008-27.md', // Climate Change Act 2008
          'uk/ukpga-2005-4.md', // Constitutional Reform Act 2005
          'uk/ukpga-2006-46.md', // Companies Act 2006
          'uk/ukpga-2016-25.md', // Investigatory Powers Act 2016
          'uk/ukpga-2018-16.md', // EU (Withdrawal) Act 2018
        ],
        scanYears(range(2015, 2025), y => range(1, 30).map(n => `uk/ukpga-${y}-${n}.md`)),
        scanYears(range(2016, 2024), y => range(1, 20).map(n => `uk-sct/asp-${y}-${n}.md`)),
        scanYears(range(2018, 2024), y => range(1, 10).map(n => `uk-wls/asc-${y}-${n}.md`)),
        scanYears(range(2015, 2023), y => range(1, 12).map(n => `uk-nir/nia-${y}-${n}.md`)),
      ),
  },
  {
    cc: 'us',
    name: 'United States',
    institution: 'Office of the Law Revision Counsel — United States Code',
    licence: 'Public domain (17 U.S.C. §105)',
    attribution: 'United States Code, Office of the Law Revision Counsel, U.S. House of Representatives.',
    candidates: () =>
      scanYears(range(1, 54), t => range(1, 120).map(s => `us/USC-T${t}-S${s}.md`)),
  },
  {
    cc: 'eu',
    name: 'European Union',
    institution: 'Publications Office of the European Union — EUR-Lex',
    licence: 'CC BY 4.0',
    attribution:
      '© European Union, https://eur-lex.europa.eu — Source: EUR-Lex (Publications Office of the European Union). Reused under CC BY 4.0. Only legislation published in the printed Official Journal is authentic.',
    candidates: () =>
      interleave(
        [
          'eu/32016R0679.md', // GDPR
          'eu/32024R1689.md', // AI Act
          'eu/32022R2065.md', // Digital Services Act
          'eu/32022R1925.md', // Digital Markets Act
          'eu/32023R1114.md', // MiCA
          'eu/32021R1119.md', // European Climate Law
          'eu/32014R0596.md', // Market Abuse Regulation
          'eu/32017R0745.md', // Medical Devices Regulation
          'eu/32013R0575.md', // Capital Requirements Regulation
          'eu/32019R0881.md', // Cybersecurity Act
        ],
        scanYears(range(2014, 2025), y => range(1, 260).map(n => `eu/3${y}R${pad(n, 4)}.md`)),
      ),
  },
  {
    cc: 'de',
    name: 'Germany',
    institution: 'Bundesministerium der Justiz / Bundesamt für Justiz — Gesetze im Internet',
    licence: 'Public domain (amtliches Werk, §5 UrhG)',
    attribution: 'Gesetze im Internet — Bundesministerium der Justiz und Bundesamt für Justiz.',
    // Filenames are the official juris abbreviation, upper-cased.
    candidates: () =>
      [
        'GG', 'BGB', 'STGB', 'STPO', 'ZPO', 'HGB', 'GVG', 'VWGO', 'VWVFG', 'AO-1977',
        'ESTG', 'KSTG', 'USTG', 'GEWO', 'BETRVG', 'KSCHG', 'TVG', 'ARBZG', 'BURLG',
        'MUSCHG', 'BBIG', 'BDSG', 'TKG', 'TMG', 'URHG', 'PATG', 'MARKENG', 'GWB',
        'UWG', 'AKTG', 'GMBHG', 'INSO', 'STVG', 'STVO', 'FEV', 'LUFTVG', 'BIMSCHG',
        'BNATSCHG', 'WHG', 'KRWG', 'AUFENTHG', 'ASYLVFG', 'STAG', 'BWAHLG', 'PARTG',
        'BVERFGG', 'BEAMTSTG', 'SG', 'IFG', 'KWG', 'WPHG', 'VAG', 'GEG', 'ENWG',
        'EEG-2023', 'TIERSCHG', 'LFGB', 'AMG-1976', 'SGB-1', 'SGB-2', 'SGB-3',
        'SGB-4', 'SGB-5', 'SGB-6', 'SGB-7', 'SGB-8', 'SGB-9', 'SGB-10', 'SGB-11',
        'SGB-12', 'BGG', 'AGG', 'ENTGTRANSPG', 'NETZDG', 'GEHVERBOTSG', 'BPOLG',
        'BKAG', 'ZOLLVG', 'ERBSTG-1974', 'GRSTG-1973', 'BEWG', 'FGO', 'ARBGG',
        'SGG', 'GERICHTSKOSTG', 'RVG', 'BRAO', 'BNOTO', 'ZVG', 'WEG', 'BAUGB',
        'MSTV', 'PSTG', 'BGBL', 'VERSAMMLG', 'PARLSTG',
      ].map(abk => `de/${abk}.md`),
  },
  {
    cc: 'fr',
    name: 'France',
    institution: 'Direction de l’information légale et administrative (DILA) — Légifrance',
    licence: 'Licence Ouverte / Open Licence (Etalab) v2.0',
    // The LEGI consolidated codes are single documents of several megabytes.
    maxDocBytes: 3_000_000,
    maxBytes: 6_000_000,
    attribution:
      'Source : Direction de l’information légale et administrative (DILA) — base LEGI / Légifrance. Données réutilisées sous Licence Ouverte v2.0.',
    // LEGITEXT identifiers are opaque 12-digit keys, so only known codes are
    // probed; there is no scannable range.
    candidates: () =>
      [
        '000006071194', // Constitution du 4 octobre 1958
        '000006070721', // Code civil
        '000006070719', // Code pénal
        '000006070716', // Code de procédure civile
        '000006071154', // Code de procédure pénale
        '000006072050', // Code du travail
        '000005634379', // Code de commerce
        '000006069414', // Code général des impôts
        '000006069577',
        '000006074228', // Code de la route
        '000006072665', // Code de la santé publique
        '000006071191', // Code de l'éducation
        '000006074220', // Code de l'environnement
        '000006073189', // Code de la sécurité sociale
        '000006069565', // Code de la consommation
        '000006072026', // Code monétaire et financier
        '000006074075', // Code de l'urbanisme
        '000006070633', // Code général des collectivités territoriales
        '000006073984', // Code des assurances
        '000006071367', // Code rural
        '000006070933', // Code de justice administrative
        '000006074096', // Code de la propriété intellectuelle
        '000006070239', // Code de l'action sociale et des familles
        '000006071307', // Code des transports
        '000006072637',
      ].map(id => `fr/LEGITEXT${id}.md`),
  },
  {
    cc: 'it',
    name: 'Italy',
    institution: 'Istituto Poligrafico e Zecca dello Stato — Normattiva / Gazzetta Ufficiale',
    licence: 'Public domain (Normattiva official texts)',
    attribution: 'Normattiva — Istituto Poligrafico e Zecca dello Stato, Gazzetta Ufficiale della Repubblica Italiana.',
    candidates: () =>
      scanYears(range(15, 25), yy => range(1, 200).map(n => `it/${pad(yy, 2)}G${pad(n, 5)}.md`)),
  },
  {
    cc: 'es',
    name: 'Spain',
    institution: 'Agencia Estatal Boletín Oficial del Estado (BOE)',
    licence: 'BOE open data reuse',
    attribution: 'Agencia Estatal Boletín Oficial del Estado (BOE) — https://www.boe.es.',
    candidates: () => {
      const seeds = [
        'es/BOE-A-1978-31229.md', // Constitución Española
        'es/BOE-A-1889-4763.md', // Código Civil
        'es/BOE-A-1995-25444.md', // Código Penal
        'es/BOE-A-1996-8930.md',
        'es/BOE-A-2015-11430.md',
        'es/BOE-A-2015-10565.md', // Ley 39/2015
        'es/BOE-A-2018-16673.md', // LOPDGDD
        'es/BOE-A-2000-323.md', // Ley de Enjuiciamiento Civil
      ];
      return interleave(seeds, ...seeds.map(s => neighbours(s, 90)));
    },
  },
  {
    cc: 'nl',
    name: 'Netherlands',
    institution: 'Ministerie van Justitie en Veiligheid — wetten.overheid.nl (Basis Wetten Bestand)',
    licence: 'Public domain (Auteurswet art. 11)',
    attribution: 'Basis Wetten Bestand — wetten.overheid.nl, Koninkrijk der Nederlanden.',
    candidates: () => range(1830, 16000).map(n => `nl/BWBR${pad(n, 7)}.md`),
  },
  {
    cc: 'pl',
    name: 'Poland',
    institution: 'Rządowe Centrum Legislacji — Dziennik Ustaw',
    licence: 'Public domain (ustawa o prawie autorskim art. 4)',
    attribution: 'Dziennik Ustaw Rzeczypospolitej Polskiej — Rządowe Centrum Legislacji.',
    candidates: () =>
      scanYears(range(2015, 2025), y => range(1, 260).map(n => `pl/DU-${y}-${n}.md`)),
  },
  {
    cc: 'cz',
    name: 'Czechia',
    institution: 'Ministerstvo vnitra — Sbírka zákonů',
    licence: 'Public domain (autorský zákon §3)',
    attribution: 'Sbírka zákonů České republiky — Ministerstvo vnitra ČR.',
    candidates: () =>
      scanYears(range(1992, 2025), y => range(1, 200).map(n => `cz/SB-${y}-${n}.md`)),
  },
  {
    cc: 'sk',
    name: 'Slovakia',
    institution: 'Ministerstvo spravodlivosti — Zbierka zákonov (Slov-Lex)',
    licence: 'Public domain (autorský zákon §5)',
    attribution: 'Zbierka zákonov Slovenskej republiky — Slov-Lex, Ministerstvo spravodlivosti SR.',
    candidates: () =>
      scanYears(range(1992, 2024), y => range(1, 200).map(n => `sk/ZZ-${y}-${n}.md`)),
  },
  {
    cc: 'gr',
    name: 'Greece',
    institution: 'Εθνικό Τυπογραφείο — Φύλλο Εφημερίδας της Κυβερνήσεως (ΦΕΚ)',
    licence: 'Public domain (official gazette)',
    attribution: 'Εθνικό Τυπογραφείο — Φύλλο Εφημερίδας της Κυβερνήσεως.',
    candidates: () =>
      scanYears(range(2010, 2024), y => range(1, 60).map(n => `gr/FEK-A-${n}-${y}.md`)),
  },
  {
    cc: 'se',
    name: 'Sweden',
    institution: 'Regeringskansliet — Svensk författningssamling (SFS)',
    licence: 'Public domain (upphovsrättslagen 9 §)',
    attribution: 'Svensk författningssamling — Regeringskansliet, Sverige.',
    candidates: () =>
      interleave(
        ['se/SFS-1962-700.md', 'se/SFS-1974-152.md', 'se/SFS-2011-1108.md'],
        scanYears(range(1990, 2025), y => range(1, 400).map(n => `se/SFS-${y}-${n}.md`)),
      ),
  },
  {
    cc: 'fi',
    name: 'Finland',
    institution: 'Oikeusministeriö — Finlex (Suomen säädöskokoelma)',
    licence: 'Public domain (tekijänoikeuslaki 9 §)',
    attribution: 'Finlex — Oikeusministeriö, Suomen säädöskokoelma.',
    candidates: () =>
      interleave(
        ['fi/1999-731.md'],
        scanYears(range(1990, 2025), y => range(1, 300).map(n => `fi/${y}-${n}.md`)),
      ),
  },
  {
    cc: 'no',
    name: 'Norway',
    institution: 'Lovdata / Justis- og beredskapsdepartementet',
    licence: 'Public domain (åndsverkloven §14)',
    attribution: 'Lovdata — Norges lover, Justis- og beredskapsdepartementet.',
    candidates: () => {
      const seeds = ['no/LOV-1814-05-17.md', 'no/LOV-2005-05-20-28.md', 'no/LOV-2023-06-09-26.md'];
      const scan = scanYears(range(2005, 2024), y =>
        ['06', '12'].flatMap(m =>
          range(1, 28).flatMap(d => range(1, 6).map(n => `no/LOV-${y}-${m}-${pad(d, 2)}-${n}.md`)),
        ),
      );
      return interleave(seeds, ...seeds.map(s => neighbours(s, 40)), scan);
    },
  },
  {
    cc: 'at',
    name: 'Austria',
    institution: 'Bundeskanzleramt — Rechtsinformationssystem des Bundes (RIS)',
    licence: 'Public domain (UrhG §7)',
    attribution: 'Rechtsinformationssystem des Bundes (RIS) — Bundeskanzleramt Österreich.',
    candidates: () => range(10000000, 10003400).map(n => `at/AT-${n}.md`),
  },
  {
    cc: 'ch',
    name: 'Switzerland',
    institution: 'Bundeskanzlei — Fedlex (Systematische Rechtssammlung)',
    licence: 'Public domain (URG Art. 5)',
    attribution: 'Fedlex — Schweizerische Bundeskanzlei, Systematische Rechtssammlung.',
    candidates: () => {
      const seeds = ['ch/cc-1999-404.md'];
      return interleave(
        seeds,
        ...seeds.map(s => neighbours(s, 120)),
        scanYears(range(1995, 2025), y => range(1, 120).map(n => `ch/cc-${y}-${n}.md`)),
      );
    },
  },
  {
    cc: 'be',
    name: 'Belgium',
    institution: 'Federale Overheidsdienst Justitie — Justel / Moniteur belge',
    licence: 'Public domain (official acts)',
    attribution: 'Justel — Federale Overheidsdienst Justitie / Service public fédéral Justice, Belgique.',
    candidates: () => {
      const seeds = ['be/1867060850.md', 'be/1994021048.md', 'be/2024000164.md'];
      return interleave(seeds, ...seeds.map(s => neighbours(s, 300)));
    },
  },
  {
    cc: 'pt',
    name: 'Portugal',
    institution: 'Imprensa Nacional-Casa da Moeda — Diário da República Eletrónico',
    licence: 'Public domain (Código do Direito de Autor art. 7)',
    attribution: 'Diário da República Eletrónico — Imprensa Nacional-Casa da Moeda, Portugal.',
    candidates: () =>
      scanYears(range(2010, 2024), y =>
        interleave(
          range(1, 60).map(n => `pt/DRE-L-${n}-${y}.md`),
          range(1, 120).map(n => `pt/DRE-DL-${n}-${y}.md`),
        ),
      ),
  },
  {
    cc: 'lu',
    name: 'Luxembourg',
    institution: 'Service central de législation — Légilux',
    licence: 'Public domain (official acts)',
    attribution: 'Légilux — Service central de législation, Grand-Duché de Luxembourg.',
    candidates: () => {
      const seeds = [
        'lu/leg-constitution-1868-10-17-n1.md',
        'lu/leg-loi-2022-05-27-a250.md',
        'lu/leg-rgd-2026-04-02-a185.md',
      ];
      return interleave(seeds, ...seeds.map(s => neighbours(s, 300)));
    },
  },
  {
    cc: 'li',
    name: 'Liechtenstein',
    institution: 'Regierung des Fürstentums Liechtenstein — Landesgesetzblatt',
    licence: 'Public domain (official acts)',
    attribution: 'Landesgesetzblatt — Fürstentum Liechtenstein.',
    candidates: () =>
      scanYears(range(1990, 2025), y => range(1, 120).map(n => `li/LGBl-${y}-${pad(n, 3)}.md`)),
  },
  {
    cc: 'ad',
    name: 'Andorra',
    institution: 'Consell General — Butlletí Oficial del Principat d’Andorra',
    licence: 'Public domain (official acts)',
    attribution: 'Butlletí Oficial del Principat d’Andorra — Consell General d’Andorra.',
    candidates: () =>
      interleave(
        ['ad/BOPA-C-1993.md'],
        scanYears(range(2010, 2025), y => range(1, 30).map(n => `ad/BOPA-L-${y}-${n}.md`)),
        scanYears(range(2015, 2025), y => range(1, 15).map(n => `ad/BOPA-LD-${y}-${n}.md`)),
      ),
  },
  {
    cc: 'lv',
    name: 'Latvia',
    institution: 'Valsts kanceleja — Likumi.lv (Latvijas Vēstnesis)',
    licence: 'Public domain (Autortiesību likums 6. pants)',
    attribution: 'Likumi.lv — Latvijas Vēstnesis, Latvijas Republika.',
    candidates: () => {
      const seeds = ['lv/225418.md', 'lv/57980.md', 'lv/68488.md'];
      return interleave(seeds, ...seeds.map(s => neighbours(s, 400)));
    },
  },
  {
    cc: 'ro',
    name: 'Romania',
    institution: 'Camera Deputaţilor — Legislaţia României',
    licence: 'Public domain (official acts)',
    maxDocBytes: 3_000_000,
    attribution: 'Legislaţia României — Camera Deputaţilor, România.',
    candidates: () => {
      // A full walk of RO-1..RO-1400 resolves this identifier and no other, so
      // the scan is a coarse stride rather than a dense range.
      const seeds = ['ro/RO-798.md'];
      return interleave(seeds, range(1, 400).map(n => `ro/RO-${n * 53}.md`));
    },
  },
  {
    cc: 'ar',
    name: 'Argentina',
    institution: 'Ministerio de Justicia — InfoLEG / Boletín Oficial',
    licence: 'Public domain (Ley 11.723 art. 8)',
    attribution: 'InfoLEG — Ministerio de Justicia de la Nación, República Argentina.',
    candidates: () =>
      interleave(
        ['ar/LEY-19550.md', 'ar/LEY-26994.md', 'ar/DNU-70-2023.md', 'ar/DEC-222-2003.md'],
        range(20000, 27600).map(n => `ar/LEY-${n}.md`),
      ),
  },
  {
    cc: 'co',
    name: 'Colombia',
    institution: 'Congreso de la República / Función Pública — SUIN-Juriscol',
    licence: 'Public domain (Ley 23 de 1982 art. 41)',
    attribution: 'SUIN-Juriscol — Ministerio de Justicia y del Derecho, República de Colombia.',
    candidates: () =>
      interleave(
        ['co/LEY-57-1887.md', 'co/DECRETO-453-1981.md'],
        scanYears(range(2005, 2022), y => range(1000, 2400).map(n => `co/LEY-${n}-${y}.md`)),
        scanYears(range(1980, 2020), y => range(1, 2000).map(n => `co/DECRETO-${n}-${y}.md`)),
      ),
  },
  {
    cc: 'cl',
    name: 'Chile',
    institution: 'Biblioteca del Congreso Nacional — LeyChile',
    licence: 'Public domain (Ley 17.336 art. 71 Q)',
    attribution: 'LeyChile — Biblioteca del Congreso Nacional de Chile.',
    candidates: () => {
      const seeds = ['cl/CL-1138479.md', 'cl/CL-242302.md', 'cl/CL-258831.md', 'cl/CL-6374.md'];
      return interleave(seeds, ...seeds.map(s => neighbours(s, 400)));
    },
  },
  {
    cc: 'uy',
    name: 'Uruguay',
    institution: 'IMPO — Dirección Nacional de Impresiones y Publicaciones Oficiales',
    licence: 'Public domain (official acts)',
    attribution: 'IMPO — Centro de Información Oficial, República Oriental del Uruguay.',
    candidates: () =>
      interleave(
        [
          'uy/UY-constitucion-1967.md',
          'uy/UY-codigo-civil-16603.md',
          'uy/UY-codigo-tributario-14306.md',
          'uy/UY-ley-18331.md',
          'uy/UY-ley-19996.md',
        ],
        range(15000, 20600).map(n => `uy/UY-ley-${n}.md`),
      ),
  },
];

// ------------------------------------------------------------- world section

async function fetchJurisdiction(j) {
  const outDir = path.join(BASE_DIR, 'world-legislation', j.cc);
  fs.mkdirSync(outDir, { recursive: true });

  // Consolidated codes (France, Romania) exist only as very large documents;
  // the default ceiling would exclude those jurisdictions entirely.
  const maxDoc = j.maxDocBytes ?? MAX_DOC_BYTES;
  const maxTotal = j.maxBytes ?? PER_JURISDICTION_BYTES;
  const candidates = j.candidates().slice(0, PROBE_BUDGET);
  const kept = [];
  let probed = 0;
  let oversize = 0;
  let tooShort = 0;
  let bytes = 0;
  const done = () => kept.length >= PER_JURISDICTION || bytes >= maxTotal;

  for (let i = 0; i < candidates.length && !done(); i += 120) {
    const batch = candidates.slice(i, i + 120);
    probed += batch.length;
    const results = await mapPool(batch, CONCURRENCY, async rel => {
      const res = await getBounded(`${RAW}/legalize-dev/legalize-${j.cc}/main/${rel}`, maxDoc);
      if (!res) return null;
      if (res.oversize) return { oversize: true };
      return { rel, text: renameFootnoteKeys(res.text) };
    });

    for (const r of results) {
      if (!r) continue;
      if (r.oversize) { oversize++; continue; }
      if (done()) break;
      const words = wordsIn(r.text, r.rel);
      // The mirrors carry a few frontmatter-only stubs where the publisher's
      // body never populated; the floor is what catches them.
      if (words < MIN_WORDS) { tooShort++; continue; }

      const fm = parseFrontmatter(r.text);
      const file = path.join(outDir, path.basename(r.rel));
      fs.writeFileSync(file, r.text, 'utf8');
      bytes += r.text.length;
      kept.push({
        title: fm.title || path.basename(r.rel, '.md'),
        identifier: fm.identifier || path.basename(r.rel, '.md'),
        rank: fm.rank || '',
        publication_date: fm.publication_date || '',
        status: fm.status || '',
        source: fm.source || '',
        file: path.relative(ROOT, file),
        words,
        chars: r.text.length,
      });
    }
  }

  console.log(
    `  ${j.cc.padEnd(3)} ${String(kept.length).padStart(3)} kept  ` +
      `${String(Math.round(bytes / 1024)).padStart(5)} KB  ` +
      `(${probed} probed, ${tooShort} under ${MIN_WORDS}w, ${oversize} oversize)  ${j.name}`,
  );
  return { ...meta(j), documents: kept };
}

function meta(j) {
  return {
    jurisdiction: j.name,
    code: j.cc,
    institution: j.institution,
    licence: j.licence,
    attribution: j.attribution,
    mirror: `https://github.com/legalize-dev/legalize-${j.cc}`,
  };
}

/**
 * legislation.gov.uk's editorial notes are carried as Markdown footnotes whose
 * labels are `key-` followed by a 32-character hex digest. That is byte for
 * byte the shape of a Mailgun API key, so GitHub's push protection rejects any
 * commit containing one — 1,494 of them across the UK statutes. Renaming the
 * prefix to `note-` keeps the digest (the mirror's stable note identifier) and
 * keeps every reference matched to its definition, while no longer looking like
 * a credential.
 */
function renameFootnoteKeys(text) {
  return text.replace(/\[\^key-([0-9a-f]{32})\]/g, '[^note-$1]');
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*"?(.*?)"?\s*$/i);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

// ------------------------------------------------------------------ UN UDHR

async function fetchUDHR() {
  console.log('\n--- Universal Declaration of Human Rights (OHCHR) ---');
  const outDir = path.join(BASE_DIR, 'un-udhr');
  fs.mkdirSync(outDir, { recursive: true });

  const index = await get(`${RAW}/wooorm/udhr/main/index.js`);
  if (!index) {
    console.log('  index unavailable');
    return { documents: [] };
  }
  // The index is a JS module; the records are flat object literals.
  const entries = [];
  const re = /\{\s*bcp47:\s*'([^']+)',\s*code:\s*'([^']+)',[\s\S]*?name:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(index))) entries.push({ bcp47: m[1], code: m[2], name: m[3].replace(/\\'/g, "'") });
  console.log(`  ${entries.length} encoded languages`);

  const docs = await mapPool(entries, CONCURRENCY, async e => {
    const html = await get(`${RAW}/wooorm/udhr/main/declaration/${e.code}.html`);
    if (!html) return null;
    const text = htmlToText(html);
    const words = wordsIn(text);
    if (words < MIN_WORDS) return { short: true };
    const header =
      `Universal Declaration of Human Rights\n` +
      `Language: ${e.name} (${e.bcp47})\n` +
      `Adopted: UN General Assembly resolution 217 A (III), Paris, 10 December 1948\n` +
      `Publisher: Office of the United Nations High Commissioner for Human Rights (OHCHR)\n\n`;
    const file = path.join(outDir, `udhr-${e.code}.txt`);
    fs.writeFileSync(file, header + text, 'utf8');
    return {
      language: e.name,
      bcp47: e.bcp47,
      code: e.code,
      file: path.relative(ROOT, file),
      words,
      chars: text.length,
    };
  });

  const kept = docs.filter(d => d && !d.short);
  const short = docs.filter(d => d && d.short).length;
  console.log(`  kept ${kept.length}, ${short} below the ${MIN_WORDS}-word floor`);
  return {
    instrument: 'Universal Declaration of Human Rights',
    institution: 'United Nations General Assembly / OHCHR',
    licence: 'Public domain (UN General Assembly resolution 217 A (III))',
    attribution: 'Universal Declaration of Human Rights, Office of the UN High Commissioner for Human Rights. Unicode encodings via github.com/wooorm/udhr.',
    documents: kept,
  };
}

function htmlToText(html) {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, '')
    .replace(/<\/(h1|h2|h3|p|article|header|div)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// ------------------------------------------------------------ World Factbook

const FACTBOOK_REGIONS = [
  'africa', 'antarctica', 'australia-oceania', 'central-america-n-caribbean',
  'central-asia', 'east-n-southeast-asia', 'europe', 'middle-east',
  'north-america', 'oceans', 'south-america', 'south-asia', 'world',
];

async function fetchFactbook() {
  console.log('\n--- CIA World Factbook country profiles ---');
  const outDir = path.join(BASE_DIR, 'world-factbook');
  fs.mkdirSync(outDir, { recursive: true });

  // No directory index is published, so the two-letter GEC code space is walked
  // in full. Misses are 404s and cost one HEAD each.
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const candidates = [];
  for (const region of FACTBOOK_REGIONS) {
    for (const a of letters) for (const b of letters) candidates.push(`${region}/${a}${b}.json`);
  }

  const docs = await mapPool(candidates, 24, async rel => {
    const res = await getBounded(`${RAW}/factbook/factbook.json/master/${rel}`, 1_500_000);
    if (!res || res.oversize) return null;
    let data;
    try {
      data = JSON.parse(res.text);
    } catch {
      return null;
    }
    const [region, base] = rel.split('/');
    const code = base.replace('.json', '');
    const text = factbookToText(data, { region, code });
    const words = wordsIn(text);
    if (words < MIN_WORDS) return null;
    const file = path.join(outDir, `${region}_${code}.txt`);
    fs.writeFileSync(file, text, 'utf8');
    return {
      name: data?.Government?.['Country name']?.['conventional short form']?.text || code.toUpperCase(),
      gec_code: code,
      region,
      file: path.relative(ROOT, file),
      words,
      chars: text.length,
    };
  });

  const kept = docs.filter(Boolean);
  console.log(`  kept ${kept.length} profiles (${candidates.length} identifiers probed)`);
  return {
    publication: 'The World Factbook',
    institution: 'Central Intelligence Agency (United States)',
    licence: 'Public domain (US federal work)',
    attribution: 'The World Factbook, Central Intelligence Agency. JSON conversion via github.com/factbook/factbook.json.',
    documents: kept,
  };
}

/** Render a Factbook profile as headed prose rather than nested JSON. */
function factbookToText(data, { region, code }) {
  const name =
    data?.Government?.['Country name']?.['conventional short form']?.text ||
    data?.Government?.['Country name']?.['conventional long form']?.text ||
    code.toUpperCase();
  const lines = [
    `The World Factbook — ${name}`,
    `Region: ${region}`,
    `GEC code: ${code}`,
    `Publisher: Central Intelligence Agency (public domain)`,
    '',
  ];

  const walk = (node, depth) => {
    if (node == null) return;
    if (typeof node !== 'object') {
      lines.push(`${'  '.repeat(Math.max(0, depth - 1))}${node}`);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'text' && typeof value === 'string') {
        lines.push(`${'  '.repeat(Math.max(0, depth - 1))}${value}`);
        continue;
      }
      if (depth <= 2) lines.push('', `${'#'.repeat(Math.min(depth + 1, 6))} ${key}`);
      else lines.push(`${'  '.repeat(depth - 2)}${key}:`);
      walk(value, depth + 1);
    }
  };
  walk(data, 1);

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ------------------------------------------------------------------ assembly

/**
 * Several of these publishers licence their texts for reuse on condition of
 * attribution, so the attribution notice is generated from the manifest rather
 * than maintained by hand — it cannot drift out of step with what was fetched.
 */
function writeAttribution(manifest) {
  const out = [
    '# Attribution and rights — 06-government-legal',
    '',
    'This directory holds official documents published by government and',
    'intergovernmental institutions. Most are outside copyright as official',
    'works; the remainder are published under open licences that require',
    'attribution. The notice required by each publisher is reproduced below.',
    '',
    'Generated by `scripts/fetch-world-government.mjs`; do not edit by hand.',
    '',
    '## National and supranational legislation',
    '',
    '| Jurisdiction | Documents | Publishing institution | Licence |',
    '|---|---:|---|---|',
  ];
  for (const j of manifest.sections.world_legislation ?? []) {
    out.push(`| ${j.jurisdiction} | ${j.documents.length} | ${j.institution} | ${j.licence} |`);
  }
  out.push('', '### Required notices', '');
  for (const j of manifest.sections.world_legislation ?? []) {
    if (!j.documents.length) continue;
    out.push(`**${j.jurisdiction}** — ${j.attribution}`, '');
  }
  for (const key of ['un_udhr', 'world_factbook']) {
    const s = manifest.sections[key];
    if (!s?.documents?.length) continue;
    out.push(
      `## ${s.instrument || s.publication}`,
      '',
      `- Institution: ${s.institution}`,
      `- Documents: ${s.documents.length}`,
      `- Licence: ${s.licence}`,
      `- Notice: ${s.attribution}`,
      '',
    );
  }
  out.push(
    '## Conversion note',
    '',
    'Legislation texts are read from the legalize.dev mirrors, which convert each',
    'publisher’s official XML or HTML feed to Markdown. Converted text is not the',
    'authentic legal instrument: only the version published by the issuing',
    'institution in its official gazette is authoritative.',
    '',
  );
  fs.writeFileSync(path.join(BASE_DIR, 'ATTRIBUTION.md'), out.join('\n'), 'utf8');
}

async function main() {
  console.log('=== World Government & Legal Corpus Fetcher ===');
  console.log(`Minimum ${MIN_WORDS} words per document; max ${MAX_DOC_BYTES} bytes.\n`);
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });

  const only = process.argv.includes('--only')
    ? process.argv[process.argv.indexOf('--only') + 1].split(',')
    : null;
  const jurisdictionFilter = process.argv.includes('--jurisdictions')
    ? new Set(process.argv[process.argv.indexOf('--jurisdictions') + 1].split(','))
    : null;

  // A filtered run refreshes part of the corpus, so it merges into the existing
  // manifest rather than replacing it with a partial one.
  const filtered = Boolean(only || jurisdictionFilter);
  const previous = filtered && fs.existsSync(MANIFEST_FILE)
    ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
    : null;

  const manifest = {
    source: 'World Government & Legal',
    fetched_at: new Date().toISOString(),
    min_words: MIN_WORDS,
    max_doc_bytes: MAX_DOC_BYTES,
    sections: previous?.sections ?? {},
  };

  if (!only || only.includes('legislation')) {
    console.log('--- National legislation ---');
    const existing = new Map(
      (manifest.sections.world_legislation ?? []).map(entry => [entry.code, entry]),
    );
    for (const j of JURISDICTIONS) {
      if (jurisdictionFilter && !jurisdictionFilter.has(j.cc)) continue;
      existing.set(j.cc, await fetchJurisdiction(j));
    }
    // Keep the declared jurisdiction order regardless of what this run touched.
    manifest.sections.world_legislation = JURISDICTIONS.map(j => existing.get(j.cc)).filter(Boolean);
  }
  if (!only || only.includes('udhr')) manifest.sections.un_udhr = await fetchUDHR();
  if (!only || only.includes('factbook')) manifest.sections.world_factbook = await fetchFactbook();

  const counts = {
    world_legislation:
      manifest.sections.world_legislation?.reduce((n, j) => n + j.documents.length, 0) ?? 0,
    un_udhr: manifest.sections.un_udhr?.documents.length ?? 0,
    world_factbook: manifest.sections.world_factbook?.documents.length ?? 0,
  };
  manifest.totals = { ...counts, all: Object.values(counts).reduce((a, b) => a + b, 0) };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  writeAttribution(manifest);
  console.log(`\n=== Done: ${manifest.totals.all} documents ===`);
  console.log(`  national legislation: ${counts.world_legislation}`);
  console.log(`  UDHR translations:    ${counts.un_udhr}`);
  console.log(`  Factbook profiles:    ${counts.world_factbook}`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_FILE)}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
