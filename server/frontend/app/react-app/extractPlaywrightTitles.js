// extractPlaywrightTitles.js
// Usage:
//   node extractPlaywrightTitles.js <tests_root_dir>
// Example:
//   node extractPlaywrightTitles.js ./tests
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || process.cwd();
const today = new Date();
const ymd = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("");
const OUTDIR = "../../../doc";
const OUTFILE = `webui-playwright-list.md`;
const OUTPATH = path.join(OUTDIR, OUTFILE);

const validExts = new Set([".ts", ".tsx", ".js", ".jsx"]);
const isTestFile = (p) => /\b(spec|test)\.(t|j)sx?$/i.test(p);

// walk
function* walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    let s; try { s = fs.statSync(p); } catch { continue; }
    if (s.isDirectory()) yield* walk(p);
    else if (validExts.has(path.extname(p)) && isTestFile(p)) yield p;
  }
}

// regexes
const q = `(['"\`])((?:\\\\\\1|[^\\1])*?)\\1`;
const reDescribe = new RegExp(`\\btest\\.describe\\s*\\(\\s*${q}`, "g");
const reTest = new RegExp(`\\btest\\.(?:only|skip|fixme)?\\s*\\(\\s*${q}`, "g");
const rePlainTest = new RegExp(`\\btest\\s*\\(\\s*${q}`, "g");
const reIt = new RegExp(`\\bit\\.(?:only|skip|fixme)?\\s*\\(\\s*${q}`, "g");
const rePlainIt = new RegExp(`\\bit\\s*\\(\\s*${q}`, "g");

// collect
const files = [...walk(ROOT)].sort();
const groups = [];

for (const file of files) {
  const base = path.basename(file);
  const src = fs.readFileSync(file, "utf8");
  const suites = new Set();
  const titles = new Set();

  for (const m of src.matchAll(reDescribe)) suites.add(m[2].trim());
  for (const m of src.matchAll(reTest)) titles.add(m[2].trim());
  for (const m of src.matchAll(rePlainTest)) titles.add(m[2].trim());
  for (const m of src.matchAll(reIt)) titles.add(m[2].trim());
  for (const m of src.matchAll(rePlainIt)) titles.add(m[2].trim());

  if (suites.size === 0 && titles.size === 0) continue;
  groups.push({ category: base, suites: [...suites], titles: [...titles] });
}

// render markdown list
let md = `# Frontend Playwright Test List (${ymd})\n\n`;
for (const g of groups) {
  md += `## ${g.category}\n`;
  if (g.suites.length) {
    md += `- Suites:\n`;
    for (const s of g.suites) md += `  - ${s}\n`;
  }
  for (const t of g.titles) md += `- ${t}\n`;
  md += `\n`;
}

fs.writeFileSync(OUTPATH, md);
