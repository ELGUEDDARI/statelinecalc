/* Recoupe la formule de la Louisiane ET les donnees du site contre les TABLES IMPRIMEES du
 * Louisiana Department of Revenue lui-meme.
 *
 * Source : « Louisiana Withholding Tables and Formulas », R-1306 (1/26), « Effective on or
 * after January 1, 2026 », https://dam.ldr.la.gov/taxforms/1306-1-26.pdf (21 pages ; formule p. 2,
 * tables p. 3-21, 735 lignes : jour 189, semaine 96, quinzaine 96, bimensuel 104, mois 104, annee 246).
 * Formules du PDF : W = S x 0,0309 (colonne 0) ; W = (S - 12 875/N) x 0,0309 (colonne 1) ;
 * W = (S - 25 750/N) x 0,0309 (colonne 2) ; « if any of the variables in the formula are negative, the
 * negative variable should be considered zero ».
 * FAQ du DOR : « The “midpoint of salary ranges” refers to the midpoint of the minimum and maximum
 * provided for each salary range of the withholding table. »
 *
 * CE QUE LE SCRIPT FAIT
 * 0. Telecharge le PDF, le lit par COORDONNEES (la-tables-extract.py, PyMuPDF).
 * 1. Pour chaque ligne et chaque colonne : recalcule W = max(0, S_milieu - D/N) x 0,0309 et exige
 *    l'egalite au centime imprime (tolerance 0,011 : arrondi de l'agence).
 * 2. Verifie que le seuil « (Add 3.09% for amounts in excess of $X) » de chaque periode est bien
 *    le haut de la derniere ligne imprimee.
 * 3. TEMOIN NEGATIF : la meme formule avec un taux de 3 % doit echouer presque partout.
 * 4. Si data/rates-2026.js contient deja le bloc louisiana (phase 2), le compare a la formule : deduction
 *    standard aux 3 statuts, taux, et impot d'Etat annuel du moteur contre la formule a 11 salaires.
 *
 * Lancer : node .tooling/test/verif-retenue-la.js   (necessite python + PyMuPDF)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const URL = "https://dam.ldr.la.gov/taxforms/1306-1-26.pdf";
const pdf = path.join(os.tmpdir(), "la-r1306-26.pdf");
const TAUX = 0.0309, D1 = 12875, D2 = 25750;
/* CONSTAT (06/10/2026) : le texte de la formule (p. 2) dit « Daily payroll 365 », mais les 189 lignes de la table
   journaliere ne se recoupent qu'avec N = 260 (12 875 / 260 = 49,52 $ par jour) : avec 365, 333 cellules sur 567 s'ecartent ;
   avec 260, aucune. Les cinq autres periodes se recoupent avec le N imprime. Le site ne chiffre pas la paie journaliere. */
const N = { Daily: 260, Weekly: 52, Biweekly: 26, "Semi-Monthly": 24, Monthly: 12, Annual: 1 };

function telecharge(url) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" } }, r => {
      if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode));
      const out = fs.createWriteStream(pdf);
      r.pipe(out); out.on("finish", () => out.close(ok));
    }).on("error", ko);
  });
}
const W = (s, d, n, taux) => Math.max(0, s - d / n) * taux;

(async () => {
  let echecs = 0;
  const check = (nom, ok, detail) => { console.log((ok ? "OK    " : "ECHEC ") + nom + (detail ? "  " + detail : "")); if (!ok) echecs++; };
  await telecharge(URL);
  const txt = execFileSync("python", [path.join(__dirname, "la-tables-extract.py"), pdf], { maxBuffer: 1 << 28, env: { ...process.env, PYTHONIOENCODING: "utf8" } }).toString();
  const { rows, excess } = JSON.parse(txt);
  const attendu = { Daily: 189, Weekly: 96, Biweekly: 96, "Semi-Monthly": 104, Monthly: 104, Annual: 246 };
  for (const p of Object.keys(attendu))
    check("lignes lues, " + p, rows.filter(r => r.periode === p).length === attendu[p], rows.filter(r => r.periode === p).length + " / " + attendu[p]);

  let cellules = 0, mauvaises = 0, pire = 0, temoin = 0, positives = 0;
  for (const r of rows) {
    const n = N[r.periode], s = (r.lo + r.hi) / 2;
    [0, D1, D2].forEach((d, i) => {
      cellules++;
      const e = Math.abs(W(s, d, n, TAUX) - r.cells[i]);
      pire = Math.max(pire, e);
      if (e > 0.011) { mauvaises++; if (mauvaises < 6) console.log("   ecart", r.periode, r.lo, r.hi, "col", i, "imprime", r.cells[i], "formule", W(s, d, n, TAUX).toFixed(4)); }
      if (r.cells[i] > 0) { positives++; if (Math.abs(W(s, d, n, 0.03) - r.cells[i]) > 0.011) temoin++; }
    });
  }
  check("toutes les cellules imprimees (" + cellules + ") = formule du PDF a 0,011 $ pres", mauvaises === 0, "ecart max " + pire.toFixed(4));
  check("temoin negatif : a 3 % la formule echoue sur la plupart des cellules (>90 % des cellules non nulles)", temoin / positives > 0.9, (100 * temoin / positives).toFixed(1) + " % de " + positives + " cellules non nulles");
  for (const e of excess) {
    const derniere = rows.filter(r => r.periode === e.periode).pop();
    check("seuil « excess of » = haut de la derniere ligne, " + e.periode, derniere.hi === e.seuil, e.seuil + " / " + derniere.hi);
  }

  /* Phase 2 : les donnees du site. */
  const { R, calcul } = require("../lib/paie.js");
  const L = R.states.louisiana;
  if (!L) { console.log("(bloc louisiana absent de data/rates-2026.js : controle du site ignore)"); }
  else {
    const I = L.incomeTax;
    check("deduction standard du site = 12 875 / 25 750 / 25 750", JSON.stringify(I.standardDeduction) === JSON.stringify({ single: D1, marriedJoint: D2, headOfHousehold: D2 }));
    check("taux du site = 3,09 % pour les trois statuts", ["single", "marriedJoint", "headOfHousehold"].every(s => I.brackets[s].length === 1 && I.brackets[s][0][1] === TAUX && I.brackets[s][0][0] === Infinity));
    check("aucune exemption, aucun credit, aucune deduction par palier", !I.personalExemption && !I.deductionByIncome && !I.slidingDeduction && !I.federalTaxSubtraction && !I.countyTax);
    let ecart = 0;
    for (const [st, d] of [["single", D1], ["marriedJoint", D2], ["headOfHousehold", D2]])
      for (const g of [3000, 12875, 12876, 25750, 30000, 52000, 75000, 100300, 250000, 1500000]) {
        if (Math.abs(calcul("louisiana", g, st, 0).etat - Math.max(0, g - d) * TAUX) > 0.005) ecart++;
      }
    check("impot d'Etat du moteur = formule annuelle (3 statuts x 10 salaires)", ecart === 0);
  }
  console.log("\n" + (echecs === 0 ? "TOUT PASSE" : echecs + " ECHEC(S)"));
  process.exit(echecs === 0 ? 0 : 1);
})().catch(e => { console.error("ERREUR", e.message); process.exit(2); });
