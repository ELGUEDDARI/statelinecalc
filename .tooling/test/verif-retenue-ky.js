/* Recoupe la formule du Kentucky ET les donnees du site contre les DEUX documents officiels du
 * Kentucky Department of Revenue qui portent la retenue 2026.
 *
 * Sources (lues le 2026-10-07) :
 *  - « 2026 KENTUCKY WITHHOLDING TAX FORMULA », 42A003 (TCF)(10-2025), PDF d'une page :
 *    https://revenue.ky.gov/Forms/2026%20Withholding%20Formula.pdf
 *    « 2026 Kentucky Standard Deduction: $3,360 » ; « 2026 Kentucky Tax Rate: 3.5% of taxable income ».
 *  - « 2026 Employer Withholding Calculator.xlsx » (feuille cachee « Hidden Table », 1 994 formules) :
 *    https://revenue.ky.gov/Business/Documents/2026%20Withholding%20Tax%20Calculator.xlsx
 *
 * Il n'existe PAS de tables imprimees de tranches de salaire au Kentucky : la formule est la seule
 * source ; le tableur du DOR la confirme ligne par ligne et les deux exemples imprimes la recalculent.
 *
 * CE QUE LE SCRIPT FAIT
 * 0. Telecharge les deux fichiers, les lit (ky-tables-extract.py : PyMuPDF + XML du classeur).
 * 1. PDF : deduction 3 360, taux 3,5 % ; les 2 exemples imprimes recalcules a la main.
 *    CONSTAT (07/10/2026) : l'exemple bimensuel imprime « $35,730 x 3.5% = $1,247.40 » (35 640 x 3,5 %
 *    = 1 247,40, donc 35 730 est une coquille) et « $47 » (47,98 tronque). Signales, pas des echecs.
 * 2. Classeur : les 1 994 formules cachees ont exactement la meme forme, avec 3360 et 3.5 ; les codes de
 *    frequence donnent N = 365, 52, 26, 24, 12, 1 ; les formules visibles bornent la retenue a 0.
 * 3. TEMOIN NEGATIF : avec le taux 2025 (4 %) ou la deduction 2025 (3 270 $), la formule differe.
 * 4. Moteur du site : si data/rates-2026.js contient deja le bloc kentucky (phase 2), il est lu ; sinon
 *    le script lit le bloc pret a coller indique par la variable d'environnement KY_BLOC. Compare la
 *    deduction aux 3 statuts, le taux, et l'impot d'Etat annuel du moteur a la formule, a 10 salaires.
 *
 * Lancer : node .tooling/test/verif-retenue-ky.js   (necessite python + PyMuPDF)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const U_PDF = "https://revenue.ky.gov/Forms/2026%20Withholding%20Formula.pdf";
const U_XLS = "https://revenue.ky.gov/Business/Documents/2026%20Withholding%20Tax%20Calculator.xlsx";
const pdf = path.join(os.tmpdir(), "ky-formula-26.pdf"), xls = path.join(os.tmpdir(), "ky-calc-26.xlsx");
const TAUX = 0.035, DED = 3360;
const KY_BLOC = process.env.KY_BLOC || "";

function telecharge(url, dest) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" } }, r => {
      if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode + " " + url));
      const out = fs.createWriteStream(dest);
      r.pipe(out); out.on("finish", () => out.close(ok));
    }).on("error", ko);
  });
}
/* Formule du DOR : (S x N - D) x taux / N, plancher a 0 (le tableur : IF(H>0, H, 0)). */
const W = (s, n, d, taux) => Math.max(0, (s * n - d) * taux / n);
const c2 = x => Math.round(x * 100) / 100;

