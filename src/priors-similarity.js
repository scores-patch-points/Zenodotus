// src/priors-similarity.js — Multi-dimensional prior navigation
//
// Three orthogonal axes:
//   1. Phasepost (asymmetric compression in 27-cell space)
//   2. Surprise (KL divergence from corpus prior)
//   3. Entity (surface-form Jaccard overlap from coref priors)
//
// Key insight: compression is asymmetric, cosine is not.
//   - Prior → Content: "this content is an instance of what the prior knows"
//   - Content → Prior: "this content reveals the structure the prior gestured at"
// The asymmetry = DL(prior|content) - DL(content|prior) is the signal cosine loses.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PPM = 1_000_000;

// ─── Axis 1: Phasepost (Asymmetric Compression) ───────────────────────────

/**
 * Compute the description length (in bits) of a distribution q when
 * encoded using the code optimized for distribution p.
 *
 * DL(q || p) = -sum(q_i * log2(p_i + eps))
 *
 * This is the cross-entropy H(q, p). The KL divergence is:
 *   KL(q || p) = H(q, p) - H(q) = DL(q || p) - DL(q || q)
 *
 * Accepts distributions in two formats:
 *   - Raw probabilities (0-1 range): used directly
 *   - PPM values (0-1000000): divided by PPM first
 *   - { amplitude_ppm } objects: extracted and divided by PPM
 *
 * For the phasepost axis we use the full bidirectional pair:
 *   forward  = DL(content_amplitudes || prior_amplitudes)
 *   backward = DL(prior_amplitudes || content_amplitudes)
 *
 * forward < backward  → content is "expected by" the prior (familiar)
 * backward < forward  → content "explains" the prior (retroactive sense-making)
 */
export function descriptionLength(qDist, pDist) {
  const eps = 1e-12; // absolute continuity floor
  let dl = 0;
  const keys = Object.keys(qDist);
  for (const k of keys) {
    const qVal = qDist[k];
    const pVal = pDist[k];
    // Detect format: raw probability (0-1), PPM (0-1000000), or { amplitude_ppm }
    const toProb = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') {
        // If value > 1, treat as PPM and normalize
        return v > 1 ? v / PPM : v;
      }
      if (typeof v === 'object') {
        const amp = v.amplitude_ppm || 0;
        return amp > 1 ? amp / PPM : amp;
      }
      return 0;
    };
    const q = toProb(qVal);
    const p = toProb(pVal);
    if (q > 0) {
      dl += -q * Math.log2(p + eps);
    }
  }
  return dl;
}

/**
 * Bidirectional compression distance between two phasepost measurement vectors.
 *
 * Each vector is { [cellKey]: { similarity_ppm, amplitude_ppm } }
 *
 * Returns:
 *   {
 *     forwardBits: DL(content || prior),      // how well prior predicts content
 *     backwardBits: DL(prior || content),      // how well content explains prior
 *     symmetricBits: (forward + backward) / 2, // overall compression distance
 *     asymmetry: backward - forward,           // >0 means content is familiar to prior
 *     klContentToPrior: KL(content || prior),  // extra bits using prior's code
 *     klPriorToContent: KL(prior || content),  // extra bits using content's code
 *   }
 */
