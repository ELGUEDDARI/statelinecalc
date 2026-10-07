/* Construit /paycheck-calculator/indiana/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Indiana est le 32e Etat publie. Ce qu'il a de propre :
 *
 *   1. UN TAUX PLAT DE 2,95 % ET UNE SEULE BASE : (salaire - exemptions). Pas de
 *      tranche, pas de deduction standard. Departmental Notice #1 (effectif le
 *      1er octobre 2026) : « For 2026, the state adjusted gross income tax rate
 *      for individuals is 2.95%. » ; « Each employee is entitled to deduct
 *      $1,000 per year per exemption claimed on line 5 of his/her Form WH-4. »
 *   2. L'IMPOT DE COMTE EST RETENU AVEC L'IMPOT D'ETAT, sur la MEME base. 92
 *      comtes, 0,5 % (Porter) a 3,0 % (Randolph). C'est le premier Etat ou le
 *      moteur ajoute une ligne de taxe locale : un selecteur de comte sur la
 *      page, defaut Marion (Indianapolis, 2,02 %), dit sur la page. Le comte est
 *      celui du 1er janvier, pas celui d'aujourd'hui.
 *   3. AUCUN PROGRAMME SALARIE : le DWD dit « Employees do NOT pay into UI ».
 *      Aucun conge paye ni assurance invalidite d'Etat dans les documents lus :
 *      « we found no », jamais « Indiana has no ».
 *   4. RECIPROCITE avec Kentucky, Michigan, Ohio, Pennsylvanie, Wisconsin
 *      (IB #33) pour l'impot d'Etat, PAS pour l'impot de comte.
 *   5. PRIMES : « For one-time or non-periodic payments, such as a bonus check,
 *      withholding should be computed without exemptions. »
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * in.gov/dor et in.gov/dwd repondent 200 (06/10). forms.in.gov refuse tout
 * client automatise (Cloudflare 403) : le WH-4 est lu dans l'instantane Internet
 * Archive du 12/06/2025 (revision R10 / 8-23, memes numeros de ligne que le
 * Notice 2026). Dates et citations : data/rates-2026.js et
 * .tooling/lib/sources.js (PAR_ETAT.indiana).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Indiana has no city income tax » : les documents lus decrivent
 *     l'impot de comte seulement, ce qui n'est pas une preuve : « we found no » ;
 *   - pas de baisse « de 3,0 % a 2,95 % » : aucun document lu ne donne le taux
 *     2025 ; seul 2,95 % pour 2026 est cite ;
 *   - pas de rate de comte « au 1er janvier » pour Boone : seule la valeur du
 *     1er octobre est lue (asterisque : modifie depuis le 1er janvier) ;
 *   - 401(k) : le Notice parle de « gross income » sans dire un mot du 401(k) :
 *     choix de modelisation, dit sur la page ;
 *   - pas de personnes a charge, d'age 65 ans / aveugle, de retenue
 *     supplementaire, de regle des 30 jours.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-indiana.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "indiana";
const NOM = "Indiana";
const URL = "https://statelinecalc.com/paycheck-calculator/indiana/";
const AUJOURD_HUI = "2026-10-06";
const LISIBLE = "October 6, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const IN = R.states[CLE];
const TAUX = IN.incomeTax.brackets.single[0][1];           // 0,0295
const DED = IN.incomeTax.standardDeduction;                // 1 000 / 2 000 / 1 000
const EXEMPTION = 1000;                                    // Notice #1, Table A
const CT = IN.incomeTax.countyTax;
const COMTES = Object.entries(CT.rates).map(([cle, [nom, taux]]) => ({ cle, nom, taux }));
const DEF = CT.rates[CT.defaultCounty];                    // ["Marion", 0.0202]
const TAUX_DEF = DEF[1];
const fedDed = R.federal.standardDeduction;
const parTaux = COMTES.slice().sort((a, b) => a.taux - b.taux || a.nom.localeCompare(b.nom));
const bas1 = parTaux[0], bas2 = parTaux[1];
const haut1 = parTaux[parTaux.length - 1], haut2 = parTaux[parTaux.length - 2], haut3 = parTaux[parTaux.length - 3];

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct1 = t => (t * 100).toFixed(1) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
const ct = r => r.programmes.filter(p => p.county).reduce((t, p) => t + p.montant, 0);
const comteDe = (brut, cle, statut = "single", rp = 0) => calcul(CLE, brut, statut, rp, cle);

const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = (a75.etat + ct(a75)) - (r401.etat + ct(r401));
const bas75 = comteDe(75000, bas1.cle);
const haut75 = comteDe(75000, haut1.cle);
const ecartComtes = bas75.net - haut75.net;
const ham75 = comteDe(75000, "hamilton");
const base75 = 75000 - DED.single;                         // 74 000
const sansComte = a75.etat;                                // l'Etat seul
const BONUS = 5000;
const bonusEtat = BONUS * TAUX, bonusComte = BONUS * TAUX_DEF;

/* Voisins : Illinois, Michigan, Ohio (frontaliers publies). Indiana est montre
   avec le comte par defaut. */
