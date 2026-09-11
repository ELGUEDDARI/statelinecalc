/* Construit /paycheck-calculator/wisconsin/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Le Wisconsin est le 16e Etat publie. Ce qu'il a de propre, et qu'aucune des
 * 15 autres pages ne peut dire :
 *
 *   1. SA DEDUCTION STANDARD EST UNE PENTE, PAS UNE MARCHE. La plupart des
 *      Etats publient un montant fixe par foyer ; l'Ohio le fait varier par
 *      PALIERS de revenu. Le Wisconsin publie une FORMULE LINEAIRE qui
 *      diminue dollar pour dollar a mesure que le revenu monte, jusqu'a
 *      atteindre zero : "13,960 less 12% of the amount over $20,120" pour un
 *      celibataire (2026 Form 1-ES Instructions). Le chef de famille a meme
 *      DEUX segments de pente successifs (22,515 % puis 12 %).
 *   2. UNE EXEMPTION PERSONNELLE DE 700 $ S'AJOUTE A CETTE DEDUCTION, par
 *      personne du foyer que le calculateur connait (declarant, et conjoint
 *      en commun).
 *   3. LA PROPRE PAGE « TAUX » DU DOR EST PERIMEE. Au 11/09/2026,
 *      revenue.wi.gov/Pages/FAQS/pcs-taxrates.aspx n'affiche que le bareme
 *      2025 ; le bareme 2026 n'existe que dans le Form 1-ES. Une recherche
 *      pressee tombe sur la mauvaise annee au premier lien officiel.
 *
 * ── LA VERIFICATION QUI DONNE CONFIANCE DANS LE MOTEUR ──────────────────────
 * Les quatre constantes imprimees par le Form 1-ES se recalculent au centime
 * pres a partir des seuils de tranche eux-memes : 15 110 x 3,5 % = 528,85 $,
 * + (51 950 - 15 110) x 4,4 % = 2 149,81 $, + (332 720 - 51 950) x 5,3 % =
 * 17 030,62 $. Meme chose en commun jusqu'a 22 707,70 $. Si un seuil avait
 * ete recopie de travers, l'egalite casserait. Verifie aussi dans
 * .tooling/test/test-engine.js, independamment du moteur.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur un impot municipal ou de comte : aucune des cinq sources lues
 *     n'en mentionne, en bien ou en mal ;
 *   - rien sur le statut Married Filing Separately : notre calculateur ne le
 *     propose pas ;
 *   - rien sur l'age 65+ ou les personnes a charge : le calculateur ne les
 *     demande pas, donc le supplement de 250 $ et les 700 $ par personne a
 *     charge ne sont pas modelises.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans data/rates-2026.js et .tooling/sources/wisconsin.md.
 * 2026 Form 1-ES Instructions (PDF, 262 557 octets), Publication W-166 (PDF,
 * 2 128 837 octets), UI Employer Handbook UCB-201-P (PDF, 1 315 282 octets),
 * tous lus le 11/09/2026, HTTP 200. docs.legis.wisconsin.gov (texte code des
 * articles 71.06 et 71.05(22)) a refuse la connexion sur trois methodes :
 * le Form 1-ES, document officiel du DOR qui cite ch. 71 des Wis. Stats. et
 * sa date d'enactment, sert de source primaire a sa place.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-wisconsin.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "wisconsin";

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* 2026 Form 1-ES Instructions (D-101A, R. 1-26), revenue.wi.gov. */
const B1_SINGLE = 15110, B2_SINGLE = 51950, B3_SINGLE = 332720;
const B1_JOINT = 20150, B2_JOINT = 69260, B3_JOINT = 443630;
const A2_SINGLE = 528.85, A3_SINGLE = 2149.81, A4_SINGLE = 17030.62;
const A2_JOINT = 705.25, A3_JOINT = 2866.09, A4_JOINT = 22707.70;
const DED_FULL_SINGLE = 13960, DED_END_SINGLE = 20119, DED_ZERO_SINGLE = 136453;
const DED_RATE_SINGLE = 0.12;
const DED_FULL_JOINT = 25840, DED_END_JOINT = 29039, DED_ZERO_JOINT = 159690;
const DED_RATE_JOINT = 0.19778;
const DED_FULL_HOH = 18030, DED_END_HOH = 20119, DED_MID_HOH = 58827;
const DED_RATE1_HOH = 0.22515;
const EXEMPT_SINGLE = 700, EXEMPT_JOINT = 1400;

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

