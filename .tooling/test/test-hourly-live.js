/* Preuve, dans un VRAI navigateur, que la saisie horaire marche.

   Prend une URL de base en argument, pour pouvoir tourner AVANT publication
   sur un serveur local, puis APRES sur l'URL publique :
     node .tooling/test/test-hourly-live.js http://127.0.0.1:8765
     node .tooling/test/test-hourly-live.js            (defaut : le site en ligne)

   Attendu, recalcule A LA MAIN — 30 $/h, 40 h/semaine, Nevada, celibataire :
     annuel    = 30 x 40 x 52 = 62 400
     imposable = 62 400 - 16 100 = 46 300
     federal   = 1 240 + 4 068 = 5 308,00
     SS 3 868,80 + Medicare 904,80 + Etat 0
     total     = 10 081,60
     net       = 52 318,40  ->  25,15 $ par heure  ->  4 359,87 $ par mois

   Et le piege qu'on refuse : a 35 h/semaine le brut annuel tombe a 54 600 $,
   donc le net NE DOIT PAS etre le meme. Un calculateur qui suppose 2 080 h
   donnerait le meme resultat dans les deux cas.
*/
const { chromium } = require("playwright");

const BASE = process.argv[2] || "https://statelinecalc.com";
const URL = BASE.replace(/\/$/, "") + "/paycheck-calculator/nevada/";

const NET_HORAIRE = 25.15;
const NET_MENSUEL = 4359.87;      // 52 318,40 / 12

(async () => {
  let pass = 0, fail = 0;
  const dire = (ok, label, detail) => {
    console.log((ok ? "  OK    | " : "  ECHEC | ") + label + (detail ? " | " + detail : ""));
    ok ? pass++ : fail++;
  };
  const montants = t => [...t.matchAll(/\$([\d,]+\.\d{2})/g)]
    .map(m => parseFloat(m[1].replace(/,/g, "")));

  const nav = await chromium.launch();
  const page = await (await nav.newContext()).newPage();
  const erreurs = [];
  page.on("pageerror", e => erreurs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });

  console.log("\n=== Saisie horaire — " + URL + " ===");
  await page.goto(URL, { waitUntil: "networkidle" });

  // 1. Le champ "heures par semaine" doit etre CACHE tant qu'on est en annuel.
  dire(await page.isHidden("[data-hours-field]"),
       "heures/semaine cache quand la saisie est annuelle");

  // 2. La fonction de conversion, telle qu'elle tourne vraiment sur la page.
  const conv = await page.evaluate(() => {
    const f = window.StateLineCalc && window.StateLineCalc.periodsPerYear;
    if (!f) return null;
    return {
      h40: f("hourly", 40), h35: f("hourly", 35), annuel: f("annual"),
      vide: f("hourly", ""), zero: f("hourly", 0), absurde: f("hourly", 500)
    };
  });
  dire(conv !== null, "periodsPerYear est exposee pour les tests");
  dire(conv && conv.h40 === 2080, "40 h/sem -> 2 080 h/an", conv && conv.h40);
  dire(conv && conv.h35 === 1820, "35 h/sem -> 1 820 h/an", conv && conv.h35);
  dire(conv && conv.annuel === 1, "annuel -> 1", conv && conv.annuel);
  dire(conv && conv.vide === 2080 && conv.zero === 2080,
       "saisie vide ou zero retombe sur 40 h, sans planter");
  dire(conv && conv.absurde === 168 * 52,
       "500 h/semaine est plafonne a 168", conv && conv.absurde);

  // 3. Le champ apparait quand on passe en horaire.
  await page.selectOption("#period", "hourly");
  await page.waitForTimeout(300);
  dire(await page.isVisible("[data-hours-field]"),
       "heures/semaine apparait quand la saisie passe en horaire");

  // 4. Le calcul, affiche par heure.
  await page.fill("#salary", "30");
  await page.fill("#hours", "40");
  await page.selectOption("#display", "hourly");
  await page.click("button[type=submit]");
  await page.waitForTimeout(400);
  let v = montants((await page.textContent(".result")) || "");
  dire(v.some(x => Math.abs(x - NET_HORAIRE) <= 0.02),
       "30 $/h brut -> 25,15 $/h net", v.map(x => "$" + x.toFixed(2)).join(" "));

  // 5. Le meme calcul, affiche par mois.
  await page.selectOption("#display", "monthly");
  await page.click("button[type=submit]");
  await page.waitForTimeout(400);
  v = montants((await page.textContent(".result")) || "");
  dire(v.some(x => Math.abs(x - NET_MENSUEL) <= 0.51),
       "le meme salaire -> 4 359,87 $/mois", v.map(x => "$" + x.toFixed(2)).join(" "));
  const netMensuel40 = v.find(x => Math.abs(x - NET_MENSUEL) <= 0.51);

  // 6. Le piege des 2 080 h : 35 h/semaine doit donner AUTRE CHOSE.
  await page.fill("#hours", "35");
  await page.click("button[type=submit]");
  await page.waitForTimeout(400);
  v = montants((await page.textContent(".result")) || "");
  const change = v.every(x => Math.abs(x - netMensuel40) > 1);
  dire(change, "35 h/sem donne un resultat DIFFERENT de 40 h/sem",
       v.map(x => "$" + x.toFixed(2)).join(" "));

  // 7. Retour en annuel : le champ heures se recache.
  await page.selectOption("#period", "annual");
  await page.selectOption("#display", "monthly");
  await page.waitForTimeout(300);
  dire(await page.isHidden("[data-hours-field]"),
       "heures/semaine se recache en revenant a l'annuel");

  dire(erreurs.length === 0, "aucune erreur JS ni violation de CSP",
       erreurs.join(" | ") || "aucune");

  await nav.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