const REF = 75000;
const COMPARE = [CLE, "illinois", "kentucky", "michigan", "ohio"];
const NOMS = { [CLE]: "Indiana", illinois: "Illinois", kentucky: "Kentucky", michigan: "Michigan", ohio: "Ohio" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const il75 = calcul("illinois", REF), ky75 = calcul("kentucky", REF), mi75 = calcul("michigan", REF), oh75 = calcul("ohio", REF);

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des 92 comtes : taux lu dans le moteur, impot de comte et net
   calcules par le moteur pour 75 000 $, celibataire. */
const lignesComtes = COMTES.slice().sort((a, b) => a.nom.localeCompare(b.nom)).map(c => {
  const r = comteDe(75000, c.cle);
  return "        <tr><th scope=\"row\">" + c.nom + "</th><td class=\"num\">" + pct(c.taux) +
         "</td><td class=\"num\">" + $$(ct(r)) + "</td><td class=\"num\">" + $(r.net) + "</td></tr>";
}).join("\n");

/* Les options du selecteur : « Marion (2.02%) », defaut Marion. */
const optionsComtes = COMTES.slice().sort((a, b) => a.nom.localeCompare(b.nom)).map(c =>
  "            <option value=\"" + c.cle + "\"" + (c.cle === CT.defaultCounty ? " selected" : "") + ">" +
  c.nom + " (" + pct(c.taux) + ")</option>").join("\n");

/* Le tableau des exemptions : Notice #1, tables A, B et C. */
const tableExemptions = [
  ["Lines 1 to 4 (yourself, a spouse who does not claim one, dependents, age 65 or older, blind), totaled on line 5", $(EXEMPTION) + " each", "Table A"],
  ["Line 6, an additional exemption for each qualifying dependent child", $(1500) + " each", "Table B"],
  ["Line 7, the first-time additional dependent exemption", $(1500) + " each", "Table B"],
  ["Line 8, an adopted qualifying dependent", $(3000) + " each", "Table C"]
].map(([q, m, t]) => "        <tr><th scope=\"row\">" + q + "</th><td class=\"num\">" + m + "</td><td>" + t + "</td></tr>").join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Indiana income tax withholding rate in 2026?",
   "Indiana has one state rate, " + N(pct(TAUX)) + ", the same for every filing status and every pay level. It applies to your wages after " + $(EXEMPTION) +
   " for each exemption on Form WH-4. On top of that, your employer withholds county income tax at the rate for your county, which runs from " +
   N(pct(bas1.taux)) + " to " + N(pct(haut1.taux)) + ". On a single filer&rsquo;s " + $(75000) + " salary in " + DEF[0] + " County, state withholding is " + $$(a75.etat) +
   " a year and county withholding is " + $$(ct(a75)) + "."],

  ["How much Indiana tax is withheld on a $75,000 salary?",
   "For a single filer with one exemption in " + DEF[0] + " County, Indiana withholds " + $$(a75.etat + ct(a75)) + " a year, which is " + $$((a75.etat + ct(a75)) / 12) + " a month. " +
   "That is " + $(75000) + " minus " + $(DED.single) + " = " + $(base75) + ", taxed at " + pct(TAUX) + " for the state (" + $$(a75.etat) + ") and " + pct(TAUX_DEF) +
   " for the county (" + $$(ct(a75)) + "). A married filer who claims a spouse&rsquo;s exemption too has " + $(75000 - DED.marriedJoint) + " taxed and " +
   $$(j75.etat + ct(j75)) + " withheld."],

  ["What is take-home pay on a $75,000 salary in Indiana?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer in " + DEF[0] + " County with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " +
   $$(a75.etat) + " of Indiana income tax and " + $$(ct(a75)) + " of " + DEF[0] + " County income tax &mdash; " +
   "an effective rate of " + (a75.taux * 100).toFixed(1) + "%. In " + bas1.nom + " County, at " + pct(bas1.taux) + ", the same salary keeps " + $(bas75.net) +
   "; in " + haut1.nom + " County, at " + pct(haut1.taux) + ", it keeps " + $(haut75.net) + "."],

  ["How much is $20, $25 or $30 an hour after taxes in Indiana?",
   "At 40 hours a week in " + DEF[0] + " County, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) +
   " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) + " an hour. " +
   "$30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures with one exemption, " +
   "after federal tax, FICA, Indiana withholding and county withholding, with no retirement contribution."],

  ["How does Indiana county income tax work?",
   "Every one of Indiana&rsquo;s 92 counties has a rate, and your employer withholds it from your pay along with the state tax. The Department of Revenue calculates both on the same wages, " +
   "after exemptions, so on " + $(base75) + " of taxable wages " + N(pct(TAUX)) + " goes to the state and your county&rsquo;s rate goes to the county. " +
   "The rate that applies is the one for the county where you lived on January 1 of the tax year, not where you live today. If you lived out of state that day but your principal place of work was in an Indiana county, " +
   "it is the rate for the county where you work. The calculator above lets you pick the county; we start with " + DEF[0] + " County (" + pct(TAUX_DEF) + "), which includes Indianapolis."],

  ["Which Indiana counties have the highest and lowest income tax rates?",
   "In the Department of Revenue&rsquo;s notice effective October 1, 2026, the highest rates are " + haut1.nom + " County at " + N(pct(haut1.taux)) + ", " + haut2.nom + " at " +
   N(pct(haut2.taux)) + " and " + haut3.nom + " at " + N(pct(haut3.taux)) + ". The lowest are " + bas1.nom + " County at " + N(pct(bas1.taux)) + " and " + bas2.nom +
   " at " + N(pct(bas2.taux)) + ". On a " + $(75000) + " salary that is a gap of " + $$(ecartComtes) + " a year in take-home pay between " + bas1.nom + " and " + haut1.nom +
   ". The full list of 92 counties is in the table above."],

  ["I live in one county and work in another. Which rate is withheld?",
   "If you lived in Indiana on January 1, the county where you lived that day sets the rate, wherever you work in the state. The notice says the county of residence and the county of principal employment are both determined on January 1, " +
   "and that withholding agents should use the county of residence; the work county matters when you lived out of state that day. Moving later in the year does not change your county until the next calendar year. " +
   "Form WH-4 asks for both counties."],

  ["Does a 401(k) contribution lower my Indiana withholding?",
   "In this calculator, yes. The Department of Revenue&rsquo;s withholding notice works from &ldquo;gross income&rdquo; and does not discuss employee 401(k) contributions, so we apply the same treatment as the federal tax on this page, " +
   "which treats a traditional 401(k) contribution as reducing taxable pay. That is a modeling choice, and we can&rsquo;t confirm how a given employer handles it. On $75,000 with 6% going into a 401(k), Indiana state and county withholding together fall by " +
   $$(gain401) + " a year. Social Security and Medicare are still calculated on your gross pay."],

  ["How many exemptions should I claim on Form WH-4?",
   "You are entitled to one for yourself, and one more for a spouse if your spouse does not claim one. Each dependent adds another, and so does being 65 or older or blind. The notice values each of these at " + $(EXEMPTION) +
   " a year. Most dependent children qualify for an additional $1,500 exemption, and most adopted children for $3,000. This calculator assumes one exemption for a single filer or head of household and two for a married filer whose spouse does not claim one, " +
   "with no dependents. You may claim fewer than you are entitled to if you want more withheld."],

  ["How are bonuses withheld in Indiana?",
   "The notice says that for one-time or non-periodic payments, such as a bonus check, withholding should be computed without exemptions. On a " + $(BONUS) + " bonus that is " + $$(bonusEtat) +
   " of state tax at " + pct(TAUX) + " plus " + $$(bonusComte) + " of " + DEF[0] + " County tax at " + pct(TAUX_DEF) + ", or " + $$(bonusEtat + bonusComte) + " in all, before federal tax. " +
   "The calculator does not model bonuses."],

  ["I live in Michigan, Ohio, Kentucky, Pennsylvania or Wisconsin and work in Indiana. Is Indiana tax withheld?",
   "Usually not the state tax, but the county tax still applies. The Department of Revenue says Indiana has reciprocity agreements with those five states, under which Indiana does not tax the wages of their residents who work in Indiana, " +
   "and an employer is not required to withhold Indiana income tax from a qualified nonresident who gives it a completed Form WH-47. The same bulletin says reciprocity does not cover local income taxes: an employer must still withhold county tax if your principal place of work was in an Indiana county on January 1. " +
   "This calculator assumes an Indiana resident."],

  ["Are there other Indiana payroll deductions besides income tax?",
   "We model no other deductions. The Department of Workforce Development says employees do not pay into unemployment insurance and that no money is deducted from employee paychecks for it in Indiana. " +
   "We found no Indiana paid leave or state disability premium in the documents we read, but we have not checked every city or school district, so check your pay stub for any extra line."],

  ["Why is my Indiana paycheck different from this calculator?",
   "Common reasons: your county on January 1 is not the one selected here, or your employer uses a different county; you claimed a different number of exemptions on Form WH-4, for dependents or a spouse; you asked for an extra amount to be withheld from each paycheck; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; or part of your pay is a bonus. Withholding is also just an estimate of what you will owe, which is settled when you file."]
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
/* Les 5 Etats de reciprocite (IB #33) ; la phrase sort de PUBLIES, jamais saisie. */
const { PUBLIES: PUB } = require("../lib/etats-publies.js");
const RECIP = ["Kentucky", "Michigan", "Ohio", "Pennsylvania", "Wisconsin"];
const recipPub = RECIP.filter(n => PUB[n]);
const NB_MOTS = ["No", "One", "Two", "Three", "Four", "Five"];
const RECIPROQUES_PUBLIES = recipPub.length === 0 ? "" : NB_MOTS[recipPub.length] + " of the five states " +
  (recipPub.length < 5 ? "(" + recipPub.map(n => '<a href="/paycheck-calculator/' + PUB[n] + '/">' + n + "</a>").join(", ").replace(/, ([^,]*)$/, " and $1") + ") " : "") +
  "have" + " calculators here.";

