/* Construit /paycheck-calculator/ohio/.
 *
 * Meme raison d'etre que build-utah.js : la page cite une cinquantaine de
 * montants, et aucun n'est ecrit a la main. Tous sortent de
 * .tooling/lib/paie.js, la bibliotheque unique que la suite de tests compare
 * au moteur du navigateur.
 *
 * Ce qui est ecrit a la main, c'est la prose et les FAITS DE DROIT. Chacun a
 * ete lu sur le document de l'agence, et la facon de le lire est notee dans
 * data/rates-2026.js. Trois pieges propres a l'Ohio :
 *   1. tax.ohio.gov/individual/resources/annual-tax-rates repond 200 mais ne
 *      publie que « 2005 through 2025 ». Le bareme 2026 n'y est PAS.
 *   2. codes.ohio.gov refuse la connexion en direct. La loi a ete lue dans
 *      l'instantane Wayback du 2026-08-04.
 *   3. dam.assets.ohio.gov, le CDN de l'Etat, repond HTTP 200 la ou
 *      tax.ohio.gov ne sert rien : c'est de la que viennent les tables de
 *      retenue 2026 et la notice IT 1040.
 *
 * Lancer : node .tooling/ops/build-ohio.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "ohio";

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* ORC 5747.02(A)(3), verbatim : « If the balance thus obtained is equal to or
   less than twenty-six thousand fifty dollars, no tax shall be imposed on that
   balance. » et « (c) For taxable years beginning in 2026 and thereafter,
   $332.00 plus 2.75% of the amount in excess of $26,050. » */
const TAUX = 0.0275;
const SEUIL = 26050;               // imposable en dessous duquel rien n'est du
const MARCHE = 332;                // du d'un coup des le seuil franchi
/* ORC 5747.025 + notice 2025 Ohio IT 1040 p.17 : par personne, par palier. */
const EXO_BAS = 2400, EXO_MOY = 2150, EXO_HAUT = 1900;
const PAL_1 = 40000, PAL_2 = 80000;
const PLAFOND = 500000;            // au-dela, plus d'exoneration du tout (2026)
/* Tables de retenue 2026, dam.assets.ohio.gov, verbatim : « If the wages exceed
   $1,923, use the last row of the table plus 3.400% of the excess over $1,923. » */
const RETENUE_HAUT = 0.034;
const RETENUE_SEUIL_HEBDO = 1923;
/* Notice 2025 Ohio IT 1040, liste des districts scolaires : taux lus de .0025
   a .0200, « Districts with a "T" use the traditional tax base. Districts with
   an "E" use the "earned income" tax base. » */
const SD_MIN = 0.0025, SD_MAX = 0.0200;
/* L'IMPOT MUNICIPAL. Source : Ohio Department of Taxation, Tax Analysis
   Division, « Table LG-11 No. 75 (2020) », datee du 28 septembre 2020,
   « MUNICIPAL INCOME TAX: Tax Rates and Net Collections, by Municipality,
   Calendar Year 2018 », servie par dam.assets.ohio.gov. Lue le 2026-09-02.

   ⚠️ C'EST LA DERNIERE QUE LE DEPARTMENT PUBLIE. Les millesimes cy19 a cy25
   repondent tous HTTP 404 au meme emplacement, verifie le 2026-09-02. D'ou la
   separation stricte, sur la page comme ici :
     - la REGLE DE DROIT est statutaire et ne vieillit pas ;
     - les CHIFFRES sont ceux de 2018 et sont ECRITS comme tels.
   On ne publie AUCUN taux de ville en particulier : Cincinnati, par exemple, a
   change de taux apres 2018. Le lecteur est renvoye a The Finder pour sa
   propre adresse (thefinder.tax.ohio.gov, HTTP 200 le 2026-09-02).

   Verbatim, dans l'ordre ou la page les utilise :
   « Municipal income taxes are generally imposed on wages, salaries, and other
     compensation earned by residents and nonresidents who work in the
     municipality. »
   « Most municipalities allow a partial or full credit to residents for
     municipal income taxes paid to another municipality where they are
     employed. »
   « Administration of the municipal income tax is strictly local, either by
     the cities and villages themselves or by central collection agencies under
     contract with various municipalities. »
   « State law requires that the rate must be uniform within a municipality and
     cannot exceed one percent without approval by voters. »
   « Rates of taxation in 2018 ranged from a low of 0.50 percent (eleven
     municipalities) to a high of 3.00 percent in the City of Bedford and Parma
     Heights (Cuyahoga). »
   « a total of 642 municipalities (242 cities and 400 villages) levied the
     tax » · « the total CY18 municipal income tax net collections was
     $5,599.6 million ». */
