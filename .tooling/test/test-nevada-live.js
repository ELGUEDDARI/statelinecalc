/* Preuve, dans un VRAI navigateur et sur l'URL PUBLIQUE, que la page Nevada
   calcule juste et n'applique AUCUNE retenue d'Etat.

   Le risque propre a cette page : le moteur est partage avec Washington. Si
   la fiche Nevada etait mal cablee, le visiteur verrait les retenues de
   Washington (Paid Leave, WA Cares) sur une page Nevada. Le test moteur le
   verifie hors ligne ; celui-ci le verifie sur ce que le CDN sert vraiment.

   Attendu, recalcule A LA MAIN :
     brut 75 000, celibataire, Nevada, pas de 401(k)
     imposable = 75 000 - 16 100 = 58 900
     federal   = 1 240 + 4 560 + 1 870 = 7 670,00
     SS 4 650,00 + Medicare 1 087,50 + Etat 0,00
     total     = 13 407,50
     net       = 61 592,50   ->   net mensuel = 5 132,71

   Lancer : node .tooling/test/test-nevada-live.js
*/
const { chromium } = require("playwright");

const URL = "https://statelinecalc.com/paycheck-calculator/nevada/";
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

  console.log("\n=== Nevada, sur l'URL publique ===");
  const rep = await page.goto(URL, { waitUntil: "networkidle" });
  dire(rep.status() === 200, "la page repond 200", "HTTP " + rep.status());

  const erreurs = [];
  page.on("pageerror", e => erreurs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });

  // La fiche Nevada servie n'a-t-elle bien AUCUN programme d'Etat ?
  const fiche = await page.evaluate(() => {
    if (typeof RATES_2026 === "undefined") return null;
    const s = RATES_2026.states.nevada;
    return s ? { impot: !!s.incomeTax.hasIncomeTax, pl: !!s.paidLeave, wc: !!s.waCares } : null;
  });
  dire(fiche !== null, "la fiche Nevada est servie au navigateur");
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
       "le net de WASHINGTON n'apparait pas sur la page Nevada");

  // Aucune ligne de retenue d'Etat ne doit s'afficher.
  dire(!/Paid Leave|WA Cares|State income tax/i.test(bloc),
       "aucune ligne de retenue d'Etat dans le resultat");

  // Le tableau des 14 salaires doit etre dans le HTML, lisible sans JS.
  const lignes = await page.evaluate(() =>
    document.querySelectorAll(".table-scroll table tbody tr").length);
  dire(lignes >= 14, "le tableau des salaires est dans le HTML", lignes + " lignes tbody");

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
