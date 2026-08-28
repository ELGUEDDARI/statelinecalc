/* Preuve, dans un VRAI navigateur, que la page Florida calcule juste, n'applique
   AUCUNE retenue d'Etat, et que les citations constitutionnelles qui font tout
   l'interet de la page sont bien servies dans le HTML.

   Le risque propre a cette page : le moteur est partage avec Washington et le
   Nevada. Si la fiche Florida etait mal cablee, le visiteur verrait les retenues
   de Washington (Paid Leave, WA Cares) sur une page Florida. Le test moteur le
   verifie hors ligne ; celui-ci le verifie sur ce qui est reellement servi.

   Attendu, recalcule A LA MAIN :
     brut 75 000, celibataire, Florida, pas de 401(k)
     imposable = 75 000 - 16 100 = 58 900
     federal   = 1 240 + 4 560 + 1 870 = 7 670,00
     SS 4 650,00 + Medicare 1 087,50 + Etat 0,00
     total     = 13 407,50
     net       = 61 592,50   ->   net mensuel = 5 132,71

   Les chiffres sont identiques au Nevada, et c'est NORMAL : les deux Etats ne
   prelevent rien. Ce qui doit differer, c'est le contenu, pas l'arithmetique.

   Lancer : node .tooling/test/test-florida-live.js [base]
*/
const { chromium } = require("playwright");

const BASE = process.argv[2] || "https://statelinecalc.com";
const URL = BASE + "/paycheck-calculator/florida/";
const NET_MENSUEL = 5132.71;
const NET_WASHINGTON = 5046.01;   // ne doit JAMAIS apparaitre ici

(async () => {
  let pass = 0, fail = 0;
  const dire = (ok, label, detail) => {
    console.log((ok ? "  OK    | " : "  ECHEC | ") + label + (detail ? " | " + detail : ""));
    ok ? pass++ : fail++;
  };

  const nav = await chromium.launch();
  const ctx = await nav.newContext();               // profil ephemere
  const page = await ctx.newPage();

  console.log("\n=== Florida, sur " + BASE + " ===");

  const erreurs = [];
  page.on("pageerror", e => erreurs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });

  const rep = await page.goto(URL, { waitUntil: "networkidle" });
  dire(rep.status() === 200, "la page repond 200", "HTTP " + rep.status());

  const fiche = await page.evaluate(() => {
    if (typeof RATES_2026 === "undefined") return null;
    const s = RATES_2026.states.florida;
    return s ? { impot: !!s.incomeTax.hasIncomeTax, pl: !!s.paidLeave, wc: !!s.waCares } : null;
  });
  dire(fiche !== null, "la fiche Florida est servie au navigateur");
  dire(fiche && !fiche.impot, "aucun impot sur le revenu d'Etat");
  dire(fiche && !fiche.pl && !fiche.wc, "aucun programme de paie d'Etat");

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
       "net mensuel = 5 132,71 $", montants.map(v => "$" + v.toFixed(2)).join(" "));
  dire(!montants.some(v => Math.abs(v - NET_WASHINGTON) <= 0.51),
       "le net de WASHINGTON n'apparait pas sur la page Florida");
  dire(!/Paid Leave|WA Cares|State income tax/i.test(bloc),
       "aucune ligne de retenue d'Etat dans le resultat");

  // Mode horaire : 25 $/h, 40 h => 43 962 $ net annuel, taux reel 21,14 $.
  await page.selectOption("#period", "hourly");
  await page.waitForTimeout(200);
  const champHeures = await page.isVisible("[data-hours-field]");
  dire(champHeures, "le champ 'heures par semaine' apparait en mode horaire");
  await page.fill("#salary", "25");
  await page.fill("#hours", "40");
  await page.selectOption("#display", "annual");
  await page.click("button[type=submit]");
  await page.waitForTimeout(500);
  const blocH = (await page.textContent(".result")) || "";
  dire(/43,96\d/.test(blocH), "25 $/h a 40 h donne bien ~43 962 $ net par an",
       blocH.replace(/\s+/g, " ").slice(0, 120));

  // Les DEUX tableaux de 30 lignes doivent exister sans JS : c'est la version
  // lisible par les IA, qui n'executent pas de JavaScript.
  const tableaux = await page.evaluate(() =>
    [...document.querySelectorAll("table")].map(t => t.querySelectorAll("tbody tr").length));
  dire(tableaux.filter(n => n === 30).length >= 2,
       "2 tableaux de 30 lignes (salaire annuel + taux horaire)", "lignes: " + tableaux.join(", "));

  // Ce qui fait la valeur propre de cette page : les citations de la loi.
  // Sans elles, la page Floride redevient un clone du Texas.
  const texte = await page.evaluate(() => document.body.innerText);
  dire(/Section 5\(a\)/.test(texte) && /income of natural persons/i.test(texte),
       "l'article VII section 5(a) de la Constitution est cite mot pour mot");
  dire(/ceiling/i.test(texte) && /Texas/.test(texte),
       "la nuance plafond-Floride contre interdiction-Texas est expliquee");
  dire(/reemployment tax is paid by employers/i.test(texte),
       "la taxe de reemploi est citee comme entierement patronale");
  dire(/\$7,000/.test(texte), "le plafond de 7 000 $ est present");
  dire(/2012/.test(texte), "le changement de nom de 2012 est explique");
  dire(!/\$NaN/.test(texte), "aucun NaN dans la page");

  // Maillage interne : la page doit renvoyer vers les deux autres Etats vivants.
  const liens = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")));
  dire(liens.includes("/paycheck-calculator/washington/"), "lien vers Washington present");
  dire(liens.includes("/paycheck-calculator/georgia/"), "lien vers Georgia present");
  dire(liens.includes("/methodology/"), "lien vers la methodologie present");

  // Mobile : pas de debordement horizontal.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(200);
  const debord = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dire(debord <= 0, "pas de defilement horizontal a 375 px", "debordement = " + debord + "px");

  dire(erreurs.length === 0, "aucune erreur JS ni violation de CSP", erreurs.join(" | ") || "aucune");

  await nav.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