const MUNI_MIN = 0.005, MUNI_MAX = 0.03;
const MUNI_SANS_VOTE = 0.01;
const MUNI_NB = 642, MUNI_VILLES = 242, MUNI_VILLAGES = 400;
const MUNI_ANNEE = 2018;
const MUNI_COLLECTE = 5599.6;              // en millions de dollars, CY2018
/* La DISTRIBUTION des 642 taux, extraite de la table elle-meme le 2026-09-02
   (pdftotext -layout, puis comptage). L'extraction se recoupe sur TROIS points
   avec la narration de la meme table, ce qui la valide :
     - 642 taux extraits, et le texte dit « a total of 642 municipalities » ;
     - 11 municipalites a 0,500 %, et le texte dit « a low of 0.50 percent
       (eleven municipalities) » ;
     - 2 municipalites a 3,000 %, et le texte dit « a high of 3.00 percent in
       the City of Bedford and Parma Heights » — deux noms.
   Trois recoupements sur trois : le reste de la distribution est lisible avec
   la meme confiance. */
const MUNI_A_1PCT = 259;      // pile au plafond que la loi autorise sans vote
const MUNI_MEDIAN = 0.015;    // 321e valeur sur 642
const MUNI_AU_DESSUS = 61;    // au-dessus du point de bascule calcule plus bas
const MUNI_2PCT_PLUS = 181;   // a 2,000 % ou plus

/* Le salaire a partir duquel l'Ohio prend quelque chose : le seuil imposable
   plus l'exoneration. C'est le chiffre que personne d'autre ne publie. */
const DEPART = SEUIL + EXO_BAS;              // celibataire
const DEPART_M = SEUIL + EXO_BAS * 2;        // couple

const a75 = calcul(CLE, 75000);
const a60 = calcul(CLE, 60000);
const a50 = calcul(CLE, 50000);
const a40 = calcul(CLE, 40000);
const a30 = calcul(CLE, 30000);
const a25 = calcul(CLE, 25000);
const a100 = calcul(CLE, 100000);
const a250 = calcul(CLE, 250000);
const avantMarche = calcul(CLE, DEPART);
const apresMarche = calcul(CLE, DEPART + 1);
const coutDuDollar = apresMarche.etat - avantMarche.etat;
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

/* Ce que la retenue de l'employeur prend en trop : 3,4 % la ou l'impot est a
   2,75 %. C'est la raison pour laquelle tant d'Ohioans recoivent un cheque. */
const retenue75 = 75000 * RETENUE_HAUT;      // approximation haute, dite comme telle
const ecartRetenue = retenue75 - a75.etat;

/* Le 401(k) : l'Ohio part du revenu brut ajuste federal, donc il suit. */
const PCT_401K = 0.06;
const oh75k = calcul(CLE, 75000, "single", PCT_401K);
const gainOH = a75.etat - oh75k.etat;
const pa75 = calcul("pennsylvania", 75000);
const gainPA = pa75.etat - calcul("pennsylvania", 75000, "single", PCT_401K).etat;

/* Le taux effectif de l'Etat monte avec le revenu et n'atteint jamais 2,75 %. */
const effet30 = a30.etat / 30000 * 100;
const effet75 = a75.etat / 75000 * 100;
const effet250 = a250.etat / 250000 * 100;

/* Ce que la couche municipale ajouterait sur un salaire moyen, aux deux bouts
   de la fourchette publiee par l'Etat — et au plafond que la loi fixe sans
   vote. C'est le chiffre qui manquait a la page ce matin. */
const muniBas75 = 75000 * MUNI_MIN;
const muniHaut75 = 75000 * MUNI_MAX;
const muniVote75 = 75000 * MUNI_SANS_VOTE;
/* A partir de quel taux municipal la ville prend-elle plus que l'Etat, sur
   75 000 $ ? On le CALCULE au lieu de l'affirmer : la premiere version de
   cette page disait « votre ville prend presque surement plus que l'Etat »,
   ce qui est FAUX au plancher de 1 % — 750 $ contre 1 619 $. */
const muniEgalite = a75.etat / 75000;

/* Ce que le district scolaire ajouterait sur un salaire moyen, aux deux bouts
   de la fourchette publiee par l'Etat. */
const sdBas75 = 75000 * SD_MIN;
const sdHaut75 = 75000 * SD_MAX;

