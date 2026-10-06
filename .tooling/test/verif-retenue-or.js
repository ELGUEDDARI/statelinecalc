/* Recoupe la formule de l'Oregon contre les TABLES IMPRIMEES du Department of
 * Revenue lui-meme.
 *
 * Source : Oregon Withholding Tax Tables, Effective January 1, 2026 (150-206-430,
 * Rev. 12-18-25), https://www.oregon.gov/dor/forms/FormsPubs/
 * withholding-tax-tables_206-430_2026.pdf. Quatre tables (mensuelle, deux fois
 * par mois, toutes les deux semaines, hebdomadaire) donnent, ligne par ligne, la
 * retenue en dollars ronds pour 0 a 14 allowances. Elles s'arretent vers
 * 51 000 $ de salaire annuel (« For wages of $4,250 and more, see Oregon
 * Withholding Tax Formulas ») : la formule pour salaire >= 50 000 $ n'est donc
 * recoupee ici QUE par continuite avec les dernieres lignes, jamais par une table
 * imprimee a 75 000 $.
 *
 * ── CE QUE LE SCRIPT FAIT ───────────────────────────────────────────────────
 * 1. Il ecrit ICI la formule a partir du TEXTE du livret (150-206-436, p. 5-7), pas
 *    a partir du moteur du site : impot sans le 263 $ de la p. 6 (voir 2b du
 *    commentaire d'Oregon dans data/rates-2026.js), moins 263 $ par allowance,
 *    BASE = salaire - impot federal retenu (plafond 8 750 $) - deduction standard.
 * 2. L'impot federal retenu n'est pas imprime dans les tables : il est recalcule
 *    avec IRS Publication 15-T (2026), p. 12, « STANDARD Withholding Rate
 *    Schedules » (formulaires W-4 de 2019 ou avant : salaire - 4 300 $ par
 *    allowance, puis le bareme), lu le 2026-10-06.
 * 3. Pour chaque ligne dont TOUT le salaire annualise est < 50 000 $, il compare au
 *    MILIEU de la ligne ; le resultat imprime doit etre a moins de 1 $ du calcul
 *    (arrondi au dollar de l'agence 0,5 $ + milieu de ligne). Colonnes
 *    ASSERTEES : celibataire 0, 1, 2 allowances ; marie 2 allowances.
 * 4. Pour les lignes qui franchissent 50 000 $ (colonnes CELIBATAIRE seulement), le
 *    resultat imprime doit tomber entre le calcul au bord bas et au bord haut de la
 *    ligne (a 1 $ pres) : peu importe en quel point de la ligne l'agence a evalue,
 *    une marche de 263 $ a 50 000 $ ferait echouer ce controle. Les colonnes
 *    mariees ne sont pas assertees ici (voir 6).
 * 5. TEMOIN NEGATIF : la formule de la p. 6 (celle qui ajoute 263 $) est calculee
 *    sur les memes cellules ; elle doit echouer sur la grande majorite des
 *    cellules non nulles. C'est la preuve que les tables ne suivent pas la p. 6.
 * 6. Colonnes mariees a 0 et 1 allowance, et colonne mariee a 2 allowances au-dela
 *    de 50 000 $ : INFORMATIVES, non assertees. L'ecart atteint 9 $ par mois et ne
 *    vient pas de la formule Oregon mais de l'impot federal que l'agence suppose
 *    pour un couple : il saute par marches (les montants de la Publication 15-T en
 *    tranches de salaire, pas la methode en pourcentage) des que le salaire annuel
 *    depasse ~44 000 $, et le script ne sait pas le reproduire, donc il ne pretend
 *    pas le valider.
 *
 * Lancer : node .tooling/test/verif-retenue-or.js   (necessite pdftotext)
 * Resultat du 06/10/2026 : voir la derniere ligne.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const URL = "https://www.oregon.gov/dor/forms/FormsPubs/withholding-tax-tables_206-430_2026.pdf";
const pdf = path.join(os.tmpdir(), "or-withholding-tables-2026.pdf");

function telecharge(url) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" } }, r => {
      if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode));
      const out = fs.createWriteStream(pdf);
      r.pipe(out); out.on("finish", () => out.close(ok));
    }).on("error", ko);
  });
}

/* IRS Publication 15-T (2026), p. 12, STANDARD Withholding Rate Schedules, annuel :
   [de, a, impot a `de`, taux]. */
const IRS_S = [[0, 7500, 0, 0], [7500, 19900, 0, .10], [19900, 57900, 1240, .12], [57900, 113200, 5800, .22],
  [113200, 209275, 17966, .24], [209275, 263725, 41024, .32], [263725, 648100, 58448, .35], [648100, Infinity, 192979.25, .37]];
const IRS_M = [[0, 19300, 0, 0], [19300, 44100, 0, .10], [44100, 120100, 2480, .12], [120100, 230700, 11600, .22],
  [230700, 422850, 35932, .24], [422850, 531750, 82048, .32], [531750, 788000, 116896, .35], [788000, Infinity, 206583.5, .37]];
const federal = (salaire, allow, T) => {
  const adj = Math.max(0, salaire - 4300 * allow);
  for (const [lo, hi, b, p] of T) if (adj < hi) return b + p * (adj - lo);
};

