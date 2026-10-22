/* Construit /paycheck-calculator/missouri/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Missouri est le 43e Etat publie. Aucun mecanisme nouveau au moteur : deduction standard par statut +
 * bareme progressif dont la premiere tranche est a 0 %, aucun programme salarie. Ce qu'il a de propre,
 * et que la page DIT :
 *
 *   1. UNE FORMULE ANNUELLE, PAS DE TABLE DE RETENUE PAR SALAIRE : le Department of Revenue publie une
 *      « Withholding Tax Formula » (annualiser, retrancher la deduction standard, appliquer le bareme,
 *      diviser) et, pour memoire, un tableau de seuils par periode de paie. verif-retenue-mo.js recoupe
 *      les 42 seuils imprimes (6 periodes x 7) et l'exemple imprime (707,81 $ : l'agence additionne 263
 *      arrondi, le cumul exact est 262,86 $).
 *   2. LE MARIE : la formule donne 32 200 $ au « Married and Spouse Does Not Work » (case du MO W-4,
 *      ligne 1, « not a separate filing status ») et 16 100 $ si le conjoint travaille. Le site modelise
 *      « marriedJoint » = 32 200 $ (meme choix que l'Iowa) ; la page chiffre l'ecart (756,70 $ a 75 000 $).
 *   3. L'ARRONDI AU DOLLAR PAR PAIE (« You must round the amounts that you withhold »), que le moteur
 *      n'applique pas : dit sur la page, ecart d'au plus 0,50 $ par paie.
 *   4. DEUX IMPOTS LOCAUX A 1 % (Kansas City, Saint-Louis), retenus par l'employeur : NON MODELISES, chiffres
 *      sur la page (750 $ a 75 000 $).
 *   5. AUCUN PROGRAMME SALARIE TROUVE ; chomage a la charge de l'employeur (RSMo 288.090).
 *   6. AUCUNE RECIPROCITE (guide, p. 4).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - « Missouri has no other local tax » : seulement « we found no other » ;
 *   - « the 2025 rate was ... » / « Missouri cut its rate » : aucun document lu ne compare 2025 et 2026 ;
 *   - « the Department removed the federal tax deduction » : phrase lue seulement dans un extrait de moteur de
 *     recherche, la page dor.mo.gov repond 403 : NON REPRISE ;
 *   - « your employer withholds the city tax » sans « may » quand on ne sait pas ou vous travaillez.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-missouri.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "missouri";
const NOM = "Missouri";
const URL = "https://statelinecalc.com/paycheck-calculator/missouri/";
const AUJOURD_HUI = "2026-10-20";
const LISIBLE = "October 20, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const MOS = R.states[CLE];
const IT = MOS.incomeTax;
const SD = IT.standardDeduction;                       // 16 100 / 32 200 / 24 150
const B = IT.brackets.single;                          // 8 paliers, le premier a 0 %
const fedDed = R.federal.standardDeduction;
const ZERO = B[0][0];                                  // 1 348
const SEUIL_HAUT = B[B.length - 2][0];                 // 9 436
const TAUX_HAUT = B[B.length - 1][1];                  // 4,7 %
const LOCAL = 0.01;                                    // Kansas City, Saint-Louis : 1 %

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const pctS = t => (t * 100).toFixed(1) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a30 = calcul(CLE, 30000);
const a250 = calcul(CLE, 250000);
const a17 = calcul(CLE, 17000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const imp75 = 75000 - SD.single;                                          // 58 900
const cumulHaut = progressiveTax(SEUIL_HAUT, B);                          // 262,86
const auDessus = imp75 - SEUIL_HAUT;                                      // 49 464
const pieces = [];
for (let i = 0, bas = 0; i < B.length; i++) {
  const haut = Math.min(imp75, B[i][0]);
  pieces.push({ bas, haut: B[i][0], taux: B[i][1], base: Math.max(0, haut - bas), montant: Math.max(0, haut - bas) * B[i][1] });
  bas = B[i][0];
}
const jImp = 75000 - SD.marriedJoint;                                     // 42 800
const hImp = 75000 - SD.headOfHousehold;                                  // 50 850
/* Ce que les echelons bas valent par rapport au taux superieur, applique a tout le revenu imposable jusqu'a 9 436 $. */
const econ = SEUIL_HAUT * TAUX_HAUT - cumulHaut;                          // 180,632
/* Erreurs typiques. */
const sansDeduction = progressiveTax(75000, B);                           // 3 344,368
const ecartSansDeduction = sansDeduction - a75.etat;                      // 756,70
const tauxUnique = imp75 * TAUX_HAUT;                                     // 2 768,30
const ecartTauxUnique = tauxUnique - a75.etat;                            // 180,632
const conjointTravaille = a75.etat;                                       // 16 100 $ : comme le celibataire
const ecartConjoint = conjointTravaille - j75.etat;                       // 756,70
/* Impots locaux. */
const loc75 = 75000 * LOCAL;                                              // 750
const netApresLocal = a75.net - loc75;
const loc401 = (75000 - 4500) * LOCAL;                                    // 705 : base apres 401(k)
/* Arrondi au dollar par paie. */
const mensuel75 = a75.etat / 12;                                          // 215,64
const bimensuel75 = a75.etat / 26;                                        // 99,53
/* Seuil de salaire annuel au-dela duquel le taux marginal est le taux haut (celibataire) : 16 100 + 9 436. */
const PAIE_HAUT = SEUIL_HAUT + SD.single;                                 // 25 536
const PAIE_ZERO = ZERO + SD.single;                                       // 17 448

