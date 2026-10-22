/* Retire la balise <script async src=".../gtag/js?id=G-XK0HYXJH0E"> des pages
 * et de leurs generateurs : assets/analytics.js charge desormais gtag.js
 * lui-meme, apres 'load' + 1re interaction (ou 4 s). Audit perf 22/10/2026.
 *
 * Meme methode que pose-*.js : une ligne exacte, idempotent (relancer ne fait
 * rien), echec bruyant si une page contient la balise sous une AUTRE forme.
 * Lancer : node .tooling/ops/retire-balise-gtag.js        (ajouter --dry pour compter)
 */
const fs = require("fs"), path = require("path");
const RACINE = path.join(__dirname, "..", "..");
const DRY = process.argv.includes("--dry");
const BAL = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>';
const FINS = ["\r\n", "\n"];   // les deux fins de ligne existent dans le depot
const ID = "googletagmanager.com/gtag/js";
let modifies = 0, deja = 0, anormaux = [];

function marche(dir, ext, filtre) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (p === path.join(RACINE, ".tooling")) continue; marche(p, ext, filtre); }
    else if (e.name.endsWith(ext) && filtre(p)) traiter(p);
  }
}
function traiter(p) {
  const s = fs.readFileSync(p, "utf8");
  if (!s.includes(ID)) { deja++; return; }
  let t = s, n = 0;
  for (const fin of FINS) { const k = t.split(BAL + fin).length - 1; n += k; t = t.split(BAL + fin).join(""); }
  if (n === 0 || t.includes(ID)) { anormaux.push(path.relative(RACINE, p)); return; }
  if (!DRY) fs.writeFileSync(p, t);
  modifies++;
}
marche(RACINE, ".html", () => true);
const ops = path.join(RACINE, ".tooling", "ops");
for (const f of fs.readdirSync(ops)) if (/^build-.*\.js$/.test(f)) traiter(path.join(ops, f));
console.log((DRY ? "[dry] " : "") + "modifies: " + modifies + ", sans balise: " + deja + ", anormaux: " + anormaux.length);
anormaux.forEach(x => console.log("  ANORMAL " + x));
process.exit(anormaux.length ? 1 : 0);