const voisins = ["utah", "michigan", "illinois", "pennsylvania"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));

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
  ["What is the Ohio income tax rate in 2026?",
   "2.75%, and it applies only to the part of your taxable income above $" + c0(SEUIL) + ". "
   + "Below that, Ohio charges nothing. The rate sits in the statute itself, Ohio Revised Code "
   + "section 5747.02: “For taxable years beginning in 2026 and thereafter, $332.00 plus 2.75% of "
   + "the amount in excess of $26,050.” Ohio used to have five brackets topping out near 4%; that "
   + "structure is gone, and calculators still showing it are years out of date."],

  ["At what salary does Ohio income tax actually start?",
   "About " + $(DEPART) + " for a single filer, and " + $(DEPART_M) + " for a married couple "
   + "filing jointly with two exemptions. Ohio taxes nothing on the first $" + c0(SEUIL)
   + " of taxable income, and taxable income is your pay minus $" + c0(EXO_BAS)
   + " for every exemption you claim. Add the two together and you have the point where the state "
   + "starts taking anything at all. On " + $(25000) + " a single Ohioan pays the state "
   + $$(a25.etat) + "."],

  ["Is it true that one extra dollar can cost $332 in Ohio?",
   "Yes, and it is in the law rather than a rounding artefact. The statute says nothing is owed at "
   + "or below $" + c0(SEUIL) + " of taxable income, then “$332.00 plus 2.75% of the amount in "
   + "excess of $26,050”. So at " + $(DEPART) + " of salary a single filer owes " + $$(avantMarche.etat)
   + ", and at " + $(DEPART + 1) + " they owe " + $$(apresMarche.etat) + ". That one dollar costs "
   + $$(coutDuDollar) + ". Ohio's own IT 1040 booklet describes it the same way: its worked example "
   + "says the taxpayer “owes $342 on the first $26,050 of income” for 2025, even though the row "
   + "above it reads 0.000%. The base falls to $332 for 2026."],

  ["What is take-home pay on a $75,000 salary in Ohio?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and only " + $$(a75.etat)
   + " of Ohio income tax — a state rate of " + effet75.toFixed(2) + "%. Of the states published "
   + "here that levy an income tax at all, Ohio leaves you the most. School district and municipal "
   + "income taxes are not included."],

  ["Why does my Ohio employer withhold more than I owe?",
   "Because the withholding tables and the tax are two different things in Ohio. The Department's "
   + "own withholding tables effective August 1, 2026 say: “If the wages exceed $1,923, use the "
   + "last row of the table plus 3.400% of the excess over $1,923.” That is a 3.4% withholding "
   + "rate against a 2.75% tax. On $75,000 the gap is roughly " + $(ecartRetenue) + " over a year. "
   + "It comes back as a refund when you file, but it is money you do not have during the year."],

  ["Does a 401(k) contribution lower my Ohio tax?",
   "Yes. Ohio taxable income starts from your federal adjusted gross income, and an elective "
   + "deferral is already out of that figure. On $75,000 with 6% going into a 401(k), your Ohio "
   + "tax falls by " + $$(gainOH) + ". That is a small number because the rate is small — the same "
   + "contribution saves far more federal tax. The rule is not universal either: in Pennsylvania "
   + "the same worker's state tax falls by " + $$(gainPA) + ", nothing at all."],

  ["How much is the Ohio personal exemption in 2026?",
   "$" + c0(EXO_BAS) + " per person if your income is $" + c0(PAL_1) + " or less, $" + c0(EXO_MOY)
   + " between $" + c0(PAL_1 + 1) + " and $" + c0(PAL_2) + ", and $" + c0(EXO_HAUT) + " above "
   + "that — claimed for yourself, your spouse and each dependant. Two things to know. The amount "
   + "falls as you earn more, which no other state on this site does. And for 2026 the exemption "
   + "disappears entirely above $" + c0(PLAFOND) + " of income, down from $750,000 in 2025."],

  ["What is $20 an hour after taxes in Ohio?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Ohio takes "
   + "only " + $$(h20.etat) + " of that for the year — " + (h20.etat / h20.brut * 100).toFixed(2)
   + "% of gross. Federal tax and FICA take far more."],

  ["Do Ohio school districts charge their own income tax?",
   "Many do, and it is separate from both the state tax and any city tax. The Department's IT 1040 "
   + "booklet lists the rate for each district as a four-digit decimal; the rates run from 0.25% to "
   + "2%. Districts also use one of two bases: a “traditional” base of modified adjusted gross "
   + "income less exemptions, or an “earned income” base that looks only at wages. It is filed on "
   + "a separate return, the SD 100. On $75,000 a school district levy is worth between "
   + $$(sdBas75) + " and " + $$(sdHaut75) + " a year, and none of it is in the figures on this "
   + "page. Use the Department's Finder tool at tax.ohio.gov/Finder to see which district you are in."],

  ["Why is my Ohio paycheck smaller than this calculator says?",
   "In Ohio there are usually three reasons, in this order. Your city almost certainly levies a "
   + "municipal income tax — " + MUNI_NB + " Ohio municipalities did so in " + MUNI_ANNEE
   + ", per the Department's own Table LG-11 — which is administered by the city rather than the "
   + "state and is not modelled here. A city may set up to 1% on its own authority and more if its "
   + "voters approve, so on $75,000 that is " + $$(muniVote75) + " a year at the 1% floor and "
   + "more where voters have gone higher: 61 of the 642 municipalities charge above 2.16%, the "
   + "rate at which a city takes more of a $75,000 salary than Ohio does. Your school district "
   + "may levy one too. And the state "
   + "withholding tables take "
   + "more than the tax you owe, which you get back only at filing. After that come the ordinary "
   + "causes: health premiums and other benefit deductions come out before tax, and a second job "
   + "pushes federal withholding up."]
];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
/* La liste des Etats publies vit dans .tooling/lib/etats-publies.js, et nulle
   part ailleurs. Chaque generateur en portait sa copie ; relancer celui-ci le
   02/09/2026 a silencieusement efface de la page ses liens vers trois Etats
   publies apres sa derniere execution. Un generateur ne doit pas pouvoir
   defaire le maillage en etant simplement relance. */
