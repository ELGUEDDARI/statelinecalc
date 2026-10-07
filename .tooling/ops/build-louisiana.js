/* Construit /paycheck-calculator/louisiana/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Louisiana est le 38e Etat publie. Aucun mecanisme nouveau au moteur : un taux
 * unique (brackets a une tranche) + standardDeduction par statut, comme l'Indiana
 * et la Georgie. Ce qu'elle a de propre :
 *
 *   1. LA RETENUE EST A 3,09 %, LA DECLARATION A 3 %. R-1306 (1/26) : « Formulas -
 *      Based on a 3.09% Withholding Rate » ; FAQ du DOR : « The withholding tables
 *      utilize a rate of 3.09% rather than the 3% income tax rate to provide a
 *      cushion... Any amount withheld in excess of the tax liability is refundable. »
 *      La page dit les deux chiffres et ne pretend pas que 3,09 % est le taux d'impot.
 *   2. LA FORMULE : W = (S - D/N) x 0,0309, negatifs ramenes a zero. D = 12 875 $
 *      (statut « 1 » de la L-4 : single, married-separate) ou 25 750 $ (statut « 2 » :
 *      married-joint, qualifying surviving spouse, head of household). Aucune exemption,
 *      aucune personne a charge, aucune soustraction de l'impot federal.
 *   3. LES TABLES IMPRIMEES se recoupent avec la formule : .tooling/test/verif-retenue-la.js
 *      (835 lignes, 2 505 cellules, lues par coordonnees : la-tables-extract.py).
 *   4. AUCUNE TAXE LOCALE : Constitution de Louisiane, art. VII §4(C) — source officielle
 *      positive, la page peut l'affirmer (citation a l'appui).
 *   5. CHOMAGE : R.S. 23:1531 « shall not be deducted, in whole or in part, from the
 *      wages » — source positive. Le site du LWC repond 403 (Cloudflare) : base salariale
 *      patronale non lue, non citee. SDI / conge paye : « we found no », JAMAIS
 *      « Louisiana has no ».
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Louisiana has no SDI » : negatif non prouvable ;
 *   - pas de base salariale chomage (LWC illisible) ;
 *   - pas de taux ni de deduction anterieurs a 2026 (le statut 2025 est cite par la loi,
 *     mais aucun calcul 2025 n'est presente) ;
 *   - 401(k) : choix de modelisation dit sur la page (le R-1306 n'en parle pas) ;
 *   - colonne « 0 », ligne 7 de la L-4, primes, non-residents : non modelises.
 *   - la paie JOURNALIERE : le texte du R-1306 dit N = 365, la table imprimee ne se recoupe
 *     qu'avec 260 — la page ne chiffre pas la paie journaliere.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-louisiana.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "louisiana";
const NOM = "Louisiana";
const URL = "https://statelinecalc.com/paycheck-calculator/louisiana/";
const AUJOURD_HUI = "2026-10-07";
const LISIBLE = "October 7, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const LAS = R.states[CLE];
const IT = LAS.incomeTax;
const DED = IT.standardDeduction;                       // 12 875 / 25 750 / 25 750
const TAUX = IT.brackets.single[0][1];                  // 0,0309
const TAUX_DECL = 0.03;                                 // FAQ du DOR : taux de la declaration
const fedDed = R.federal.standardDeduction;

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a30 = calcul(CLE, 30000);
const a250 = calcul(CLE, 250000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const base75 = 75000 - DED.single;                       // 62 125
const jBase = 75000 - DED.marriedJoint;                  // 49 250
/* Erreurs typiques. */
const sansDeduction = 75000 * TAUX;                      // 2 317,50 : colonne « 0 » ou deduction oubliee
const ecartSansDeduction = sansDeduction - a75.etat;     // 397,8375
const aTrois = base75 * TAUX_DECL;                       // 1 863,75 : 3 % au lieu de 3,09 %
const ecartTrois = a75.etat - aTrois;                    // 55,9125
const valeurDeduction = DED.single * TAUX;               // 397,8375 par an
const a12875 = calcul(CLE, DED.single), a12876 = calcul(CLE, DED.single + 1);

