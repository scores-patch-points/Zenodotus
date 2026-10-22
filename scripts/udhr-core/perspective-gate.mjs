// udhr-core/perspective-gate.mjs — which sources may feed the CORE (ground, grown priors, associates), by the perspective they declare. Policy: perspective-policy.json.
// Fail closed: a source with no declaration is a control. Usage as a module: `admitted(path)` -> { admit: bool, why }; as a script: prints counts per collection.
import { readFileSync, readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join, relative } from "node:path";
const ROOT = new URL("../../", import.meta.url).pathname, POLICY = JSON.parse(readFileSync(process.env.PERSPECTIVE_POLICY ?? new URL("./perspective-policy.json", import.meta.url), "utf8"));   // PERSPECTIVE_POLICY=./perspective-policy.v1.json reproduces the reports made under the folder-level policy
const head = (p) => { const fd = openSync(p, "r"), b = Buffer.alloc(3000), n = readSync(fd, b, 0, 3000, 0); closeSync(fd); return b.toString("utf8", 0, n); };
export function admitted(path) {
  const rel = relative(ROOT, path);
  for (const pat of POLICY.admit.explicitPatterns ?? []) if (new RegExp(pat.match).test(rel)) return { admit: true, why: "explicit pattern: curated primary works" };
  for (const [dir, why] of Object.entries(POLICY.admit.explicit)) if (rel.startsWith(dir + "/")) return { admit: true, why: `explicit: ${dir}` };
  for (const dir of Object.keys(POLICY.admit.collections)) if (rel.startsWith(dir + "/")) { const m = /^---\n([\s\S]*?)\n---/.exec(head(path)), p = m ? /^perspective:\s*(.+)$/m.exec(m[1]) : null; return p && p[1].trim() ? { admit: true, why: `declared: ${p[1].trim().slice(0, 40)}` } : { admit: false, why: "control: no perspective declared" }; }
  return { admit: false, why: "control: collection not admitted" };
}
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f), s = statSync(p); return s.isDirectory() ? walk(p) : /\.(txt|md)$/.test(f) ? [p] : []; });
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const dir of [...Object.keys(POLICY.admit.collections), ...Object.keys(POLICY.admit.explicit), "21-anti-colonial/colonial-studies", "20-first-person-voices/gutenberg", "24-global-literature", "01-literature-books", "19-organic-community"]) {
    const files = walk(join(ROOT, dir)), a = files.filter((p) => admitted(p).admit).length;
    console.log(`${dir.padEnd(62)} ${String(files.length).padStart(5)} files  ${String(a).padStart(5)} admitted  ${String(files.length - a).padStart(5)} control`);
  }
}
