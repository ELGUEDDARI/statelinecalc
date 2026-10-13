/* Recoupe la formule de la Virginie-Occidentale ET les donnees du site contre les TABLES IMPRIMEES
 * du West Virginia Tax Division.
 *
 * Source (lue le 2026-10-07) : « Form WV IT-100.2A », « Tables for Percentage Method of Withholding »,
 * « March 2026 », PDF de 4 pages :
 *   https://tax.wv.gov/Documents/Withholding/it100.2a.pdf
 * 12 tables = 2 baremes (« TWO EARNER/TWO OR MORE JOBS » pages 1-2, « OPTIONAL ONE EARNER/ONE JOB »
 * pages 3-4) x 6 periodes (hebdo, bimensuel, semi-mensuel, mensuel, annuel, quotidien).
 * Taux (page « 2026 Income Tax Rate Cut », https://tax.wv.gov/Individuals/Pages/PersonalIncomeTaxReductionBill.aspx) :
 * 2,11 % / 2,81 % / 3,16 % / 4,22 % / 4,58 %, seuils annuels 10 000 / 25 000 / 40 000 / 60 000 (ONE EARNER)
 * et 7 500 / 18 750 / 30 000 / 45 000 (TWO EARNER = 75 % des seuils).
 *
 * CE QUE LE SCRIPT FAIT
 * 0. Telecharge le PDF, le lit (wv-tables-extract.py, PyMuPDF).
 * 1. Verifie l'en-tete : « March 2026 », 12 tables, deduction par exemption imprimee (2 000 / 52 / 26 / 24 /
 *    12 / 260 : 38,46 ; 76,92 ; 83,33 ; 166,67 ; 7,66).
 * 2. TABLE ANNUELLE, 2 baremes : seuils, taux et BASES (cumuls) recalcules depuis les seuils et les taux ;
 *    la base imprimee doit etre ce cumul ARRONDI au cent (ex. 474,375 -> 474,38). Ecart zero exige.
 * 3. Les 5 autres periodes : les seuils sont arrondis a l'unite par l'agence et les bases sont calculees
 *    par elle ; on mesure l'ecart entre la table imprimee et la formule annualisee ((tax(s x P)) / P) a
 *    plusieurs salaires par tranche, et on EXIGE qu'il reste sous 0,06 $ par periode (mesure, pas
 *    suppose ; l'agence arrondit ensuite la retenue au dollar : « rounding the result to the nearest whole
 *    dollar »).
 * 4. TEMOIN NEGATIF : avec les taux 2025 (2,22 / 2,96 / 3,33 / 4,44 / 4,82 %) la table annuelle ne se
 *    recoupe plus.
 * 5. Moteur du site : le bloc "west-virginia" de data/rates-2026.js s'il existe, sinon le bloc pret a coller
 *    dont le chemin est dans WV_BLOC. Compare exemption, taux et impot d'Etat annuel du moteur a la formule
 *    imprimee (bareme TWO EARNER, par defaut), aux 3 statuts, a 14 salaires.
 *
 * Lancer : node .tooling/test/verif-retenue-wv.js   (necessite python + PyMuPDF)
 *          WV_BLOC=chemin\rates-wv-bloc.txt node .tooling/test/verif-retenue-wv.js   (avant l'integration)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const URL = "https://tax.wv.gov/Documents/Withholding/it100.2a.pdf";
const pdf = path.join(os.tmpdir(), "wv-it100-2a-2026.pdf");
const WV_BLOC = process.env.WV_BLOC || "";

function telecharge(url, dest) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" } }, r => {
      if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode + " " + url));
      const out = fs.createWriteStream(dest);
      r.pipe(out); out.on("finish", () => out.close(ok));
    }).on("error", ko);
  });
}

let echecs = 0, controles = 0;
function check(nom, ok, detail) {
  controles++;
  if (!ok) { echecs++; console.log("  ECHEC | " + nom + (detail ? "  -> " + detail : "")); }
}

/* Formule imprimee : tranches [plafond, taux], impot marginal exact sur le salaire imposable. */
const TAUX = [0.0211, 0.0281, 0.0316, 0.0422, 0.0458];
const TAUX_2025 = [0.0222, 0.0296, 0.0333, 0.0444, 0.0482];
const impot = (t, seuils, taux) => {
  let du = 0, bas = 0;
  for (let i = 0; i < taux.length; i++) {
    const haut = i < seuils.length ? seuils[i] : Infinity;
    if (t > bas) du += (Math.min(t, haut) - bas) * taux[i];
    bas = haut;
  }
  return du;
};
const cent = x => Math.round(x * 100 + 1e-7) / 100;
const SEUILS = { "two-earner": [7500, 18750, 30000, 45000], "one-earner": [10000, 25000, 40000, 60000] };
const DED = { annual: 2000, monthly: 166.67, semimonthly: 83.33, biweekly: 76.92, weekly: 38.46, daily: 7.66 };

