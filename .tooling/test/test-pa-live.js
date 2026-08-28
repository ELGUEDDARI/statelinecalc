/* Preuve, dans un VRAI navigateur, que la page Pennsylvanie dit la verite.
   Chaque valeur attendue est RECALCULEE ici par la bibliotheque, puis comparee
   a trois endroits independants : la prose, le tableau servi, et le calculateur
   en direct. Les trois doivent tomber sur le meme chiffre.
   Lancer : node .tooling/test/test-pa-live.js [base] */
const { chromium } = require("playwright");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const BASE = process.argv[2] || "https://statelinecalc.com";
const U = BASE + "/paycheck-calculator/pennsylvania/";
const U2 = BASE + "/salary-to-hourly-calculator/pennsylvania/";

(async () => {
  let pass = 0, fail = 0;
  const dire = (ok, l, d) => { console.log((ok ? "  OK    | " : "  ECHEC | ") + l + (d ? " | " + d : "")); ok ? pass++ : fail++; };

  const nav = await chromium.launch();
  const page = await (await nav.newContext()).newPage();
  const err = [];
  page.on("pageerror", e => err.push(String(e)));
  page.on("console", m => { if (m.type() === "error") err.push(m.text()); });

  console.log("\n=== Pennsylvanie sur " + BASE + " ===");

  let rep = await page.goto(U, { waitUntil: "networkidle" });
  dire(rep.status() === 200, "la page repond 200", "HTTP " + rep.status());

  const t = await page.evaluate(() => document.body.innerText);
  const a75 = calcul("pennsylvania", 75000);
  const a60 = calcul("pennsylvania", 60000);

  dire(t.includes("$" + c2(a75.etat)), "impot d'Etat sur 75 000 = $" + c2(a75.etat));
  dire(t.includes("$" + c0(a75.net)), "net annuel = $" + c0(a75.net));
  dire(t.includes("$" + c2(a75.programmes[0].montant)), "chomage salarie = $" + c2(a75.programmes[0].montant));
  dire(t.includes("3.07"), "le taux 3,07 % est present");
  dire(t.includes("3.735"), "le taux resident de Philadelphie 2026 est present");
  dire(!/\$NaN|NaN|undefined/.test(t), "aucun NaN ni undefined");
  dire(!/programme\b/.test(t) || /program\b/.test(t), "orthographe americaine");

  /* Le tableau doit porter les memes chiffres que la prose, et ses colonnes
     doivent rendre exactement le net : brut - federal - FICA - Etat - chomage. */
  const ligne = await page.evaluate(() => {
    const tr = [...document.querySelectorAll("tbody tr")].find(r => r.cells[0] && r.cells[0].innerText.trim() === "$60,000");
    return tr ? [...tr.cells].map(c => c.innerText.trim()) : null;
  });
  dire(!!ligne && ligne[3] === "$" + c0(a60.etat), "tableau : la colonne PA vaut " + "$" + c0(a60.etat), ligne ? ligne.join(" | ") : "introuvable");
  dire(!!ligne && ligne[5] === "$" + c0(a60.net), "tableau : le net vaut $" + c0(a60.net));
  const nb = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
  dire(nb === 60, "les deux tableaux font 30 lignes chacun", nb + " lignes");

  /* LE POINT CENTRAL DE LA PAGE : le calculateur doit refuser de reduire
     l'impot d'Etat quand on saisit un 401(k). Si ce test passe au vert par
     erreur, la page ment sur son propre sujet. */
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
  dire(r0.includes("$" + c2(a75.programmes[0].montant)), "calculateur : la ligne chomage PA apparait");
  const r6 = await lire(6);
  dire(r6.includes("$" + c2(a75.etat)), "calculateur a 6 % : impot d'Etat INCHANGE, $" + c2(a75.etat), r6.replace(/\s+/g, " ").slice(0, 80));

  /* Le meme test en Illinois doit donner l'inverse : la baisse doit exister. */
  await page.goto(BASE + "/paycheck-calculator/illinois/", { waitUntil: "networkidle" });
  const il6 = calcul("illinois", 75000, "single", 0.06);
  await page.fill("#salary", "75000"); await page.selectOption("#period", "annual");
  await page.selectOption("#display", "annual"); await page.fill("#retirement", "6");
  await page.click("button[type=submit]"); await page.waitForTimeout(350);
  const ril = (await page.textContent(".result")) || "";
  dire(ril.includes("$" + c2(il6.etat)), "temoin Illinois : l'impot BAISSE bien a $" + c2(il6.etat), ril.replace(/\s+/g, " ").slice(0, 80));

  /* La jumelle salaire -> horaire. */
  rep = await page.goto(U2, { waitUntil: "networkidle" });
  dire(rep.status() === 200, "la page salaire/horaire repond 200", "HTTP " + rep.status());
  const t2 = await page.evaluate(() => document.body.innerText);
  dire(t2.includes("$" + c2(a60.net / HEURES)), "net horaire de 60 000 $ = $" + c2(a60.net / HEURES));
  dire(t2.includes("$28.85"), "le brut horaire 28,85 $ est present");
  const liens = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")));
  dire(liens.includes("/paycheck-calculator/pennsylvania/"), "renvoie vers sa page de paie");
  dire(liens.filter(h => /^\/salary-to-hourly-calculator\/[a-z]+\/$/.test(h)).length >= 6,
       "relie les six autres Etats de la famille",
       liens.filter(h => /^\/salary-to-hourly-calculator\/[a-z]+\/$/.test(h)).length + " liens");

  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(200);
  const deb = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dire(deb <= 0, "pas de defilement horizontal a 375 px", deb + "px");
  dire(err.length === 0, "aucune erreur JS ni violation de CSP", err.join(" | ") || "aucune");

  await nav.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
