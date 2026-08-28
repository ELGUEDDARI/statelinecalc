/* Preuve, dans un VRAI navigateur, que la famille "salaire -> taux horaire"
   dit la verite sur les six Etats.

   Ce que cette suite protege : la page entiere repose sur une promesse unique,
   donner le taux horaire APRES impot quand tout le monde s'arrete au brut. Si
   la colonne "apres impot" derive, il ne reste rien qui nous distingue.

   Chaque valeur attendue est recalculee ici a partir des memes baremes que le
   moteur, puis comparee a ce que la page SERT. Deux chemins independants qui
   doivent tomber sur le meme chiffre.

   Lancer : node .tooling/test/test-s2h-live.js [base]
*/
const { chromium } = require("playwright");
const R = require("../../data/rates-2026.js");

const BASE = process.argv[2] || "https://statelinecalc.com";
const ETATS = ["texas", "florida", "nevada", "washington", "pennsylvania", "georgia", "illinois"];
const NOMS = { texas: "Texas", florida: "Florida", nevada: "Nevada",
               washington: "Washington", pennsylvania: "Pennsylvania",
               georgia: "Georgia", illinois: "Illinois" };
const HEURES = 2080;

function progressiveTax(t, bands) {
  let du = 0, bas = 0;
  for (const [pl, tx] of bands) {
    const haut = (pl === null || pl === undefined) ? Infinity : pl;
    if (t > bas) du += (Math.min(t, haut) - bas) * tx;
    bas = haut;
    if (t <= haut) break;
  }
  return du;
}
function deductionEtat(S, statut, revenu) {
  const d = S.incomeTax.standardDeduction;
  if (!d) return 0;
  let v = (typeof d === "object") ? ((statut in d) ? d[statut] : d.single) : d;
  const po = S.incomeTax.deductionPhaseOut;
  if (po) {
    const seuil = (statut in po) ? po[statut] : po.single;
    if (isFinite(seuil) && revenu > seuil) v = 0;
  }
  return v;
}
function netHoraire(cle, brut) {
  const S = R.states[cle];
  const fed = progressiveTax(Math.max(0, brut - R.federal.standardDeduction.single),
                             R.federal.brackets.single);
  const ss = Math.min(brut, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
  const med = brut * R.fica.medicare.rate
            + Math.max(0, brut - R.fica.additionalMedicare.threshold) * R.fica.additionalMedicare.rate;
  const etat = S.incomeTax.hasIncomeTax
    ? progressiveTax(Math.max(0, brut - deductionEtat(S, "single", brut)), S.incomeTax.brackets.single) : 0;
  const pl = S.paidLeave
    ? (S.paidLeave.wageCap ? Math.min(brut, S.paidLeave.wageCap) : brut) * S.paidLeave.employeeRate : 0;
  const wc = S.waCares ? brut * S.waCares.rate : 0;
  /* Programmes salaries generiques. Ecrit a la main ICI, et non importe de la
     bibliotheque : tout l'interet de cette suite est d'etre une SECONDE
     implementation. Le 28/08/2026 son absence a fait diverger le test de la
     page de 0,02 $ l'heure sur la Pennsylvanie - c'etait le test qui avait
     tort, mais la divergence etait exactement ce qu'on lui demande de voir. */
  const prog = (S.employeePrograms || []).reduce((t, pg) =>
    t + (pg.wageCap ? Math.min(brut, pg.wageCap) : brut) * pg.rate, 0);
  /* La Pennsylvanie taxe le versement 401(k) ; les tableaux publies supposent
     un versement nul, donc l'assiette est la meme, mais la regle est ecrite
     pour que ce test reste juste le jour ou un tableau supposera autre chose. */
  return (brut - (fed + ss + med + etat + pl + wc + prog)) / HEURES;
}
const c2 = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

(async () => {
  let pass = 0, fail = 0;
  const dire = (ok, label, detail) => {
    console.log((ok ? "  OK    | " : "  ECHEC | ") + label + (detail ? " | " + detail : ""));
    ok ? pass++ : fail++;
  };

  const nav = await chromium.launch();
  const ctx = await nav.newContext();
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", e => erreurs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });

  console.log("\n=== Salaire -> taux horaire, sur " + BASE + " ===");

  // --- le hub ---
  let rep = await page.goto(BASE + "/salary-to-hourly-calculator/", { waitUntil: "networkidle" });
  dire(rep.status() === 200, "le hub repond 200", "HTTP " + rep.status());
  const texteHub = await page.evaluate(() => document.body.innerText);
  dire(/\$28\.85/.test(texteHub), "le brut horaire de 60 000 $ est bien 28,85 $");
  const lignesHub = await page.evaluate(() =>
    document.querySelectorAll("tbody tr").length);
  dire(lignesHub === ETATS.length,
       "le hub compare bien les " + ETATS.length + " Etats", lignesHub + " lignes");

  // --- chaque Etat ---
  for (const cle of ETATS) {
    const attendu = "$" + c2(netHoraire(cle, 60000));
    rep = await page.goto(BASE + "/salary-to-hourly-calculator/" + cle + "/",
                          { waitUntil: "networkidle" });
    dire(rep.status() === 200, NOMS[cle] + " : la page repond 200", "HTTP " + rep.status());

    const t = await page.evaluate(() => document.body.innerText);
    dire(t.includes(attendu),
         NOMS[cle] + " : le net horaire de 60 000 $ vaut " + attendu, "recalcule ici");
    dire(/\$28\.85/.test(t), NOMS[cle] + " : le brut horaire 28,85 $ est present");
    dire(!/\$NaN/.test(t), NOMS[cle] + " : aucun NaN");

    // La ligne 60 000 du tableau doit porter le MEME net horaire que la prose.
    /* Depuis le 28/08/2026 la page porte DEUX tableaux : celui des salaires et
       celui des autres Etats. On vise explicitement le premier, sinon le test
       compte les deux et echoue pour une raison qui n'est pas un defaut. */
    const ligne = await page.evaluate(() => {
      const tr = [...document.querySelectorAll("table")[0].querySelectorAll("tbody tr")]
        .find(r => r.cells[0] && r.cells[0].innerText.trim() === "$60,000");
      return tr ? [...tr.cells].map(c => c.innerText.trim()) : null;
    });
    dire(ligne && ligne[2] === attendu,
         NOMS[cle] + " : le tableau et la prose donnent le meme chiffre",
         ligne ? ligne.join(" | ") : "ligne 60 000 introuvable");

    const nbLignes = await page.evaluate(() =>
      document.querySelectorAll("table")[0].querySelectorAll("tbody tr").length);
    dire(nbLignes === 30, NOMS[cle] + " : tableau de 30 lignes", nbLignes + " lignes");

    /* Le second tableau relie la page aux autres Etats de la famille, et chacun
       de ses chiffres doit etre le meme que celui servi par la page visee. */
    const voisins = await page.evaluate(() => {
      const t = document.querySelectorAll("table")[1];
      if (!t) return null;
      return [...t.querySelectorAll("tbody tr")].map(r => ({
        lien: r.querySelector("a") ? r.querySelector("a").getAttribute("href") : null,
        net: r.cells[1].innerText.trim()
      }));
    });
    dire(voisins && voisins.length === ETATS.length - 1,
         NOMS[cle] + " : le tableau des autres Etats en compte " + (ETATS.length - 1),
         voisins ? voisins.length + " lignes" : "tableau absent");
    if (voisins) {
      const faux = voisins.filter(v => {
        const k = (v.lien || "").split("/").filter(Boolean).pop();
        return !R.states[k] || v.net !== "$" + c2(netHoraire(k, 60000));
      });
      dire(faux.length === 0,
           NOMS[cle] + " : chaque Etat voisin porte son vrai taux horaire net",
           faux.length ? JSON.stringify(faux) : "les " + voisins.length + " concordent");
    }

    // Le calculateur doit tomber sur la meme valeur que le tableau.
    await page.fill("#salary", "60000");
    await page.selectOption("#period", "annual");
    await page.selectOption("#filing", "single");
    await page.selectOption("#display", "hourly");
    await page.click("button[type=submit]");
    await page.waitForTimeout(400);
    const res = (await page.textContent(".result")) || "";
    dire(res.includes(attendu),
         NOMS[cle] + " : le CALCULATEUR donne aussi " + attendu,
         res.replace(/\s+/g, " ").slice(0, 90));

    const liens = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")));
    dire(liens.includes("/paycheck-calculator/" + cle + "/"),
         NOMS[cle] + " : renvoie vers sa page de paie");
  }

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