/* La reponse directe : 40 a 60 mots, verifie plus bas. */
const reponse = "Indiana withholds a flat 2.95% in 2026 after $1,000 for each exemption on Form WH-4, plus a county income tax of 0.5% to 3.0%. " +
  "On $75,000 in Marion County, a single filer keeps about " + $(a75.net) + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Indiana (IN) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Indiana (IN) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA, the flat state rate and your county income tax.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Indiana (IN) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Indiana withholds a flat 2.95% in 2026 plus a county income tax of 0.5% to 3.0%. On $75,000 in Marion County a single filer keeps about ${$(a75.net)}.">
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
      "name": "Indiana Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Indiana take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Indiana income tax withheld at a flat 2.95% after Form WH-4 exemptions of ${$(EXEMPTION)} each, and the county income tax for the county you choose, from 0.5% to 3.0%."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Indiana", "item": "${URL}" }
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
    <li aria-current="page">Indiana</li>
  </ol>
</nav>

  <h1>Indiana Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Indiana take-home pay</h2>

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
        actually work, not an assumed 2,080 a year.</span>
      </div>

      <div class="field">
        <label for="county">Your Indiana county on January 1</label>
        <select id="county" name="county">
${optionsComtes}
        </select>
        <span class="help">Sets the county income tax withheld with your state tax. We start with ${DEF[0]}
        County, which includes Indianapolis. If you lived out of state on January 1, pick the county where you work.</span>
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
          <span class="help">Sets your federal brackets and standard deduction, and the Indiana
          exemptions: one (${$(DED.single)}) for single or head of household, two (${$(DED.marriedJoint)}) for a married filer
          whose spouse does not claim one.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Indiana state and county withholding too.</span>
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
    <p>Indiana withholds a flat percentage and has no brackets. The Department of Revenue&rsquo;s withholding notice tells the employer to take your wages for the year, subtract ${N($(EXEMPTION))} for every exemption claimed on
    Form WH-4, the state&rsquo;s withholding certificate, and apply ${N(pct(TAUX))} to what is left. It does not use the federal standard deduction. The same remainder is also taxed at your county&rsquo;s
    rate, which the notice lists for all 92 counties, from ${N(pct(bas1.taux))} to ${N(pct(haut1.taux))}. Indiana therefore has two income tax lines on a pay stub, and the second one depends on where you lived
    on January 1.
    </p>

    <p>The calculator applies five deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Indiana income tax</strong>: your wages after any 401(k) contribution, minus
      ${N($(DED.single))} for a single filer or head of household (one exemption) or ${N($(DED.marriedJoint))} for a married filer (two), times ${N(pct(TAUX))}.</li>
      <li><strong>County income tax</strong>: the same wages after exemptions, times the rate for the county you pick.
      We show it as its own line, labeled with the county and the rate.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Indiana, the <strong>Department of Revenue</strong>&rsquo;s Departmental Notice #1, effective October 1, 2026, with its county rate table; Form WH-4; its bulletin on nonresident employees;
    and the Department of Workforce Development. The state&rsquo;s forms site refuses automated requests, so we read Form WH-4 from a dated snapshot in the Internet Archive; the snapshot and its date are linked in the sources
    below. Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Which county we start with, and why it matters.</strong> There is no single Indiana rate, so we have to assume a county until you pick yours. We start with ${DEF[0]} County, which includes Indianapolis, at ${N(pct(TAUX_DEF))}.
    A different county changes your take-home pay: on ${N($(75000))}, a single filer keeps ${N($(bas75.net))} in ${bas1.nom} County and ${N($(haut75.net))} in ${haut1.nom} County, a gap of ${N($$(ecartComtes))} a year. Unless we say otherwise, the figures on this page, including the headline
    figure at the top, use ${DEF[0]} County.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the department&rsquo;s method. Your Indiana income tax itself is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: a different number of exemptions than the
    one it assumes, dependents, age 65 or older, blindness, adopted children, an extra amount withheld per paycheck, multiple jobs, bonuses and other one-time payments, the
    reciprocity exemption for residents of other states, the rules for nonresidents who work in Indiana 30 days or less, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Indiana take-home pay by salary</h2>
  <p class="prose">Single filer with one exemption in ${DEF[0]} County, no retirement contribution, 2026 state and federal rates. The
  IN state + county tax column adds Indiana income tax withholding to ${DEF[0]} County income tax withholding.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Indiana take-home pay, single filer, ${DEF[0]} County
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">IN state + county tax</th>
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

    <h2>Indiana county income tax rates and what they cost on $75,000</h2>
    <p>These are the rates in the Department of Revenue&rsquo;s Departmental Notice #1, effective October 1, 2026, for withholding periods beginning on or after that date. They run from ${N(pct(bas1.taux))} in ${bas1.nom} County to
    ${N(pct(haut1.taux))} in ${haut1.nom} County. The third column is the county tax on ${N($(75000))} for a single filer with one exemption, which is ${N($(base75))} of taxable wages times the county rate; the fourth is what that filer keeps after
    every deduction on this page. The state tax is the same ${N($$(a75.etat))} in every county.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Indiana county income tax rates, 2026, and take-home pay on $75,000, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">County</th>
          <th scope="col">County tax rate</th>
          <th scope="col">County tax a year</th>
          <th scope="col">Take-home a year</th>
        </tr>
      </thead>
      <tbody>