export function compressionDistance(contentMeasurements, priorMeasurements) {
  // Extract amplitude distributions — handle both formats:
  //   { [cell]: { similarity_ppm, amplitude_ppm } }  (from compress.js/fold.js)
  //   { [cell]: number }                              (raw distribution_ppm from cube)
  const getAmp = (m) => {
    if (typeof m === 'number') return m;
    if (m && typeof m === 'object') return m.amplitude_ppm || 0;
    return 0;
  };

  const contentAmp = {};
  const priorAmp = {};
  const allCells = new Set([
    ...Object.keys(contentMeasurements),
    ...Object.keys(priorMeasurements),
  ]);

  let contentTotal = 0;
  let priorTotal = 0;

  for (const cell of allCells) {
    const cAmp = getAmp(contentMeasurements[cell]);
    const pAmp = getAmp(priorMeasurements[cell]);
    contentAmp[cell] = cAmp;
    priorAmp[cell] = pAmp;
    contentTotal += cAmp;
    priorTotal += pAmp;
  }

  // Normalize to probability distributions
  const contentProb = {};
  const priorProb = {};
  for (const cell of allCells) {
    contentProb[cell] = contentTotal > 0 ? contentAmp[cell] / contentTotal : 1 / allCells.size;
    priorProb[cell] = priorTotal > 0 ? priorAmp[cell] / priorTotal : 1 / allCells.size;
  }

  // Cross-entropies (description lengths)
  const forwardBits = descriptionLength(contentProb, priorProb);
  const backwardBits = descriptionLength(priorProb, contentProb);

  // Self-entropies (for KL computation)
  const hContent = descriptionLength(contentProb, contentProb);
  const hPrior = descriptionLength(priorProb, priorProb);

  // KL divergences
  const klContentToPrior = forwardBits - hContent;
  const klPriorToContent = backwardBits - hPrior;

  return {
    forwardBits: Math.round(forwardBits * 1e6) / 1e6,
    backwardBits: Math.round(backwardBits * 1e6) / 1e6,
    symmetricBits: Math.round(((forwardBits + backwardBits) / 2) * 1e6) / 1e6,
    asymmetry: Math.round((backwardBits - forwardBits) * 1e6) / 1e6,
    klContentToPrior: Math.max(0, Math.round(klContentToPrior * 1e6) / 1e6),
    klPriorToContent: Math.max(0, Math.round(klPriorToContent * 1e6) / 1e6),
    // Interpretation of the asymmetry direction
    interpretation: backwardBits - forwardBits > 1
      ? 'content-explains-prior'   // content reveals structure the prior gestured at
      : forwardBits - backwardBits > 1
        ? 'prior-expects-content'   // prior already knows this pattern
        : 'mutual-compression',     // roughly symmetric
  };
}

/**
 * Score content against a library of priors along the phasepost axis.
 *
 * @param {Object} contentMeasurements - { [cell]: { similarity_ppm, amplitude_ppm } }
 * @param {Object} priorLibrary - { [priorId]: { measurements: {...}, label: string } }
 * @returns {Array} Sorted by symmetricBits ascending (closest first)
 */
export function scorePhasepostAxis(contentMeasurements, priorLibrary) {
  const results = [];

  for (const [priorId, prior] of Object.entries(priorLibrary)) {
    if (!prior.measurements) continue;

    const compression = compressionDistance(contentMeasurements, prior.measurements);

    results.push({
      priorId,
      label: prior.label || priorId,
      axis: 'phasepost',
      ...compression,
      // Interpretation helpers
      interpretation: compression.asymmetry > 0.5
        ? 'familiar'      // prior already knows this pattern
        : compression.asymmetry < -0.5
          ? 'revelatory'   // content reveals prior's structure
          : 'symmetric',   // mutual compression
    });
  }

  return results.sort((a, b) => a.symmetricBits - b.symmetricBits);
}

// ─── Axis 2: Surprise (KL from Corpus Prior) ──────────────────────────────

/**
 * Compute KL divergence between a text's forward-surprise distribution
 * and the aggregate corpus prior.
 *
 * The corpus prior has aggregateBins: { low, mid, high, lowFrac, midFrac, highFrac }
 * A text has bins: { veryLow, low, mid, high, veryHigh }
 *
 * We normalize both to 5-bin distributions and compute KL.
 */
export function klFromCorpusPrior(textBins, corpusPrior) {
  const agg = corpusPrior.prior?.aggregateBins;
  if (!agg) return { klBits: Infinity, note: 'no corpus prior' };

  // Map text bins to low/mid/high (matching corpus prior's 3-bin structure)
  const textTotal = (textBins.veryLow || 0) + (textBins.low || 0) + (textBins.mid || 0) + (textBins.high || 0) + (textBins.veryHigh || 0);
  if (textTotal === 0) return { klBits: Infinity, note: 'empty text bins' };

  // Aggregate text bins into 3 categories matching corpus prior
  const textLow = ((textBins.veryLow || 0) + (textBins.low || 0)) / textTotal;
  const textMid = (textBins.mid || 0) / textTotal;
  const textHigh = ((textBins.high || 0) + (textBins.veryHigh || 0)) / textTotal;

  const priorLow = agg.lowFrac || 0;
  const priorMid = agg.midFrac || 0;
  const priorHigh = agg.highFrac || 0;

  const eps = 1e-12;
  let kl = 0;

  if (textLow > 0) kl += textLow * Math.log2((textLow + eps) / (priorLow + eps));
  if (textMid > 0) kl += textMid * Math.log2((textMid + eps) / (priorMid + eps));
  if (textHigh > 0) kl += textHigh * Math.log2((textHigh + eps) / (priorHigh + eps));

  return {
    klBits: Math.round(kl * 1e6) / 1e6,
    textLow: Math.round(textLow * 1e4) / 1e4,
    textMid: Math.round(textMid * 1e4) / 1e4,
    textHigh: Math.round(textHigh * 1e4) / 1e4,
    priorLow: Math.round(priorLow * 1e4) / 1e4,
    priorMid: Math.round(priorMid * 1e4) / 1e4,
    priorHigh: Math.round(priorHigh * 1e4) / 1e4,
    interpretation: kl < 0.5
      ? 'expected'       // matches corpus norm
      : kl < 2.0
        ? 'moderate'     // some deviation
        : 'novel',       // carries new signal
  };
}

