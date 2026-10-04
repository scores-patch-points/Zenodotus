#!/usr/bin/env node
// Demo: exercise priors-similarity.js against real data
// Usage: node scripts/demo-similarity.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  compressionDistance,
  scorePhasepostAxis,
  scoreSurpriseAxis,
  scoreEntityAxis,
  fuseSimilarity,
  loadCorefLibrary,
  loadCorpusPrior,
  buildPhasepostLibrary,
} from '../src/priors-similarity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRIORS_DIR = path.join(__dirname, '..', '..', 'eoPriors', 'priors');

// ─── Helper: extract a real book's 27-cell distribution from the cube ────

function loadBookDistribution(cubePath, bookIndex) {
  const cube = JSON.parse(fs.readFileSync(cubePath, 'utf8'));
  const book = cube.generated_from?.per_book?.[bookIndex];
  if (!book?.distribution_ppm) return null;

  // Convert distribution_ppm (single value per cell) to measurement shape
  const measurements = {};
  for (const [cell, ampPpm] of Object.entries(book.distribution_ppm)) {
    measurements[cell] = {
      similarity_ppm: ampPpm,
      amplitude_ppm: ampPpm,
    };
  }
  return { measurements, label: book.file || `book-${bookIndex}` };
}

// ─── Demo 1: Asymmetric Compression with Real Data ────────────────────────

function demoAsymmetricCompression() {
  console.log('\n=== Demo 1: Asymmetric Compression (Real 27-Cell Data) ===\n');

  const cubePath = path.join(PRIORS_DIR, 'corpus-prior-cube.json');
  if (!fs.existsSync(cubePath)) {
    console.log('No corpus-prior-cube.json found');
    return;
  }

  // Load two real books with very different structural signatures
  const bookA = loadBookDistribution(cubePath, 0);   // chunqiu (Chinese classic)
  const bookB = loadBookDistribution(cubePath, 50);  // some Gutenberg text
  const bookC = loadBookDistribution(cubePath, 100); // another text

  if (!bookA || !bookB) {
    console.log('Could not load book distributions');
    return;
  }

  console.log(`Book A: ${bookA.label}`);
  console.log(`Book B: ${bookB.label}`);
  if (bookC) console.log(`Book C: ${bookC.label}`);

  // Find the dominant cells for each book
  function topCells(measurements, n = 5) {
    return Object.entries(measurements)
      .sort((a, b) => b[1].amplitude_ppm - a[1].amplitude_ppm)
      .slice(0, n)
      .map(([cell, m]) => `${cell}: ${(m.amplitude_ppm / 10000).toFixed(1)}%`);
  }

  console.log(`\nBook A top cells: ${topCells(bookA.measurements).join(', ')}`);
  console.log(`Book B top cells: ${topCells(bookB.measurements).join(', ')}`);
  if (bookC) console.log(`Book C top cells: ${topCells(bookC.measurements).join(', ')}`);

  // Compute bidirectional compression
  console.log('\n--- Bidirectional Compression Distances ---\n');

  const distAB = compressionDistance(bookA.measurements, bookB.measurements);
  console.log(`Book A vs Book B:`);
  console.log(`  Forward  (B→A): ${distAB.forwardBits.toFixed(4)} bits  — how well B's structure predicts A`);
  console.log(`  Backward (A→B): ${distAB.backwardBits.toFixed(4)} bits  — how well A's structure explains B`);
  console.log(`  Symmetric:      ${distAB.symmetricBits.toFixed(4)} bits`);
  console.log(`  Asymmetry:      ${distAB.asymmetry.toFixed(4)} bits  (${distAB.interpretation})`);
  console.log(`  KL(A||B):       ${distAB.klContentToPrior.toFixed(4)} bits`);
  console.log(`  KL(B||A):       ${distAB.klPriorToContent.toFixed(4)} bits`);

  if (bookC) {
    const distAC = compressionDistance(bookA.measurements, bookC.measurements);
    const distBC = compressionDistance(bookB.measurements, bookC.measurements);

    console.log(`\nBook A vs Book C:`);
    console.log(`  Forward  (C→A): ${distAC.forwardBits.toFixed(4)} bits`);
    console.log(`  Backward (A→C): ${distAC.backwardBits.toFixed(4)} bits`);
    console.log(`  Symmetric:      ${distAC.symmetricBits.toFixed(4)} bits`);
    console.log(`  Asymmetry:      ${distAC.asymmetry.toFixed(4)} bits  (${distAC.interpretation})`);

    console.log(`\nBook B vs Book C:`);
    console.log(`  Forward  (C→B): ${distBC.forwardBits.toFixed(4)} bits`);
    console.log(`  Backward (B→C): ${distBC.backwardBits.toFixed(4)} bits`);
    console.log(`  Symmetric:      ${distBC.symmetricBits.toFixed(4)} bits`);
    console.log(`  Asymmetry:      ${distBC.asymmetry.toFixed(4)} bits  (${distBC.interpretation})`);
  }

  // Score Book A against the lens-fold clusters
  console.log('\n--- Book A vs Lens-Fold Clusters ---\n');
  const phasepostLibrary = buildPhasepostLibrary(PRIORS_DIR);
  const scores = scorePhasepostAxis(bookA.measurements, phasepostLibrary);

  for (const s of scores.slice(0, 5)) {
    console.log(`  ${s.label}`);
    console.log(`    Symmetric: ${s.symmetricBits.toFixed(4)} bits, Asymmetry: ${s.asymmetry.toFixed(4)} (${s.interpretation})`);
  }
}