${lignesComtes}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>What Form WH-4 subtracts from your wages</h2>
    <p>Indiana has no standard deduction in its withholding method. The only subtractions are the exemptions you claim on Form WH-4, each worth a fixed dollar amount per year. For a single filer with one exemption on ${N($(75000))}, that is
    ${N($(75000))} &minus; ${N($(DED.single))} = ${N($(base75))}, which is then taxed at ${N(pct(TAUX))} for the state, ${N($$(a75.etat))}, and ${N(pct(TAUX_DEF))} for ${DEF[0]} County, ${N($$(ct(a75)))}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        What each Form WH-4 exemption subtracts from annual wages
      </caption>
      <thead>
        <tr>
          <th scope="col">Exemption</th>
          <th scope="col">Subtracted a year</th>
          <th scope="col">Notice #1 table</th>
        </tr>
      </thead>
      <tbody>
${tableExemptions}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Indiana hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in Indiana?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Indiana withholding and ${DEF[0]} County withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Indiana&rsquo;s share is
    ${N($$(h20.etat))} of state income tax withholding plus ${N($$(ct(h20)))} of county income tax for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Indiana?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. State and county income tax together are ${N($$(h25.etat + ct(h25)))}
    a year at $25 an hour, and ${N($$(h30.etat + ct(h30)))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses.
    The department&rsquo;s notice says that for one-time or non-periodic payments, such as a bonus check, withholding is computed without exemptions, so a bonus is withheld on its full amount.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Indiana take-home pay by hourly rate</h3>
    <p>Single filer with one exemption in ${DEF[0]} County, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Indiana take-home pay by hourly rate, single filer, ${DEF[0]} County, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Indiana</h2>

  <h3>One flat state rate, no brackets</h3>
  <p>Indiana&rsquo;s withholding notice gives one rate for individuals in 2026, ${N(pct(TAUX))}, and it does not change with your pay or filing status. There is no standard deduction either: the federal ${N($(fedDed.single))} plays no part. The only subtraction is
  ${N($(EXEMPTION))} for each exemption on your Form WH-4. A single filer on ${N("$75,000")} has ${N($(base75))} taxed, and the state tax is ${N($$(a75.etat))}. On ${N("$250,000")} the same rate applies to ${N($(250000 - DED.single))}, for ${N($$(a250.etat))}.</p>

  <h3>Your county adds a second income tax</h3>
  <p>Employers withhold county tax on the same wages, using the rate for the employee&rsquo;s county. There are 92 counties, and the rates in the October 1, 2026 notice run from ${N(pct(bas1.taux))} (${bas1.nom}) to ${N(pct(haut1.taux))} (${haut1.nom}).
  Combined with the state&rsquo;s ${N(pct(TAUX))}, withholding runs from ${N(pct(TAUX + bas1.taux))} to ${N(pct(TAUX + haut1.taux))} of wages after exemptions. In ${DEF[0]} County it is ${N(pct(TAUX + TAUX_DEF))}, so on ${N("$75,000")} county withholding is ${N($$(ct(a75)))}, about two-thirds of the state tax of ${N($$(a75.etat))}.</p>

  <h3>The county is the one from January 1</h3>
  <p>The notice says both the county of residence and the county of principal business or employment are determined on January 1 of the year in which the taxable year begins. If you lived in an Indiana county that day, your county of residence sets the rate. If you lived out of state that day but worked in an Indiana county,
  the work county sets it. Moving after January 1 does not change your county for that year, and Form WH-4 has a box to ask for a change effective next year.</p>

  <h3>One county&rsquo;s rate has already moved this year</h3>
  <p>The Department of Revenue published Departmental Notice #1 for 2026 on January 1 and issued an updated version effective October 1, 2026. The new one marks with an asterisk each county whose rate changed in between, and Boone County, now ${pct(CT.rates.boone[1])}, is the only one marked.
  The rates on this page are the October 1 rates.</p>

  <h3>Reciprocity covers the state tax, not the county tax</h3>
  <p>The Department of Revenue says Indiana has reciprocity agreements with Kentucky, Michigan, Ohio, Pennsylvania and Wisconsin: Indiana does not tax the wages of those states&rsquo; residents who work in Indiana, and an employer is not required to withhold Indiana income tax from a qualified nonresident who gives it a completed Form WH-47.
  The same bulletin says reciprocity does not cover local income taxes: those residents are subject to county tax in the same way as residents of other states. This calculator assumes an Indiana resident and does not model the exemption. ${RECIPROQUES_PUBLIES}</p>

  <h3>Exemptions, not allowances</h3>
  <p>Form WH-4 asks for exemptions, and each one is worth ${N($(EXEMPTION))} a year. You get one for yourself, and one for a spouse who does not claim one. A married filer therefore subtracts ${N($(DED.marriedJoint))} instead of ${N($(DED.single))}, and on ${N("$75,000")} has ${N($$(j75.etat))} of state tax and ${N($$(ct(j75)))} of county tax withheld,
  against ${N($$(a75.etat))} and ${N($$(ct(a75)))} for a single filer. Indiana has no head of household category on this form, so we give a head of household the single filer&rsquo;s one exemption: ${N($$(h75.etat))} of state tax.</p>

  <h3>No unemployment or leave premium comes out of your pay</h3>
  <p>The Department of Workforce Development says employees do not pay into unemployment insurance and that no money is deducted from employee paychecks for it in Indiana. We found no Indiana paid leave or disability premium in the documents we read, so the calculator takes no state payroll program deduction.</p>

  <h3>Your 401(k) lowers your Indiana wages</h3>
  <p>The withholding notice works from &ldquo;gross income&rdquo; and does not discuss employee 401(k) contributions. The federal tax on this page already treats a traditional 401(k) contribution as reducing taxable pay, so we apply the same treatment to the state and county tax; it is a modeling choice, not a rule the notice spells out. On ${N("$75,000")} with 6% going in, Indiana state and county withholding together fall by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in all.</p>

  <h2>Common mistakes</h2>

  <h3>Leaving out the county tax</h3>
  <p>A calculator that applies only the state&rsquo;s ${N(pct(TAUX))} overstates take-home pay for almost every Indiana worker. On ${N("$75,000")} in ${DEF[0]} County the county line is ${N($$(ct(a75)))}; in ${haut1.nom} County it is ${N($$(ct(haut75)))}.</p>

  <h3>Using the county you live in today</h3>
  <p>The rate that applies is the one for your county on January 1. If you moved in March, your county for withholding stays the same until the next calendar year.</p>

  <h3>Subtracting the federal standard deduction</h3>
  <p>The withholding method does not use it. It subtracts only the ${N($(EXEMPTION))} exemptions on Form WH-4, so a single filer on ${N("$75,000")} has ${N($(base75))} taxed by Indiana, not the ${N($(75000 - fedDed.single))} of federal taxable income.</p>

  <h3>Expecting exemptions on a bonus</h3>
  <p>The notice says a one-time payment such as a bonus check is withheld without exemptions. A ${N($(BONUS))} bonus has ${N($$(bonusEtat))} of state tax and ${N($$(bonusComte))} of ${DEF[0]} County tax withheld on the whole amount, ${N($$(bonusEtat + bonusComte))} together.</p>

  <h3>Forgetting that reciprocity stops at the county line</h3>
  <p>A Michigan, Ohio, Kentucky, Pennsylvania or Wisconsin resident working in Indiana can be exempt from Indiana state tax with a Form WH-47 and still owe county tax, based on the Indiana county where they work on January 1.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the exemptions on your Form WH-4 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in ${DEF[0]} County, Indiana, in 2026, claiming one exemption, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Indiana exemption: 1 &times; ${N($(EXEMPTION))} = ${N($(DED.single))}</li>
    <li>Wages after the exemption: ${N($(a75.brut))} &minus; ${N($(DED.single))} = ${N($(base75))}</li>
    <li>Indiana income tax: ${N($(base75))} &times; ${N(pct(TAUX))} = ${N($$(a75.etat))}
    a year, which is ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
    <li>${DEF[0]} County income tax: ${N($(base75))} &times; ${N(pct(TAUX_DEF))} = ${N($$(ct(a75)))}
    a year, which is ${N($$(ct(a75) / 12))} on a monthly paycheck</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Indiana borders Illinois, Kentucky, Michigan and Ohio, and we publish all four.
  Indiana is shown with one exemption and the ${DEF[0]} County income tax included in its state-level deductions.</p>
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
  <p>An <a href="/paycheck-calculator/illinois/">Illinois</a> worker keeps ${N($$(Math.abs(il75.net - a75.net)))} ${il75.net < a75.net ? "less" : "more"} than an Indiana worker in ${DEF[0]} County on the
  same salary, a <a href="/paycheck-calculator/kentucky/">Kentucky</a> worker keeps ${N($$(Math.abs(ky75.net - a75.net)))} ${ky75.net < a75.net ? "less" : "more"}, a <a href="/paycheck-calculator/michigan/">Michigan</a> worker keeps ${N($$(Math.abs(mi75.net - a75.net)))} ${mi75.net < a75.net ? "less" : "more"}, and an
  <a href="/paycheck-calculator/ohio/">Ohio</a> worker keeps ${N($$(Math.abs(oh75.net - a75.net)))} ${oh75.net < a75.net ? "less" : "more"}. Ohio&rsquo;s figure leaves out city income tax, and Kentucky&rsquo;s leaves out local occupational license taxes; neither calculator models them.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/illinois/">Illinois paycheck calculator</a> &mdash; the neighbor to the west, with a flat 4.95% after a personal exemption.</li>
    <li><a href="/paycheck-calculator/kentucky/">Kentucky paycheck calculator</a> &mdash; the neighbor to the south, a flat 3.5% after a $3,360 deduction and a reciprocity agreement with Indiana.</li>
    <li><a href="/paycheck-calculator/michigan/">Michigan paycheck calculator</a> &mdash; the neighbor to the north, a flat rate with a per-person exemption and an income tax reciprocity agreement with Indiana.</li>
    <li><a href="/paycheck-calculator/ohio/">Ohio paycheck calculator</a> &mdash; the neighbor to the east, with nothing withheld on the first $26,050 of taxable income and a reciprocity agreement with Indiana.</li>
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
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Indiana rates.
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

/* 1. Recoupement independant : la methode du Notice #1 ecrite ici A PARTIR DU
   TEXTE (exemple imprime : 800 $ hebdomadaire, 5 exemptions, comte a 0,01 :
   473,08 $ imposables, 13,96 $ d'Etat, 4,73 $ de comte), pas du moteur. */
const ex = 800 - 96.15 - 86.54 - 28.85 - 115.38;           // exemple imprime : 473,08
if (Math.abs(ex - 473.08) > 0.005) echec("l'exemple imprime du Notice ne donne pas 473,08 $");
if (Math.abs(+(473.08 * 0.0295).toFixed(2) - 13.96) > 0.005 || Math.abs(+(473.08 * 0.01).toFixed(2) - 4.73) > 0.005) echec("exemple imprime : 13,96 $ / 4,73 $");
const verifs = [["single", a75, 75000, 1, "marion"], ["marriedJoint", j75, 75000, 2, "marion"], ["headOfHousehold", h75, 75000, 1, "marion"],
                ["single", a250, 250000, 1, "marion"], ["single", h20, 20 * HEURES, 1, "marion"],
                ["single", h25, 25 * HEURES, 1, "marion"], ["single", h30, 30 * HEURES, 1, "marion"],
                ["single", bas75, 75000, 1, bas1.cle], ["single", haut75, 75000, 1, haut1.cle]];
for (const [statut, r, brut, n, cle] of verifs) {
  const taux = CT.rates[cle][1];
  const base = brut - n * 1000;
  if (Math.abs(base * 0.0295 - r.etat) > 0.006) echec(statut + " " + brut + " $ : Etat notice " + (base * 0.0295).toFixed(3) + ", moteur " + r.etat.toFixed(3));
  if (Math.abs(base * taux - ct(r)) > 0.006) echec(statut + " " + brut + " $ : comte notice " + (base * taux).toFixed(3) + ", moteur " + ct(r).toFixed(3));
}
/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 06/10/2026). */
const attendusProse = [
  [a75.etat, 2183.00, "etat 75 000"], [ct(a75), 1494.80, "Marion 75 000"], [a75.net, 57914.70, "net 75 000"],
  [j75.etat, 2153.50, "etat marie"], [ct(j75), 1474.60, "Marion marie"], [h75.etat, 2183.00, "etat chef de famille"],
  [h25.etat + ct(h25), 2534.70, "etat + comte 25 $/h"], [h25.net, 41427.30, "net 25 $/h"],
  [a250.etat, 7345.50, "etat 250 000"], [ct(a250), 5029.80, "Marion 250 000"], [a250.net, 170806.70, "net 250 000"],
  [bas75.etat + ct(bas75), 2183 + 370, "Porter 75 000"], [ct(bas75), 370.00, "Porter comte"], [ct(haut75), 2220.00, "Randolph comte"],
  [ecartComtes, 1850.00, "ecart Porter / Randolph"], [ct(ham75), 814.00, "Hamilton"],
  [gain401, 223.65, "gain 401(k)"], [bonusEtat, 147.50, "prime etat"], [bonusComte, 101.00, "prime comte"],
  [base75, 74000, "base 75 000"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(TAUX === 0.0295 && DED.single === 1000 && DED.marriedJoint === 2000 && DED.headOfHousehold === 1000)) echec("taux / exemptions != moteur");
if (!(COMTES.length === 92 && DEF[0] === "Marion" && TAUX_DEF === 0.0202)) echec("92 comtes et defaut Marion 0,0202 attendus");
if (!(bas1.nom === "Porter" && bas1.taux === 0.005 && bas2.nom === "Spencer" && bas2.taux === 0.008)) echec("les deux comtes les moins taxes ne sont plus Porter et Spencer");
if (!(haut1.nom === "Randolph" && haut1.taux === 0.03 && haut2.nom === "Cass" && haut2.taux === 0.0295 && haut3.nom === "Wabash" && haut3.taux === 0.029)) echec("les trois comtes les plus taxes ne sont plus Randolph, Cass et Wabash");
if (CT.rates.boone[1] !== 0.0171) echec("Boone n'est plus a 0,0171");
if (!(il75.net !== a75.net && ky75.net !== a75.net && mi75.net !== a75.net && oh75.net !== a75.net)) echec("la comparaison (IL, KY, MI, OH) n'est plus celle ecrite");
if (!(R.states.illinois.incomeTax.hasIncomeTax && R.states.michigan.incomeTax.hasIncomeTax && R.states.ohio.incomeTax.hasIncomeTax)) echec("un voisin n'a plus d'impot");
/* Le 401(k) ne change ni la FICA ni le comte du brut : le comte est sur la base apres 401(k). */
if (!(Math.abs(progs(r401) - ct(r401)) < 1e-9)) echec("un programme salarie inattendu apparait avec un 401(k)");
if (progs(a75) !== ct(a75)) echec("a 75 000 $, le seul « programme » doit etre le comte");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
console.log("recoupements Notice #1 (Etat 2,95 %% + comte, exemple imprime 473,08 $) : OK ; reponse directe %d mots", nbMotsReponse);