/**
 * Score content against the corpus prior using forward-surprise statistics.
 *
 * @param {Object} textStats - { mean, std, bins, entropy, ... } from eoreader pipeline
 * @param {Object} corpusPrior - loaded corpus-prior.json
 * @returns {Object} KL divergence result
 */
export function scoreSurpriseAxis(textStats, corpusPrior) {
  if (!textStats?.bins) {
    return { klBits: Infinity, note: 'no bins in textStats' };
  }

  const result = klFromCorpusPrior(textStats.bins, corpusPrior);

  // Also compute deviation from corpus mean
  const corpusMean = corpusPrior.prior?.forwardSurprise?.meanAcrossTexts;
  const corpusStd = corpusPrior.prior?.forwardSurprise?.stdAcrossTexts;
  if (corpusMean && corpusStd && textStats.mean !== undefined) {
    const zScore = (textStats.mean - corpusMean) / corpusStd;
    result.zScore = Math.round(zScore * 1e4) / 1e4;
    result.deviationBits = Math.abs(textStats.mean - corpusMean);
  }

  return { axis: 'surprise', ...result };
}

// ─── Axis 3: Entity (Coref Surface Overlap) ───────────────────────────────

/**
 * Extract all surface forms from a coref prior.
 *
 * @param {Object} corefPrior - loaded coref/*.json
 * @returns {Set} All surface strings (lowercased)
 */
export function extractSurfaces(corefPrior) {
  const surfaces = new Set();
  for (const ref of corefPrior.referents || []) {
    for (const s of ref.surfaces || []) {
      if (s.surface) {
        surfaces.add(s.surface.toLowerCase());
      }
    }
  }
  return surfaces;
}

/**
 * Extract surface forms from raw text (naive: noun phrases, named entities).
 *
 * This is a fallback when no coref prior exists for the content.
 * A proper implementation would use the reader's entity extraction.
 */
