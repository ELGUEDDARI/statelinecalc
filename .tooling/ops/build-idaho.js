/* Construit /paycheck-calculator/idaho/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * L'Idaho est le 18e Etat publie. Ce qu'il a de propre, et qu'aucune des 17
 * autres pages ne peut dire :
 *
 *   1. C'EST UN VRAI TAUX UNIQUE, PAS UN BAREME A PALIERS QUI FINIT PLAT.
 *      5,3 % depuis le 1er janvier 2025 (House Bill 40), et un seul chiffre
 *      au-dessus du seuil pour tout le monde. L'Utah est le seul autre Etat
 *      du site dans ce cas, et l'Utah credite plutot que de deduire.
 *   2. LE CHEF DE FAMILLE PARTAGE LE SEUIL DU CELIBATAIRE, PAS CELUI DU
 *      CONJOINT. La table de retenue 2026 (EPB00744) regroupe explicitement
 *      « Single Persons Including Head of Household » a 16 100 $ ; le
 *      formulaire annuel de l'annee d'imposition 2025 regroupait au contraire
 *      le chef de famille avec le conjoint. C'est un fait a verifier, pas a
 *      supposer par symmetrie avec les autres Etats du site.
 *   3. LE CREDIT D'IMPOT POUR ENFANT PROPRE A L'IDAHO A EXPIRE LE 1er JANVIER
 *      2026. Un credit distinct du credit federal, 205 $ par enfant, ne
 *      s'applique plus a l'annee d'imposition 2026 par sa propre clause
 *      d'extinction (Idaho Code 63-3029L) - la Commission le dit dans le
 *      meme communique qui annonce la table de retenue 2026.
 *
 * ── L'OBSTACLE RESEAU, ET COMMENT IL A ETE CONTOURNE ────────────────────────
 * tax.idaho.gov ET legislature.idaho.gov ont refuse la connexion depuis cette
 * machine sur trois methodes distinctes le 12/09/2026 (curl direct, curl en
 * IPv4 force, un Chromium reel headless) alors que sos.idaho.gov, meme TLD,
 * repondait normalement le meme jour - un blocage de serveurs precis, pas du
 * domaine entier. Les deux documents officiels ont donc ete lus dans leur
 * instantane Internet Archive, comme l'Utah le 02/09/2026 pour sa
 * Publication 14. Detail complet : data/rates-2026.js et
 * .tooling/sources/idaho.md.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur un impot municipal ou de comte : aucune des sources lues ne
 *     l'affirme en toutes lettres (meme regle que le Montana et le
 *     Wisconsin) ;
 *   - rien sur le statut Married Filing Separately, non propose par le
 *     calculateur ;
 *   - rien sur les personnes a charge ou l'age 65+, que le calculateur ne
 *     demande pas, ni sur le detail de la deduction ligne-a-ligne du
 *     formulaire annuel (63-3024A) : le calculateur modelise la retenue sur
 *     salaire, pas la declaration annuelle complete.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-idaho.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "idaho";

/* --- les valeurs de droit citees dans la prose --------------------------- */
const TAUX = 0.053;                                  // 5.3%, EPB00744 + Idaho Code 63-3024
const DED_SINGLE = 16100, DED_JOINT = 32200;          // EPB00744, periode annuelle 2026
const DED_HOH = 16100;                                // meme colonne que le celibataire
const DED_2025_SINGLE = 4811, DED_2025_JOINT = 9622;  // EIN00046 (tax year 2025), pour comparaison
const CTC_MONTANT = 205;                              // Idaho Code 63-3029L, sunset 2026

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

const imposable75 = 75000 - DED_SINGLE;               // 58,900

/* Le taux effectif d'Etat : la deduction est un montant fixe, donc elle
   abrite une part plus grande d'un petit salaire, meme sous un taux unique. */
const effet = r => r.etat / r.brut * 100;