(async () => {
  await telecharge(URL, pdf);
  const T = JSON.parse(execFileSync("python", [path.join(__dirname, "wv-tables-extract.py"), pdf],
    { encoding: "utf8", env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }), maxBuffer: 1 << 26 }));

  console.log("PDF : version « " + T.version + " », " + T.tables.length + " tables, baremes par page : " + T.bareme_par_page.join(" | "));
  check("version imprimee = March 2026", T.version === "March 2026", String(T.version));
  check("12 tables lues", T.tables.length === 12);
  check("pages 1-2 = TWO EARNER, pages 3-4 = ONE EARNER",
    JSON.stringify(T.bareme_par_page) === JSON.stringify(["two-earner", "two-earner", "one-earner", "one-earner"]));
  for (const p of ["1", "3"]) check("deductions par exemption page " + p, JSON.stringify(T.deductions[p]) === JSON.stringify([83.33, 76.92, 38.46]), JSON.stringify(T.deductions[p]));
  for (const p of ["2", "4"]) check("deductions par exemption page " + p, JSON.stringify(T.deductions[p]) === JSON.stringify([166.67, 7.66, 2000]), JSON.stringify(T.deductions[p]));

  /* 2. annuel : ecart zero */
  for (const bar of ["two-earner", "one-earner"]) {
    const a = T.tables.find(t => t.bareme === bar && t.periode === "annual");
    check(bar + " annuel : seuils", JSON.stringify(a.seuils) === JSON.stringify(SEUILS[bar]), JSON.stringify(a.seuils));
    check(bar + " annuel : taux", JSON.stringify(a.taux) === JSON.stringify(TAUX), JSON.stringify(a.taux));
    const attendu = [0, ...SEUILS[bar]].map(s => cent(impot(s, SEUILS[bar], TAUX)));
    check(bar + " annuel : bases imprimees = cumul arrondi au cent", JSON.stringify(a.bases) === JSON.stringify(attendu),
      JSON.stringify(a.bases) + " vs " + JSON.stringify(attendu));
    console.log("  " + bar + " annuel : seuils " + a.seuils.join("/") + " bases " + a.bases.join("/") + " -> ecart zero : " +
      (JSON.stringify(a.bases) === JSON.stringify(attendu) ? "oui" : "NON"));
  }
  check("le bareme TWO EARNER = 75 % des seuils du ONE EARNER", SEUILS["two-earner"].every((s, i) => s === SEUILS["one-earner"][i] * 0.75));

  /* 3. autres periodes : ecart mesure et plafonne */
  let pire = 0, pireNom = "";
  for (const t of T.tables) {
    if (t.periode === "annual") continue;
    check(t.bareme + " " + t.periode + " : taux", JSON.stringify(t.taux) === JSON.stringify(TAUX));
    check(t.bareme + " " + t.periode + " : deduction", DED[t.periode] > 0);
    const P = t.periodes_par_an;
    /* l'exemple : table du ONE EARNER ou TWO EARNER annualise */
    const sA = SEUILS[t.bareme];
    const points = [];
    for (let i = 0; i < 5; i++) {
      const lo = i === 0 ? 0 : t.seuils[i - 1], hi = i < 4 ? t.seuils[i] : t.seuils[3] * 2;
      points.push(lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.75);
    }
    for (const w of points) {
      const i = t.seuils.findIndex(s => w <= s); const k = i < 0 ? 4 : i;
      const imprimee = t.bases[k] + (w - (k === 0 ? 0 : t.seuils[k - 1])) * t.taux[k];
      const formule = impot(w * P, sA, TAUX) / P;
      const ec = Math.abs(imprimee - formule);
      if (ec > pire) { pire = ec; pireNom = t.bareme + " " + t.periode + " a " + w.toFixed(2); }
    }
  }
  console.log("  autres periodes : ecart maximal table imprimee / formule annualisee = " + pire.toFixed(4) + " $ par periode (" + pireNom + ")");
  check("ecart des autres periodes < 0,06 $ par periode", pire < 0.06, pire.toFixed(4));

  /* 4. temoin negatif */
  {
    const a = T.tables.find(t => t.bareme === "two-earner" && t.periode === "annual");
    const faux = [0, ...SEUILS["two-earner"]].map(s => cent(impot(s, SEUILS["two-earner"], TAUX_2025)));
    check("TEMOIN NEGATIF : avec les taux 2025 les bases annuelles ne se recoupent plus", JSON.stringify(a.bases) !== JSON.stringify(faux), JSON.stringify(faux));
  }

  /* 5. moteur du site */
  const { calcul, R } = require("../lib/paie.js");
  if (!R.states["west-virginia"]) {
    if (!WV_BLOC) { console.log("\n(bloc west-virginia absent de data/rates-2026.js et WV_BLOC non fourni : etape 5 sautee)"); return fin(); }
    const txt = fs.readFileSync(WV_BLOC, "utf8");
    const i = txt.indexOf('"west-virginia": {');
    if (i < 0) { check("bloc pret a coller lisible", false); return fin(); }
    R.states["west-virginia"] = (new Function("return ({" + txt.slice(i) + "})"))()["west-virginia"];
    console.log("\n(moteur : bloc pret a coller lu dans " + WV_BLOC + ")");
  }
  const S = R.states["west-virginia"], I = S.incomeTax;
  const BR = I.brackets;
  check("site : 3 baremes identiques, 5 tranches 2,11/2,81/3,16/4,22/4,58",
    ["single", "marriedJoint", "headOfHousehold"].every(st => JSON.stringify(BR[st]) === JSON.stringify([[7500, 0.0211], [18750, 0.0281], [30000, 0.0316], [45000, 0.0422], [Infinity, 0.0458]])));
  check("site : exemption 2 000 / 4 000 / 2 000",
    I.personalExemption.single === 2000 && I.personalExemption.marriedJoint === 4000 && I.personalExemption.headOfHousehold === 2000);
  check("site : aucune deduction standard, credit, palier, programme salarie, impot local",
    !I.standardDeduction && !I.deductionByIncome && !I.slidingDeduction && !I.taxCredit && !I.withholdingAllowances &&
    !I.federalTaxSubtraction && !I.countyTax && !S.employeePrograms && !S.paidLeave);
  const nExempt = { single: 1, marriedJoint: 2, headOfHousehold: 1 };
  let n = 0;
  for (const st of ["single", "marriedJoint", "headOfHousehold"])
    for (const g of [1500, 2000, 4000, 9500, 20000, 20750, 32000, 47000, 52000, 75000, 102000, 120000, 250000, 1500000]) {
      const imposable = Math.max(0, g - 2000 * nExempt[st]);
      const attendu = impot(imposable, SEUILS["two-earner"], TAUX);
      const site = calcul("west-virginia", g, st, 0).etat;
      n++;
      check("moteur " + st + " " + g, Math.abs(site - attendu) < 1e-6, site + " vs " + attendu);
    }
  console.log("  moteur du site vs formule imprimee (TWO EARNER) : " + n + " comparaisons");
  /* exemple a la main : 75 000 $ celibataire */
  const a75 = calcul("west-virginia", 75000, "single", 0);
  check("75 000 $ celibataire : impot d'Etat = 1 462,875 + 28 000 x 4,58 % = 2 745,275", Math.abs(a75.etat - 2745.275) < 1e-6, String(a75.etat));
  check("75 000 $ celibataire : net = 58 847,225", Math.abs(a75.net - 58847.225) < 1e-6, String(a75.net));
  console.log("  75 000 $ celibataire : impot d'Etat " + a75.etat + ", net " + a75.net);
  fin();
})().catch(e => { console.error("ERREUR", e.message); process.exit(2); });

function fin() {
  console.log("\n" + (controles - echecs) + "/" + controles + " controles OK" + (echecs ? ", " + echecs + " ECHEC(S)" : ""));
  process.exit(echecs ? 1 : 0);
}