export function extractTextSurfaces(text) {
  const surfaces = new Set();

  // Simple heuristic: extract capitalized phrases (potential named entities)
  const capitalized = text.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g) || [];
  for (const phrase of capitalized) {
    if (phrase.length > 2) {
      surfaces.add(phrase.toLowerCase());
    }
  }

  // Extract quoted phrases (potential referent surfaces)
  const quoted = text.match(/["'][^"']{3,50}["']/g) || [];
  for (const q of quoted) {
    surfaces.add(q.replace(/["']/g, '').trim().toLowerCase());
  }

  return surfaces;
}

/**
 * Compute Jaccard similarity between two surface sets.
 *
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function jaccardSurfaces(surfacesA, surfacesB) {
  const setA = surfacesA instanceof Set ? surfacesA : new Set(surfacesA);
  const setB = surfacesB instanceof Set ? surfacesB : new Set(surfacesB);

  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Score content against a library of coref priors along the entity axis.
 *
 * @param {Set|string} contentSurfaces - Set of surface strings, or raw text
 * @param {Object} corefLibrary - { [priorId]: { coref: loaded coref JSON, label: string } }
 * @returns {Array} Sorted by jaccard descending (highest overlap first)
 */
export function scoreEntityAxis(contentSurfaces, corefLibrary) {
  const contentSet = contentSurfaces instanceof Set
    ? contentSurfaces
    : extractTextSurfaces(contentSurfaces);

  const results = [];

  for (const [priorId, entry] of Object.entries(corefLibrary)) {
    if (!entry.coref?.referents) continue;

    const priorSurfaces = extractSurfaces(entry.coref);
    const jaccard = jaccardSurfaces(contentSet, priorSurfaces);

    // Also compute which specific surfaces overlap
    const overlap = [];
    for (const s of contentSet) {
      if (priorSurfaces.has(s)) {
        overlap.push(s);
      }
    }

    results.push({
      priorId,
      label: entry.label || priorId,
      axis: 'entity',
      jaccard: Math.round(jaccard * 1e4) / 1e4,
      overlapCount: overlap.length,
      contentSurfaceCount: contentSet.size,
      priorSurfaceCount: priorSurfaces.size,
      overlap: overlap.slice(0, 20), // top 20 overlapping surfaces
      interpretation: jaccard > 0.3
        ? 'strong-entity-match'
        : jaccard > 0.1
          ? 'partial-entity-match'
          : 'weak-entity-match',
    });
  }

  return results.sort((a, b) => b.jaccard - a.jaccard);
}

// ─── Fusion: Multi-Dimensional Similarity ──────────────────────────────────

/**
 * Fuse similarity scores from multiple axes into a ranked result.
 *
 * Each axis produces its own score space:
 *   - phasepost: symmetricBits (lower = closer)
 *   - surprise: klBits (lower = more expected)
 *   - entity: jaccard (higher = more overlap)
 *
 * Fusion normalizes each to [0, 1] and combines with configurable weights.
 *
 * @param {Object} axisScores - { phasepost: [...], surprise: {...}, entity: [...] }
 * @param {Object} weights - { phasepost: 0.4, surprise: 0.3, entity: 0.3 }
 * @returns {Array} Ranked priors with multi-dimensional similarity vectors
 */
export function fuseSimilarity(axisScores, weights = { phasepost: 0.4, surprise: 0.3, entity: 0.3 }) {
  const { phasepost = [], surprise, entity = [] } = axisScores;

  // Collect all prior IDs
  const priorIds = new Set();
  for (const r of phasepost) priorIds.add(r.priorId);
  if (surprise) priorIds.add(surprise.priorId || 'corpus');
  for (const r of entity) priorIds.add(r.priorId);

  // Normalize each axis to [0, 1]
  const normalize = (values, key, invert = false) => {
    if (!values || values.length === 0) return {};
    const vals = values.map(v => v[key]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const map = {};
    for (const v of values) {
      const norm = (v[key] - min) / range;
      map[v.priorId] = invert ? (1 - norm) : norm;
    }
    return map;
  };

  const phasepostNorm = normalize(phasepost, 'symmetricBits', true); // invert: lower bits = higher similarity
  const surpriseNorm = surprise ? { [surprise.priorId || 'corpus']: 1 - Math.min(1, (surprise.klBits || 0) / 10) } : {};
  const entityNorm = normalize(entity, 'jaccard');

  const results = [];

  for (const priorId of priorIds) {
    const pScore = phasepostNorm[priorId] ?? 0.5; // default neutral
    const sScore = surpriseNorm[priorId] ?? 0.5;
    const eScore = entityNorm[priorId] ?? 0; // default no entity match

    const fused =
      (weights.phasepost || 0) * pScore +
      (weights.surprise || 0) * sScore +
      (weights.entity || 0) * eScore;

    // Find the raw data for this prior
    const phasepostData = phasepost.find(r => r.priorId === priorId);
    const entityData = entity.find(r => r.priorId === priorId);

    results.push({
      priorId,
      fused: Math.round(fused * 1e4) / 1e4,
      similarity: {
        phasepost: phasepostData ? {
          symmetricBits: phasepostData.symmetricBits,
          asymmetry: phasepostData.asymmetry,
          forwardBits: phasepostData.forwardBits,
          backwardBits: phasepostData.backwardBits,
          interpretation: phasepostData.interpretation,
        } : null,
        surprise: surprise ? {
          klBits: surprise.klBits,
          zScore: surprise.zScore,
          interpretation: surprise.interpretation,
        } : null,
        entity: entityData ? {
          jaccard: entityData.jaccard,
          overlapCount: entityData.overlapCount,
          overlap: entityData.overlap,
          interpretation: entityData.interpretation,
        } : null,
      },
      label: phasepostData?.label || entityData?.label || priorId,
    });
  }

  return results.sort((a, b) => b.fused - a.fused);
}

// ─── Loading Helpers ──────────────────────────────────────────────────────

/**
 * Load all coref priors from the priors/coref/ directory.
 */
export function loadCorefLibrary(priorsDir) {
  const corefDir = path.join(priorsDir, 'coref');
  if (!fs.existsSync(corefDir)) return {};

  const library = {};
  for (const file of fs.readdirSync(corefDir)) {
    if (file.endsWith('.json')) {
      const coref = JSON.parse(fs.readFileSync(path.join(corefDir, file), 'utf8'));
      const id = file.replace('.json', '');
      library[id] = {
        coref,
        label: coref.source || id,
      };
    }
  }
  return library;
}

/**
 * Load the corpus prior.
 */
export function loadCorpusPrior(priorsDir) {
  const filePath = path.join(priorsDir, 'corpus-prior.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Build a phasepost prior library from corpus-prior-cube.json or lens-fold.json.
 */
export function buildPhasepostLibrary(priorsDir) {
  const library = {};

  // From lens-fold.json: each cluster has a centroid operator profile
  const lensFoldPath = path.join(priorsDir, 'lens-fold.json');
  if (fs.existsSync(lensFoldPath)) {
    const lensFold = JSON.parse(fs.readFileSync(lensFoldPath, 'utf8'));
    for (const cluster of lensFold.clusters || []) {
      // Convert centroid operator profile to pseudo-measurements
      const measurements = {};
      const centroid = cluster.centroid || {};
      const total = Object.values(centroid).reduce((s, v) => s + v, 0) || 1;

      // Map operator amplitudes to cell measurements
      // This is approximate — a proper version would use the full 27-cell distribution
      for (const [op, amp] of Object.entries(centroid)) {
        // Each operator maps to 3 cells (Ground, Figure, Pattern)
        const normalizedAmp = Math.round((amp / total) * PPM);
        measurements[`${op}_Ground`] = { similarity_ppm: normalizedAmp, amplitude_ppm: normalizedAmp };
        measurements[`${op}_Figure`] = { similarity_ppm: normalizedAmp, amplitude_ppm: normalizedAmp };
        measurements[`${op}_Pattern`] = { similarity_ppm: normalizedAmp, amplitude_ppm: normalizedAmp };
      }

      library[`lens-${cluster.id}`] = {
        measurements,
        label: cluster.description || cluster.id,
        members: cluster.members?.length || 0,
      };
    }
  }

  // From corpus-prior-cube.json: per-book 27-cell distributions
  const cubePath = path.join(priorsDir, 'corpus-prior-cube.json');
  if (fs.existsSync(cubePath)) {
    const cube = JSON.parse(fs.readFileSync(cubePath, 'utf8'));
    const books = cube.generated_from?.per_book || [];
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      if (book?.distribution_ppm) {
        // Use raw distribution_ppm directly (numbers, not measurement objects)
        library[`cube-${i}`] = {
          measurements: book.distribution_ppm,
          label: book.file || `book-${i}`,
        };
      }
    }
  }

  return library;
}

// ─── Main Query Interface ─────────────────────────────────────────────────

/**
 * Query the priors space along all three axes.
 *
 * @param {Object} content - {
 *   measurements: { [cell]: { similarity_ppm, amplitude_ppm } },  // phasepost measurements
 *   textStats: { mean, std, bins, ... },                          // forward-surprise stats
 *   surfaces: Set<string>|string,                                 // entity surfaces or raw text
 * }
 * @param {Object} priorsDir - path to the priors/ directory
 * @param {Object} options - { weights: { phasepost, surprise, entity }, topK }
 * @returns {Object} { phasepost: [...], surprise: {...}, entity: [...], fused: [...] }
 */
export async function queryPriors(content, priorsDir, options = {}) {
  const { weights = { phasepost: 0.4, surprise: 0.3, entity: 0.3 }, topK = 10 } = options;

  // Load prior libraries
  const corefLibrary = loadCorefLibrary(priorsDir);
  const corpusPrior = loadCorpusPrior(priorsDir);
  const phasepostLibrary = buildPhasepostLibrary(priorsDir);

  // Score each axis
  const phasepostScores = content.measurements
    ? scorePhasepostAxis(content.measurements, phasepostLibrary)
    : [];

  const surpriseScore = content.textStats && corpusPrior
    ? scoreSurpriseAxis(content.textStats, corpusPrior)
    : null;

  const entityScores = content.surfaces
    ? scoreEntityAxis(content.surfaces, corefLibrary)
    : [];

  // Fuse
  const fused = fuseSimilarity(
    { phasepost: phasepostScores, surprise: surpriseScore, entity: entityScores },
    weights,
  );

  return {
    phasepost: phasepostScores.slice(0, topK),
    surprise: surpriseScore,
    entity: entityScores.slice(0, topK),
    fused: fused.slice(0, topK),
  };
}
