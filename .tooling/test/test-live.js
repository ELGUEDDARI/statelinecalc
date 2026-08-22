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

const URL_PAGE = "https://statelinecalc.com/paycheck-calculator/washington/";
const URL_HOME = "https://statelinecalc.com/";

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

  console.log("\n=== 5. Le tableau HTML est bien dans la page (lisible par les IA) ===");
  const lignes = await page.locator("table tbody tr").count();
  check("14 lignes de tranches", lignes === 14, lignes + " lignes");

  console.log("\n=== 6. Mobile : pas de defilement horizontal ===");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(200);
  const debord = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("la page ne deborde pas en largeur", debord <= 1, "debordement = " + debord + "px");

  console.log("\n=== 7. Les donnees ne sortent pas du navigateur ===");
  const requetes = [];
  page.on("request", r => { if (!r.url().startsWith("https://statelinecalc.com")) requetes.push(r.url()); });
  await page.fill("#salary", "123456");
  await page.waitForTimeout(500);
  check("aucune requete vers un tiers", requetes.length === 0, requetes.slice(0, 3).join(" / "));

  await navigateur.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
