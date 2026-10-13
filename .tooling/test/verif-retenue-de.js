/* Recoupe la formule du Delaware ET les donnees du site contre les TABLES IMPRIMEES de la Division of Revenue.
 *
 * Sources (lues le 2026-10-13) :
 *   - « Employer's Guide (Withholding Regulations and Employer's Duties) »
 *     https://revenue.delaware.gov/employers-guide-withholding-regulations-employers-duties/
 *     Section 17 (methode annualisee, table « Tax Computation Table Effective January 1, 2025 »)
 *     et Section 24 (tables de retenue « Effective January 1, 2025 (No changes from January 1, 2014) »).
 *   - Les cinq PDF de la Section 24 :
 *     https://revenuefiles.delaware.gov/docs/{daily16,weekly16,bi-wk16,semi-mth16,month16}.pdf
 *
 * ⚠️ Le Delaware n'a publie AUCUNE table etiquetee 2026. La page Employer's Guide, modifiee le 2026-01-09
 * d'apres ses metadonnees, porte encore « Effective January 1, 2025 ». Ce script ECHOUE si cette etiquette
 * disparait ou change : ce serait le signe d'un nouveau bareme a relire.
 *
 * CE QUE LE SCRIPT FAIT
 * 1. Lit la page du guide : table de calcul (Pay / Plus / On Amounts Over), deduction standard 3 250 / 6 500,
 *    credit de 110 $, facteurs d'annualisation (300 / 52 / 26 / 24 / 12), etiquette « Effective January 1, 2025 ».
 *    Controle que les bases imprimees se recoupent entre elles (cumul des tranches) : ecart ZERO exige.
 * 2. Lit les cinq PDF (de-tables-extract.py) et compare CHAQUE cellule imprimee (lignes x 9 colonnes de
 *    « credits », 5 periodes) a la formule annualisee au MILIEU de la ligne de salaire, celibataire.
 *    Ecart maximal exige : 0,005 $ (= l'arrondi au cent de l'agence). Mesure, pas suppose.
 * 3. TEMOIN NEGATIF : avec le taux superieur de 2011 (6,95 %), une cellule du haut de table ne se recoupe plus.
 * 4. Moteur du site : le bloc "delaware" de data/rates-2026.js. Compare deduction, credit, tranches et impot
 *    d'Etat annuel du moteur (calcul()) a la formule imprimee, aux 3 statuts, a 14 salaires.
 *
 * Lancer : node .tooling/test/verif-retenue-de.js   (necessite python avec pypdf)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const BASE = "https://revenuefiles.delaware.gov/docs/";
const GUIDE = "https://revenue.delaware.gov/employers-guide-withholding-regulations-employers-duties/";
const dossier = path.join(os.tmpdir(), "de-tables-2025");
fs.mkdirSync(dossier, { recursive: true });

function telecharge(url, dest) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" } }, r => {
      if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode + " " + url));
      const chunks = [];
      r.on("data", c => chunks.push(c));
      r.on("end", () => { fs.writeFileSync(dest, Buffer.concat(chunks)); ok(); });
    }).on("error", ko);
  });
}

let echecs = 0, controles = 0;
function check(nom, ok, detail) {
  controles++;
  if (!ok) { echecs++; console.log("  ECHEC | " + nom + (detail ? "  -> " + detail : "")); }
}

/* Formule imprimee : (limite haute du palier, taux). Base = cumul. */
const PALIERS = [[2000, 0], [5000, 0.022], [10000, 0.039], [20000, 0.048], [25000, 0.052], [60000, 0.0555], [Infinity, 0.066]];
const PALIERS_2011 = PALIERS.map(([h, r], i) => i === 6 ? [h, 0.0695] : [h, r]);
const impot = (t, paliers = PALIERS) => {
  let du = 0, bas = 0;
  for (const [haut, taux] of paliers) { if (t > bas) du += (Math.min(t, haut) - bas) * taux; bas = haut; }
  return du;
};
const DED = { single: 3250, marriedJoint: 6500, headOfHousehold: 3250 };
const CRED = { single: 110, marriedJoint: 220, headOfHousehold: 110 };
const PERIODES = { daily: 300, weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };

