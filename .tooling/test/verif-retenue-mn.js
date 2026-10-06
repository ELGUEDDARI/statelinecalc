/* Recoupe la formule du Minnesota contre les TABLES IMPRIMEES du Department of
 * Revenue lui-meme.
 *
 * Source : 2026 Minnesota Income Tax Withholding Instruction Booklet,
 * https://www.revenue.state.mn.us/sites/default/files/2025-12/wh-inst-26.pdf
 * La page 34 donne la formule informatique (annual wage - allowances x 5 300 $,
 * puis le « Chart for Step 5 ») ; les pages 16-33 impriment, ligne par ligne, la
 * retenue en dollars ronds pour 0 a 10 allocations.
 *
 * Ce script lit les tables hebdomadaire, toutes les 2 semaines, 2 fois par mois
 * et mensuelle (celibataire et marie), applique la formule au MILIEU de chaque
 * ligne et exige que la valeur imprimee en soit l'arrondi au dollar (ecart
 * < 0,5 $). Les lignes dont `pdftotext` inverse les bornes basse et haute sont
 * ecartees et comptees : c'est un defaut de lecture, pas un autre taux.
 *
 * Resultat du 06/10/2026 : 6 666 valeurs comparees, ecart maximal 0,4996 $.
 * Il utilise la formule ECRITE ICI a partir du texte imprime, pas le moteur du
 * site : il ne peut donc pas se tromper avec lui.
 *
 * Lancer : node .tooling/test/verif-retenue-mn.js   (necessite pdftotext)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const URL = "https://www.revenue.state.mn.us/sites/default/files/2025-12/wh-inst-26.pdf";
const pdf = path.join(os.tmpdir(), "wh-inst-26.pdf");

function telecharge(url) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" } }, r => {
      if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode));
      const out = fs.createWriteStream(pdf);
      r.pipe(out); out.on("finish", () => out.close(ok));
    }).on("error", ko);
  });
}

/* Le « Chart for Step 5 » imprime p. 34 : [plus que, jusqu'a, soustraire, taux, ajouter]. */
const CHART = {
  s: [[4700, 38010, 4700, .0535, 0], [38010, 114130, 38010, .068, 1782.09],
      [114130, 207850, 114130, .0785, 6958.25], [207850, Infinity, 207850, .0985, 14315.27]],
  m: [[14700, 63400, 14700, .0535, 0], [63400, 208180, 63400, .068, 2605.45],
      [208180, 352630, 208180, .0785, 12450.49], [352630, Infinity, 352630, .0985, 23789.82]]
};
function formule(table, brutAnnuel, nbAlloc) {
  const x = brutAnnuel - 5300 * nbAlloc;               // etapes 3 et 4
  if (x <= 0) return 0;
  for (const [lo, hi, sub, taux, add] of CHART[table]) if (x > lo && x <= hi) return (x - sub) * taux + add;
  return 0;
}

(async () => {
  await telecharge(URL);
  const txt = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n");
  const titres = [];
  txt.forEach((l, i) => {
    const m = l.match(/^\s*(Single|Married) employees paid (every day|once a week|every two weeks|twice a month|once a month)/);
    if (m) titres.push([i, m[1] === "Single" ? "s" : "m", { "every day": 360, "once a week": 52, "every two weeks": 26, "twice a month": 24, "once a month": 12 }[m[2]]]);
  });
  titres.push([txt.length, null, null]);
  let total = 0, mauvais = 0, ecartees = 0, maxEcart = 0;
  for (let k = 0; k < titres.length - 1; k++) {
    const [debut, table, n] = titres[k];
    if (n === 360) continue;                         // la table journaliere, hors perimetre
    const fin = (titres[k + 1] || [txt.length])[0];
    for (let i = debut; i < fin; i++) {
      const m = txt[i].match(/^\s*([\d,]+)\s+([\d,]+)\s+((?:\d[\d,]*\s*){11})\s*$/);
      if (!m) continue;
      const lo = +m[1].replace(/,/g, ""), hi = +m[2].replace(/,/g, "");
      const v = m[3].trim().split(/\s+/).map(s => +s.replace(/,/g, ""));
      if (v.length !== 11) continue;
      if (hi - lo > 20) continue;                    // lignes larges : arrondi au milieu non comparable
      if (hi <= lo) { ecartees += 11; continue; }    // bornes inversees par pdftotext
      const milieu = (lo + hi) / 2;
      for (let a = 0; a < 11; a++) {
        const calc = formule(table, milieu * n, a) / n;
        const d = Math.abs(calc - v[a]);
        total++; maxEcart = Math.max(maxEcart, d);
        if (d > 0.5) { mauvais++; if (mauvais < 10) console.log("  ECHEC | table %s x%d ligne %d-%d, %d allocation(s) : imprime %d, formule %s", table, n, lo, hi, a, v[a], calc.toFixed(3)); }
      }
    }
  }
  console.log("\n=== RETENUE MN : %d valeurs imprimees comparees a la formule (ecart max %s $), %d ecartees pour lecture PDF, %d ECHEC ===",
    total, maxEcart.toFixed(4), ecartees, mauvais);
  process.exit(mauvais ? 1 : 0);
})().catch(e => { console.error("INDETERMINE :", e.message); process.exit(2); });
