// Is the new log an append-only extension of the one already committed on the PR branch?   node check-prefix.mjs <repo> <file>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const [repo, file] = process.argv.slice(2);
const before = execFileSync("git", ["-C", repo, "show", `HEAD:${file}`], { maxBuffer: 1 << 26 });
const after = readFileSync(`${repo}/${file}`);
const same = after.subarray(0, before.length).equals(before);
console.log(JSON.stringify({ committedBytes: before.length, newBytes: after.length, appendOnly: same }));
process.exit(same ? 0 : 1);
