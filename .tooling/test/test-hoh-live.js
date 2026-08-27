/* Preuve, dans un VRAI navigateur et sur l'URL PUBLIQUE, que le correctif
   "Head of household" du 27/08/2026 est bien servi au visiteur.

   Pourquoi ce fichier existe : test-engine.js prouve que le calcul est juste
   en local. Il ne prouve pas que le navigateur telecharge la bonne version du
   fichier. Un CDN qui sert encore l'ancien JS donnerait 22 tests verts et un
   chiffre faux a l'ecran.

   Attendu, recalcule A LA MAIN (IRS Rev. Proc. 2025-32, TABLE 2) :
     brut 75 000, head of household, Washington, pas de 401(k)
     imposable = 75 000 - 24 150 = 50 850
     federal   = 1 770 + (50 850 - 17 700) x 0,12 = 5 748,00
     SS 4 650,00 + Medicare 1 087,50 + Paid Leave 605,37 + WA Cares 435,00
     total     = 12 525,87
     net annuel= 62 474,13   ->   net mensuel = 5 206,18

   Avant le correctif, le meme visiteur voyait le bareme "single" :
     federal 7 670,00 -> net mensuel 5 046,01. Soit 160,17 $/mois de trop.

   Lancer : node .tooling/test/test-hoh-live.js
*/
const { chromium } = require("playwright");

const URL = "https://statelinecalc.com/paycheck-calculator/washington/";
const ATTENDU_MENSUEL = 5206.18;
const AVANT_CORRECTIF = 5046.01;

(async () => {
  let pass = 0, fail = 0;
  const dire = (ok, label, detail) => {
    console.log((ok ? "  OK    | " : "  ECHEC | ") + label + (detail ? " | " + detail : ""));
    ok ? pass++ : fail++;
  };

  const nav = await chromium.launch();
  const ctx = await nav.newContext();               // profil ephemere, jamais celui de la machine
  const page = await ctx.newPage();

  console.log("\n=== Head of household, sur l'URL publique ===");
  await page.goto(URL, { waitUntil: "networkidle" });

  // Le fichier servi contient-il bien le nouveau bareme ?
  const rates = await page.evaluate(() =>
    typeof RATES_2026 !== "undefined" && RATES_2026.federal.brackets.headOfHousehold
      ? RATES_2026.federal.brackets.headOfHousehold[0][0] : null);
  dire(rates === 17700, "le bareme HoH servi commence a 17 700", String(rates));

  // Le visiteur choisit Head of household sur un salaire de 75 000 $ par an,
  // resultat affiche au mois, 401(k) a 0, WA Cares inclus (valeurs par defaut).
  await page.fill("#salary", "75000");
  await page.selectOption("#period", "annual");
  await page.selectOption("#filing", "headOfHousehold");
  await page.fill("#retirement", "0");
  await page.selectOption("#display", "monthly");
  await page.click("button[type=submit]");
  await page.waitForTimeout(500);

  const texte = (await page.textContent(".result")) || "";
  const montants = [...texte.matchAll(/\$([\d,]+\.\d{2})/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
  const trouve = montants.some(v => Math.abs(v - ATTENDU_MENSUEL) <= 0.51);
  dire(trouve, "net mensuel HoH = 5 206,18 $", montants.map(v => "$" + v.toFixed(2)).join(" "));

  const ancien = montants.some(v => Math.abs(v - AVANT_CORRECTIF) <= 0.51);
  dire(!ancien, "le chiffre d'AVANT le correctif (5 046,01) a disparu");

  await nav.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
