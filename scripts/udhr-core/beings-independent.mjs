// Does the beings conclusion survive when the English-projected priors are removed?   (no log is written)
import { readAll, modalNN, mutualPairs, nullCounts, windowOf } from "./build-mind-beings.mjs";
const { rows } = await readAll();
const kinds = {}; for (const r of rows) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
console.log("read editions by prior source:", JSON.stringify(kinds));
const report = (label, rs) => {
  const pairs = mutualPairs(modalNN(rs)), nul = nullCounts(rs, 200);
  const w = windowOf(rs, 100);
  console.log(JSON.stringify({ set: label, editions: rs.length, languages: new Set(rs.map((r) => r.code)).size, pairs: pairs.length, list: pairs.join(" "), nullMax: Math.max(...nul), nullMean: +(nul.reduce((a, b) => a + b, 0) / nul.length).toFixed(2), claimHolds: pairs.length > Math.max(...nul), stableWindowMax: w.max, pivotal: w.pivotal }));
};
report("all", rows);
report("without projected-from-UDHR", rows.filter((r) => r.kind !== "projected-from-UDHR"));
report("only projected-from-UDHR", rows.filter((r) => r.kind === "projected-from-UDHR"));