/* Oregon Withholding Tax Formulas 2026, p. 5-7 (le « 263 + » de la p. 6 en option). */
function oregon(salaire, allow, statut, avec263) {
  const M = statut === "M";
  const sd = M ? 5820 : 2910;
  const T = M ? IRS_M : IRS_S;
  const plafond = 8750;                                         // sous 125 000 $ : jamais depasse ici
  const base = Math.max(0, salaire - Math.min(federal(salaire, allow, T), plafond) - sd);
  const seuils = M ? [[9100, 0, .0475, 0], [22800, 432, .0675, 9100], [250000, 1357, .0875, 22800], [Infinity, 21237, .099, 250000]]
                   : [[4550, 0, .0475, 0], [11400, 216, .0675, 4550], [125000, 678, .0875, 11400], [Infinity, 10618, .099, 125000]];
  const [, b, t, de] = seuils.find(s => base < s[0]);
  return Math.max(0, b + t * (base - de) + (avec263 ? 263 : 0) - 263 * allow);
}

(async () => {
  await telecharge(URL);
  const txt = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n");
  const titres = [];
  txt.forEach((l, i) => {
    const m = l.match(/^\s*(Monthly|Twice-a-month|Bi-weekly|Weekly|Daily or miscellaneous) payroll period \(Oregon\)/);
    if (m) titres.push([i, { "Monthly": 12, "Twice-a-month": 24, "Bi-weekly": 26, "Weekly": 52, "Daily or miscellaneous": 0 }[m[1]], m[1]]);
  });
  titres.push([txt.length, null, null]);

  const COLS = [["S", 0], ["S", 1], ["S", 2], ["M", 0], ["M", 1], ["M", 2]];
  const ASSERTEES = new Set([0, 1, 2, 5]);
  let asserted = 0, mauvais = 0, bornes = 0, mauvaisBornes = 0, info = 0, infoEcarts = 0, maxEcart = 0;
  let temoin = 0, temoinEchecs = 0, lignesLues = 0;
  for (let k = 0; k < titres.length - 1; k++) {
    const [debut, n, nom] = titres[k];
    if (!n) continue;                                          // la table journaliere : hors perimetre
    for (let i = debut; i < titres[k + 1][0]; i++) {
      const m = txt[i].match(/^\s*(\d+)\s+\S\s+(\d+)\s+((?:\d+\s+){17}\d+)\s*$/);
      if (!m) continue;
      const lo = +m[1], hi = +m[2], v = m[3].trim().split(/\s+/).map(Number);
      if (v.length !== 18) continue;
      lignesLues++;
      const milieu = n * (lo + hi) / 2;
      COLS.forEach(([st, a], ci) => {
        const imprime = v[ci];
        if (n * hi <= 50000) {
          const calc = oregon(milieu, a, st, false) / n;
          const e = Math.abs(calc - imprime);
          if (ASSERTEES.has(ci)) {
            asserted++; maxEcart = Math.max(maxEcart, e);
            if (e > 1.0) { mauvais++; if (mauvais < 10) console.log("  ECHEC | %s ligne %d-%d, %s %d allowance(s) : imprime %d, calcul %s", nom, lo, hi, st, a, imprime, calc.toFixed(2)); }
          } else { info++; if (e > 1.0) infoEcarts++; }
          if (ASSERTEES.has(ci) && imprime > 0) {
            temoin++;
            if (Math.abs(oregon(milieu, a, st, true) / n - imprime) > 1.0) temoinEchecs++;
          }
        } else if (st === "S") {
          const f1 = oregon(n * lo, a, st, false) / n, f2 = oregon(n * hi, a, st, false) / n;
          bornes++;
          if (imprime < Math.min(f1, f2) - 1.0 || imprime > Math.max(f1, f2) + 1.0) {
            mauvaisBornes++; console.log("  ECHEC | %s ligne %d-%d (franchit 50 000 $), %s %d allowance(s) : imprime %d, calcul %s a %s", nom, lo, hi, st, a, imprime, f1.toFixed(2), f2.toFixed(2));
          }
        }
      });
    }
  }
  console.log("\nlignes de tables lues : %d (4 tables, jusqu'a ~51 000 $ par an)", lignesLues);
  console.log("cellules assertees sous 50 000 $ (celibataire 0-2 allowances, marie 2) : %d, ecart maximal %s $, %d ECHEC", asserted, maxEcart.toFixed(3), mauvais);
  console.log("cellules celibataire qui franchissent 50 000 $ (imprime entre les bords de la ligne, +/- 1 $) : %d, %d ECHEC", bornes, mauvaisBornes);
  console.log("temoin negatif, formule de la p. 6 (+ 263 $) : %d cellules non nulles, %d s'ecartent de plus de 1 $ du tableau imprime", temoin, temoinEchecs);
  console.log("informatif, marie 0 et 1 allowance : %d cellules, %d a plus de 1 $ (non assertees)", info, infoEcarts);
  const ok = mauvais === 0 && mauvaisBornes === 0 && asserted > 400 && bornes > 0 && temoin > 0 && temoinEchecs / temoin > 0.8;
  console.log("\n=== RETENUE OR : %s ===", ok ? "OK" : "ECHEC");
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error("INDETERMINE :", e.message); process.exit(2); });