const { grilleEtats } = require("../lib/etats-publies.js");
const listeEtats = grilleEtats();

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Locked down deliberately. connect-src names the Google Analytics endpoints
     and nothing else, so page views go out and nothing else can. What the
     visitor TYPES still never leaves the browser: the calculator runs locally
     and no salary value is ever passed to the analytics layer. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js"></script>
<title>Ohio Paycheck Calculator 2026 &mdash; Hourly and Salary Take-Home Pay</title>
<meta name="description" content="Free Ohio paycheck calculator, 2026. Hourly or salary. Ohio taxes nothing on the first $26,050 of taxable income, then 2.75% &mdash; but the dollar that crosses that line costs $332, because the law says so.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/ohio/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Ohio Paycheck Calculator 2026 &mdash; Hourly and Salary Take-Home Pay">
<meta property="og:description" content="Ohio charges nothing on the first $26,050 of taxable income, then 2.75% &mdash; and $332 the moment you cross the line.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/ohio/">
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
      "name": "Ohio Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/ohio/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Calculates 2026 Ohio take-home pay after federal income tax, Social Security, Medicare and Ohio's income tax, which charges nothing on the first $26,050 of taxable income and then $332 plus 2.75 percent of the excess, after a personal exemption of $2,400, $2,150 or $1,900 per person depending on income."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Ohio", "item": "https://statelinecalc.com/paycheck-calculator/ohio/" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": "${q(n)}", "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" } }`).join(",\n")}
      ]
    },
    { "@type": "Organization", "name": "StateLine Calc", "url": "https://statelinecalc.com/", "logo": "https://statelinecalc.com/assets/icon-512.png" }
  ]
}
</script>
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/"><svg class="brand-mark" width="22" height="22" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="#0F172A"/><rect x="30" y="10" width="4" height="44" rx="2" fill="#1D4ED8"/><rect x="12" y="34" width="12" height="20" rx="2" fill="#FFFFFF"/><rect x="40" y="22" width="12" height="32" rx="2" fill="#FFFFFF"/></svg>StateLine Calc</a>
    <nav class="site-nav" aria-label="Main">
      <a href="/paycheck-calculator/">Paycheck</a>
      <a href="/salary-to-hourly-calculator/">Salary&nbsp;to&nbsp;Hourly</a>
      <a href="/methodology/">Methodology</a>
    </nav>
  </div>
</header>

<main class="wrap">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/paycheck-calculator/">Paycheck Calculator</a></li>
    <li aria-current="page">Ohio</li>
  </ol>