(async () => {
  /* 1. le guide */
  const html = await new Promise((ok, ko) => https.get(GUIDE, { headers: { "User-Agent": "Mozilla/5.0 Chrome/128" } }, r => {
    if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode));
    let s = ""; r.setEncoding("utf8"); r.on("data", c => s += c); r.on("end", () => ok(s));
  }).on("error", ko));
  const texte = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "\n").replace(/&#8211;/g, "–").replace(/&#8217;/g, "’")
    .replace(/&amp;/g, "&").replace(/\s*\n\s*/g, "\n");
  check("guide : « Tax Computation Table Effective January 1, 2025 »", /Tax Computation Table Effective January 1, 2025/.test(texte));
  check("guide : tables « Effective January 1, 2025 (No changes from January 1, 2014) »", /Effective January 1, 2025 \(No changes from January 1, 2014\)/.test(texte));
  check("guide : aucune etiquette 2026 sur les tables ou le bareme", !/Effective January 1, 2026/.test(texte));
  check("guide : deduction standard 3 250 $ / 6 500 $",
    /\$3,250 if the taxpayer is single, \$6,500 for married filing jointly/.test(texte));
  check("guide : credit de 110 $", /Multiply the number of employee.s personal exemption by \$110/.test(texte));
  check("guide : facteurs d'annualisation", /daily gross by 300, weekly gross by 52, monthly gross by 12, semi-monthly gross by 24 and bi-weekly by 26/.test(texte));
  check("guide : exemple imprime 21 750 $ -> 741 + 91", /Tax on \$21,750\.00 \(\$741\.00 \+ \$91\.00 \[\$1,750\.00 x 5\.20%\]\)/.test(texte));
  const i0 = texte.indexOf("Tax Computation Table Effective January 1, 2025");
  const bloc = texte.slice(i0, i0 + 700).split("\n");
  const iPay = bloc.indexOf("Pay"), iPlus = bloc.indexOf("Plus"), iOver = bloc.indexOf("On Amounts Over");
  check("guide : colonnes Pay / Plus / On Amounts Over lues", iPay > 0 && iPlus > iPay && iOver > iPlus);
  const lis = (a, b) => bloc.slice(a + 1, b).map(x => parseFloat(x.replace(/[$,%]/g, "")));
  const pay = lis(iPay, iPlus), plus = lis(iPlus, iOver), over = bloc.slice(iOver + 1, iOver + 8).map(x => parseFloat(x.replace(/[$,]/g, "")));
  check("guide : 7 lignes", pay.length === 7 && plus.length === 7 && over.length === 7, pay.length + "/" + plus.length + "/" + over.length);
  check("guide : seuils 0 / 2 000 / 5 000 / 10 000 / 20 000 / 25 000 / 60 000", JSON.stringify(over) === JSON.stringify([0, 2000, 5000, 10000, 20000, 25000, 60000]), JSON.stringify(over));
  check("guide : taux 0 / 2,20 / 3,90 / 4,80 / 5,20 / 5,55 / 6,60 %", JSON.stringify(plus) === JSON.stringify([0, 2.2, 3.9, 4.8, 5.2, 5.55, 6.6]), JSON.stringify(plus));
  let ecartBases = 0;
  over.forEach((s, i) => { ecartBases = Math.max(ecartBases, Math.abs(pay[i] - impot(s))); });
  check("guide : bases imprimees = cumul des tranches (ecart zero)", ecartBases < 1e-9, String(ecartBases));
  console.log("Guide : bases " + pay.join(" / ") + " -> ecart au cumul " + ecartBases.toFixed(6));

  /* 2. les cinq PDF */
  for (const n of ["daily16", "weekly16", "bi-wk16", "semi-mth16", "month16"]) await telecharge(BASE + n + ".pdf", path.join(dossier, n + ".pdf"));
  const T = JSON.parse(execFileSync("python", ["-I", path.join(__dirname, "de-tables-extract.py"), dossier],
    { encoding: "utf8", env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }), maxBuffer: 1 << 26 }));
  let cellules = 0, pire = 0, pireNom = "";
  for (const [periode, P] of Object.entries(PERIODES)) {
    const L = T[periode].lignes;
    check(periode + " : au moins 100 lignes lues", L.length >= 100, String(L.length));
    check(periode + " : premiere ligne a 0 $", L[0][0] === 0);
    let trous = 0;
    L.forEach((l, i) => { if (i && L[i - 1][1] !== l[0]) trous++; });
    check(periode + " : lignes contigues (aucun trou)", trous === 0, trous + " trous");
    for (const [bas, haut, cs] of L) {
      const mid = (bas + haut) / 2;
      cs.forEach((c, n) => {
        const f = Math.max(0, impot(mid * P - DED.single) - CRED.single * n) / P;
        const e = Math.abs(f - c);
        cellules++;
        if (e > pire) { pire = e; pireNom = periode + " " + bas + "-" + haut + " credits " + n + " : imprime " + c + " formule " + f.toFixed(4); }
      });
    }
  }
  check("tables : ecart maximal a la formule <= 0,005 $", pire <= 0.005 + 1e-9, pireNom);
  console.log("Tables : " + cellules + " cellules lues (5 periodes x lignes x 9 colonnes), ecart maximal " + pire.toFixed(4) + " $ (" + pireNom + ")");

  /* 3. temoin negatif : le taux de 2011 (6,95 %) ne se recoupe pas sur les hauts salaires */
  const hautMensuel = T.monthly.lignes[T.monthly.lignes.length - 1];
  const midH = (hautMensuel[0] + hautMensuel[1]) / 2;
  const avec2011 = Math.max(0, impot(midH * 12 - 3250, PALIERS_2011)) / 12;
  const avecActuel = Math.max(0, impot(midH * 12 - 3250)) / 12;
  check("temoin negatif : la derniere ligne mensuelle se recoupe avec 6,60 % et PAS avec 6,95 %",
    Math.abs(avecActuel - hautMensuel[2][0]) <= 0.005 + 1e-9 && Math.abs(avec2011 - hautMensuel[2][0]) > 0.5,
    "imprime " + hautMensuel[2][0] + " actuel " + avecActuel.toFixed(2) + " 2011 " + avec2011.toFixed(2));

  /* 4. moteur du site */
  const R = require(path.join(__dirname, "..", "..", "data", "rates-2026.js"));
  const { calcul } = require(path.join(__dirname, "..", "lib", "paie.js"));
  const D = R.states.delaware;
  check("moteur : bloc delaware present", !!D);
  if (D) {
    for (const st of Object.keys(DED)) {
      check("moteur : deduction " + st, D.incomeTax.standardDeduction[st] === DED[st]);
      check("moteur : credit " + st, D.incomeTax.taxCredit.base[st] === CRED[st]);
      check("moteur : tranches " + st, JSON.stringify(D.incomeTax.brackets[st]) === JSON.stringify(PALIERS));
    }
    let maxEcart = 0, n = 0;
    for (const st of Object.keys(DED)) {
      for (const g of [10000, 20000, 25000, 30000, 40000, 50000, 60000, 75000, 90000, 100000, 120000, 150000, 200000, 250000]) {
        const attendu = Math.max(0, impot(g - DED[st]) - CRED[st]);
        const obtenu = calcul("delaware", g, st).etat;
        maxEcart = Math.max(maxEcart, Math.abs(attendu - obtenu)); n++;
      }
    }
    check("moteur : impot d'Etat = formule imprimee (3 statuts x 14 salaires)", maxEcart < 1e-6, String(maxEcart));
    console.log("Moteur : " + n + " calculs, ecart maximal a la formule imprimee " + maxEcart.toExponential(2) + " $");
    check("moteur : exemple imprime 25 000 $ celibataire = 722,00 $", Math.abs(calcul("delaware", 25000).etat - 722) < 1e-9, String(calcul("delaware", 25000).etat));
    const pl = D.employeePrograms || [];
    check("moteur : une seule retenue salariee, 0,40 % jusqu'a 184 500 $", pl.length === 1 && pl[0].rate === 0.004 && pl[0].wageCap === 184500);
  }

  console.log("\n" + controles + " controles, " + echecs + " echec(s)");
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.log("ERREUR : " + e.message); process.exit(2); });