// ─── Demo 2: Real Corpus Prior KL ─────────────────────────────────────────

function demoSurpriseAxis() {
  console.log('\n\n=== Demo 2: Surprise Axis (KL from Corpus Prior) ===\n');

  const corpusPrior = loadCorpusPrior(PRIORS_DIR);
  if (!corpusPrior) {
    console.log('No corpus-prior.json found at:', PRIORS_DIR);
    return;
  }

  console.log('Corpus prior aggregate:');
  console.log(`  Mean forward surprise: ${corpusPrior.prior.forwardSurprise.meanAcrossTexts}`);
  console.log(`  Std:                   ${corpusPrior.prior.forwardSurprise.stdAcrossTexts}`);
  console.log(`  Aggregate bins:        low=${corpusPrior.prior.aggregateBins.lowFrac}, mid=${corpusPrior.prior.aggregateBins.midFrac}, high=${corpusPrior.prior.aggregateBins.highFrac}`);

  // Test against actual texts from the corpus prior
  const sampleTexts = corpusPrior.texts.slice(0, 8);

  console.log('\nKL divergence for sample texts:');
  for (const text of sampleTexts) {
    const result = scoreSurpriseAxis(
      { bins: text.bins, mean: text.mean, std: text.std },
      corpusPrior,
    );
    const label = text.label.length > 55 ? text.label.substring(0, 55) + '…' : text.label;
    console.log(`  ${label}`);
    console.log(`    KL=${result.klBits.toFixed(3)} bits, z=${result.zScore?.toFixed(2) || 'N/A'}, ${result.interpretation}`);
  }
}

// ─── Demo 3: Entity Overlap ───────────────────────────────────────────────

function demoEntityAxis() {
  console.log('\n\n=== Demo 3: Entity Axis (Coref Surface Overlap) ===\n');

  const corefLibrary = loadCorefLibrary(PRIORS_DIR);
  const corefIds = Object.keys(corefLibrary);

  if (corefIds.length === 0) {
    console.log('No coref priors found');
    return;
  }

  console.log(`Loaded ${corefIds.length} coref priors:`);
  for (const id of corefIds) {
    const coref = corefLibrary[id].coref;
    const surfaceCount = coref.referents?.reduce((s, r) => s + (r.surfaces?.length || 0), 0) || 0;
    const refCount = coref.referents?.length || 0;
    console.log(`  ${corefLibrary[id].label}: ${refCount} referents, ${surfaceCount} surfaces`);
  }

  // Simulate content about Frankenstein's creature
  const frankensteinContent = `The creature opened his eyes and beheld the world for the first time. He was a wretch, a monster, abandoned by his creator Victor Frankenstein. The being wandered alone through the wilderness, learning to speak and read, but his deformity ensured he would never be loved.`;

  // Simulate content about Pride and Prejudice
  const prideContent = `Elizabeth Bennet walked through the grounds of Pemberley, reflecting on how her prejudice against Mr. Darcy had blinded her. The gentleman's estate was magnificent. Her sister Jane would approve, though the proud Mr. Darcy had once insulted her at the Meryton assembly.`;

  console.log('\n--- Frankenstein passage vs coref priors ---');
  const frankScores = scoreEntityAxis(frankensteinContent, corefLibrary);
  for (const s of frankScores.slice(0, 4)) {
    console.log(`  ${s.label}: Jaccard=${s.jaccard.toFixed(4)}, ${s.overlapCount} overlaps (${s.interpretation})`);
    if (s.overlap.length > 0) console.log(`    Overlapping: ${s.overlap.join(', ')}`);
  }

  console.log('\n--- Pride and Prejudice passage vs coref priors ---');
  const prideScores = scoreEntityAxis(prideContent, corefLibrary);
  for (const s of prideScores.slice(0, 4)) {
    console.log(`  ${s.label}: Jaccard=${s.jaccard.toFixed(4)}, ${s.overlapCount} overlaps (${s.interpretation})`);
    if (s.overlap.length > 0) console.log(`    Overlapping: ${s.overlap.join(', ')}`);
  }

  // Demonstrate the asymmetry insight: same entities, different structure
  console.log('\n--- Key insight: entity match ≠ structural match ---');
  console.log('A passage about "the creature" and "Victor" matches Frankenstein\'s coref prior');
  console.log('But if written in a definitional style (high DEF/SIG amplitude), it would be');
  console.log('structurally distant from Frankenstein\'s connective/narrative phasepost profile.');
  console.log('This is why we need BOTH axes — entity tells you WHO, phasepost tells you HOW.');
}