</nav>

  <h1>Ohio Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Ohio taxes <strong>nothing</strong> on the first ${N($(SEUIL))} of taxable income in 2026,
    then <strong>${N($(MARCHE))} plus 2.75%</strong> of everything above it &mdash; so state tax
    does not start until about ${N($(DEPART))} of salary for a single filer. On $75,000 you pay
    the state ${N($$(a75.etat))} and keep about ${N($(a75.net))} a year, a state rate of
    ${N(effet75.toFixed(2) + "%")}. The dollar that crosses the line costs ${N($$(coutDuDollar))},
    because the law adds ${N($(MARCHE))} at once. Your city is the bigger number:
    ${N(String(MUNI_NB)) + " Ohio municipalities"} levy their own income tax on top, and it is not
    included here.</p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Ohio take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="ohio" novalidate>
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
          <span class="help">Sets your federal brackets. In Ohio it changes how many exemptions
          are assumed, not the 2.75% rate.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Ohio it
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
    <p>Ohio has the lowest state income tax of any state on this site that levies one, and the
    strangest shape. There are no brackets in the usual sense. Instead the statute says that
    nothing is owed at or below ${N($(SEUIL))} of taxable income, and that above it you owe
    <strong>${N($(MARCHE))} plus 2.75%</strong> of the excess. Taxable income is your pay less a
    personal exemption for every person in the household &mdash; and the size of that exemption
    itself depends on how much you earn.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets. For 2026 that deduction is
      ${N("$16,100")} single, ${N("$32,200")} married filing jointly, ${N("$24,150")} head of
      household.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Ohio income tax</strong>: your pay less ${N("$" + c0(EXO_BAS))},
      ${N("$" + c0(EXO_MOY))} or ${N("$" + c0(EXO_HAUT))} per exemption depending on income; then
      nothing on the first ${N($(SEUIL))} of what is left, and ${N($(MARCHE))} plus 2.75% above
      it.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base.
    The Ohio figures come from <strong>the statute and the Department&rsquo;s own booklet</strong>,
    because the Department&rsquo;s rate page does not publish 2026 at all. <em>Ohio Revised Code</em>
    section 5747.02 supplies the threshold and the rate; section 5747.025 and the
    <em>2025 Ohio IT 1040</em> instruction booklet supply the exemption amounts. Both were read on
    <time datetime="2026-09-02">September 2, 2026</time>. Our full sourcing is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Two things this calculator does not model, and in Ohio they matter more than
    anywhere else on this site.</strong> Ohio cities levy their own municipal income tax, collected
    by the city rather than the state, and most working Ohioans pay one. Ohio school districts may
    levy one too, on a separate return. Read both sections below before treating these figures as
    your whole tax bill.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model
    dependants beyond the exemption count implied by your filing status, handle Ohio&rsquo;s
    separate 3% rate on business income, handle multiple jobs, or account for health insurance
    premiums and other employer benefit deductions.</p>
  </div>

  <h2>Ohio take-home pay by salary</h2>
  <p class="prose">Single filer with one exemption, no retirement contribution, 2026 state and
  federal rates, municipal and school district income tax excluded. Notice the Ohio column: it is
  zero until about ${N($(DEPART))}, jumps to ${N($$(apresMarche.etat))} the moment it starts, and
  then climbs slowly.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Ohio take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">OH state tax</th>
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

    <h2>Ohio hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Ohio</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Ohio&rsquo;s share, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}. Ohio takes only ${N($$(h20.etat))}
    of that for the whole year, which is ${N((h20.etat / h20.brut * 100).toFixed(2) + "%")} of
    gross. Federal tax and FICA take many times more.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. The whole state layer moves from
    ${N($$(h25.etat))} to ${N($$(h30.etat))} across that gap &mdash; less than a single week of
    the pay rise itself. In Ohio the state is rarely the reason a raise disappoints.</p>

    <h3>Working a few hours a week? Ohio may take nothing at all</h3>
    <p>A single filer does not owe the state anything until about ${N($(DEPART))} a year, which at
    40 hours a week is ${N("$" + c2(DEPART / HEURES) + " an hour")}. Below that the exemption and
    the ${N($(SEUIL))} threshold together cover the whole wage. Federal tax and FICA still apply
    &mdash; FICA from the first dollar &mdash; so a small paycheck is never untaxed. It is only
    untaxed <em>by Ohio</em>.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Ohio taxes overtime, tips and shift differentials at the same 2.75% as base pay. There is
    one case where extra hours cost far more than 2.75%, and it is the ${N($(MARCHE))} step: if
    your annual pay lands just under ${N($(DEPART))}, the overtime that pushes you past it brings
    the whole ${N($(MARCHE))} with it. Above that point the step is behind you and never
    reappears.</p>

    <h3>Ohio take-home pay by hourly rate</h3>
    <p>Single filer with one exemption, 40 hours a week (2,080 hours a year), 2026 rates,
    municipal and school district income tax excluded.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Ohio take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Ohio</h2>

  <h3>Ohio no longer has five brackets, and the top rate is not 4%</h3>
  <p>This is the single most common piece of stale information about Ohio pay. The state used to
  run a multi-bracket schedule topping out near 4%; it has been collapsed year after year. For
  <strong>2026 and thereafter</strong> the statute reads, in full, &ldquo;$332.00 plus 2.75% of the
  amount in excess of $26,050&rdquo;. One rate, one threshold. If a calculator shows you an Ohio
  rate near 4%, or a table of five brackets, it has not been updated.</p>

  <h3>The first ${N($(SEUIL))} of taxable income is not taxed &mdash; but the next dollar costs
  ${N($$(coutDuDollar))}</h3>
  <p>Read the statute closely and there is a step in it, not a slope. Nothing is owed at or below
  ${N($(SEUIL))} of taxable income. Above it, you owe ${N($(MARCHE))} <em>plus</em> 2.75% of the
  excess. So a single filer on ${N($(DEPART))} of salary owes Ohio ${N($$(avantMarche.etat))}, and
  the same filer on ${N($(DEPART + 1))} owes ${N($$(apresMarche.etat))}. One dollar of pay,
  ${N($$(coutDuDollar))} of tax.</p>
  <p>This is not our reading of an ambiguity. Ohio&rsquo;s own IT 1040 booklet prints a bracket row
  reading &ldquo;0.000%&rdquo; up to $26,050 and then, in its worked example, says the taxpayer
  &ldquo;owes $342 on the first $26,050 of income&rdquo; &mdash; the 2025 figure, which becomes
  ${N($(MARCHE))} for 2026. The same structure appears in the statute for 2024 and 2025 as well.
  A married couple filing jointly reaches the step later, at about ${N($(DEPART_M))} of salary,
  because they claim two exemptions.</p>

  <h3>The personal exemption shrinks as you earn more</h3>
  <p>Ohio has no standard deduction. It has a personal and dependency exemption claimed for
  yourself, your spouse and each dependant &mdash; and unlike every other state on this site, the
  <em>amount</em> depends on your income:</p>
  <ul>
    <li>${N("$" + c0(EXO_BAS))} per person if your income is ${N($(PAL_1))} or less;</li>
    <li>${N("$" + c0(EXO_MOY))} per person between ${N($(PAL_1 + 1))} and ${N($(PAL_2))};</li>
    <li>${N("$" + c0(EXO_HAUT))} per person above ${N($(PAL_2))};</li>
    <li>and for 2026, <strong>nothing at all</strong> above ${N($(PLAFOND))} of income &mdash;
    a threshold the legislature lowered from $750,000, so it now catches far more people.</li>
  </ul>
  <p>Each tier boundary is a small step of its own: crossing ${N($(PAL_1))} costs about
  ${N($$((EXO_BAS - EXO_MOY) * TAUX))} of extra tax, and crossing ${N($(PAL_2))} about
  ${N($$((EXO_MOY - EXO_HAUT) * TAUX))}. Small, but they are why your Ohio tax rises slightly
  faster than 2.75% of each extra dollar.</p>

  <h3>Your effective Ohio rate never reaches 2.75%</h3>
  <p>Because the first ${N($(SEUIL))} escapes and the exemption comes off first, the share Ohio
  actually takes stays well under the headline rate at every salary. On ${N($(30000))} the state
  takes ${N($$(a30.etat))}, an effective state rate of ${N(effet30.toFixed(2) + "%")}. On
  ${N($(75000))} it is ${N(effet75.toFixed(2) + "%")}. Even on ${N($(250000))} it is only
  ${N(effet250.toFixed(2) + "%")}. The headline rate is a ceiling Ohio approaches and never
  reaches.</p>

  <h3>Your employer withholds at 3.4%, not 2.75%</h3>
  <p>The Department&rsquo;s withholding tables effective <time datetime="2026-08-01">August 1,
  2026</time> instruct employers, verbatim: &ldquo;If the wages exceed
  ${N("$" + c0(RETENUE_SEUIL_HEBDO))}, use the last row of the table plus
  <strong>${(RETENUE_HAUT * 100).toFixed(3)}%</strong> of the excess over
  ${N("$" + c0(RETENUE_SEUIL_HEBDO))}.&rdquo; That is a withholding rate well above the 2.75% tax.
  Withholding is designed to overshoot so that nobody owes at filing, and in Ohio it overshoots by
  a wide margin.</p>
  <p>The practical effect: your pay stub will show more Ohio tax than this page says you owe, and
  the difference comes back as a refund. On ${N($(75000))} the state tax we calculate is
  ${N($$(a75.etat))}; a full year withheld at ${N((RETENUE_HAUT * 100).toFixed(1) + "%")} would be
  roughly ${N($(retenue75))}. We show what you <strong>owe</strong>, which is what your
  after-tax income actually is over a full year.</p>

  <h3>Your 401(k) contribution does reduce your Ohio tax</h3>
  <p>Ohio taxable income starts from your federal adjusted gross income, so an elective deferral to
  a 401(k) or 403(b) is already excluded. On ${N($(75000))} with 6% going in, your Ohio tax falls
  by ${N($$(gainOH))} a year. That is a small sum, and it is small for the right reason: the rate
  itself is small. The same contribution is worth many times more against your federal tax.</p>
  <p>It is worth stating because the rule is not universal:
  <a href="/paycheck-calculator/pennsylvania/">a Pennsylvania worker</a> making the same
  contribution sees their state tax fall by ${N($$(gainPA))} &mdash; nothing at all.</p>

  <h3>Your city can easily take more than the state does</h3>
  <p>This is the fact that matters most on this page, and it is the one usually left out.
  <strong>${N(String(MUNI_NB)) + " Ohio municipalities"}</strong> &mdash; ${N(String(MUNI_VILLES)) + " cities"}
  and ${N(String(MUNI_VILLAGES)) + " villages"} &mdash; levied their own income tax, according to the
  Department of Taxation&rsquo;s own Table LG-11, and between them they collected
  ${N("$" + MUNI_COLLECTE.toLocaleString("en-US") + " million")} in a single year. For comparison,
  <a href="/paycheck-calculator/michigan/">Michigan</a>, the other state here with a city tax
  layer, has about two dozen.</p>
  <p>Three rules decide what it costs you, and all three come from that table:</p>
  <ul>
    <li><strong>It follows the work, not just the home.</strong> The tax is
    &ldquo;imposed on wages, salaries, and other compensation earned by <em>residents and
    nonresidents who work in the municipality</em>&rdquo;. Commuting in does not put you outside
    it.</li>
    <li><strong>You are usually not taxed twice.</strong> &ldquo;Most municipalities allow a
    partial or full credit to residents for municipal income taxes paid to another municipality
    where they are employed&rdquo; &mdash; but it is the municipality&rsquo;s choice, not a
    statewide guarantee.</li>
    <li><strong>${N("1%")} is the ceiling a city can set on its own.</strong> State law
    &ldquo;requires that the rate must be uniform within a municipality and cannot exceed one
    percent without approval by voters&rdquo;. Anything above ${N("1%")} was voted for locally.</li>
  </ul>
  <p>The scale, in money, on a ${N($(75000))} salary. At the ${N("1%")} a city can set without
  a vote, it owes its city ${N($$(muniVote75))} &mdash; about half what the state takes. Across the
  range the Department&rsquo;s table records, ${N((MUNI_MIN * 100).toFixed(2) + "%")} to
  ${N((MUNI_MAX * 100).toFixed(0) + "%")}, it is between ${N($$(muniBas75))} and
  ${N($$(muniHaut75))}. <strong>The crossover is
  ${N((muniEgalite * 100).toFixed(2) + "%")}</strong>: above that rate your city takes more of
  your pay than Ohio does, and ${N(String(MUNI_AU_DESSUS)) + " of the " + N(String(MUNI_NB))} municipalities in the
  Department&rsquo;s table are.</p>
  <p>The shape of that table says something the range alone does not.
  <strong>${N(String(MUNI_A_1PCT))} of the ${N(String(MUNI_NB))}</strong> &mdash; more than a
  third &mdash; sit at exactly ${N("1.000%")}, the ceiling a council can set without asking its
  voters. The median rate is ${N("1.5%")}, and ${N(String(MUNI_2PCT_PLUS))} municipalities are at
  ${N("2%")} or above. So the typical Ohio city takes rather less than the state on a
  ${N($(75000))} salary while the largest ones take more &mdash; which is why no single number
  can stand in for your own city.</p>
  <p><strong>Two honest caveats.</strong> Those counts and rates are for calendar year
  ${N(String(MUNI_ANNEE))}: it is the most recent municipality-by-municipality table the
  Department publishes, and we checked for later editions before saying so. And we deliberately do
  not name any city&rsquo;s rate here, because individual cities have changed theirs since. Since
  &ldquo;administration of the municipal income tax is strictly local&rdquo;, the reliable sources
  for your own rate are your pay stub, your city&rsquo;s income tax office, and the
  Department&rsquo;s Finder tool at <span class="num">thefinder.tax.ohio.gov</span>. None of it is
  in the figures on this page.</p>

  <h3>Ohio school districts levy their own income tax too</h3>
  <p>Separately from any city tax, Ohio school districts may levy an income tax on residents, filed
  on its own return, the SD 100. The Department&rsquo;s IT 1040 booklet lists the rate for every
  taxing district as a four-digit decimal; the rates run from
  ${N((SD_MIN * 100).toFixed(2) + "%")} to ${N((SD_MAX * 100).toFixed(0) + "%")}. Districts use one
  of two bases, and the booklet marks which: a <strong>&ldquo;traditional&rdquo;</strong> base of
  modified adjusted gross income less exemptions, or an <strong>&ldquo;earned income&rdquo;</strong>
  base that counts only wages and self-employment income.</p>
  <p>On a ${N($(75000))} salary that is between ${N($$(sdBas75))} and ${N($$(sdHaut75))} a year,
  depending on the district &mdash; at the top of the range, more than the state itself takes. The
  Department&rsquo;s Finder tool at <span class="num">tax.ohio.gov/Finder</span> tells you which
  district you live in. None of it is in the figures on this page.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Using an old Ohio bracket table</h3>
  <p>The most expensive error, and the easiest to make, because Ohio changed its schedule several
  years running. A table showing five brackets and a top rate near 4% describes a law that no
  longer exists. For 2026 there is one rate, 2.75%, above one threshold, ${N($(SEUIL))}.</p>

  <h3>Multiplying the whole salary by 2.75%</h3>
  <p>It overstates the tax at every income, because the exemption and the ${N($(SEUIL))} threshold
  both come off first. On ${N($(50000))} that arithmetic gives ${N($$(50000 * TAUX))} where the
  real figure is ${N($$(a50.etat))}. On ${N($(75000))} it gives ${N($$(75000 * TAUX))} against
  ${N($$(a75.etat))}.</p>

  <h3>Forgetting the ${N($(MARCHE))} step</h3>
  <p>The opposite error, and it only bites near the threshold. Someone earning just over
  ${N($(DEPART))} who applies 2.75% to the excess alone gets a few cents where the true answer is
  ${N($$(apresMarche.etat))}. The ${N($(MARCHE))} is owed in full the moment the threshold is
  passed.</p>

  <h3>Treating the state tax as the whole tax</h3>
  <p>In Ohio this is the mistake that costs the most, and the arithmetic says so plainly. The
  state layer is genuinely small &mdash; ${N($$(a75.etat))} on ${N($(75000))}. A city levying the
  ${N("1%")} it can set without a vote takes ${N($$(muniVote75))} on the same salary, and
  ${N(String(MUNI_NB)) + " Ohio municipalities"} levy something. Add a school district levy on top and an
  Ohio budget built on the state figure alone is wrong by more than the state figure itself.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and in Ohio it particularly will not, because the state withholding tables take
  ${N((RETENUE_HAUT * 100).toFixed(1) + "%")} where the tax is 2.75%, and because city tax is
  withheld alongside it. Treat this as an accurate model of what you <em>owe</em> at the federal
  and state level, and read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Ohio in 2026, claiming one exemption, with no
  retirement contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; ${N("$16,100")} =
    ${N("$58,900")}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Ohio exemption at this income: ${N("$" + c0(EXO_MOY))} (one person, income between
    ${N($(PAL_1 + 1))} and ${N($(PAL_2))})</li>
    <li>Ohio taxable income: ${N($(a75.brut))} &minus; ${N("$" + c0(EXO_MOY))} =
    ${N($(75000 - EXO_MOY))}</li>
    <li>Ohio income tax: ${N($(MARCHE))} + 2.75% &times;
    (${N($(75000 - EXO_MOY))} &minus; ${N($(SEUIL))}) = ${N($$(a75.etat))}</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>
  <p>Add a city income tax and, if your district levies one, a school district tax, and the picture
  changes materially &mdash; which is exactly why both are called out above rather than buried.</p>

  <h2>Frequently asked questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Compare with other states</h2>
  <p>The same ${N($(a75.brut))} salary, single filer, 2026 rates, state layer only:</p>
  <ul>