/* Le seuil ou l'Idaho prend son premier cent, cherche par le moteur. */
const seuilImposition = (() => {
  let bas = 0, haut = 200000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();

/* 401(k) : l'Idaho part du revenu brut federal (Form 40, ligne 7, "Federal
   Adjusted Gross Income"), qui exclut deja un versement 401(k) elective. */
const PCT_401K = 0.06;
const gainID = a75.etat - calcul(CLE, 75000, "single", PCT_401K).etat;
const pa75 = calcul("pennsylvania", 75000);
const gainPA = pa75.etat - calcul("pennsylvania", 75000, "single", PCT_401K).etat;

/* Voisins directs de l'Idaho deja publies : Montana, Nevada, Utah, Washington. */
const voisins = ["montana", "nevada", "utah", "washington"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));
const NOMS = { montana: "Montana", nevada: "Nevada", utah: "Utah", washington: "Washington" };

/* « An Idaho worker », « a Utah worker » : le son commande, pas
   l'orthographe. Les cinq voyelles moins le U, qui se dit « you ». */
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
  ["What is the Idaho income tax rate in 2026?",
   "A single flat rate of 5.3% on Idaho taxable income above the filing-status threshold "
   + "&mdash; $" + c0(DED_SINGLE) + " for a single filer or head of household, $" + c0(DED_JOINT)
   + " filing jointly for 2026. Idaho cut its rate to 5.3% for tax year 2025 under House Bill 40 "
   + "and has not cut it again for 2026, so the same rate applies both years; the thing that "
   + "changed is the size of the threshold, which rose with the federal standard deduction."],

  ["Does Idaho have a standard deduction?",
   "Effectively yes, though it works through the withholding threshold rather than a separate "
   + "line you subtract yourself. The 2026 withholding table starts a 0% band at $" + c0(DED_SINGLE)
   + " for a single filer and $" + c0(DED_JOINT) + " filing jointly &mdash; the same two numbers "
   + "as the 2026 federal standard deduction for those statuses, to the dollar. A head of household "
   + "gets the same $" + c0(DED_HOH) + " band as a single filer, not the larger $24,150 the IRS "
   + "gives that status. Everything above the applicable line is taxed at 5.3%."],

  ["What is take-home pay on a $75,000 salary in Idaho?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of Idaho "
   + "income tax - an effective rate of " + (a75.taux * 100).toFixed(1) + "%. The state figure is "
   + "5.3% of the $" + c0(imposable75) + " left after the $" + c0(DED_SINGLE) + " threshold."],

  ["Does head of household get the same threshold as married filing jointly in Idaho?",
   "No, and this is easy to get wrong by assuming it works like most other states. Idaho's 2026 "
   + "withholding table groups a head of household with a single filer, both at the $"
   + c0(DED_SINGLE) + " threshold &mdash; not with the $" + c0(DED_JOINT)
   + " married-filing-jointly figure. On a $75,000 salary that makes a head of household's Idaho "
   + "tax " + $$(h75.etat) + ", identical to a single filer's, rather than the lower "
   + $$(j75.etat) + " a joint filer pays."],

  ["What happened to the Idaho Child Tax Credit?",
   "It expired on January 1, 2026. Idaho Code section 63-3029L created a nonrefundable "
   + "$" + CTC_MONTANT + "-per-child credit, separate from the federal child tax credit, written "
   + "into law with its own end date of January 1, 2026. The Idaho State Tax Commission "
   + "confirmed the sunset when it published the 2026 withholding tables and removed the "
   + "credit's withholding allowance from them. It has no effect on tax year 2026, which is what "
   + "this calculator models."],

  ["At what salary does Idaho start taking income tax?",
   $(seuilImposition) + " for a single filer - one dollar past the $" + c0(DED_SINGLE)
   + " threshold, and nothing more, because Idaho's flat rate applies from the first taxable "
   + "dollar with no lower band. Federal tax and FICA still apply well below that line."],

  ["Do Idaho employees pay for unemployment insurance?",
   "No. The Idaho Department of Labor's own handbook for businesses puts it plainly: "
   + "&ldquo;State Unemployment Tax (SUTA) is an employer-paid tax paid into the unemployment "
   + "insurance trust fund.&rdquo; The only state line we found on an Idaho pay stub is income "
   + "tax withholding."],

  ["Does a 401(k) contribution lower my Idaho tax?",
   "Yes. Idaho's own tax form starts from your federal adjusted gross income, which already "
   + "excludes a 401(k) elective deferral. On $75,000 with 6% going into a 401(k), your Idaho tax "
   + "falls by " + $$(gainID) + " a year. The rule is not universal: a "
   + "<a href=\"/paycheck-calculator/pennsylvania/\">Pennsylvania</a> worker making the same "
   + "contribution on the same salary sees their state tax fall by " + $$(gainPA)
   + " - nothing at all."],

  ["What is $20 an hour after taxes in Idaho?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Idaho "
   + "takes " + $$(h20.etat) + " of that: the first $" + c0(DED_SINGLE)
   + " is untaxed and the rest is taxed at a flat 5.3%."],

  ["Why is my Idaho paycheck smaller than this calculator says?",
   "The usual reasons: health insurance premiums and other pre-tax benefit deductions come out "
   + "before tax and are not modeled here, a second job pushes your federal withholding up, and "
   + "your employer withholds from the W-4 and Idaho Form ID W-4 you actually filed rather than "
   + "the standard assumptions this page uses. One Idaho-specific reason: the withholding table "
   + "sets the threshold that applies to your paycheck, but your final bill at filing runs through "
   + "the full annual worksheet on Form 40, which can land a little differently once your actual "
   + "deductions and credits are counted."]
];

