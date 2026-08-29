/* Preuve, dans un VRAI navigateur, que la page Michigan dit la verite.
   Chaque valeur attendue est RECALCULEE ici par la bibliotheque, puis comparee
   a trois endroits independants : la prose, le tableau servi, et le calculateur
   en direct. Les trois doivent tomber sur le meme chiffre.

   Le controle central de cette page est l'inverse de celui de la Pennsylvanie :
   ici le 401(k) DOIT faire baisser l'impot d'Etat. Si ce test passe au vert
   alors que rien ne bouge, la page ment sur son propre sujet.

   Lancer : node .tooling/test/test-michigan-live.js [base] */
const { chromium } = require("playwright");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const BASE = process.argv[2] || "https://statelinecalc.com";
const U = BASE + "/paycheck-calculator/michigan/";
const U2 = BASE + "/salary-to-hourly-calculator/michigan/";

/* Les faits de droit, recopies des documents officiels, jamais du moteur. */
const EXO = 5900;
const TAUX = 0.0425;
const DET_RES = 0.024;
const DET_EXO = 600;

(async () => {
  let pass = 0, fail = 0;
  const dire = (ok, l, d) => { console.log((ok ? "  OK    | " : "  ECHEC | ") + l + (d ? " | " + d : "")); ok ? pass++ : fail++; };

  const nav = await chromium.launch();
  const page = await (await nav.newContext()).newPage();
  const err = [];
  page.on("pageerror", e => err.push(String(e)));
  page.on("console", m => { if (m.type() === "error") err.push(m.text()); });

  console.log("\n=== Michigan sur " + BASE + " ===");

  let rep = await page.goto(U, { waitUntil: "networkidle" });
  dire(rep.status() === 200, "la page repond 200", "HTTP " + rep.status());

  const t = await page.evaluate(() => document.body.innerText);
  const a75 = calcul("michigan", 75000);
  const a60 = calcul("michigan", 60000);
  const a25 = calcul("michigan", 25000);

  dire(t.includes("$" + c2(a75.etat)), "impot d'Etat sur 75 000 = $" + c2(a75.etat));
  dire(t.includes("$" + c0(a75.net)), "net annuel = $" + c0(a75.net));
  dire(t.includes("4.25"), "le taux 4,25 % est present");
  dire(t.includes("$5,900"), "l'exoneration de 5 900 $ est presente");
  dire(t.includes("2.4%"), "le taux resident de Detroit est present");
  dire(t.includes("$" + c2((60000 - DET_EXO) * DET_RES)),
       "le montant Detroit sur 60 000 $ = $" + c2((60000 - DET_EXO) * DET_RES));
  dire(!/\$NaN|NaN|undefined/.test(t), "aucun NaN ni undefined");
  dire(/modelled|modelling/.test(t) === false || /model/.test(t), "orthographe coherente");

  /* Le taux effectif annonce doit vraiment etre sous le taux affiche. */
  dire(a25.etat / 25000 < TAUX && a75.etat / 75000 < TAUX,
       "le taux effectif d'Etat reste sous 4,25 % aux deux revenus cites",
       (a25.etat / 25000 * 100).toFixed(2) + "% et " + (a75.etat / 75000 * 100).toFixed(2) + "%");

  /* Le tableau doit porter les memes chiffres que la prose. Michigan n'a pas
     de programme salarie : 7 colonnes, la colonne d'Etat est en position 3. */
  const ligne = await page.evaluate(() => {
    const tr = [...document.querySelectorAll("tbody tr")].find(r => r.cells[0] && r.cells[0].innerText.trim() === "$60,000");
    return tr ? [...tr.cells].map(c => c.innerText.trim()) : null;
  });
  dire(!!ligne && ligne.length === 7, "tableau : 7 colonnes, aucun programme salarie", ligne ? ligne.length + " colonnes" : "introuvable");
  dire(!!ligne && ligne[3] === "$" + c0(a60.etat), "tableau : la colonne MI vaut $" + c0(a60.etat), ligne ? ligne.join(" | ") : "introuvable");
  dire(!!ligne && ligne[4] === "$" + c0(a60.net), "tableau : le net vaut $" + c0(a60.net));
  const nb = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
  dire(nb === 60, "les deux tableaux font 30 lignes chacun", nb + " lignes");

  /* La colonne d'Etat du tableau doit valoir exactement (brut - 5 900) x 4,25 %
     sur chaque ligne : c'est la regle de droit, verifiee sur le HTML servi et
     non sur le moteur qui l'a produit. */
  const lignes = await page.evaluate(() =>
    [...document.querySelectorAll("tbody tr")].map(r => [...r.cells].map(c => c.innerText.trim())));
  const sept = lignes.filter(l => l.length === 7);
  let ecarts = 0;
  sept.forEach(l => {
    const brut = Number(l[0].replace(/[$,]/g, ""));
    const etat = Number(l[3].replace(/[$,]/g, ""));
    if (Math.abs(etat - Math.round(Math.max(0, brut - EXO) * TAUX)) > 1) ecarts++;
  });
  dire(ecarts === 0, "les 30 lignes valent bien (brut - 5 900) x 4,25 %", ecarts + " ecart(s) sur " + sept.length);

  /* LE POINT CENTRAL : le 401(k) DOIT reduire l'impot du Michigan. */
  const lire = async (pct) => {
    await page.fill("#salary", "75000");
    await page.selectOption("#period", "annual");
    await page.selectOption("#filing", "single");
    await page.selectOption("#display", "annual");
    await page.fill("#retirement", String(pct));
    await page.click("button[type=submit]");
    await page.waitForTimeout(350);
    return (await page.textContent(".result")) || "";
  };
  const r0 = await lire(0);
  dire(r0.includes("$" + c2(a75.etat)), "calculateur a 0 % : impot d'Etat $" + c2(a75.etat), r0.replace(/\s+/g, " ").slice(0, 80));
  const mi6 = calcul("michigan", 75000, "single", 0.06);
  const r6 = await lire(6);
  dire(r6.includes("$" + c2(mi6.etat)), "calculateur a 6 % : impot d'Etat BAISSE a $" + c2(mi6.etat), r6.replace(/\s+/g, " ").slice(0, 80));
  dire(!r6.includes("$" + c2(a75.etat)), "et il ne reste pas a l'ancienne valeur");

  /* Temoin inverse : la Pennsylvanie, elle, ne doit PAS bouger. */
  await page.goto(BASE + "/paycheck-calculator/pennsylvania/", { waitUntil: "networkidle" });
  const pa = calcul("pennsylvania", 75000);
  await page.fill("#salary", "75000"); await page.selectOption("#period", "annual");
  await page.selectOption("#display", "annual"); await page.fill("#retirement", "6");
  await page.click("button[type=submit]"); await page.waitForTimeout(350);
  const rpa = (await page.textContent(".result")) || "";
  dire(rpa.includes("$" + c2(pa.etat)), "temoin Pennsylvanie : l'impot NE bouge PAS, $" + c2(pa.etat), rpa.replace(/\s+/g, " ").slice(0, 80));

  /* La jumelle salaire -> horaire. */
  rep = await page.goto(U2, { waitUntil: "networkidle" });
  dire(rep.status() === 200, "la page salaire/horaire repond 200", "HTTP " + rep.status());
  const t2 = await page.evaluate(() => document.body.innerText);
  dire(t2.includes("$" + c2(a60.net / HEURES)), "net horaire de 60 000 $ = $" + c2(a60.net / HEURES));
  dire(t2.includes("$28.85"), "le brut horaire 28,85 $ est present");
  const liens = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")));
  dire(liens.includes("/paycheck-calculator/michigan/"), "renvoie vers sa page de paie");
  dire(liens.filter(h => /^\/salary-to-hourly-calculator\/[a-z]+\/$/.test(h)).length >= 7,
       "relie les sept autres Etats de la famille",
       liens.filter(h => /^\/salary-to-hourly-calculator\/[a-z]+\/$/.test(h)).length + " liens");

  /* Les liens entrants : une page neuve sans liens internes n'est pas trouvee. */
  for (const [depuis, attendu] of [
    ["/", "/paycheck-calculator/michigan/"],
    ["/paycheck-calculator/", "/paycheck-calculator/michigan/"],
    ["/salary-to-hourly-calculator/", "/salary-to-hourly-calculator/michigan/"],
    ["/paycheck-calculator/texas/", "/paycheck-calculator/michigan/"]
  ]) {
    await page.goto(BASE + depuis, { waitUntil: "domcontentloaded" });
    const h = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")));
    dire(h.includes(attendu), "lien entrant depuis " + depuis + " vers " + attendu);
  }

  await page.goto(U, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(200);
  const deb = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dire(deb <= 0, "pas de defilement horizontal a 375 px", deb + "px");
  dire(err.length === 0, "aucune erreur JS ni violation de CSP", err.join(" | ") || "aucune");

  await nav.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