/* Voisins : les huit frontaliers sont publies (Kansas depuis le 20/10/2026). */
const REF = 75000;
const COMPARE = [CLE, "iowa", "illinois", "kentucky", "tennessee", "arkansas", "oklahoma", "kansas", "nebraska"];
const NOMS = { [CLE]: "Missouri", iowa: "Iowa", illinois: "Illinois", kentucky: "Kentucky", tennessee: "Tennessee",
  arkansas: "Arkansas", oklahoma: "Oklahoma", kansas: "Kansas", nebraska: "Nebraska" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const art = nom => /^[AEIOU]/.test(nom) ? "an" : "a";
const plusMoins = k => {
  const r = calcul(k, REF), nom = NOMS[k];
  const lien = "<a href=\"/paycheck-calculator/" + k + "/\">" + nom + "</a>";
  return art(nom) + " " + lien + " worker keeps " + N($$(Math.abs(r.net - a75.net))) + (r.net > a75.net ? " more" : " less");
};
const phraseVoisins = (() => {
  const l = COMPARE.slice(1).map(plusMoins);
  return l.slice(0, -1).join(", ") + ", and " + l[l.length - 1];
})();

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des huit echelons : revenu imposable, taux, impot cumule au sommet, salaire annuel au sommet (celibataire). */
const libTranche = (i) => i === 0 ? "First " + $(B[0][0])
  : i === B.length - 1 ? "Over " + $(B[i - 1][0])
  : $(B[i - 1][0]) + " to " + $(B[i][0]);
const TRANCHES = B.map((tr, i) => {
  const cumul = i === B.length - 1 ? null : progressiveTax(tr[0], B);
  const paie = i === B.length - 1 ? null : tr[0] + SD.single;
  return "        <tr><th scope=\"row\">" + libTranche(i) + "</th><td class=\"num\">" + pct2(tr[1]) + "</td><td class=\"num\">" +
    (cumul === null ? "&mdash;" : $$(cumul)) + "</td><td class=\"num\">" + (paie === null ? "&mdash;" : $(paie)) + "</td></tr>";
}).join("\n");

/* Le tableau des deductions par case du MO W-4. */
const LIGNES_STATUT = [
  ["Single, or married and your spouse works, or married filing separately", "Single", SD.single],
  ["Married and your spouse does not work", "Married filing jointly", SD.marriedJoint],
  ["Head of household", "Head of household", SD.headOfHousehold]
].map(([lib, site, d]) => "        <tr><th scope=\"row\">" + lib + "</th><td>" + site + "</td><td class=\"num\">" + $(d) + "</td></tr>").join("\n");

/* Le tableau des periodes de paie : seuil du premier echelon imprime et du dernier, par periode. */
const PERIODES = [["Daily", 260], ["Weekly", 52], ["Every two weeks", 26], ["Twice a month", 24], ["Monthly", 12], ["Yearly", 1]];
const LIGNES_PERIODES = PERIODES.map(([lib, n]) => {
  const w = Math.round(ZERO / n), top = Math.round(SEUIL_HAUT / n);
  return "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + n + "</td><td class=\"num\">" + $(w) +
    "</td><td class=\"num\">" + $(top) + "</td></tr>";
}).join("\n");

/* Le tableau des deux villes. */
const LIGNES_VILLES = [
  ["Kansas City", "All wages of city residents; the part of a nonresident&rsquo;s pay earned in the city", "1%", $$(loc75)],
  ["St. Louis", "Residents of the city, wherever their employer is; people who work in the city, wherever they live", "1%", $$(loc75)]
].map(([v, qui, t, d]) => "        <tr><th scope=\"row\">" + v + "</th><td>" + qui + "</td><td class=\"num\">" + t + "</td><td class=\"num\">" + d + "</td></tr>").join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Missouri income tax withholding rate?",
   "Missouri&rsquo;s withholding table has eight steps. The first " + $(ZERO) + " of taxable income is taxed at " + N("0%") + ", and the next six steps, each " + $(ZERO) + " wide, are taxed at " +
   B.slice(1, -1).map(t => N(pct(t[1]))).join(", ").replace(/, ([^,]*)$/, " and $1") + ". Everything above " + $(SEUIL_HAUT) + " is taxed at " + N(pct(TAUX_HAUT)) +
   ". Taxable income is your yearly pay minus the " + $(SD.single) + " standard deduction for a single filer, so " + N(pct(TAUX_HAUT)) + " is the rate on each extra dollar of a single filer&rsquo;s pay above " + $(PAIE_HAUT) +
   ". On " + $(75000) + ", Missouri withholds " + $$(a75.etat) + " a year."],

  ["How much Missouri tax is withheld on a $75,000 salary?",
   "For a single filer, Missouri withholds " + $$(a75.etat) + " a year, which is " + $$(mensuel75) + " a month or " + $$(bimensuel75) + " on a biweekly check. " +
   "Taxable income is " + $(75000) + " minus the " + $(SD.single) + " standard deduction, or " + $(imp75) + ". The first " + $(SEUIL_HAUT) + " of it produces " + $$(cumulHaut) +
   " of tax, and the other " + $(auDessus) + " is taxed at " + pct(TAUX_HAUT) + ". A married filer whose spouse does not work, with a " + $(SD.marriedJoint) + " deduction, has " + $$(j75.etat) +
   " withheld, and a head of household has " + $$(h75.etat) + " withheld. Missouri requires employers to round each check to the whole dollar, so each real paycheck can differ from these yearly figures divided by your pay periods by up to 50 cents, which can add up to as much as about $13 over a year of biweekly checks."],

  ["What is take-home pay on a $75,000 salary in Missouri?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of Missouri income tax, an effective rate of " + (a75.taux * 100).toFixed(1) + "%. It is before the 1% earnings tax that Kansas City and St. Louis charge, " +
   "which this calculator does not include."],

  ["How much is $20, $25 or $30 an hour after taxes in Missouri?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "Missouri income tax withholding, with no retirement contribution and no city earnings tax."],

  ["What is the Missouri standard deduction for withholding?",
   "The Department of Revenue&rsquo;s withholding formula gives " + $(SD.single) + " for a single filer, " + $(SD.single) + " for a married filer whose spouse works and for married filing separately, " +
   $(SD.marriedJoint) + " for a married filer whose spouse does not work, and " + $(SD.headOfHousehold) + " for head of household. Your actual Missouri tax is figured on your return, where you can itemize instead."],

  ["Which box do I check on the Missouri W-4 if I am married?",
   "It depends on your spouse. Line 1 of Form MO W-4 has three boxes: &ldquo;Single or Married Spouse Works or Married Filing Separate,&rdquo; &ldquo;Married (Spouse does not work),&rdquo; and &ldquo;Head of Household.&rdquo; " +
   "The Department says the second one is not a separate filing status; it sets the standard deduction the employer uses, " + $(SD.marriedJoint) + " or " + $(SD.single) + ". " +
   "On " + $(75000) + " the difference is " + $$(ecartConjoint) + " of Missouri tax a year. This calculator uses the " + $(SD.marriedJoint) + " deduction for &ldquo;Married filing jointly,&rdquo; so it assumes a spouse with no pay. " +
   "If your spouse works, pick &ldquo;Single&rdquo; to see the " + $(SD.single) + " result. The form has no allowances or dependents."],

  ["Do Kansas City and St. Louis tax my paycheck?",
   "Each city charges a 1% earnings tax. Kansas City&rsquo;s guide for employers outside the city, which may withhold the tax voluntarily, says that once they register they must withhold the one percent on all wages of city residents, and on the part of a nonresident&rsquo;s pay earned in the city. " +
   "The St. Louis Collector of Revenue says the tax is collected from residents of the city wherever their employer is and from people who work in the city wherever they live. On " + $(75000) + " it comes to " + $$(loc75) +
   " a year. This calculator does not include it, because it cannot know where you live or work. If one applies to you, subtract about 1% of your pay from the result."],

  ["Is there a Missouri state disability or paid leave deduction?",
   "We found none. Neither the Department of Revenue&rsquo;s guide nor Form MO W-4 describes a state payroll program that an employee pays for. Missouri law (RSMo section 288.090) also says unemployment contributions &ldquo;shall not be deducted in whole or in part from the wages of individuals in employment,&rdquo; so that cost falls on your employer. " +
   "That is what we read, not proof that nothing else exists, and your pay stub is the final word."],

  ["I live in Missouri and work in another state, or the reverse. Which state taxes me?",
   "Missouri has no reciprocity agreement with any other state, according to the Department&rsquo;s guide. For a Missouri resident who works in a state with a lower income tax rate, the guide tells the Missouri employer to withhold the difference between the two states&rsquo; requirements, unless the employee gives it Form MO W-4C. " +
   "For a nonresident who does all of the work in Missouri, tax is withheld as it would be for a resident. This calculator assumes you live and work in Missouri and does not model either case."],

  ["Does a 401(k) contribution lower my Missouri withholding?",
   "In this calculator, yes. The Department&rsquo;s guide defines wages for Missouri withholding the way federal withholding does and points to the federal Publication 15 for gross taxable income, so we start from pay after a traditional 401(k) contribution, the same choice we make in every other state here. " +
   "On " + $(75000) + " with 6% going into a 401(k), Missouri income tax withholding falls by " + $$(gain401) + " a year. Both city earnings taxes also leave deferred compensation out of their base, according to the cities&rsquo; own pages."],

  ["How does Missouri withhold tax on a bonus?",
   "The Department&rsquo;s guide gives two options when overtime or other supplemental pay is paid separately from regular wages: withhold a flat " + N(pct(TAUX_HAUT)) + " of the supplemental pay, or add it to the regular wages for the period, apply the formula to the total and subtract what was already withheld. " +
   "When the pay comes with normal wages, the formula is applied to the whole payment. This calculator does not model bonuses, so ask your employer which method it uses."],

  ["Why is my Missouri paycheck different from this calculator?",
   "Common reasons: you checked a different box on the MO W-4, or asked for extra or reduced withholding on its lines 2 and 3; your employer rounds each check to the whole dollar, as the Department requires; you live or work in Kansas City or St. Louis; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; or part of your pay is a bonus. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."],

  ["How current is the Missouri formula on this page?",
   "It comes from the Department of Revenue&rsquo;s Employer&rsquo;s Tax Guide, Form-4282, whose page header reads &ldquo;Revised 03-2026&rdquo; and whose formula page is titled &ldquo;2026 Missouri Withholding Tax Formula.&rdquo; " +
   "We read the copy of the guide that the Internet Archive saved on August 8, 2026, and link to it. We did not compare it with an earlier year, and we make no claim about what changed."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. */
const dec = s => s.replace(/<[^>]+>/g, "").replace(/&mdash;/g, "—").replace(/&rsquo;/g, "’")
  .replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
  .replace(/&hellip;/g, "…").replace(/&times;/g, "×").replace(/&minus;/g, "−")
  .replace(/&ndash;/g, "–").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

/* La reponse directe : 40 a 60 mots, verifie plus bas. */
const reponse = "Missouri withholds at rates from 0% to 4.7%, after a $16,100 standard deduction for a single filer. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year, with no state payroll deduction we found. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/assets/analytics.js" defer></script>
<title>Missouri (MO) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Missouri (MO) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Missouri tax. Top rate 4.7%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Missouri (MO) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Missouri withholds 0% to 4.7% after a $16,100 standard deduction. On $75,000 a single filer keeps about ${$(a75.net)}.">
<meta property="og:url" content="${URL}">
<meta property="og:image" content="https://statelinecalc.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:type" content="website">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "Missouri Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Missouri take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Missouri income tax withheld under the Missouri Department of Revenue formula (a standard deduction by filing status and rates from 0% to 4.7%). Kansas City and St. Louis earnings taxes are not included."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Missouri", "item": "${URL}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": ${JSON.stringify(dec(n))}, "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(dec(a))} } }`).join(",\n")}
      ]
    },
    ${JSON.stringify(organisation, null, 2).split("\n").map((l, i) => i ? "    " + l : l).join("\n")}
  ]
}
</script>
</head>
<body>

${entete("paycheck")}

<main class="wrap">
<div class="col-contenu">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/paycheck-calculator/">Paycheck Calculator</a></li>
    <li aria-current="page">Missouri</li>
  </ol>
</nav>

  <h1>Missouri Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Missouri take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="${CLE}" novalidate>
      <div class="field">
        <label for="salary">Your gross pay or hourly rate</label>
        <input type="text" id="salary" name="salary" inputmode="decimal" value="75000"
               autocomplete="off">
        <span class="help">Before any taxes or deductions. Do not include tips paid in cash.</span>
        <span class="error" role="alert">Enter an amount greater than zero.</span>
      </div>

      <div class="field" data-hours-field hidden>
        <label for="hours">Hours per week</label>
        <input type="text" id="hours" name="hours" inputmode="decimal" value="40"
               autocomplete="off">
        <span class="help">Only asked when something here is per hour. We use the hours you
        actually work to turn an hourly rate into a yearly figure, not an assumed 2,080 a year.</span>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="period">How often you are paid</label>
          <select id="period" name="period">
            <option value="annual" selected>Per year</option>
            <option value="hourly">Per hour</option>
            <option value="monthly">Per month</option>
            <option value="semimonthly">Twice a month</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Per week</option>
          </select>
          <span class="help">This tells us what the amount above represents.</span>
        </div>

        <div class="field">
          <label for="filing">Filing status</label>
          <select id="filing" name="filing">
            <option value="single" selected>Single</option>
            <option value="marriedJoint">Married filing jointly</option>
            <option value="headOfHousehold">Head of household</option>
          </select>
          <span class="help">Sets your federal brackets and standard deduction, and your Missouri standard deduction.
          For a married filer we assume a spouse who does not work; if yours does, choose Single.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Missouri income tax withholding too.</span>
        </div>

        <div class="field">
          <label for="display">Show results</label>
          <select id="display" name="display">
            <option value="monthly" selected>Per month</option>
            <option value="hourly">Per hour</option>
            <option value="annual">Per year</option>
            <option value="semimonthly">Twice a month</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Per week</option>
          </select>
          <span class="help">Changes the period, not the calculation.</span>
        </div>
      </div>

      <button type="submit" class="btn btn-primary">Calculate</button>
    </form>

    <div class="result" data-paycheck-result aria-live="polite"></div>

    <p class="caption u-mt-3">
      Everything is calculated in your browser. Nothing you type is sent to us or stored.
    </p>
  </section>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

    <h2>How this calculator works</h2>
    <p>The Missouri Department of Revenue publishes a withholding formula, and this calculator follows it. Your pay is converted to a yearly amount. The standard deduction comes off (${N($(SD.single))} for a single filer, ${N($(SD.marriedJoint))} for a married filer whose spouse does not work), the rest is taxed through a table of rates from ${N("0%")} to ${N(pct(TAUX_HAUT))}, and the yearly result is divided by the number of pay periods. The table is the same for every filing status; what changes is the deduction.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Missouri income tax</strong>: your wages after any 401(k) contribution, minus the Missouri standard deduction for your status, taxed through the table.</li>
    </ul>
    <p>This calculator has no other Missouri line. We looked for a state payroll deduction on your check and found none.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Missouri, the <strong>Department of Revenue</strong>&rsquo;s Employer&rsquo;s Tax Guide, the Revisor of Missouri&rsquo;s statutes, and the
    <strong>City of St. Louis</strong> and <strong>City of Kansas City</strong> pages on their earnings taxes.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How current the source is.</strong> The guide&rsquo;s formula page is titled &ldquo;2026 Missouri Withholding Tax Formula,&rdquo; and the guide&rsquo;s page header reads &ldquo;Revised 03-2026.&rdquo; The Department&rsquo;s site refused our automated requests on ${LISIBLE}, so we read the copy the Internet Archive saved on August 8, 2026, and the Sources section links to that copy.
    We did not compare it with earlier years and make no claim about what changed. The federal figures, Social Security wage base and Medicare thresholds are the 2026 ones.</p>

    <p><strong>How we checked the formula against the printed table.</strong> Next to the formula, the Department prints a percentage table with seven breakpoints for each pay period: daily, weekly, every two weeks, twice a month, monthly and yearly. We rebuilt all 42 from the yearly ${N($(ZERO))} step width, divided by the number of pay periods and rounded to the dollar, and every one matched.
    The Department&rsquo;s own worked example, a married filer with a working spouse and ${N("$35,000")} of pay, prints ${N("$707.81")} of yearly tax, because it adds a rounded ${N("$263")} for the first seven steps. Exact arithmetic gives ${N($$(cumulHaut))} for those steps and ${N($$(progressiveTax(35000 - SD.single, B)))} in total, 14 cents less. This calculator uses the exact figure.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department&rsquo;s formula. Your actual Missouri income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: the Kansas City and St. Louis earnings taxes, a spouse who works, the extra or reduced withholding lines on Form MO W-4, bonuses, rounding each check to the whole dollar, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Missouri take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 federal and Missouri rates. The
  MO state tax column is Missouri income tax withholding; we found no Missouri payroll program to add. It does not include the Kansas City or St. Louis earnings tax.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Missouri take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">MO state tax</th>
          <th scope="col">Take-home</th>
          <th scope="col">Per month</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${tableSalaires}
      </tbody>
    </table>
  </div>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

    <h2>Missouri&rsquo;s eight steps and the income they apply to</h2>
    <p>These are the steps in the Department&rsquo;s yearly percentage table. They apply to your taxable income, which is your yearly pay after the standard deduction, not to your pay itself. For a single filer on ${N($(75000))}, taxable income is ${N($(75000))} &minus; ${N($(SD.single))} = ${N($(imp75))}.
    Only the first ${N($(SEUIL_HAUT))} of it is taxed below ${N(pct(TAUX_HAUT))}, so for any taxable income above ${N($(SEUIL_HAUT))}, ${N(pct(TAUX_HAUT))} is the rate on every extra dollar. For a single filer, that point is reached at ${N($(PAIE_HAUT))} of yearly pay.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Missouri withholding table by size of taxable income
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable income</th>
          <th scope="col">Rate</th>
          <th scope="col">Tax at the top of the step</th>
          <th scope="col">Yearly pay at the top, single filer</th>
        </tr>
      </thead>
      <tbody>
${TRANCHES}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The Department prints the same table for each pay period, with the breakpoints scaled to the period. The first step ends at ${N($(ZERO))} a year and the last at ${N($(SEUIL_HAUT))}; the table below shows where they fall on each kind of paycheck. The employer applies them to taxable pay for that check, after subtracting the standard deduction divided by the number of periods.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Where the first and last steps end, by pay period
      </caption>
      <thead>
        <tr>
          <th scope="col">Pay period</th>
          <th scope="col">Periods a year</th>
          <th scope="col">0% step ends at</th>
          <th scope="col">Top rate starts above</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_PERIODES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>The standard deduction: what changes with your Missouri W-4</h2>
    <p>Missouri has no separate table for each filing status and no personal exemptions or allowances in the formula. It has three boxes on line 1 of Form MO W-4, and each box sets the standard deduction. The Department says the box for a married filer whose spouse does not work &ldquo;is not a separate filing status.&rdquo; This is how the calculator maps its three choices.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Missouri standard deduction by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Form MO W-4, line 1</th>
          <th scope="col">Used by this calculator for</th>
          <th scope="col">Standard deduction</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The deduction comes off your pay before the table, so each extra ${N($(1000))} of deduction is worth ${N($$(1000 * TAUX_HAUT))} a year to anyone above the ${N($(SEUIL_HAUT))} step. A married couple where both spouses work takes ${N($(SD.single))} on each spouse&rsquo;s paycheck, the same as two single filers. If only one spouse works and checks the second box, the ${N($(SD.marriedJoint))} deduction applies to that one paycheck.</p>

    <h2>The Kansas City and St. Louis earnings taxes</h2>
    <p>Kansas City and St. Louis each levy their own tax on pay. Both charge ${N("1%")}, employers can withhold both, and neither is part of the state formula this calculator follows.</p>

    <h3>Who pays in each city</h3>
    <p>Kansas City&rsquo;s guide for employers outside the city, which may withhold the tax voluntarily, says that once they register they must withhold the one percent on all wages of city residents, and on the part of a nonresident&rsquo;s pay earned in the city. The St. Louis Collector of Revenue says the tax is collected from residents of the city, wherever their employer is, and from employees of businesses located or performing work in the city, wherever they live. The Collector&rsquo;s page for employers adds that every employer with employees working in the city must withhold it.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        City earnings taxes in Missouri, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">City</th>
          <th scope="col">Who it applies to</th>
          <th scope="col">Rate</th>
          <th scope="col">On $75,000</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_VILLES}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h3>What it does to your take-home pay</h3>
    <p>On ${N($(75000))} the tax is ${N($$(loc75))} a year, or ${N($$(loc75 / 12))} a month, which would bring a single filer&rsquo;s take-home pay from ${N($(a75.net))} to about ${N($(netApresLocal))}. This calculator does not add it, because it cannot know where you live or where you work. We found no other Missouri city that charges one in the pages we read, which is not proof that none exists.</p>

    <h3>Why a 401(k) lowers it</h3>
    <p>Kansas City says taxable earnings are gross pay less contributions to cafeteria plans and qualified deferred compensation plans, and the St. Louis list of non-taxable items includes deferred compensation such as 401(k) contributions. With 6% of ${N($(75000))} going into a 401(k), the base shrinks to ${N($(75000 - 4500))} and the tax to ${N($$(loc401))}.</p>

    <h3>The St. Louis payroll expense tax is the employer&rsquo;s</h3>
    <p>St. Louis also charges employers a ${N("0.5%")} payroll expense tax on wages earned in the city. The Collector says the employer pays it, so it does not come out of your check.</p>

    <h2>Missouri hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Missouri your hours also matter because of the deduction: a single filer earning ${N($(PAIE_ZERO))} or less a year has nothing withheld.</p>

    <h3>What is $20 an hour after taxes in Missouri?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Missouri income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Missouri&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Missouri?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Missouri income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The Department&rsquo;s guide says that when overtime or other supplemental pay is paid together with regular wages, the formula is applied to the whole payment. When it is paid separately, the employer may withhold a flat ${N(pct(TAUX_HAUT))} of it instead, or add it to the regular wages, apply the formula and subtract the tax already withheld.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Missouri take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), with no city earnings tax.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Missouri take-home pay by hourly rate, single filer, 40 hours a week
      </caption>
      <thead>
        <tr>
          <th scope="col">Hourly rate</th>
          <th scope="col">Gross a year</th>
          <th scope="col">Take-home a year</th>
          <th scope="col">Per month</th>
          <th scope="col">Real hourly rate</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${tableHoraire}
      </tbody>
    </table>
  </div>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

${blocLimites(CLE)}

  <h2>Key facts that affect your take-home pay in Missouri</h2>

  <h3>The first ${$(ZERO)} of taxable income is not taxed</h3>
  <p>The table starts at ${N("0%")} for the first ${N($(ZERO))}. With the ${N($(SD.single))} standard deduction, a single filer&rsquo;s yearly pay has to pass ${N($(PAIE_ZERO))} before the table charges anything. At ${N($(17000))}, Missouri withholds ${N($$(a17.etat))}; at ${N($(30000))}, it withholds ${N($$(a30.etat))} a year.</p>

  <h3>The table tops out at ${$(SEUIL_HAUT)} of taxable income</h3>
  <p>The eight steps form a graduated table, but it is a short one. The first ${N($(SEUIL_HAUT))} of taxable income produces ${N($$(cumulHaut))} of tax. Compared with taxing all of it at ${N(pct(TAUX_HAUT))}, the lower steps save ${N($$(econ))} a year.
  Past ${N($(SEUIL_HAUT))}, each extra dollar is taxed at ${N(pct(TAUX_HAUT))}, whether your pay is ${N($(75000))} or ${N($(250000))}. For most workers, Missouri withholding behaves like a flat ${N(pct(TAUX_HAUT))} on pay above the deduction, less a fixed ${N($$(econ))}.</p>

  <h3>The standard deduction depends on one box</h3>
  <p>A single filer&rsquo;s taxable income is pay minus ${N($(SD.single))}. A married filer who checks the &ldquo;spouse does not work&rdquo; box gets ${N($(SD.marriedJoint))}, which is why Missouri withholds ${N($$(j75.etat))} from that filer on ${N("$75,000")} and ${N($$(a75.etat))} from a single one. Taxable income for the married filer is ${N($(jImp))}.</p>

  <h3>Head of household has its own deduction</h3>
  <p>The formula lists ${N($(SD.headOfHousehold))} for head of household, halfway between the single and the married figures. On ${N("$75,000")}, taxable income is ${N($(hImp))} and Missouri withholds ${N($$(h75.etat))}. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>No allowances, no dependents, no exemptions</h3>
  <p>Form MO W-4 has four lines: a filing status, extra withholding, reduced withholding and an exempt box. It has no allowances and no place for dependents. Line 3 lets an employee who expects a refund direct the employer to withhold only a fixed amount per pay period, and line 2 adds a fixed amount. This calculator does not model either line.</p>

  <h3>Your employer rounds each check to the whole dollar</h3>
  <p>The Department tells employers to round what they withhold to the nearest whole dollar, 49 cents down and 50 cents up. On ${N("$75,000")}, the yearly figure of ${N($$(a75.etat))} is ${N($$(mensuel75))} a month, which is withheld as ${N($(Math.round(mensuel75)))}, and ${N($$(bimensuel75))} on a biweekly check, which is withheld as ${N($(Math.round(bimensuel75)))}. This calculator does not round, so a real check can differ from its figure by up to 50 cents, and over a year the difference can reach about $13 on biweekly pay.</p>

  <h3>Missouri has no reciprocity agreements</h3>
  <p>The Department&rsquo;s guide states that Missouri does not have a reciprocity agreement with any other state. If you live in one state and work in another, withholding can involve two states. This calculator assumes you live and work in Missouri.</p>

  <h3>Unemployment insurance is your employer&rsquo;s cost</h3>
  <p>Missouri law (RSMo section 288.090) says unemployment contributions &ldquo;shall not be deducted in whole or in part from the wages of individuals in employment.&rdquo; We did not find a state disability insurance or paid leave program run through payroll in the documents we read. That is a statement about what we read, not a guarantee that nothing else exists, and your pay stub is the final word.</p>

  <h3>Your 401(k) lowers your Missouri wages in this calculator</h3>
  <p>The guide treats wages the way federal withholding does and refers to Publication 15 for gross taxable income, so this calculator starts from pay after a traditional 401(k) contribution, as it does for every state on this site. On ${N("$75,000")} with 6% going in, Missouri income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the standard deduction</h3>
  <p>Applying the table to the full ${N($(75000))} instead of ${N($(imp75))} overstates Missouri withholding by ${N($$(ecartSansDeduction))}: ${N($$(sansDeduction))} instead of ${N($$(a75.etat))}.</p>

  <h3>Taxing everything at the top rate</h3>
  <p>The ${N(pct(TAUX_HAUT))} rate applies only to taxable income above ${N($(SEUIL_HAUT))}. Applying it to all of ${N($(imp75))} gives ${N($$(tauxUnique))}, which overstates withholding by ${N($$(ecartTauxUnique))}.</p>

  <h3>Checking the wrong box when your spouse works</h3>
  <p>A married filer whose spouse also works should not use the ${N($(SD.marriedJoint))} deduction. At ${N("$75,000")}, checking &ldquo;spouse does not work&rdquo; anyway lowers withholding from ${N($$(conjointTravaille))} to ${N($$(j75.etat))}, which is ${N($$(ecartConjoint))} too little withheld over a year. The shortfall shows up as a balance due when you file.</p>

  <h3>Leaving out the Kansas City or St. Louis earnings tax</h3>
  <p>If you live or work in one of those cities, the city tax is about ${N("1%")} of your pay on top of everything above, which is ${N($$(loc75))} on ${N("$75,000")}. This calculator&rsquo;s result does not include it.</p>

  <h3>Expecting round numbers on every check</h3>
  <p>Missouri withholding on a paycheck is a whole-dollar amount. A yearly figure divided by 12 or 26 will rarely land on one, so each stub can differ from this calculator by up to 50 cents, and over a year the difference can reach about $13 on biweekly pay.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the box you checked on your Form MO W-4 may differ from the
  one we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Missouri in 2026, with no retirement
  contribution, under the Department&rsquo;s formula:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Missouri taxable income: ${N($(a75.brut))} &minus; ${N($(SD.single))} standard deduction = ${N($(imp75))}</li>
    <li>Tax on the first ${N($(SEUIL_HAUT))}: ${pieces.filter(p => p.base > 0 && p.taux > 0 && p.haut <= SEUIL_HAUT).map(p => N($(p.base)) + " &times; " + N(pct(p.taux)) + " = " + N($$(p.montant))).join(", ")}, which makes ${N($$(cumulHaut))}</li>
    <li>Tax on the other ${N($(auDessus))}: ${N($(auDessus))} &times; ${N(pct(TAUX_HAUT))} = ${N($$(auDessus * TAUX_HAUT))}</li>
    <li>Missouri income tax withholding: ${N($$(cumulHaut))} + ${N($$(auDessus * TAUX_HAUT))} = ${N($$(a75.etat))}
    a year, ${N($$(mensuel75))} on a monthly paycheck or ${N($$(bimensuel75))} on a biweekly one</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>

  <h2>Frequently asked questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Compare with other states</h2>
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Missouri borders eight states: Iowa, Illinois, Kentucky, Tennessee, Arkansas, Oklahoma, Kansas and Nebraska. We have a calculator for all eight.
  Missouri is shown with its income tax withholding and no city earnings tax, as the other rows leave out their own local taxes. Tennessee&rsquo;s page explains that the state taxes no wages.</p>
  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        State-level deductions and take-home pay on ${$(REF)}, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">State</th>
          <th scope="col">State-level deductions</th>
          <th scope="col">Take-home pay</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${lignesCompare.map(l => `        <tr><th scope="row">${l.cle === CLE ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</th><td class="num">${$$(l.deductions)}</td><td class="num">${$(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a Missouri worker on the same salary, ${phraseVoisins}. A worker who lives in one of those states and commutes into Missouri, or the reverse, is a different case that this calculator does not model: it assumes a Missouri resident working in Missouri.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/iowa/">Iowa paycheck calculator</a> &mdash; the neighbor to the north, with a flat 3.8% after a $13,000 deduction.</li>
    <li><a href="/paycheck-calculator/illinois/">Illinois paycheck calculator</a> &mdash; the neighbor to the east, with a flat 4.95%.</li>
    <li><a href="/paycheck-calculator/kentucky/">Kentucky paycheck calculator</a> &mdash; the neighbor across the Mississippi River, with a flat 3.5% and local occupational taxes.</li>
    <li><a href="/paycheck-calculator/tennessee/">Tennessee paycheck calculator</a> &mdash; the neighbor to the southeast, which taxes no wages.</li>
    <li><a href="/paycheck-calculator/arkansas/">Arkansas paycheck calculator</a> &mdash; the neighbor to the south.</li>
    <li><a href="/paycheck-calculator/oklahoma/">Oklahoma paycheck calculator</a> &mdash; the neighbor to the southwest.</li>
    <li><a href="/paycheck-calculator/kansas/">Kansas paycheck calculator</a> &mdash; the neighbor to the west, with rates of 5.2% and 5.58% after a $9,160 allowance.</li>
    <li><a href="/paycheck-calculator/nebraska/">Nebraska paycheck calculator</a> &mdash; the neighbor to the northwest.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Missouri ranks on one salary.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa(NOM, { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="${AUJOURD_HUI}">${LISIBLE}</time> &middot;
    Last updated <time datetime="${AUJOURD_HUI}">${LISIBLE}</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal rates and
    the Missouri Department of Revenue&rsquo;s withholding formula, and do not include the Kansas City or St. Louis earnings tax.
  </p>

</div>
${colonne(NOM)}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", CLE);
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), require("../lib/jsonld.js").nettoieJsonLd(html), "utf8");

const mots = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")
  .split(/\s+/).filter(Boolean).length;
const motsProse = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<table[\s\S]*?<\/table>/g, " ")
  .replace(/<select[\s\S]*?<\/select>/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots (%d hors tableaux et menus), %d H2, %d H3, %d lignes de tableau",
  mots, motsProse, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* ── Garde-fous ──────────────────────────────────────────────────────────── */
const echec = m => { console.error("ARRET : " + m); process.exit(2); };

/* 1. Recoupement independant : la formule du guide ecrite ici A PARTIR DU TEXTE (p. 12-13), pas du moteur.
   Cumuls imprimes : 1 348 x (0, 2, 2,5, 3, 3,5, 4, 4,5) %. */
const SEUILS = [1348, 2696, 4044, 5392, 6740, 8088, 9436];
const TAUX = [0, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045];
const imprime = (t) => {
  let d = 0;
  for (let i = 0; i < SEUILS.length; i++) {
    const bas = i === 0 ? 0 : SEUILS[i - 1];
    if (t > bas) d += (Math.min(t, SEUILS[i]) - bas) * TAUX[i];
  }
  if (t > 9436) d += (t - 9436) * 0.047;
  return d;
};
const fed75 = 7670, fedJ = 4640, fedH = 5748;
if (Math.abs(imprime(75000 - 16100) - a75.etat) > 0.006) echec("MO 75 000 $ : guide " + imprime(58900) + ", moteur " + a75.etat);
if (Math.abs(imprime(75000 - 32200) - j75.etat) > 0.006) echec("MO marie 75 000 $ : guide " + imprime(42800) + ", moteur " + j75.etat);
if (Math.abs(imprime(75000 - 24150) - h75.etat) > 0.006) echec("MO chef de famille 75 000 $ : guide " + imprime(50850) + ", moteur " + h75.etat);
if (Math.abs(imprime(35000 - 16100) - 707.668) > 0.0006) echec("l'exemple imprime du guide (35 000 $, spouse works) ne se reproduit plus");
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 20/10/2026). */
const attendusProse = [
  [a75.etat, 2587.668, "etat 75 000"], [imp75, 58900, "imposable 75 000"], [cumulHaut, 262.86, "cumul au sommet de 9 436 $"],
  [auDessus, 49464, "imposable au-dessus de 9 436 $"], [auDessus * TAUX_HAUT, 2324.808, "49 464 x 4,7 %"],
  [pieces[1].montant, 26.96, "1 348 x 2 %"], [pieces[2].montant, 33.7, "1 348 x 2,5 %"], [pieces[3].montant, 40.44, "1 348 x 3 %"],
  [pieces[4].montant, 47.18, "1 348 x 3,5 %"], [pieces[5].montant, 53.92, "1 348 x 4 %"], [pieces[6].montant, 60.66, "1 348 x 4,5 %"],
  [a75.net, 59004.832, "net 75 000"], [a75.total, 15995.168, "total 75 000"],
  [j75.etat, 1830.968, "etat marie"], [jImp, 42800, "imposable marie"], [j75.net, 62791.532, "net marie"],
  [h75.etat, 2209.318, "etat chef de famille"], [hImp, 50850, "imposable chef de famille"], [h75.net, 61305.182, "net chef de famille"],
  [a30.etat, 472.668, "etat 30 000"], [a17.etat, 0, "etat 17 000"],
  [sansDeduction, 3344.368, "sans deduction"], [ecartSansDeduction, 756.7, "ecart sans deduction"],
  [tauxUnique, 2768.3, "imposable x 4,7 %"], [ecartTauxUnique, 180.632, "ecart taux unique"],
  [econ, 180.632, "economie des echelons bas"], [ecartConjoint, 756.7, "ecart conjoint qui travaille"],
  [loc75, 750, "ville 75 000"], [netApresLocal, 58254.832, "net apres impot de ville"], [loc401, 705, "ville avec 401(k) 6 %"],
  [gain401, 211.5, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [mensuel75, 215.639, "mensuel"], [bimensuel75, 99.5257692, "bimensuel"],
  [PAIE_HAUT, 25536, "paie au sommet"], [PAIE_ZERO, 17448, "paie au premier echelon"],
  [h25.net, 41544.875 + 0, "net 25 $/h (verifie plus bas)"]
];
/* 20 $/h = 41 600 $, imposable 25 500 : 262,86 + (25 500 - 9 436) x 4,7 % = 262,86 + 755,008 = 1 017,868.
   25 $/h = 52 000 $, imposable 35 900 : 262,86 + 26 464 x 4,7 % = 262,86 + 1 243,808 = 1 506,668.
   30 $/h = 62 400 $, imposable 46 300 : 262,86 + 36 864 x 4,7 % = 262,86 + 1 732,608 = 1 995,468. */
attendusProse.pop();
attendusProse.push([h20.etat, 1017.868, "etat 20 $/h"], [h25.etat, 1506.668, "etat 25 $/h"], [h30.etat, 1995.468, "etat 30 $/h"]);
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(SD.single === 16100 && SD.marriedJoint === 32200 && SD.headOfHousehold === 24150)) echec("deductions != 16 100 / 32 200 / 24 150");
if (!(B.length === 8 && B[0][0] === 1348 && B[0][1] === 0 && B[6][0] === 9436 && B[6][1] === 0.045 && B[7][1] === 0.047 && SEUIL_HAUT === 9436)) echec("table != celle du guide");
for (const k of COMPARE.slice(1)) if (!R.states[k]) echec("voisin absent du moteur : " + k);
if (a75.programmes.length !== 0 || a75.paidLeave !== 0 || a75.waCares !== 0) echec("le Missouri ne doit avoir aucun programme salarie");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 2500) echec(motsProse + " mots hors tableaux, sous le plancher de 2 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements du guide (formule imprimee ecrite a la main, 75 000 $ celibataire, marie et chef de famille, exemple imprime 35 000 $) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