(async () => {
  let echecs = 0;
  const check = (nom, ok, detail) => { console.log((ok ? "OK    " : "ECHEC ") + nom + (detail ? "  " + detail : "")); if (!ok) echecs++; };
  await telecharge(U_PDF, pdf); await telecharge(U_XLS, xls);
  const txt = execFileSync("python", [path.join(__dirname, "ky-tables-extract.py"), pdf, xls],
    { maxBuffer: 1 << 28, env: { ...process.env, PYTHONIOENCODING: "utf8" } }).toString();
  const { pdf: P, xlsx: X } = JSON.parse(txt);

  check("PDF : 1 page, deduction 2026 = 3 360 $", P.pages === 1 && P.deduction === DED, P.deduction + " $");
  check("PDF : taux 2026 = 3,5 %", P.taux === TAUX, (P.taux * 100) + " %");
  check("PDF : 2 exemples imprimes lus", P.exemples.length === 2, P.exemples.length + " / 2");
  for (const e of P.exemples) {
    const impo = e.salaire * e.periodes - DED, imp = c2(impo * TAUX), ret = c2(imp / e.periodes);
    check("exemple " + e.freq + " : imposable " + impo + ", impot annuel " + imp, impo === e.imposable && Math.abs(imp - e.impot_annuel) < 0.005);
    if (Math.abs(ret - e.retenue) < 0.005) check("exemple " + e.freq + " : retenue imprimee = " + ret, true);
    else console.log("CONSTAT exemple " + e.freq + " : retenue recalculee " + ret + ", imprimee " + e.retenue +
      (e.imposable_dans_ligne3 !== e.imposable ? " ; ligne 3 imprime " + e.imposable_dans_ligne3 + " au lieu de " + e.imposable : ""));
  }
  const mensuel = P.exemples.find(e => e.freq === "monthly");
  check("exemple mensuel : 104,65 $ imprime = 104,65 $ recalcule", mensuel && c2(W(3270, 12, DED, TAUX)) === 104.65 && mensuel.retenue === 104.65);
  check("exemple bimensuel recalcule : 47,98 $ (le PDF imprime 47 $ : troncature)", c2(W(1500, 26, DED, TAUX)) === 47.98);

  const cachees = X.formules.filter(f => f.cachee), visibles = X.formules.filter(f => !f.cachee);
  const gabarit = f => f.replace(/C\d+/g, "Cn").replace(/B\d+/g, "Bn");
  check("classeur : 1 994 formules dans la feuille cachee", cachees.length === 1994, cachees.length + "");
  check("classeur : les 1 994 formules cachees ont toutes la meme forme", new Set(cachees.map(f => gabarit(f.f))).size === 1);
  check("classeur : cette forme contient -3360)*(3.5/100)", cachees[0].f.includes("-3360)*(3.5/100))/VLOOKUP"));
  check("classeur : les formules visibles bornent a 0 (IF(H>0, H, 0))", visibles.length === 1994 && visibles.every(f => /^IF\('Hidden Table'!H\d+>0,'Hidden Table'!H\d+,0\)$/.test(f.f)));
  const N = { 12: 1, 2: 12, 4: 24, 3: 52, 5: 26, 10: 365 };
  check("classeur : periodes 1, 12, 24, 52, 26, 365 (Annual, Monthly, Semi-Monthly, Weekly, Bi-Weekly, Daily)",
    Object.entries(N).every(([k, v]) => Number(X.periodes[k]) === v), JSON.stringify(X.periodes));

  /* Temoin negatif : taux 2025 (K-4 2025 : 4 %) ou deduction 2025 (3 270 $). */
  let diffTaux = 0, diffDed = 0;
  for (const s of [30000, 52000, 75000, 250000]) {
    if (Math.abs(W(s, 1, DED, 0.04) - W(s, 1, DED, TAUX)) > 0.01) diffTaux++;
    if (Math.abs(W(s, 1, 3270, TAUX) - W(s, 1, DED, TAUX)) > 0.01) diffDed++;
  }
  check("temoin negatif : taux 4 % et deduction 3 270 $ donnent un autre resultat aux 4 salaires", diffTaux === 4 && diffDed === 4);

  /* Moteur du site. */
  const { R, calcul } = require("../lib/paie.js");
  let K = R.states.kentucky, origine = "data/rates-2026.js";
  if (!K) {
    if (!KY_BLOC) console.log("INFO  bloc kentucky absent de data/rates-2026.js ; passer KY_BLOC=<chemin du bloc pret a coller> pour tester le moteur");
    else {
      const t = fs.readFileSync(KY_BLOC, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      R.states.kentucky = new Function("return {" + t.slice(t.indexOf("kentucky:")) + "}")().kentucky;
      K = R.states.kentucky; origine = KY_BLOC;
    }
  }
  if (K) {
    console.log("INFO  bloc lu : " + origine);
    const A = K.incomeTax, ST = ["single", "marriedJoint", "headOfHousehold"];
    check("site : une tranche a 3,5 % aux 3 statuts", ST.every(s => JSON.stringify(A.brackets[s]) === JSON.stringify([[Infinity, TAUX]])));
    check("site : deduction standard 3 360 aux 3 statuts", ST.every(s => A.standardDeduction[s] === DED));
    check("site : aucune exemption, aucun programme salarie, aucun impot local", !A.personalExemption && !A.countyTax && !K.employeePrograms && !K.paidLeave);
    let pire = 0, n = 0;
    for (const st of ST)
      for (const g of [900, 3000, 3360, 3361, 30000, 52000, 75000, 100001, 250000, 1500000]) {
        const e = calcul("kentucky", g, st, 0).etat, f = W(g, 1, DED, TAUX);
        pire = Math.max(pire, Math.abs(e - f)); n++;
      }
    check("moteur : impot d'Etat annuel = formule du DOR sur " + n + " cas (3 statuts x 10 salaires)", pire < 0.005, "ecart max " + pire.toFixed(6));
    let pireP = 0;
    for (const n2 of [52, 26, 24, 12])
      for (const s of [200, 1500, 3270, 6250, 20000]) {
        const dor = W(s, n2, DED, TAUX), site = calcul("kentucky", s * n2, "single", 0).etat / n2;
        pireP = Math.max(pireP, Math.abs(dor - site));
      }
    check("moteur : retenue par paie (52, 26, 24, 12 periodes) = formule du DOR", pireP < 0.005, "ecart max " + pireP.toFixed(6));
  }
  console.log(echecs ? "\n" + echecs + " ECHEC(S)" : "\nTOUT PASSE");
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error("ERREUR", e.message); process.exit(2); });
