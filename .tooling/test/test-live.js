/* Test du site EN LIGNE, dans un vrai navigateur.
   Un code 200 ne prouve pas qu'une page marche : le CSP strict peut bloquer
   le JavaScript, et le calculateur ne rendrait plus rien. Seul un navigateur
   qui execute la page le dit.

   Profil ephemere, aucun profil Chrome de la machine n'est touche.

   Lancer :
     set NODE_PATH=C:\Users\sland\Desktop\SHOPFY NERVOLAXE\node_modules
     node .tooling/test/test-live.js
*/

const { chromium } = require("playwright");

/* La base est prise en argument, comme dans toutes les autres suites. Avant le
   28/08 elle etait ecrite en dur sur la production : passer une URL locale ne
   faisait rien, et "les tests locaux passent" pouvait donc etre faux sans que
   rien ne le signale. C'est le pire genre de defaut dans un harnais de test. */
const BASE = process.argv[2] || "https://statelinecalc.com";
const URL_PAGE = BASE + "/paycheck-calculator/washington/";
const URL_HOME = BASE + "/";

let pass = 0, fail = 0;
function check(label, ok, detail) {
  console.log((ok ? "  OK   " : "  ECHEC") + " | " + label + (detail ? " | " + detail : ""));
  ok ? pass++ : fail++;
}

(async () => {
  const navigateur = await chromium.launch({ headless: true });
  const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await contexte.newPage();

  const erreurs = [];
  page.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });
  page.on("pageerror", e => erreurs.push("pageerror: " + e.message));

  console.log("\n=== 1. Redirection HTTP -> HTTPS ===");
  const rep = await page.goto("http://statelinecalc.com/", { waitUntil: "domcontentloaded" });
  check("l'accueil finit en https", page.url().startsWith("https://"), page.url());
  check("statut 200", rep.status() === 200, "HTTP " + rep.status());

  console.log("\n=== 2. Page Washington ===");
  await page.goto(URL_PAGE, { waitUntil: "networkidle" });
  check("titre correct",
    (await page.title()).includes("Washington Paycheck Calculator"),
    await page.title());

  // Le tiret long doit s'afficher, pas une sequence de mojibake.
  check("encodage du titre propre", !(await page.title()).includes("\u00e2\u20ac"));

  console.log("\n=== 3. Le CSP strict ne casse rien ===");
  const csp = erreurs.filter(e => /Content Security Policy|Refused to/i.test(e));
  check("aucune violation de CSP", csp.length === 0, csp.slice(0, 2).join(" / "));
  check("aucune erreur JavaScript", erreurs.length === 0, erreurs.slice(0, 2).join(" / "));

  console.log("\n=== 4. Le calculateur calcule vraiment ===");
  // Valeur par defaut : 75 000 $/an, celibataire, affichage mensuel.
  // Attendu, recalcule a la main dans test-engine.js : 5 046,01 $/mois.
  const resultat = await page.textContent("[data-paycheck-result]");
  check("le bloc resultat est rempli", resultat && resultat.trim().length > 20);
  check("net mensuel = $5,046.01", resultat.includes("$5,046.01"),
    (resultat.match(/\$[\d,]+\.\d\d/) || ["rien"])[0]);
  check("taux effectif = 19.3%", resultat.includes("19.3%"));

  // Recalcul dynamique : on passe a 100 000 $, attendu 77 793 $/an
  await page.fill("#salary", "100000");
  await page.selectOption("#display", "annual");
  await page.waitForTimeout(300);
  const r2 = await page.textContent("[data-paycheck-result]");
  check("recalcul a 100 000 $ -> $77,793", /\$77,79[0-9]/.test(r2),
    (r2.match(/\$[\d,]+\.\d\d/) || ["rien"])[0]);

  console.log("\n=== 5. Les tableaux HTML sont dans la page (lisibles par les IA) ===");
  /* Depuis le 27/08/2026 la page porte DEUX tableaux de 30 lignes : par
     salaire annuel, et par taux horaire. Le test comptait 30 lignes en tout
     et cassait donc a l'ajout du second — c'etait le test qui etait perime,
     pas la page. On compte desormais chaque tableau separement, ce qui
     detecte aussi la disparition d'un seul des deux. */
  const tableaux = await page.evaluate(() =>
    [...document.querySelectorAll("table")].map(t => t.querySelectorAll("tbody tr").length));
  const de14 = tableaux.filter(n => n === 30).length;
  check("2 tableaux de 30 lignes (salaire annuel + taux horaire)",
    de14 >= 2, "tableaux : " + tableaux.join(", "));

  console.log("\n=== 6. Mobile : pas de defilement horizontal ===");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(200);
  const debord = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("la page ne deborde pas en largeur", debord <= 1, "debordement = " + debord + "px");

  console.log("\n=== 7. Les donnees SAISIES ne sortent pas du navigateur ===");
  // Depuis l'ajout de GA4 le 22/08, il Y A des requetes tierces : la mesure
  // d'audience. Ce qui doit rester vrai, et que la page promet noir sur
  // blanc, c'est qu'AUCUNE requete ne transporte ce que le visiteur tape.
  // C'est ca qu'on teste, pas l'absence de tiers.
  const AUTORISES = [
    "statelinecalc.com",
    "www.googletagmanager.com",
    "www.google-analytics.com",
    "analytics.google.com",
    "region1.google-analytics.com",
  ];
  const intrus = [];
  const fuites = [];
  const SALAIRE_TEMOIN = "987654";
  page.on("request", r => {
    const u = r.url();
    if (!AUTORISES.some(h => u.includes(h))) intrus.push(u);
    let corps = "";
    try { corps = r.postData() || ""; } catch (e) { corps = ""; }
    if (u.includes(SALAIRE_TEMOIN) || corps.includes(SALAIRE_TEMOIN)) fuites.push(u);
  });
  await page.fill("#salary", SALAIRE_TEMOIN);
  await page.waitForTimeout(1500);
  check("aucun domaine tiers hors mesure d'audience", intrus.length === 0, intrus.slice(0, 3).join(" / "));
  check("le salaire saisi n'est envoye NULLE PART", fuites.length === 0, fuites.slice(0, 2).join(" / "));

  console.log("\n=== 8. GA4 charge sans violer le CSP ===");
  const cspGa = erreurs.filter(e => /Content Security Policy|Refused to/i.test(e));
  check("aucun blocage CSP apres ajout de GA4", cspGa.length === 0, cspGa.slice(0, 2).join(" / "));
  const gaCharge = await page.evaluate(() => typeof window.gtag === "function");
  check("gtag est bien charge", gaCharge);

  await navigateur.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