${voisins.map(v => {
  const nom = v.cle.charAt(0).toUpperCase() + v.cle.slice(1);
  const d = v.r.net - a75.net;
  const sens = d > 0 ? "keeps " + $$(Math.abs(d)) + " more" : "keeps " + $$(Math.abs(d)) + " less";
  /* « An Illinois » mais « a Utah » : c'est le SON qui decide, pas la lettre.
     Utah se dit « Yoo-tah ». Ecrit apres avoir relu « An Utah worker » dans
     la page generee le 02/09. */
  const art = (/^[AEIOU]/.test(nom) && nom !== "Utah") ? "An" : "A";
  return `    <li><a href="/paycheck-calculator/${v.cle}/">${nom}</a> &mdash; ${$(v.r.net)} take-home, `
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. ${art} ${nom} worker ${sens} than an `
    + `Ohioan on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Of every state published here that levies an income tax, <strong>Ohio leaves you the
  most</strong>. The comparison comes with a warning, though, and it runs the other way from the
  ranking: the states above are compared on their state layer alone, and Ohio&rsquo;s state layer
  is the smallest part of an Ohio tax bill. Add a city income tax &mdash; levied by
  ${N(String(MUNI_NB)) + " municipalities"} and worth ${N($$(muniVote75))} on this salary at the
  ${N("1%")} a city can set unaided &mdash; and the ranking reverses against
  <a href="/paycheck-calculator/utah/">Utah</a>, where no city tax comes out of pay at all. Only
  the states with no income tax at all are unambiguously cheaper.</p>

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/michigan/">Michigan paycheck calculator</a> &mdash; the
    nearest neighbour, and the other state here where a city tax changes the answer.</li>
    <li><a href="/paycheck-calculator/utah/">Utah paycheck calculator</a> &mdash; the mirror
    image: a higher flat rate, but no local layer on top of it at all.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-02">September 2, 2026</time> &middot;
    Last updated <time datetime="2026-09-02">September 2, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Ohio rates and exclude municipal and school district income tax.
  </p>

</main>

<footer class="site-footer">
  <div class="wrap">
    <p><strong>StateLine Calc</strong> &mdash; free money calculators for all 50 states.
    No sign-up. No personal data required.</p>
    <p class="micro u-on-dark">
      <a href="/about/">About</a> &middot;
      <a href="/methodology/">Methodology</a> &middot;
      <a href="/contact/">Contact</a> &middot;
      <a href="/privacy/">Privacy</a> &middot;
      <a href="/terms/">Terms</a> &middot;
      <a href="/disclaimer/">Disclaimer</a>
    </p>
  </div>
</footer>

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "ohio");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