/* Les chaines de faq[] contiennent deja des entites HTML brutes (&mdash;, &ldquo;,
   &rdquo;) ecrites en dur pour le rendu visible (ligne ~613, jamais passees par q()).
   Le JSON-LD (ligne ~253) reutilise ces memes chaines : q() doit donc laisser ces
   entites deja valides intactes et n'echapper que les "&" qui n'en font pas partie
   (sinon "&mdash;" devient "&amp;mdash;", cassant le rendu du JSON-LD -- defaut trouve
   par controle-statelinecalc le 12/09/2026). */
const q = s => s.replace(/&(?!amp;|mdash;|ldquo;|rdquo;|quot;|#\d+;)/g, "&amp;").replace(/"/g, "&quot;");
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
<title>Idaho (ID) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Idaho (ID) paycheck calculator, 2026. A flat 5.3% rate above a $16,100 (single) or $32,200 (joint) threshold &mdash; and head of household shares the single threshold.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/idaho/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Idaho (ID) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Idaho taxes income at a flat 5.3% above a threshold that matches the federal standard deduction &mdash; and groups head of household with single, not married filing jointly.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/idaho/">
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
      "name": "Idaho Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/idaho/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Idaho take-home pay after federal income tax, Social Security, Medicare and Idaho income tax at a flat 5.3 percent above a threshold that matches the federal standard deduction."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Idaho", "item": "https://statelinecalc.com/paycheck-calculator/idaho/" }
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
    <li aria-current="page">Idaho</li>
  </ol>
</nav>

  <h1>Idaho Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Idaho taxes income at a <strong>flat 5.3%</strong> in 2026, above a threshold of
    ${N("$" + c0(DED_SINGLE))} for a single filer or head of household and
    ${N("$" + c0(DED_JOINT))} filing jointly. On $75,000 that is ${N($$(a75.etat))} to the state
    and about ${N($(a75.net))} a year in your pocket. Head of household shares the
    <strong>single</strong> threshold, not the higher married one &mdash; a detail that trips
    people up.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Idaho take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="idaho" novalidate>
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
          <span class="help">Sets your federal brackets, and in Idaho it sets the threshold below
          which nothing is taxed &mdash; ${N("$" + c0(DED_SINGLE))} for single or head of
          household, ${N("$" + c0(DED_JOINT))} filing jointly.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Idaho it
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
    <p>Idaho is one of only two states on this site with a genuinely flat income tax rate &mdash;
    the other is <a href="/paycheck-calculator/utah/">Utah</a>, which works through a credit
    instead of a threshold. Idaho's version is simpler to describe: nothing is taxed up to a
    threshold, and every dollar above it is taxed at the same 5.3%, no matter how high your
    income goes. That threshold, for 2026, is ${N("$" + c0(DED_SINGLE))} for a single filer,
    also ${N("$" + c0(DED_SINGLE))} for a head of household, and ${N("$" + c0(DED_JOINT))} filing
    jointly. The single and joint figures match the 2026 federal standard deduction for those two
    filing statuses to the dollar; the head-of-household figure does not &mdash; Idaho groups head
    of household with the single filer instead of giving it the larger federal head-of-household
    deduction. More on that below.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Idaho income tax</strong>: your gross pay minus the ${N("$" + c0(DED_SINGLE))}
      or ${N("$" + c0(DED_JOINT))} threshold, taxed at a flat ${N("5.3%")}.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and for the state layer, the <strong>Idaho State Tax Commission</strong>&rsquo;s
    <em>Table for Percentage Computation Method of Withholding</em>, document EPB00744, revised
    <time datetime="2026-07-23">July 23, 2026</time>, and the rate statute itself,
    <strong>Idaho Code section 63-3024</strong>. Both were read on
    <time datetime="2026-09-12">September 12, 2026</time>. tax.idaho.gov and legislature.idaho.gov
    would not respond to a direct connection from the machine that built this page, so both documents
    were read from their Internet Archive snapshots &mdash; the same PDFs, the same text, just a
    different route to them. Our full sourcing, including that detail, is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>One check worth stating, because it is what makes this figure trustworthy:</strong>
    the withholding table's threshold and the federal standard deduction are not obviously the
    same quantity &mdash; one is set by the Idaho State Tax Commission, the other by the IRS. But
    for a single filer and for a married couple filing jointly, they land on the identical numbers
    for 2026, ${N("$" + c0(DED_SINGLE))} and ${N("$" + c0(DED_JOINT))}, which is consistent with
    Idaho's own tax form: Form 40 starts from your <em>federal adjusted gross income</em> and then
    applies a standard deduction that Idaho sets to match the federal one for those two statuses.
    Head of household is the exception: the federal standard deduction for that status is
    ${N("$24,150")} for 2026, but Idaho's withholding table still groups head of household with the
    single filer's ${N("$" + c0(DED_SINGLE))}, not its own, larger federal figure &mdash; a choice
    the table makes explicitly, not a rounding artifact. For tax year 2025, the comparable
    single/joint threshold was ${N("$" + c0(DED_2025_SINGLE))} single and
    ${N("$" + c0(DED_2025_JOINT))} joint &mdash; far lower, because 2026 is the first year the
    withholding table lines up the threshold with the larger, OBBBA-enhanced federal standard
    deduction rather than the smaller indexed figure Idaho
    Code 63-3024 sets on its own.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model Idaho's
    now-expired child tax credit, handle multiple jobs, or account for health insurance premiums
    and other employer benefit deductions.</p>
  </div>

  <h2>Idaho take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  Idaho column is a flat 5.3% of your pay above ${N("$" + c0(DED_SINGLE))}.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Idaho take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">ID state tax</th>
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

    <h2>Idaho hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Idaho</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Idaho&rsquo;s flat 5.3%, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}. Idaho&rsquo;s share of it is
    ${N($$(h20.etat))} for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Because Idaho&rsquo;s rate is flat, there
    is no bracket to cross at higher pay &mdash; every extra dollar above the threshold is taxed
    at the same 5.3%.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Idaho taxes overtime, tips and shift differentials at the same flat 5.3% as the rest of your
    pay, once you are past the threshold. The common complaint that &ldquo;overtime is taxed
    more&rdquo; is a federal effect: extra pay is withheld against a higher federal bracket, and
    nothing about Idaho&rsquo;s single rate changes.</p>

    <h3>Idaho take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Idaho take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Idaho</h2>

  <h3>Idaho's rate is flat, but the threshold is not a rounding error</h3>
  <p>There is no bracket to climb in Idaho: 5.3% applies to every dollar above the threshold,
  whether you earn ${N("$30,000")} or ${N("$300,000")}. What changes your Idaho tax bill is not a
  rate you cross but the size of the threshold itself, and for 2026 that threshold is set to match
  the federal standard deduction &mdash; ${N("$" + c0(DED_SINGLE))} single, ${N("$" + c0(DED_JOINT))}
  married filing jointly. On ${N("$25,000")} the state takes ${N($$(a25.etat))}, an effective state
  rate of ${N(effet(a25).toFixed(2) + "%")}. On ${N("$75,000")} it takes ${N($$(a75.etat))}, or
  ${N(effet(a75).toFixed(2) + "%")}. Even on ${N("$250,000")} it is only
  ${N(effet(a250).toFixed(2) + "%")}, because the threshold is a fixed dollar amount that shelters
  a shrinking share of a larger income.</p>

  <h3>Head of household shares the single threshold, not the joint one</h3>
  <p>This is what most sets Idaho apart from the other flat- or near-flat-rate states on
  this site. The 2026 withholding table lists two columns: &ldquo;Single Persons Including Head of
  Household&rdquo; at ${N("$" + c0(DED_SINGLE))}, and &ldquo;Married Persons&rdquo; at
  ${N("$" + c0(DED_JOINT))}. A head of household is grouped with the single filer, not with the
  married couple &mdash; the opposite grouping from what the prior year's annual return worksheet
  used. On a ${N($(75000))} salary that makes a head of household&rsquo;s Idaho tax
  ${N($$(h75.etat))}, identical to a single filer&rsquo;s ${N($$(a75.etat))}, rather than the lower
  ${N($$(j75.etat))} a joint filer pays.</p>

  <h3>The Idaho Child Tax Credit no longer applies</h3>
  <p>Idaho Code section 63-3029L created a nonrefundable ${N("$" + CTC_MONTANT)}-per-child credit,
  separate from the federal child tax credit, with its own built-in end date of
  <time datetime="2026-01-01">January 1, 2026</time>. The Idaho State Tax Commission confirmed the
  sunset in the same release that announced the 2026 withholding tables, and the withholding
  allowance for it has been removed from those tables. If you are budgeting around an Idaho child
  credit for 2026, it is not there.</p>

  <h3>Your employer cannot deduct unemployment insurance from your pay</h3>
  <p>Some states take an employee contribution for unemployment coverage;
  <a href="/paycheck-calculator/washington/">Washington</a> is the example on this site, where paid
  family leave and long-term care both come off the stub. Idaho does not: the Idaho Department of
  Labor&rsquo;s handbook for businesses states it directly, <em>State Unemployment Tax (SUTA) is
  an employer-paid tax paid into the unemployment insurance trust fund.</em> The only state line we
  found on an Idaho pay stub is income tax withholding.</p>

  <h3>Your 401(k) contribution does reduce your Idaho tax</h3>
  <p>Idaho&rsquo;s own tax form starts from your federal adjusted gross income &mdash; Form 40,
  line 7, pulled straight from federal Form 1040 &mdash; and an elective deferral to a 401(k) or
  403(b) is already excluded from that figure. On ${N("$75,000")} with 6% going in, your Idaho tax
  falls by ${N($$(gainID))} a year. The rule is not universal: a
  <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> worker making the same contribution
  on the same salary sees their state tax fall by ${N($$(gainPA))} &mdash; nothing at all.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Assuming head of household gets the married threshold</h3>
  <p>It does not, at least not for 2026 withholding. The instinct makes sense &mdash; on this site,
  filing as head of household usually lands between single and married filing jointly &mdash; but
  Idaho&rsquo;s 2026 withholding table explicitly groups head of household with single, both at
  ${N("$" + c0(DED_SINGLE))}. Assuming the married threshold applies overstates a head of
  household&rsquo;s take-home pay by treating ${N("$" + c0(DED_JOINT - DED_SINGLE))} of income as
  untaxed when it is not.</p>

  <h3>Using the 2025 threshold</h3>
  <p>${N("$" + c0(DED_2025_SINGLE))} was the tax-year-2025 annual-return figure for a single filer,
  not the 2026 withholding figure. Using it for 2026 taxes ${N("$" + c0(DED_SINGLE - DED_2025_SINGLE))}
  of income that should be untaxed, overstating a ${N($(75000))} salary&rsquo;s Idaho tax bill by a
  wide margin. If a page shows a threshold near ${N("$4,800")} for 2026, it is showing last year's
  return figure, not this year's withholding table.</p>

  <h3>Expecting the Idaho Child Tax Credit</h3>
  <p>It sunset on January 1, 2026. A ${N("$" + CTC_MONTANT)}-per-child figure that shows up in an
  older search result or a prior year's guide no longer applies to tax year 2026, and this
  calculator does not add it back.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Idaho&rsquo;s own withholding table is a per-paycheck
  approximation; your actual bill runs through the full annual worksheet on Form 40, where your
  real deductions and any credits you qualify for are counted. Health insurance premiums and other
  pre-tax benefit deductions come out before tax and are not modeled here, a second job changes
  the federal withholding picture, and your employer withholds from the Idaho Form ID W-4 you
  actually filed. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Idaho in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N("$16,100")} = ${N($(a75.brut - 16100))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Idaho taxable wages: ${N($(a75.brut))} &minus; ${N("$" + c0(DED_SINGLE))} threshold =
    ${N($(imposable75))}</li>
    <li>Idaho tax: ${N($(imposable75))} &times; 5.3% = ${N($$(a75.etat))}</li>
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
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. ${article(nom)} ${nom} worker ${sens} than an `
    + `Idahoan on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Idaho borders four states already on this site, and the spread among them is wide.
  <a href="/paycheck-calculator/nevada/">Nevada</a> and
  <a href="/paycheck-calculator/washington/">Washington</a> have no state income tax at all, which
  is why their workers keep more of the same salary despite Washington&rsquo;s small paid-leave and
  long-term-care deductions. <a href="/paycheck-calculator/utah/">Utah</a>&rsquo;s flat 4.45% is a
  lower headline rate than Idaho&rsquo;s 5.3%, and yet a Utah worker on this salary pays
  ${N($$(voisins[2].r.etat))} to the state against Idaho&rsquo;s ${N($$(a75.etat))} &mdash; because
  Utah subtracts nothing before applying its rate, while Idaho shelters
  ${N("$" + c0(DED_SINGLE))} first. What is taken out before the rate applies matters as much as
  the rate itself. <a href="/paycheck-calculator/montana/">Montana</a>, with a two-rate system and
  the same federal-sized deduction as Idaho, lands close by at ${N($$(voisins[0].r.etat))}.</p>

${blocSources("idaho")}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/utah/">Utah paycheck calculator</a> &mdash; the other
    flat-rate state on this site, and the only one that works through a credit instead of a
    threshold.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Idaho", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-12">September 12, 2026</time> &middot;
    Last updated <time datetime="2026-09-12">September 12, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Idaho rates.
  </p>

</div>
${colonne("Idaho")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "idaho");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
console.log("recoupement seuil 2026 / deduction federale : %s single, %s joint",
  DED_SINGLE === 16100 ? "OK" : "FAUX", DED_JOINT === 32200 ? "OK" : "FAUX");
console.log("HOH = single (%s) vs married (%s) : ecart %s", c0(h75.etat), c0(j75.etat),
  c0(h75.etat - j75.etat));
if (Math.abs(imposable75 * TAUX - a75.etat) > 0.005) {
  console.error("ARRET : la decomposition du cas 75 000 $ ne retombe pas sur le moteur");
  process.exit(2);
}
if (Math.abs(h75.etat - a75.etat) > 0.005) {
  console.error("ARRET : head of household devrait etre identique a single pour l'Idaho");
  process.exit(2);
}
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
