/* Extrait les grilles « Wage Bracket Withholding Charts » du GB-1210-2026 (Vermont Department of Taxes) du texte
 * .tooling/sources/vermont-gb1210-2026.txt (pdftotext -layout du PDF https://tax.vermont.gov/sites/tax/files/documents/GB-1210-2026.pdf,
 * HTTP 200, lu le 2026-10-20) vers .tooling/sources/vermont-gb1210-charts.json.
 * Seules les lignes COMPLETES (2 x 13 nombres : borne basse, borne haute, 11 colonnes de 0 a 10 allocations, celibataire a gauche,
 * marie a droite) sont gardees ; les lignes dont des colonnes de zeros sont imprimees en bloc ou collees sont comptees comme ecartees.
 * Lancer : node .tooling/test/vt-tables-extract.js */
const fs = require("fs"), path = require("path");
const txt = fs.readFileSync(path.join(__dirname, "..", "sources", "vermont-gb1210-2026.txt"), "utf8").split(/\r?\n/);
const out = {}; let per = null, ecartees = 0, gardees = 0;
for (const l of txt) {
  const m = l.match(/Single (Weekly|Biweekly|Semimonthly|Monthly|Daily or Miscellaneous)\s+Married/);
  if (m) { per = m[1].toUpperCase().replace(/ OR MISCELLANEOUS/, ""); continue; }
  if (!per) continue;
  const t = l.trim().split(/\s+/);
  if (t.length && t.every(x => /^\d+(\.\d+)?$/.test(x))) {
    if (t.length !== 26) { ecartees++; continue; }
    const v = t.map(Number);
    (out["SINGLE|" + per] = out["SINGLE|" + per] || []).push(v.slice(0, 13));
    (out["MARRIED|" + per] = out["MARRIED|" + per] || []).push(v.slice(13));
    gardees++;
  }
}
fs.writeFileSync(path.join(__dirname, "..", "sources", "vermont-gb1210-charts.json"), JSON.stringify(out));
console.log("lignes gardees", gardees, "ecartees", ecartees, Object.entries(out).map(([k, v]) => k + ":" + v.length + " [" + v[0][0] + "-" + v[v.length - 1][1] + "]").join(" ; "));