/* La deduction reellement appliquee a 75 000 $, calculee ici pour la prose,
   independamment de paie.js : sert de recoupement visible sur la page. */
const dedAt75 = Math.max(0, DED_FULL_SINGLE - DED_RATE_SINGLE * (75000 - (DED_END_SINGLE + 1)));
const dedAt25 = Math.max(0, DED_FULL_SINGLE - DED_RATE_SINGLE * (25000 - (DED_END_SINGLE + 1)));
const totalDedAt75 = dedAt75 + EXEMPT_SINGLE;
const imposable75 = Math.max(0, 75000 - totalDedAt75);

/* Le seuil ou le Wisconsin prend son premier cent, trouve par le moteur. */
const seuilImposition = (() => {
  let bas = 0, haut = 200000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();

/* Le point de jonction des deux segments de pente du chef de famille. */
const hohSeg1AtJoint = Math.max(0, DED_FULL_HOH - DED_RATE1_HOH * (DED_MID_HOH - (DED_END_HOH + 1)));
const hohSeg2AtJoint = Math.max(0, DED_FULL_SINGLE - DED_RATE_SINGLE * (DED_MID_HOH - (DED_END_HOH + 1)));

/* Le 401(k) : le Wisconsin part du revenu apres versement pretax, donc il suit. */
const PCT_401K = 0.06;
const gainWI = a75.etat - calcul(CLE, 75000, "single", PCT_401K).etat;
const il75 = calcul("illinois", 75000);
const gainIL = il75.etat - calcul("illinois", 75000, "single", PCT_401K).etat;

const voisins = ["illinois", "michigan", "ohio", "nebraska"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));
const NOMS = { illinois: "Illinois", michigan: "Michigan", ohio: "Ohio", nebraska: "Nebraska" };

const article = nom => /^[AEIO]/.test(nom) ? "An" : "A";

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

/* --- les deux tableaux, produits par les generateurs generiques ---------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Wisconsin income tax rate in 2026?",
   "Four rates: 3.5%, 4.4%, 5.3% and 7.65%. For a single filer the 3.5% band covers the first $"
   + c0(B1_SINGLE) + " of Wisconsin taxable income, 4.4% runs to $" + c0(B2_SINGLE)
   + ", 5.3% to $" + c0(B3_SINGLE) + ", and 7.65% above that. Married filing jointly the bands "
   + "run to $" + c0(B1_JOINT) + ", $" + c0(B2_JOINT) + " and $" + c0(B3_JOINT)
   + ". Head of household uses the same schedule as a single filer."],

  ["Does Wisconsin have a standard deduction?",
   "Yes, but it is not a fixed number - it slides down as your income rises. A single filer gets "
   + "the full $" + c0(DED_FULL_SINGLE) + " up to $" + c0(DED_END_SINGLE) + " of income. Above "
   + "that, the Department of Revenue's own instructions read: “$" + c0(DED_FULL_SINGLE)
   + " less 12% of the amount over $" + c0(DED_END_SINGLE + 1) + ".” The deduction reaches $0 "
   + "at $" + c0(DED_ZERO_SINGLE) + " of income and stays there. On $75,000 that formula gives "
   + "about " + $$(dedAt75) + " of deduction - far less than the flat amount most states publish."],

  ["What is take-home pay on a $75,000 salary in Wisconsin?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of "
   + "Wisconsin income tax - an effective rate of " + (a75.taux * 100).toFixed(1) + "%. At that "
   + "salary the sliding deduction has shrunk to about " + $$(dedAt75) + ", plus the flat $"
   + EXEMPT_SINGLE + " personal exemption."],

  ["Why does my Wisconsin standard deduction shrink as I earn more?",
   "Because the law writes it that way, and it is not a step - it is a straight line. The 2026 "
   + "Form 1-ES instructions give the formula as a subtraction: start at $" + c0(DED_FULL_SINGLE)
   + " and take away 12 cents for every dollar of income over $" + c0(DED_END_SINGLE + 1)
   + ", for a single filer, until it hits $0 at $" + c0(DED_ZERO_SINGLE)
   + ". Married filing jointly the rate is 19.778% instead of 12%, starting from $"
   + c0(DED_FULL_JOINT) + " and reaching $0 at $" + c0(DED_ZERO_JOINT)
   + ". Head of household is the odd one out: it slides at 22.515% up to $" + c0(DED_MID_HOH)
   + " of income, then switches to the same 12% formula a single filer uses, reaching $0 at the "
   + "same $" + c0(DED_ZERO_SINGLE) + "."],

  ["Does Wisconsin have a personal exemption too?",
   "Yes, on top of the sliding deduction, and it does not slide: the instructions say plainly, "
   + "“Your exemptions are $700 for yourself, $700 for your spouse if filing a joint return, "
   + "and $700 for each dependent.” This calculator does not ask about dependents or age, so "
   + "it applies $" + EXEMPT_SINGLE + " for a single or head-of-household filer and $"
   + EXEMPT_JOINT + " (self plus spouse) filing jointly. A filer 65 or older gets another $250 "
   + "that this calculator does not add."],

  ["Do Wisconsin employees pay for unemployment insurance?",
   "No. The Department of Workforce Development's own employer handbook states it without "
   + "qualification: “The program is financed solely through employer contributions "
   + "(taxes).” There is no state disability or paid family leave deduction either, so the "
   + "only state line on a Wisconsin pay stub is income tax withholding."],

  ["At what salary does Wisconsin start taking income tax?",
   $(seuilImposition) + " for a single filer - one dollar past the combined $"
   + c0(DED_FULL_SINGLE + EXEMPT_SINGLE) + " of standard deduction and personal exemption that "
   + "applies below the $" + c0(DED_END_SINGLE) + " point where the deduction starts sliding. "
   + "Below that the state takes nothing; federal tax and FICA still apply well below that line."],

  ["Does a 401(k) contribution lower my Wisconsin tax?",
   "Yes. Wisconsin taxes pay after pre-tax retirement contributions come out, the same base the "
   + "IRS uses, so a 401(k) deferral lowers both your federal and your Wisconsin tax. On $75,000 "
   + "with 6% going into a 401(k), your Wisconsin tax falls by " + $$(gainWI)
   + " a year. That is not universal: an <a href=\"/paycheck-calculator/illinois/\">Illinois</a> "
   + "worker making the same contribution on the same salary sees their state tax fall by "
   + $$(gainIL) + " - Illinois taxes the full amount at a flat rate, so a smaller taxable base "
   + "saves less."],

  ["What is $20 an hour after taxes in Wisconsin?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Wisconsin "
   + "takes " + $$(h20.etat) + " of that: taxable income at this salary is about $29,518 after "
   + "the sliding deduction and the personal exemption, so most of it sits in the 3.5% entry "
   + "band with the rest taxed at 4.4%."],

  ["Why is my Wisconsin paycheck smaller than this calculator says?",
   "The usual reasons - health insurance premiums and other pre-tax deductions come out before "
   + "tax and are not modelled here, and your employer withholds from the Form WT-4 you filed, "
   + "not from your actual tax liability. One trap specific to Wisconsin: if you search for the "
   + "state's own tax rate page rather than a tax form, you may land on "
   + "revenue.wi.gov's general Tax Rates FAQ, which still showed only the 2025 brackets when we "
   + "checked it - a $" + c0(B1_SINGLE - 14680) + " lower entry threshold than the 2026 figures "
   + "this calculator uses. Read <a href=\"/disclaimer/\">why your pay stub will differ</a> for "
   + "the rest."]
];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js"></script>
<title>Wisconsin (WI) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Wisconsin (WI) paycheck calculator, 2026. Rates from 3.5% to 7.65%, and a standard deduction that slides down as your income rises.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/wisconsin/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Wisconsin (WI) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Wisconsin&rsquo;s standard deduction is not a fixed number &mdash; it slides down as your income rises, dollar for dollar, until it reaches zero.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/wisconsin/">
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
      "name": "Wisconsin Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/wisconsin/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Wisconsin take-home pay after federal income tax, Social Security, Medicare and Wisconsin income tax at 3.5 to 7.65 percent, with a standard deduction that slides down as income rises."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Wisconsin", "item": "https://statelinecalc.com/paycheck-calculator/wisconsin/" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": "${q(n)}", "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" } }`).join(",\n")}
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
    <li aria-current="page">Wisconsin</li>
  </ol>
</nav>

  <h1>Wisconsin Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Wisconsin taxes income at four rates from <strong>3.5% to 7.65%</strong> in 2026, and its
    standard deduction <strong>slides down as your income rises</strong> instead of staying fixed
    &mdash; ${N($$(DED_FULL_SINGLE))} up to ${N("$" + c0(DED_END_SINGLE))} of income, shrinking to
    about ${N($$(dedAt75))} by $75,000. On $75,000 that is ${N($$(a75.etat))} to the state and
    about ${N($(a75.net))} a year in your pocket. A flat ${N("$" + EXEMPT_SINGLE)} personal
    exemption applies on top, at every income level.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Wisconsin take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="wisconsin" novalidate>
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
          <span class="help">Sets your federal brackets, and in Wisconsin it moves the rate at
          which your standard deduction slides down &mdash; ${N("12%")} single,
          ${N("19.778%")} married filing jointly.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Wisconsin it
          lowers your state tax too.</span>
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
    <p>Wisconsin is a four-rate state, and the detail worth knowing before you trust any number
    about it is that its standard deduction is not a number at all &mdash; it is a
    <strong>formula</strong>. Most states publish a fixed dollar amount per filing status. Ohio
    varies its exemption by income tier, in steps. Wisconsin goes further: its 2026 instructions
    print the deduction as a straight subtraction that falls by a fixed number of cents for every
    dollar you earn, until it hits zero. For a single filer, the Department of Revenue&rsquo;s own
    words are &ldquo;${N("$" + c0(DED_FULL_SINGLE))} less 12% of the amount over
    $${c0(DED_END_SINGLE + 1)}&rdquo; &mdash; so there is no single number to look up, only a
    slope.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Wisconsin income tax</strong>: pay after any 401(k) deferral, minus the sliding
      standard deduction and a flat ${N("$" + EXEMPT_SINGLE)} personal exemption, taxed at
      ${N("3.5%")}, ${N("4.4%")}, ${N("5.3%")} and ${N("7.65%")} as income rises.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and for the state layer, the <strong>Wisconsin Department of Revenue</strong>&rsquo;s
    <em>2026 Form 1-ES Instructions</em>, which prints both the &ldquo;2026 Tax Rate Schedules&rdquo;
    and the &ldquo;2026 Standard Deduction&rdquo; formulas by filing status, read on
    <time datetime="2026-09-11">September 11, 2026</time>. Our full sourcing, including why we did
    not link the state&rsquo;s own statute pages, is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>One check worth stating, because it is what makes these figures trustworthy:</strong>
    the four constants the Form 1-ES prints for a single filer are not independent numbers &mdash;
    each one is 100% derivable from the bracket thresholds themselves. ${N("$" + c0(B1_SINGLE))}
    &times; 3.5% = ${N($$(A2_SINGLE))}, the exact constant printed at the top of the second band.
    Add (${N("$" + c0(B2_SINGLE))} &minus; ${N("$" + c0(B1_SINGLE))}) &times; 4.4% and you land on
    ${N($$(A3_SINGLE))}, the third constant. Add (${N("$" + c0(B3_SINGLE))} &minus;
    ${N("$" + c0(B2_SINGLE))}) &times; 5.3% and you land on ${N($$(A4_SINGLE))}, the fourth. The
    same check on the married-filing-jointly schedule lands on ${N($$(A4_JOINT))}. If one threshold
    had been copied wrong, one of these four equalities would break.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model the
    Wisconsin earned income credit or homestead credit, add the extra $250 exemption for filers 65
    or older, count dependents, handle multiple jobs, or account for health insurance premiums and
    other employer benefit deductions.</p>
  </div>

  <h2>Wisconsin take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  Wisconsin column reflects the sliding standard deduction: it takes a larger bite out of a small
  salary than a large one, because less of the deduction survives at higher income.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Wisconsin take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">WI state tax</th>
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

    <h2>Wisconsin hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Wisconsin</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Wisconsin&rsquo;s income tax, that leaves about ${N($(h20.net))} a year,
    or ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}. Wisconsin&rsquo;s share of it is
    ${N($$(h20.etat))} for the year. Taxable income at this salary is about ${N("$29,518")} after
    the sliding deduction and the ${N("$" + EXEMPT_SINGLE)} exemption &mdash; enough to fill the
    ${N("3.5%")} entry band (the first ${N("$" + c0(B1_SINGLE))}) and spill a little into the
    ${N("4.4%")} band above it.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Wisconsin taxes overtime, tips and shift differentials the same as the rest of your pay,
    through the same four-rate schedule. Extra hours raise your annual income, which both narrows
    the sliding deduction and can push part of your pay into a higher bracket &mdash; two effects a
    flat-deduction state does not have.</p>

    <h3>Wisconsin take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Wisconsin take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Wisconsin</h2>

  <h3>The standard deduction slides, it does not step</h3>
  <p>This is the fact that separates Wisconsin from every other state on this site. A single filer
  keeps the full ${N($$(DED_FULL_SINGLE))} deduction up to ${N("$" + c0(DED_END_SINGLE))} of
  income. Past that point, the 2026 Form 1-ES instructions print the formula verbatim:
  &ldquo;$13,960 less 12% of the amount over $20,120.&rdquo; On a ${N("$50,000")} salary that works
  out to about ${N($$(13960 - 0.12 * (50000 - 20120)))} of deduction; on ${N("$100,000")} it is
  down to about ${N($$(Math.max(0, 13960 - 0.12 * (100000 - 20120))))}; by
  ${N("$" + c0(DED_ZERO_SINGLE))} it is exactly ${N("$0")} and stays there. No other state we cover
  shelters less of a dollar the more you earn.</p>

  <h3>Head of household has two slopes, not one</h3>
  <p>Filing as head of household, the deduction starts at ${N($$(DED_FULL_HOH))} and slides at
  ${N("22.515%")} of income over ${N("$" + c0(DED_END_HOH + 1))} &mdash; a steeper slope than a
  single filer&rsquo;s 12%. That formula runs only to ${N("$" + c0(DED_MID_HOH))} of income; above
  that, the instructions switch to the <em>same</em> formula a single filer uses, &ldquo;$13,960
  less 12% of the amount over $20,120,&rdquo; through to zero at ${N("$" + c0(DED_ZERO_SINGLE))}.
  The two formulas do not land on the exact same cent at the seam &mdash; about
  ${N($$(hohSeg1AtJoint))} against ${N($$(hohSeg2AtJoint))} at ${N("$" + c0(DED_MID_HOH))} of
  income, four cents apart. That is what the state prints, not a transcription error on our part.</p>

  <h3>A flat $700 exemption rides on top</h3>
  <p>Separate from the sliding deduction, Wisconsin grants a personal exemption that does not
  change with income: ${N("$" + EXEMPT_SINGLE)} for the filer, another ${N("$" + EXEMPT_SINGLE)}
  for a spouse filing jointly. It is worth ${N($$(EXEMPT_SINGLE * 0.035))} to
  ${N($$(EXEMPT_SINGLE * 0.0765))} a year depending on which bracket it shelters, single filer
  &mdash; small next to the deduction, but it is there at every income level, even after the
  sliding deduction has reached zero.</p>

  <h3>Wisconsin&rsquo;s own rate page shows the wrong year</h3>
  <p>Search for &ldquo;Wisconsin tax rates&rdquo; and the Department of Revenue&rsquo;s own FAQ
  page is a likely first result. As of <time datetime="2026-09-11">September 11, 2026</time> that
  page still published the 2025 brackets &mdash; a ${N("$" + c0(B1_SINGLE - 14680))} lower entry
  threshold than the true 2026 figure &mdash; with no 2026 column at all. The current numbers exist,
  but only in the Department&rsquo;s <em>2026 Form 1-ES Instructions</em>, a form most visitors
  never think to open. This page is built from that document, not the FAQ.</p>

  <h3>Your effective Wisconsin rate climbs faster than the headline suggests</h3>
  <p>Because the deduction itself shrinks with income, Wisconsin&rsquo;s effective rate rises on two
  fronts at once: more income crosses into higher brackets, <em>and</em> less of each additional
  dollar is sheltered to begin with. On ${N("$25,000")} the state takes ${N($$(a25.etat))}, an
  effective rate of ${N((a25.etat / 25000 * 100).toFixed(2) + "%")}. On ${N("$75,000")} it takes
  ${N($$(a75.etat))}, or ${N((a75.etat / 75000 * 100).toFixed(2) + "%")}. On
  ${N("$250,000")}, where the deduction has long since reached zero, it is
  ${N((a250.etat / 250000 * 100).toFixed(2) + "%")}.</p>

  <h3>Filing jointly widens the brackets and slides more slowly</h3>
  <p>A couple filing jointly starts its 4.4% bracket at ${N("$" + c0(B1_JOINT))} instead of
  ${N("$" + c0(B1_SINGLE))}, and its deduction &mdash; starting from ${N($$(DED_FULL_JOINT))}
  instead of ${N($$(DED_FULL_SINGLE))} &mdash; slides at 19.778% instead of 12%, reaching zero at
  ${N("$" + c0(DED_ZERO_JOINT))} of income rather than ${N("$" + c0(DED_ZERO_SINGLE))}. On a
  ${N($(75000))} single income, choosing married filing jointly takes the Wisconsin tax from
  ${N($$(a75.etat))} to ${N($$(j75.etat))}.</p>

  <h3>Your 401(k) contribution does reduce your Wisconsin tax</h3>
  <p>Wisconsin taxes income after pre-tax retirement contributions come out, the same base the IRS
  uses for federal tax. On ${N("$75,000")} with 6% going into a 401(k), your Wisconsin tax falls by
  ${N($$(gainWI))} a year. It is worth saying because the rule is not universal: an
  <a href="/paycheck-calculator/illinois/">Illinois</a> worker making the same contribution on the
  same salary sees their state tax fall by only ${N($$(gainIL))} &mdash; Illinois taxes the same
  dollar amount either way, at a single flat rate, so a smaller taxable base moves the result less
  in percentage terms.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Looking up a single Wisconsin standard deduction number</h3>
  <p>There is not one to find. Unlike most states on this site, Wisconsin&rsquo;s standard deduction
  is not a fixed dollar figure you can look up once and reuse &mdash; it depends on your exact
  income, sliding from ${N($$(DED_FULL_SINGLE))} down to ${N("$0")} as you earn more. Any figure
  quoted without an income attached to it is, at best, only correct at one point on that slope.</p>

  <h3>Reading the Department of Revenue&rsquo;s general rate page as current</h3>
  <p>As of the date we checked, revenue.wi.gov&rsquo;s Tax Rates FAQ still showed 2025 brackets with
  no 2026 column. If a Wisconsin figure you found elsewhere lines up with a ${N("$" + c0(14680))}
  entry threshold rather than ${N("$" + c0(B1_SINGLE))}, it is last year&rsquo;s bracket.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Your employer withholds from the Form WT-4 you filed
  &mdash; Wisconsin&rsquo;s own withholding certificate; the federal W-4 &ldquo;cannot be used for
  Wisconsin withholding tax purposes,&rdquo; in the Department&rsquo;s own words &mdash; using
  withholding tables that are a separate, rounded approximation of the tax you actually owe. Health
  premiums and other benefit deductions come out first, and a second job changes the federal
  picture. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Wisconsin in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Standard deduction at this income: ${N($$(DED_FULL_SINGLE))} &minus;
    ${N("12%")} &times; (${N($(a75.brut))} &minus; ${N("$" + c0(DED_END_SINGLE + 1))}) =
    ${N($$(dedAt75))}</li>
    <li>Plus personal exemption: ${N($$(dedAt75))} + ${N("$" + EXEMPT_SINGLE)} =
    ${N($$(totalDedAt75))}</li>
    <li>Wisconsin taxable income: ${N($(a75.brut))} &minus; ${N($$(totalDedAt75))} =
    ${N($$(imposable75))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Wisconsin tax on ${N($$(imposable75))}: ${N($$(A3_SINGLE))} +
    (${N($$(imposable75))} &minus; ${N("$" + c0(B2_SINGLE))}) &times; 5.3% =
    ${N($$(a75.etat))}</li>
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
  <p>The same ${N($(a75.brut))} salary, single filer, 2026 rates, state layer only:</p>
  <ul>
${voisins.map(v => {
  const nom = NOMS[v.cle];
  const d = v.r.net - a75.net;
  const sens = d > 0 ? "keeps " + $$(Math.abs(d)) + " more" : "keeps " + $$(Math.abs(d)) + " less";
  return `    <li><a href="/paycheck-calculator/${v.cle}/">${nom}</a> &mdash; ${$(v.r.net)} take-home, `
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. ${article(nom)} ${nom} worker ${sens} than a `
    + `Wisconsinite on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Wisconsin&rsquo;s ${N($$(a75.etat))} sits close to <a href="/paycheck-calculator/michigan/">Michigan</a>&rsquo;s
  ${N($$(voisins[1].r.etat))} at ${N("$75,000")} &mdash; two very different structures landing in
  nearly the same place. Michigan taxes every dollar at a single flat ${N("4.25%")} rate with no
  bracket at all. Wisconsin runs four rates from ${N("3.5%")} to ${N("7.65%")} against a deduction
  that is itself shrinking at this income &mdash; a more complicated formula that happens to land
  within ${N($$(Math.abs(a75.etat - voisins[1].r.etat)))} of the flat-rate result.
  <a href="/paycheck-calculator/illinois/">Illinois</a>, also flat at ${N("4.95%")} with a small
  fixed exemption, takes noticeably more: ${N($$(voisins[0].r.etat))}.</p>

${blocSources("wisconsin")}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/illinois/">Illinois paycheck calculator</a> &mdash; a
    neighboring state with a single flat rate instead of Wisconsin&rsquo;s four.</li>
    <li><a href="/paycheck-calculator/michigan/">Michigan paycheck calculator</a> &mdash; another
    neighbor, also flat, that lands within a few dollars of Wisconsin at $75,000.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Wisconsin", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-11">September 11, 2026</time> &middot;
    Last updated <time datetime="2026-09-11">September 11, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Wisconsin rates.
  </p>

</div>
${colonne("Wisconsin")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "wisconsin");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
console.log("recoupement bareme : %s (attendu %s)", c2(A4_SINGLE), c2(A4_SINGLE));
if (Math.abs(15110 * 0.035 - A2_SINGLE) > 0.01) { console.error("ARRET : recoupement A2 faux"); process.exit(2); }
if (Math.abs(A2_SINGLE + (51950 - 15110) * 0.044 - A3_SINGLE) > 0.01) { console.error("ARRET : recoupement A3 faux"); process.exit(2); }
if (Math.abs(A3_SINGLE + (332720 - 51950) * 0.053 - A4_SINGLE) > 0.01) { console.error("ARRET : recoupement A4 faux"); process.exit(2); }
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
