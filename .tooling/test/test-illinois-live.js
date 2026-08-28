/* Preuve, dans un VRAI navigateur, que la page Illinois calcule juste.

   Enjeu particulier : c'est le PREMIER Etat du site qui preleve reellement un
   impot sur le revenu. Tous les controles precedents portaient sur des Etats a
   zero, ou une erreur de cablage de l'impot d'Etat serait passee inapercue.
   Ici, un zero a la place de 2 994 $ serait une erreur de 3 000 $ par an
   servie a chaque visiteur.

   Attendu, recalcule A LA MAIN, celibataire, 75 000 $, 2026 :
     federal   : imposable 75 000 - 16 100 = 58 900
                 1 240 + 4 560 + 1 870              =  7 670,00
     SS 4 650,00 + Medicare 1 087,50                =  5 737,50
     Illinois   : imposable 75 000 - 15 000 = 60 000
                 60 000 x 0,0499                    =  2 994,00
     -----------------------------------------------------------
     total                                          = 16 401,50
     net annuel                                     = 58 598,50
     net mensuel                                    =  4 883,21

   Lancer : node .tooling/test/test-illinois-live.js [base]
*/
const { chromium } = require("playwright");

const BASE = process.argv[2] || "https://statelinecalc.com";
const URL = BASE + "/paycheck-calculator/illinois/";
const NET_MENSUEL = 4835.40;
const NET_SANS_IMPOT = 5132.71;   // le net d'un Etat a zero : ne doit PAS apparaitre

(async () => {
  let pass = 0, fail = 0;
  const dire = (ok, label, detail) => {
    console.log((ok ? "  OK    | " : "  ECHEC | ") + label + (detail ? " | " + detail : ""));
    ok ? pass++ : fail++;
  };

  const nav = await chromium.launch();
  const ctx = await nav.newContext();
  const page = await ctx.newPage();
  console.log("\n=== Illinois, sur " + BASE + " ===");

  const erreurs = [];
  page.on("pageerror", e => erreurs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });

  const rep = await page.goto(URL, { waitUntil: "networkidle" });
  dire(rep.status() === 200, "la page repond 200", "HTTP " + rep.status());

  const fiche = await page.evaluate(() => {
    if (typeof RATES_2026 === "undefined") return null;
    const s = RATES_2026.states.illinois;
    if (!s) return null;
    return {
      impot: !!s.incomeTax.hasIncomeTax,
      taux: s.incomeTax.brackets.single[0][1],
      dedSeul: s.incomeTax.standardDeduction.single,
      dedCouple: s.incomeTax.standardDeduction.marriedJoint,
      dedChef: s.incomeTax.standardDeduction.headOfHousehold
    };
  });
  dire(fiche !== null, "la fiche Illinois est servie au navigateur");
  dire(fiche && fiche.impot, "la Illinois est bien declaree comme prelevant un impot");
  dire(fiche && Math.abs(fiche.taux - 0.0495) < 1e-9, "taux 4,95 %", fiche && fiche.taux);
  dire(fiche && fiche.dedSeul === 2925 && fiche.dedCouple === 5850,
       "exoneration 2 925 / 5 850 selon la situation de famille");
  dire(fiche && fiche.dedChef === 2925,
       "chef de famille = 2 925, une seule exoneration", fiche && fiche.dedChef);

  await page.fill("#salary", "75000");
  await page.selectOption("#period", "annual");
  await page.selectOption("#filing", "single");
  await page.fill("#retirement", "0");
  await page.selectOption("#display", "monthly");
  await page.click("button[type=submit]");
  await page.waitForTimeout(500);

  const bloc = (await page.textContent(".result")) || "";
  const montants = [...bloc.matchAll(/\$([\d,]+\.\d{2})/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
  dire(montants.some(v => Math.abs(v - NET_MENSUEL) <= 0.51),
       "net mensuel = 4 883,21 $", montants.map(v => "$" + v.toFixed(2)).join(" "));
  dire(!montants.some(v => Math.abs(v - NET_SANS_IMPOT) <= 0.51),
       "le net d'un Etat SANS impot n'apparait pas ici");
  dire(montants.some(v => Math.abs(v - 297.31) <= 0.51),
       "la ligne d'impot d'Etat vaut bien 297,31 $ par mois (3 567,71 / 12)",
       bloc.replace(/\s+/g, " ").slice(0, 150));

  // Le couple deduit le double : c'est le bug que le moteur avait le 28/08.
  await page.selectOption("#filing", "marriedJoint");
  await page.click("button[type=submit]");
  await page.waitForTimeout(400);
  const blocC = (await page.textContent(".result")) || "";
  const mC = [...blocC.matchAll(/\$([\d,]+\.\d{2})/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
  dire(mC.some(v => Math.abs(v - 285.24) <= 0.6),
       "en couple l'impot d'Etat tombe a 285,24 $/mois ((75 000 - 5 850) x 4,95 % / 12)",
       blocC.replace(/\s+/g, " ").slice(0, 150));
  dire(!mC.some(v => Math.abs(v - 297.31) <= 0.01),
       "le montant du celibataire n'est PAS reutilise pour un couple");

  // Mode horaire.
  await page.selectOption("#filing", "single");
  await page.selectOption("#period", "hourly");
  await page.waitForTimeout(200);
  dire(await page.isVisible("[data-hours-field]"), "le champ heures apparait en mode horaire");
  await page.fill("#salary", "20");
  await page.fill("#hours", "40");
  await page.selectOption("#display", "annual");
  await page.click("button[type=submit]");
  await page.waitForTimeout(500);
  const blocH = (await page.textContent(".result")) || "";
  dire(/33,69\d/.test(blocH), "20 $/h a 40 h donne bien ~33 691 $ net par an",
       blocH.replace(/\s+/g, " ").slice(0, 120));

  const tableaux = await page.evaluate(() =>
    [...document.querySelectorAll("table")].map(t => t.querySelectorAll("tbody tr").length));
  dire(tableaux.filter(n => n === 30).length >= 2,
       "2 tableaux de 30 lignes lisibles sans JS", "lignes: " + tableaux.join(", "));

  const texte = await page.evaluate(() => document.body.innerText);
  dire(/4\.95 percent of net income/i.test(texte), "le taux est cite comme l\'Etat l\'ecrit");
  dire(/not allowed/i.test(texte) && /\$250,000/.test(texte),
       "la falaise de l'exoneration a 250 000 $ est expliquee");
  dire(/financed by employer payroll taxes/i.test(texte),
       "la taxe chomage est citee comme entierement patronale");
  dire(!/\$NaN/.test(texte), "aucun NaN dans la page");

  const liens = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")));
  ["/paycheck-calculator/texas/", "/paycheck-calculator/nevada/",
   "/paycheck-calculator/washington/", "/methodology/"].forEach(l =>
    dire(liens.includes(l), "lien present vers " + l));

  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(200);
  const debord = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dire(debord <= 0, "pas de defilement horizontal a 375 px", debord + "px");

  dire(erreurs.length === 0, "aucune erreur JS ni violation de CSP", erreurs.join(" | ") || "aucune");

  await nav.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