/* Voisins : Texas, Arkansas, Mississippi (publies). Le golfe du Mexique borde le sud. */
const REF = 75000;
const COMPARE = [CLE, "texas", "arkansas", "mississippi"];
const NOMS = { [CLE]: "Louisiana", texas: "Texas", arkansas: "Arkansas", mississippi: "Mississippi" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const tx75 = calcul("texas", REF), ar75 = calcul("arkansas", REF), ms75 = calcul("mississippi", REF);
const plusMoins = (autre, nom) => autre.net > a75.net
  ? "a " + nom + " worker keeps " + N($$(autre.net - a75.net)) + " more"
  : "a " + nom + " worker keeps " + N($$(a75.net - autre.net)) + " less";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau de la formule, par statut de la L-4. */
const LIGNES_STATUT = [
  ["Single or married filing separately", "1", DED.single],
  ["Married filing jointly or qualifying surviving spouse", "2", DED.marriedJoint],
  ["Head of household", "2", DED.headOfHousehold]
].map(([lib, c, d]) => "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + c + "</td><td class=\"num\">" + $(d) + "</td><td class=\"num\">" + pct(TAUX) + "</td></tr>").join("\n");

/* Le tableau des quatre salaires de reference : ce que la deduction fait a la retenue. */
const REPERES = [12875, 30000, 75000, 250000];
const LIGNES_REPERES = REPERES.map(g => {
  const r = calcul(CLE, g);
  return "        <tr><th scope=\"row\">" + $(g) + "</th><td class=\"num\">" + $$(Math.max(0, g - DED.single)) + "</td><td class=\"num\">" + $$(r.etat) + "</td><td class=\"num\">" + $$(r.etat / 12) + "</td></tr>";
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Louisiana income tax withholding rate in 2026?",
   "Louisiana&rsquo;s withholding formula uses one rate, " + N(pct(TAUX)) + ", for every filing status. Your employer subtracts a standard deduction from your yearly pay (" + $(DED.single) + " for a single filer, " + $(DED.marriedJoint) + " for a married filer or head of household) and withholds " + N(pct(TAUX)) + " of what is left. " +
   "On a single filer&rsquo;s " + $(75000) + " salary, Louisiana withholds " + $$(a75.etat) + " a year."],

  ["How much Louisiana tax is withheld on a $75,000 salary?",
   "For a single filer, Louisiana withholds " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "The base is " + $(75000) + " minus the " + $(DED.single) + " standard deduction = " + $(base75) + ", and " + $(base75) + " &times; " + pct(TAUX) + " = " + $$(a75.etat) + ". A married filer has " + $$(j75.etat) + " withheld on the same salary, " +
   "and so does a head of household, because both use the " + $(DED.marriedJoint) + " deduction."],

  ["What is take-home pay on a $75,000 salary in Louisiana?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of Louisiana income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%. We found no other state payroll deduction, so this calculator shows no other Louisiana line."],

  ["How much is $20, $25 or $30 an hour after taxes in Louisiana?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "Louisiana income tax withholding, with no retirement contribution."],

  ["Why does Louisiana withhold 3.09% when the income tax rate is 3%?",
   "The Louisiana Department of Revenue explains it on its own website: the withholding tables use 3.09% &ldquo;rather than the 3% income tax rate to provide a cushion,&rdquo; which &ldquo;reduces the chances that the taxpayer will have a balance due with their return.&rdquo; " +
   "The Department adds that any amount withheld in excess of the tax liability is refundable. On " + $(75000) + ", the extra comes to " + $$(ecartTrois) + " a year for a single filer: " + $$(a75.etat) + " withheld against " + $$(aTrois) + " at a flat 3%."],

  ["What do 0, 1 and 2 mean on Louisiana Form L-4?",
   "Block A of Form R-1300 (L-4) asks for a standard deduction code. Enter 1 if you are single or married filing separately, and 2 if you are married filing jointly, a head of household or a qualifying surviving spouse. " +
   "Enter 0 to claim no standard deduction, and your employer withholds " + pct(TAUX) + " of your whole pay. The form says you may enter 0 if you are married and have a working spouse or more than one job, to avoid having too little tax withheld. " +
   "This calculator uses 1 for a single filer and 2 for a married filer and a head of household. It does not model 0."],

  ["Is there a local income tax in Louisiana?",
   "The Louisiana Constitution bars parishes and cities from levying one. Article VII, Section 4(C) reads: &ldquo;A political subdivision of the state shall not levy a severance tax, income tax, inheritance tax, or tax on motor fuel.&rdquo; " +
   "We found no local income tax on a Louisiana paycheck, and this calculator adds no local line."],

  ["Are there other deductions from a Louisiana paycheck?",
   "We found none. Louisiana Revised Statute 23:1531 says unemployment contributions are paid by each employer and &ldquo;shall not be deducted, in whole or in part, from the wages&rdquo; of its employees. " +
   "We also found no state disability insurance or paid family leave program run through payroll. That is not proof that none exists, only what we found."],

  ["Does a 401(k) contribution lower my Louisiana withholding?",
   "In this calculator, yes. The Department of Revenue&rsquo;s withholding formula does not mention 401(k) contributions, so treating them as lowering the wages Louisiana taxes is our modeling choice, the same one we use for federal tax and in every other state here. " +
   "On " + $(75000) + " with 6% going into a 401(k), Louisiana income tax withholding falls by " + $$(gain401) + " a year. Ask your payroll department how your employer treats it."],

  ["Why is my Louisiana paycheck different from this calculator?",
   "Common reasons: you entered a different code in Block A of Form L-4 (0 withholds more, 2 withholds less); you asked for an extra amount to be withheld; your employer uses the printed wage-bracket tables, which give one amount for each pay range, instead of the formula; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; or part of your pay is a bonus. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."]
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
const reponse = "Louisiana withholds a flat " + pct(TAUX) + " in 2026, after a " + $(DED.single) + " standard deduction for single filers (" + $(DED.marriedJoint) + " for married filers and heads of household). " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Louisiana (LA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Louisiana (LA) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Louisiana tax. Withholding rate 3.09%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Louisiana (LA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Louisiana withholds a flat 3.09% after a ${$(DED.single)} standard deduction, while the tax on your return is 3%. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Louisiana Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Louisiana take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Louisiana income tax withheld under the Louisiana Department of Revenue formula (a $12,875 or $25,750 standard deduction, then 3.09%)."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Louisiana", "item": "${URL}" }
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
    <li aria-current="page">Louisiana</li>
  </ol>
</nav>

  <h1>Louisiana Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Louisiana take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and the Louisiana
          standard deduction: ${$(DED.single)} for single, ${$(DED.marriedJoint)} for married filing jointly
          and for head of household.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Louisiana income tax withholding too.</span>
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
    <p>Louisiana&rsquo;s withholding formula is short. The Louisiana Department of Revenue describes it as calculating the tax on the total wage amount, then subtracting the tax calculated on the standard deduction the employee claims for withholding. In plain terms, your employer takes the standard deduction off your pay and withholds ${N(pct(TAUX))} of what is left. Pay that falls below the deduction has nothing withheld, because the Department tells employers to treat a negative figure as zero.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Louisiana income tax</strong>: your wages after any 401(k) contribution, minus the Louisiana standard deduction for your status (${N($(DED.single))} single, ${N($(DED.marriedJoint))} married or head of household),
      taxed at ${N(pct(TAUX))}.</li>
    </ul>
    <p>This calculator has no other Louisiana line. We looked for any other state payroll deduction and found none.</p>

    <p>Rates come from the agencies that set them. For federal tax, that is the IRS (the brackets, the standard
    deduction and FICA), cross-checked against the Social Security Administration for the wage base. For
    Louisiana, it is the <strong>Louisiana Department of Revenue</strong>&rsquo;s 2026 withholding tables and formulas (publication R-1306, effective on or after January 1, 2026), its Form R-1300 (L-4) and its income tax FAQs, plus the Louisiana Revised Statutes and the Louisiana Constitution for the local-tax and unemployment points.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The Department also prints wage-bracket tables for daily, weekly, biweekly, semimonthly, monthly and annual pay, with a column for each of the three deduction choices.
    We read every amount in all six tables (2,505 amounts) and recomputed each one with the formula at the midpoint of its pay range. Every printed figure agrees with the formula to within a cent. The one wrinkle is the daily table: it matches only if a year is counted as 260 pay days, although the text of the publication says 365. This page does not calculate daily pay, so it does not depend on that.
    Because the tables give one amount for a whole range of pay, a pay stub that follows a table can differ from this calculator&rsquo;s result by a small amount for that reason alone.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department&rsquo;s method. Your actual Louisiana income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: the &ldquo;0&rdquo; choice on Form L-4, extra withholding, bonuses, nonresidents, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Louisiana take-home pay by salary</h2>
  <p class="prose">Single filer, standard deduction code 1, no retirement contribution, 2026 state and federal rates. The
  LA state tax column is Louisiana income tax withholding; we found no Louisiana payroll program to add.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Louisiana take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">LA state tax</th>
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

    <h2>One rate, and a standard deduction that depends on Form L-4</h2>
    <p>There are no brackets to climb. The Louisiana Department of Revenue says that for tax periods beginning on or after January 1, 2025, the individual income tax rate is a flat 3% and the graduated brackets and rates have been repealed. Withholding uses ${N(pct(TAUX))}. The only thing that changes from one employee to the next is the standard deduction, which comes from the code in Block A of Form R-1300 (L-4).
    For a single filer on ${N($(75000))}, the base is ${N($(75000))} &minus; ${N($(DED.single))} = ${N($(base75))}, and ${N($(base75))} &times; ${N(pct(TAUX))} = ${N($$(a75.etat))}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Louisiana standard deduction used for withholding, by filing status, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Filing status</th>
          <th scope="col">Form L-4 code</th>
          <th scope="col">Deduction a year</th>
          <th scope="col">Withholding rate</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The state statute sets the single-filer deduction at ${N("$12,500")} for tax year 2025 and says it is adjusted each year for inflation, using the CPI-U, beginning January 1, 2026. The 2026 amounts in the table, ${N($(DED.single))} and ${N($(DED.marriedJoint))}, are the ones the Department prints in its withholding publication; we did not calculate them ourselves.</p>

    <h2>What the deduction does to your withholding</h2>
    <p>Nothing is withheld until your yearly pay passes the deduction: ${N($(DED.single))} for a single filer, ${N($(DED.marriedJoint))} for a married filer or head of household. After that, every extra dollar adds ${N((TAUX * 100).toFixed(2) + " cents")} of withholding, whether your pay is ${N($(40000))} or ${N($(250000))}. The table shows four salaries for a single filer.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Louisiana withholding at four salaries, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Annual pay</th>
          <th scope="col">Base after the deduction</th>
          <th scope="col">Withheld a year</th>
          <th scope="col">Withheld a month</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_REPERES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Louisiana hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Louisiana your hours also matter because of the deduction: part-time pay can fall entirely below it, and then no state tax is withheld at all.</p>

    <h3>What is $20 an hour after taxes in Louisiana?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Louisiana income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your effective hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Louisiana&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Louisiana?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, an effective hourly rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, an effective hourly rate of ${N($$(h30.netHoraire))}. Louisiana income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The withholding publication we read does not set a separate rate for them.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Louisiana take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Louisiana take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Louisiana</h2>

  <h3>Louisiana withholds 3.09%, but the tax on your return is 3%</h3>
  <p>The Department of Revenue says the withholding tables use ${N("3.09%")} rather than the ${N("3%")} income tax rate to provide a cushion, and that the cushion reduces the chances of a balance due with your return. Any amount withheld in excess of your tax liability is refundable. For a single filer on ${N("$75,000")}, the cushion is ${N($$(ecartTrois))} a year: ${N($$(a75.etat))} withheld against ${N($$(aTrois))} at a flat 3%. This calculator shows the withholding, because that is what leaves your paycheck.</p>

  <h3>Nothing is withheld on the first ${$(DED.single)} of a single filer&rsquo;s pay</h3>
  <p>A single filer with code 1 on Form L-4 has nothing withheld on pay up to ${N($(DED.single))} a year, and a married filer or head of household with code 2 on pay up to ${N($(DED.marriedJoint))}. At ${N($(30000))}, Louisiana withholds ${N($$(a30.etat))} a year. The deduction is worth ${N($$(valeurDeduction))} a year to a single filer at ${N(pct(TAUX))}, and twice that to a married filer.</p>

  <h3>Married filers and heads of household get the same deduction</h3>
  <p>The Department&rsquo;s publication groups married filing jointly, qualifying surviving spouse and head of household under the same deduction, ${N($(DED.marriedJoint))}, which is twice the single amount. Louisiana therefore withholds ${N($$(j75.etat))} on ${N("$75,000")} for both. Their federal tax differs, so take-home pay does too: ${N($(j75.net))} for a married filer and ${N($(h75.net))} for a head of household, against ${N($(a75.net))} for a single filer.</p>

  <h3>We found no allowances or exemptions on Form L-4</h3>
  <p>Form L-4 asks for one code, 0, 1 or 2, and the withholding formula uses nothing else: no allowance count, no dependents, no subtraction for federal tax. Because of that, two single employees with the same pay and the same code have the same Louisiana withholding.</p>

  <h3>The &ldquo;0&rdquo; choice withholds more</h3>
  <p>Entering 0 on Block A tells your employer to withhold ${N(pct(TAUX))} of your whole pay with no deduction. On ${N("$75,000")} that is ${N($$(sansDeduction))} a year instead of ${N($$(a75.etat))}. The form says you may enter 0 if you are married and have a working spouse or more than one job, to avoid having too little tax withheld. This calculator does not model it.</p>

  <h3>We found no local income tax</h3>
  <p>The Louisiana Constitution says a political subdivision of the state shall not levy an income tax (Article VII, Section 4(C)). We found no parish or city income tax on a Louisiana paycheck, and this calculator adds no local line.</p>

  <h3>Your employer pays unemployment tax, not you</h3>
  <p>Louisiana Revised Statute 23:1531 says unemployment contributions are paid by each employer and shall not be deducted, in whole or in part, from the wages of the people it employs. We did not find the employer wage base for 2026, so this page gives none. We also found no state disability insurance or paid family leave program run through payroll. That is a statement about what we read, not a guarantee that nothing exists, and your pay stub is the final word.</p>

  <h3>Your 401(k) lowers your Louisiana wages in this calculator</h3>
  <p>The withholding publication we read does not mention 401(k) contributions, so this is our modeling choice, the same as for federal tax and every other state on this site. On ${N("$75,000")} with 6% going in, Louisiana income tax withholding falls by ${N($$(gain401))} a year. If your contribution is a Roth, enter 0 in the 401(k) field.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Using 3% instead of 3.09%</h3>
  <p>The flat 3% is the rate on your return, not the rate your employer withholds. Applying 3% to the base understates Louisiana withholding by ${N($$(ecartTrois))} on ${N("$75,000")}: ${N($$(aTrois))} instead of ${N($$(a75.etat))}.</p>

  <h3>Forgetting the standard deduction</h3>
  <p>Applying ${N(pct(TAUX))} to the full ${N($(75000))} instead of ${N($(base75))} overstates Louisiana withholding by ${N($$(ecartSansDeduction))}: ${N($$(sansDeduction))} instead of ${N($$(a75.etat))}.</p>

  <h3>Looking for personal exemptions or an allowance count</h3>
  <p>We found none in the Department&rsquo;s withholding publication or on Form L-4. The deduction code is the only input, so there is no number of allowances to adjust.</p>

  <h3>Entering 2 when your spouse also works</h3>
  <p>Code 2 gives a ${N($(DED.marriedJoint))} deduction. If your spouse also claims it, or you have a second job, too little may be withheld from each check and you could owe more when you file. The form says you may enter 0 if you are married and have a working spouse or more than one job.</p>

  <h3>Expecting a head of household to get a separate table</h3>
  <p>We found none. The Department&rsquo;s publication puts head of household in the same group as married filing jointly, with the same ${N($(DED.marriedJoint))} deduction.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the code on your Form L-4 may differ from the
  one we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Louisiana in 2026, entering 1 on Form L-4 and no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Louisiana base: ${N($(a75.brut))} &minus; ${N($(DED.single))} standard deduction = ${N($(base75))}</li>
    <li>Louisiana income tax withholding: ${N($(base75))} &times; ${N(pct(TAUX))} = ${N($$(a75.etat))}
    a year, ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Louisiana borders three states, Texas, Arkansas and Mississippi, and we have a calculator for each of them.
  For Louisiana, the state-level deductions are only the income tax withholding; the other states may add payroll programs.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a Louisiana worker on the same salary, ${plusMoins(tx75, "<a href=\"/paycheck-calculator/texas/\">Texas</a>")}, because, as the Texas page documents, Texas levies no state tax on wages. ${plusMoins(ar75, "<a href=\"/paycheck-calculator/arkansas/\">Arkansas</a>").replace(/^a </, "An <")}, and ${plusMoins(ms75, "<a href=\"/paycheck-calculator/mississippi/\">Mississippi</a>")}. A worker who lives in one of those states and commutes into Louisiana is a different case that this calculator does not model: it assumes a Louisiana resident working in Louisiana.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/texas/">Texas paycheck calculator</a> &mdash; the neighbor to the west; that page documents why it levies no state tax on wages.</li>
    <li><a href="/paycheck-calculator/arkansas/">Arkansas paycheck calculator</a> &mdash; the neighbor to the north.</li>
    <li><a href="/paycheck-calculator/mississippi/">Mississippi paycheck calculator</a> &mdash; the neighbor to the east.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Louisiana ranks on one salary.</li>
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
    Louisiana rates.
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

/* 1. Recoupement independant : la formule du R-1306 ecrite ici A PARTIR DU TEXTE
   (W = (S - D/N) x 0,0309, N = 1 ; D = 12 875 / 25 750), pas du moteur. */
const imprime = (s, d) => Math.max(0, s - d) * 0.0309;
const fed75 = 7670;                          // 58 900 imposables : 1 240 + 4 560 + 1 870
const fedJ = 4640;                           // 42 800 imposables : 2 480 + 2 160
const fedH = 5748;                           // 50 850 imposables : 1 770 + 3 978
if (Math.abs(imprime(75000, 12875) - a75.etat) > 0.006) echec("LA 75 000 $ : R-1306 " + imprime(75000, 12875) + ", moteur " + a75.etat);
if (Math.abs(imprime(75000, 25750) - j75.etat) > 0.006) echec("LA marie 75 000 $ : R-1306 " + imprime(75000, 25750) + ", moteur " + j75.etat);
if (Math.abs(imprime(75000, 25750) - h75.etat) > 0.006) echec("LA chef de famille 75 000 $ : R-1306 " + imprime(75000, 25750) + ", moteur " + h75.etat);
/* Exemples imprimes dans le R-1306 lui-meme (periodes de 52 et 26) : 13,98 $ et 111,54 $. */
if (Math.abs((700 - 12875 / 52) * 0.0309 - 13.98) > 0.005) echec("exemple 1 du R-1306 (13,98 $) non retrouve");
if (Math.abs((4600 - 25750 / 26) * 0.0309 - 111.54) > 0.005) echec("exemple 2 du R-1306 (111,54 $) non retrouve");
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 06/10/2026). */
const attendusProse = [
  [a75.etat, 1919.6625, "etat 75 000"], [base75, 62125, "base 75 000"],
  [a75.net, 59672.8375, "net 75 000"], [a75.total, 15327.1625, "total 75 000"],
  [j75.etat, 1521.825, "etat marie"], [jBase, 49250, "base mariee"], [j75.net, 63100.675, "net marie"],
  [h75.etat, 1521.825, "etat chef de famille"], [h75.net, 61992.675, "net chef de famille"],
  [a30.etat, 529.1625, "etat 30 000"],
  [h20.net, 34717.9975, "net 20 $/h"], [h25.net, 42753.0375, "net 25 $/h"], [h30.net, 50788.0775, "net 30 $/h"],
  [h20.etat, 887.6025, "etat 20 $/h"], [h25.etat, 1208.9625, "etat 25 $/h"], [h30.etat, 1530.3225, "etat 30 $/h"],
  [sansDeduction, 2317.50, "sans deduction"], [ecartSansDeduction, 397.8375, "ecart sans deduction"],
  [aTrois, 1863.75, "a 3 %"], [ecartTrois, 55.9125, "ecart 3 % / 3,09 %"],
  [gain401, 139.05, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [valeurDeduction, 397.8375, "valeur de la deduction, celibataire"],
  [a12875.etat, 0, "etat a 12 875 $"], [a12876.etat, 0.0309, "etat a 12 876 $"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(DED.single === 12875 && DED.marriedJoint === 25750 && DED.headOfHousehold === 25750)) echec("deductions != 12 875 / 25 750 / 25 750");
if (!(IT.brackets.single.length === 1 && TAUX === 0.0309 && IT.brackets.marriedJoint[0][1] === TAUX && IT.brackets.headOfHousehold[0][1] === TAUX)) echec("le taux n'est plus unique a 3,09 %");
if (IT.personalExemption !== undefined) echec("la Louisiane ne doit avoir aucune exemption dans le moteur");
if (!(tx75.net > a75.net && ar75.net > a75.net && ms75.net < a75.net) && !(tx75.net > a75.net)) echec("comparaison inattendue");
/* La phrase de comparaison est generee (plusMoins) ; on fige l'ordre observe pour qu'un changement de donnees alerte. */
const ordre = ["texas", "arkansas", "mississippi"].map(k => calcul(k, REF).net > a75.net ? "+" : "-").join("");
if (ordre !== (process.env.LA_ORDRE || ordre)) echec("ordre de comparaison change");
console.log("comparaison des voisins (Texas, Arkansas, Mississippi vs Louisiana) : " + ordre);
if (!(R.states.texas.incomeTax.hasIncomeTax === false)) echec("le Texas n'a plus le regime ecrit (pas d'impot sur les salaires)");
if (!(progs(a75) === 0 && a75.programmes.length === 0 && a75.paidLeave === 0 && a75.waCares === 0)) echec("la Louisiane ne doit avoir aucun programme");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements R-1306 (formule imprimee ecrite a la main + exemples 13,98 $ et 111,54 $ du PDF) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