// ─── Demo 4: Fusion ───────────────────────────────────────────────────────

function demoFusion() {
  console.log('\n\n=== Demo 4: Multi-Dimensional Fusion ===\n');

  const cubePath = path.join(PRIORS_DIR, 'corpus-prior-cube.json');
  const bookA = loadBookDistribution(cubePath, 0);

  const phasepostLibrary = buildPhasepostLibrary(PRIORS_DIR);
  const corefLibrary = loadCorefLibrary(PRIORS_DIR);
  const corpusPrior = loadCorpusPrior(PRIORS_DIR);

  if (!bookA) {
    console.log('Could not load book distribution for fusion demo');
    return;
  }

  // Build a content profile from a real book
  const contentMeasurements = bookA.measurements;
  const contentText = `The chronicle records the events of the season, noting the movements of armies and the decisions of rulers.`;
  const contentStats = {
    bins: { veryLow: 5, low: 20, mid: 40, high: 25, veryHigh: 10 },
    mean: 12.0,
  };

  const phasepostScores = scorePhasepostAxis(contentMeasurements, phasepostLibrary);
  const entityScores = scoreEntityAxis(contentText, corefLibrary);
  const surpriseScore = corpusPrior ? scoreSurpriseAxis(contentStats, corpusPrior) : null;

  // Fuse with different weightings
  const weightings = [
    { name: 'Balanced', phasepost: 0.4, surprise: 0.3, entity: 0.3 },
    { name: 'Retrieval-focused', phasepost: 0.2, surprise: 0.2, entity: 0.6 },
    { name: 'Classification-focused', phasepost: 0.7, surprise: 0.2, entity: 0.1 },
    { name: 'Novelty-focused', phasepost: 0.2, surprise: 0.6, entity: 0.2 },
  ];

  console.log(`Content: ${bookA.label}`);
  console.log(`Phasepost top cells: ${Object.entries(contentMeasurements)
    .sort((a, b) => b[1].amplitude_ppm - a[1].amplitude_ppm)
    .slice(0, 3)
    .map(([c, m]) => `${c}: ${(m.amplitude_ppm / 10000).toFixed(1)}%`)
    .join(', ')}`);

  for (const w of weightings) {
    const fused = fuseSimilarity(
      { phasepost: phasepostScores, surprise: surpriseScore, entity: entityScores },
      { phasepost: w.phasepost, surprise: w.surprise, entity: w.entity },
    );

    console.log(`\n--- ${w.name} (phasepost=${w.phasepost}, surprise=${w.surprise}, entity=${w.entity}) ---`);
    for (const r of fused.slice(0, 3)) {
      console.log(`  ${r.priorId}: fused=${r.fused.toFixed(3)}`);
      if (r.similarity.phasepost) {
        console.log(`    Phasepost: ${r.similarity.phasepost.symmetricBits.toFixed(2)} bits, ${r.similarity.phasepost.interpretation}`);
      }
      if (r.similarity.entity?.jaccard > 0) {
        console.log(`    Entity:    Jaccard=${r.similarity.entity.jaccard.toFixed(3)}`);
      }
    }
  }
}

// ─── Run All Demos ────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  live_priors — Multi-Dimensional Similarity Demo   ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log(`\nPriors directory: ${PRIORS_DIR}`);
console.log(`Exists: ${fs.existsSync(PRIORS_DIR)}`);

demoAsymmetricCompression();
demoSurpriseAxis();
demoEntityAxis();
demoFusion();

console.log('\n\n=== Key Takeaways ===\n');
console.log('1. Compression is ASYMMETRIC: DL(content|prior) ≠ DL(prior|content)');
console.log('   - Forward < Backward → content is an instance of the prior (familiar)');
console.log('   - Backward < Forward → content reveals the prior\'s structure (revelatory)');
console.log('   - Cosine is symmetric and loses this distinction entirely');
console.log('');
console.log('2. KL from corpus prior tells you if content carries NEW SIGNAL');
console.log('   - Low KL = expected, matches the corpus norm');
console.log('   - High KL = novel, worth ingesting');
console.log('');
console.log('3. Entity overlap (Jaccard) finds shared REFERENTS independent of structure');
console.log('   - Same entities, different structure → new configuration of known actors');
console.log('   - Different entities, same structure → same pattern, different cast');
console.log('');
console.log('4. Fusion combines all three with configurable weights per task');
console.log('   - Retrieval: weight entity higher');
console.log('   - Classification: weight phasepost higher');
console.log('   - Novelty detection: weight surprise higher');
