/* Construit /paycheck-calculator/arizona/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Arizona est le 28e Etat publie. Ce qu'il a de propre :
 *
 *   1. UNE RETENUE QUE LE SALARIE CHOISIT. Il n'y a ni bareme ni allocation :
 *      le Form A-4 (2026, ADOR 10121 (25)) propose sept pourcentages de la
 *      paie imposable (0,5 / 1,0 / 1,5 / 2,0 / 2,5 / 3,0 / 3,5 %). Sans
 *      formulaire, le departement exige 2,0 %. Le moteur modelise CE DEFAUT ;
 *      la page donne le tableau des sept choix a 75 000 $.
 *   2. L'IMPOT EST A 2,5 %, LA RETENUE PAR DEFAUT A 2,0 %. Page ADOR de
 *      retenue : « for tax year 2023 and beyond, the tax rate for Arizona
 *      taxable income is 2.5% » ; Form 140 (2025), ligne 46 : x 2,5 %. Mais
 *      l'impot se calcule apres la deduction standard (15 750 $ celibataire,
 *      declaration 2025). Sur 75 000 $ : (75 000 - 15 750) x 2,5 % = 1 481,25 $
 *      contre 1 500 $ retenus. Arithmetique de la page, hypotheses dites ;
 *      aucune valeur 2026 de la deduction n'a ete lue.
 *   3. AUCUNE RETENUE SALARIEE AUTRE. Chomage = employeur seul (DES : « cannot
 *      be withheld from employees' wages »). Ni prime d'invalidite ni conge
 *      familial salarie dans les documents lus ; la page dit « we found no »,
 *      jamais « Arizona has no ». Aucun impot local decrit non plus.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * azdor.gov et des.az.gov : 403 (Cloudflare) a curl, WebFetch et Chrome pilote
 * (le 02/10/2026) ; lus dans leurs instantanes Internet Archive. azleg.gov
 * (A.R.S. 43-401) repond 200 en direct. Detail complet, citations verbatim :
 * data/rates-2026.js (bloc "arizona") et .tooling/lib/sources.js
 * (PAR_ETAT.arizona).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Arizona has no disability insurance » : l'absence dans trois
 *     documents n'est pas une preuve ; « we found no » seulement ;
 *   - pas de « no local income tax » : meme raison ;
 *   - pas de deduction standard 2026 : seule celle de la declaration 2025 est lue ;
 *   - pas de taux « supplementaire » pour les primes : le A-4 n'en distingue pas,
 *     la page dit « we did not find a separate rate » ;
 *   - pas d'explication du choix de 2,0 % par le departement : non lue.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-arizona.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "arizona";
const NOM = "Arizona";
const URL = "https://statelinecalc.com/paycheck-calculator/arizona/";
const AUJOURD_HUI = "2026-10-02";
const LISIBLE = "October 2, 2026";

/* --- les valeurs de droit : le defaut est lu dans rates-2026.js ----------- */
const AZ = R.states[CLE];
const DEFAUT = AZ.incomeTax.brackets.single[0][1];                 // 0.02
const OPTIONS = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.035];    // Form A-4 2026
/* Page ADOR de retenue (instantane du 2026-08-27) et Form 140 2025, ligne 46. */
const TAUX_IMPOT = 0.025;
/* Form 140 2025, « Your Standard Deduction » : Single 15 750 $. Declaration
   2025 : aucune valeur 2026 lue. */
const DED_2025 = 15750;
const BASE_CHOMAGE = 8000;                                          // DES : « first $8,000 »
const fedDed = R.federal.standardDeduction;

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a100 = calcul(CLE, 100000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const gain401 = a75.etat - calcul(CLE, 75000, "single", 0.06).etat;
const effet = r => r.etat / r.brut * 100;

/* Independant du moteur : le A-4, un pourcentage de la paie imposable. */
const a4 = (brut, pct) => brut * pct;

/* L'impot final, illustration de la page : (salaire - deduction 2025) x 2,5 %. */
const impotFinal75 = (75000 - DED_2025) * TAUX_IMPOT;              // 1,481.25
const ecartDefaut = a75.etat - impotFinal75;                        // 18.75
const ecart25 = a4(75000, 0.025) - impotFinal75;                    // 393.75
const manque15 = impotFinal75 - a4(75000, 0.015);                   // 356.25
const partImpot = impotFinal75 / 75000 * 100;                       // 1.975 %

/* Voisins publies : Nevada, Utah, New Mexico, Colorado (Four Corners).
   California n'est pas publie. */
const REF = 75000;
const COMPARE = [CLE, "nevada", "utah", "new-mexico", "colorado"];
const NOMS = { [CLE]: "Arizona", nevada: "Nevada", utah: "Utah", "new-mexico": "New Mexico", colorado: "Colorado" };
const total = r => r.etat + r.paidLeave + r.waCares + r.programmes.reduce((t, p) => t + p.montant, 0);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const nv75 = calcul("nevada", REF), ut75 = calcul("utah", REF), nm75 = calcul("new-mexico", REF), co75 = calcul("colorado", REF);

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
/* Les taux de ce site ont deux decimales significatives. */
const pct = t => String(+(t * 100).toFixed(2)) + "%";
const pct1 = t => (t * 100).toFixed(1) + "%";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des sept pourcentages du A-4 a 75 000 $, GENERE : la retenue est
   pourcentage x salaire (formule du A-4), le net est celui du moteur avec la
   retenue remplacee. */
const tableChoix = OPTIONS.map(p => {
  const retenue = a4(75000, p);
  const net = a75.net + a75.etat - retenue;
  const marque = Math.abs(p - DEFAUT) < 1e-9;
  return "        <tr><th scope=\"row\">" + pct1(p) + (marque ? " (default)" : "") + "</th>"
    + "<td class=\"num\">" + $$(retenue) + "</td>"
    + "<td class=\"num\">" + $$(retenue / 12) + "</td>"
    + "<td class=\"num\">" + $(net) + "</td></tr>";
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Arizona state income tax withholding rate in 2026?",
   "It depends on what the employee chose. Arizona Form A-4 for 2026 offers seven percentages of gross taxable wages, " +
   "from 0.5% to 3.5% in steps of half a point, and says that if you do not give the form to your employer the " +
   "department requires 2.0% to be withheld. This calculator uses the 2.0% default. The department&rsquo;s " +
   "withholding page separately says the tax rate on Arizona taxable income is 2.5% for tax year 2023 and beyond."],

  ["How much Arizona tax is withheld on a $75,000 salary?",
   "At the 2.0% default, " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. That is " +
   $(75000) + " &times; 2.0%, with no allowance subtracted first, and it is the same for single, married filing " +
   "jointly and head of household. Choosing 3.5% on Form A-4 would withhold " + $$(a4(75000, 0.035)) +
   " instead, and choosing 0.5% would withhold " + $$(a4(75000, 0.005)) + "."],

  ["What is take-home pay on a $75,000 salary in Arizona?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer at the 2.0% " +
   "default with no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, " +
   $(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of Arizona income tax " +
   "&mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%."],

  ["How much is $20, $25 or $30 an hour after taxes in Arizona?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) +
   " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) + " an hour. " +
   "$30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are " +
   "single-filer figures after federal tax, FICA and the 2.0% Arizona default, with no retirement contribution."],

  ["How do I change my Arizona withholding?",
   "Complete a new Arizona Form A-4 and give it to your employer; do not send it to the department. On the form " +
   "you check one percentage, and you can also ask your employer to withhold an extra amount from each " +
   "paycheck. New employees are asked to complete it within the first five days of employment. Changing the " +
   "percentage changes only what comes out of each check, not the tax you owe when you file."],

  ["Why is the default withholding 2.0% when Arizona&rsquo;s tax rate is 2.5%?",
   "The two numbers apply to different bases. The 2.5% rate is applied to Arizona taxable income, which is " +
   "figured after deductions on your return. The 2.0% is a percentage of gross taxable wages, with no deduction. " +
   "For a single filer on $75,000, our arithmetic using the 2025 Form 140 standard deduction of " + $(DED_2025) +
   " gives about " + $$(impotFinal75) + " of tax, which is about " + partImpot.toFixed(1) + "% of wages, so the " +
   "default lands close to that amount. That assumes wages only, no credits and no other adjustments, and we did not find " +
   "the department explaining why it chose 2.0%."],

  ["Can I have zero Arizona tax withheld?",
   "Only if you expect to owe none. Form A-4 lets you elect a withholding percentage of zero if you expect " +
   "no Arizona tax liability for the year, and it defines that liability as gross tax less credits such as the " +
   "family tax credit, school tax credits or credits for taxes paid to other states. The form says zero " +
   "withholding does not relieve you of tax due when you file, and that to keep the election for the next " +
   "calendar year you must give your employer an updated form."],

  ["Does Arizona have a state disability or paid family leave deduction?",
   "We found none. The Form A-4, the Department of Revenue&rsquo;s withholding page and the Department of Economic " +
   "Security&rsquo;s unemployment tax pages that we read describe no employee premium for disability or family " +
   "leave, and this calculator takes none. That is what the documents we read say, not a survey of every state program."],

  ["Do Arizona employees pay for unemployment insurance?",
   "Not through a deduction. The Department of Economic Security says state unemployment taxes &ldquo;cannot be " +
   "withheld from employees&rsquo; wages,&rdquo; and its employer page says employers are currently required to pay " +
   "the tax on the first " + $(BASE_CHOMAGE) + " in gross wages paid to each employee in a calendar year. " +
   "This calculator takes nothing from your pay for unemployment insurance."],

  ["Do Arizona cities or counties tax paychecks?",
   "The Department of Revenue&rsquo;s withholding page describes one state withholding percentage and mentions no " +
   "city or county income tax. We have not checked every city, so look for a local line on your pay stub; this " +
   "calculator includes none."],

  ["Does a 401(k) contribution lower my Arizona withholding?",
   "In this calculator, yes. Form A-4 says gross taxable wages are your gross wages less any pretax " +
   "deductions, and a traditional 401(k) deferral is pre-tax for federal income tax, so the calculator takes it out " +
   "before the percentage is applied. On $75,000 with 6% going into a 401(k), Arizona withholding at 2.0% falls by " +
   $$(gain401) + " a year. Health insurance premiums and other pre-tax deductions are not modeled."],

  ["Why is my Arizona paycheck different from this calculator?",
   "The usual reasons: you chose a percentage other than 2.0% on Form A-4, health insurance premiums and other " +
   "pre-tax deductions come out before tax and are not modeled here, a second job raises federal withholding, " +
   "or an extra amount per paycheck is being withheld. Bonuses are not modeled either."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. Les entites de la
   FAQ doivent devenir de vrais caracteres dans le JSON ; nettoieJsonLd le fait
   aussi sur la page entiere a l'ecriture. */
const dec = s => s.replace(/&mdash;/g, "—").replace(/&rsquo;/g, "’")
  .replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
  .replace(/&hellip;/g, "…").replace(/&times;/g, "×").replace(/&minus;/g, "−")
  .replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

/* La reponse directe : 40 a 60 mots, verifie plus bas. Elle couvre le cas
   horaire (20 % des impressions du site sont des requetes « hourly »). */
const reponse = "Arizona withholds " + pct1(DEFAUT) + " of taxable wages by default in 2026, unless you pick 0.5% to 3.5% on Arizona Form A-4. "
  + "On $75,000, a single filer keeps about " + $(a75.net) + " a year. At $25 an hour, full time, you keep about "
  + $$(h25.netHoraire) + " an hour after tax. The state income tax rate is 2.5%, applied on your return.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Arizona (AZ) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Arizona (AZ) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Arizona's 2.0% default withholding.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Arizona (AZ) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Arizona withholds 2.0% of taxable wages by default in 2026, and you can pick 0.5% to 3.5% on Form A-4. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Arizona Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Arizona take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Arizona income tax withheld at the 2.0% default percentage of gross taxable wages, with no allowance or bracket."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Arizona", "item": "${URL}" }
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
    <li aria-current="page">Arizona</li>
  </ol>
</nav>

  <h1>Arizona Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your Arizona take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction. Arizona withholding
          is the same for every filing status.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Arizona withholding too.</span>
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
    <p>Arizona withholding has no brackets and no allowance to subtract. Each employee fills in Arizona
    Form A-4 (the state&rsquo;s counterpart to the federal W-4) and checks one percentage of gross taxable
    wages, from ${N("0.5%")} to ${N("3.5%")}. If an employee never gives the form to the employer, the
    Department of Revenue requires ${N("2.0%")} to be withheld, and this
    calculator uses that default. If you chose a different percentage, your own withholding will differ;
    the table further down shows all seven choices on a ${N("$75,000")} salary. For contrast,
    <a href="/paycheck-calculator/nevada/">Nevada</a> withholds nothing at state level, and
    <a href="/paycheck-calculator/colorado/">Colorado</a> uses a flat ${N("4.40%")} after an allowance.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Arizona income tax withholding</strong>: your wages after any 401(k) contribution,
      times ${N(pct1(DEFAUT))}.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Arizona, the <strong>Arizona Department of Revenue</strong>&rsquo;s 2026 <em>Form A-4</em> and its
    withholding page, with the election rule in <strong>A.R.S. &sect; 43-401</strong>. The department&rsquo;s
    website blocks automated requests, so we read its documents from Internet Archive snapshots, linked in
    the sources below. Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check at the default percentage. Arizona income tax itself is figured on your
    return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately does not do: it does not let you choose a percentage other than
    the default, it does not add an extra per-paycheck amount, and it does not model Married Filing
    Separately, multiple jobs, bonuses and other supplemental wages, or health insurance premiums and other
    employer benefit deductions.</p>
  </div>

  <h2>Arizona take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates, Arizona at the
  ${N(pct1(DEFAUT))} default. The AZ state tax column is the Arizona withholding; there is no other state
  deduction in this calculator.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Arizona take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">AZ state tax</th>
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

    <h2>The seven Arizona withholding choices, on a $75,000 salary</h2>
    <p>Form A-4 lists seven percentages. The table applies each one to ${N("$75,000")} of gross taxable
    wages for a single filer, with federal tax and FICA unchanged. The rows differ only in the Arizona
    line.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Arizona withholding by Form A-4 percentage, $75,000 salary, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Percentage on Form A-4</th>
          <th scope="col">Withheld a year</th>
          <th scope="col">Withheld a month</th>
          <th scope="col">Take-home a year</th>
        </tr>
      </thead>
      <tbody>
${tableChoix}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Arizona hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in Arizona?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Arizona withholding at the default, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Arizona&rsquo;s share is
    ${N($$(h20.etat))} for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Arizona?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Arizona withholds ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>Form A-4 applies the percentage to gross taxable wages &ldquo;from every paycheck,&rdquo; and we did
    not find a separate Arizona rate for overtime or bonuses in the documents we read. The calculator
    multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses.
    If you work variable hours, enter the average you expect for the year.</p>

    <h3>Arizona take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates, Arizona at the default.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Arizona take-home pay by hourly rate, single filer, 40 hours a week
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

${blocLimites()}

  <h2>Key facts that affect your take-home pay in Arizona</h2>

  <h3>You choose the percentage, and the default is 2.0%</h3>
  <p>Arizona Form A-4 has you choose how much your employer withholds: &ldquo;from gross taxable wages at the percentage checked,&rdquo; with
  seven options: ${N("0.5%")}, ${N("1.0%")}, ${N("1.5%")}, ${N("2.0%")}, ${N("2.5%")}, ${N("3.0%")} and
  ${N("3.5%")}. New employees complete it within the first five days. The form says that if you do not give
  it to your employer, the department requires ${N("2.0%")} of your gross taxable wages. The same rule is in
  state law: A.R.S. &sect; 43-401 says an employee who fails to complete the election form &ldquo;shall be
  deemed to have elected the withholding percentage prescribed by the department.&rdquo; On the same
  ${N("$75,000")}, that is ${N($$(a75.etat))} from a single filer, ${N($$(h75.etat))} from a head of household and
  ${N($$(j75.etat))} from a married couple filing jointly: the filing status changes your federal tax, not the
  Arizona line.</p>

  <h3>The tax rate is 2.5%, but that is not what the default takes</h3>
  <p>The department&rsquo;s withholding page says &ldquo;for tax year 2023 and beyond, the tax rate for Arizona
  taxable income is 2.5%,&rdquo; and line 46 of the 2025 Form 140 instructions says to multiply Arizona taxable
  income by ${N("2.5% (.025)")}. Taxable income is what is left after deductions, and the 2025 instructions give a
  standard deduction of ${N($(DED_2025))} for a single filer. For a single filer on a ${N("$75,000")} salary that is
  (${N("$75,000")} &minus; ${N($(DED_2025))}) &times; ${N("2.5%")} = ${N($$(impotFinal75))}, or about
  ${N(partImpot.toFixed(1) + "%")} of wages. That is our arithmetic, not the department&rsquo;s: it uses the 2025
  deduction because we did not read a 2026 figure, and it assumes wages only, no credits and no other adjustments.
  On those assumptions the ${N("2.0%")} default withholds ${N($$(ecartDefaut))} more than the tax, picking
  ${N("2.5%")} would withhold ${N($$(ecart25))} more, and picking ${N("1.5%")} would leave you about
  ${N($$(manque15))} short when you file. We did not find the department explaining why it set the default at
  ${N("2.0%")}.</p>

  <h3>&ldquo;Gross taxable wages&rdquo; is not your gross pay</h3>
  <p>The form defines it: the wages that will generally be in box 1 of your federal Form W-2, which is &ldquo;your
  gross wages less any pretax deductions, such as your share of health insurance premiums.&rdquo; So a pre-tax
  health premium lowers the base the percentage is applied to. This calculator removes only your 401(k)
  contribution, so on a paycheck with large pre-tax benefit deductions the real Arizona line will be a little
  lower than the one shown.</p>

  <h3>Zero withholding has conditions, and it has to be renewed</h3>
  <p>Form A-4 lets you elect zero if you expect no Arizona tax liability for the year. It defines that
  liability as gross tax less credits &mdash; &ldquo;such as the family tax credit, school tax credits, or credits
  for taxes paid to other states&rdquo; &mdash; and warns that zero withholding &ldquo;does not relieve you from
  paying Arizona income taxes that might be due at the time you file.&rdquo; To keep the election for the next
  calendar year you must give your employer an updated form; if you do not, the form says your employer may
  withhold from your wages until you do.</p>

  <h3>You can ask for an extra amount on top of the percentage</h3>
  <p>The form has a box for an extra amount to be withheld from each paycheck. The calculator does not include
  one. A higher percentage or an extra amount would raise what comes out of each check.</p>

  <h3>Unemployment insurance comes from the employer</h3>
  <p>The Department of Economic Security says state unemployment taxes &ldquo;are used solely for the payment of
  unemployment benefits and cannot be withheld from employees&rsquo; wages.&rdquo; Its employer page says employers
  are currently required to pay the tax on the first ${N($(BASE_CHOMAGE))} in gross wages paid to each employee
  in a calendar year. The calculator takes nothing from your pay for it.</p>

  <h3>We found no state disability or paid leave deduction</h3>
  <p>Neither Form A-4, the department&rsquo;s withholding page nor the unemployment pages we read describe an
  employee premium for disability or family leave, so the calculator takes none. Compare
  <a href="/paycheck-calculator/colorado/">Colorado</a>, where the employee pays half of a family and medical
  leave premium, or <a href="/paycheck-calculator/rhode-island/">Rhode Island</a>, with its temporary disability
  deduction. That absence is a reading of the documents we list below, not a survey of every program, so check your own
  pay stub.</p>

  <h3>Work done in Arizona is what counts</h3>
  <p>Form A-4 says Arizona law requires your employer to withhold Arizona income tax &ldquo;from your wages for
  work done in Arizona.&rdquo; It also says compensation earned by nonresidents while physically working in Arizona
  for temporary periods is subject to Arizona income tax, but that certain nonresident employees are not subject
  to withholding and may elect to have it withheld. The form is the place to check your own case. This calculator
  shows the Arizona withholding and does not model what your home state does on your return.</p>

  <h3>Your 401(k) contribution and the state tax</h3>
  <p>The form defines gross taxable wages as gross wages less pretax deductions. Traditional 401(k) deferrals are
  pre-tax for federal income tax, so the calculator takes your contribution out before it applies the Arizona
  percentage, the same order it uses for federal tax.
  On ${N("$75,000")} with 6% going in, Arizona withholding at ${N("2.0%")} falls by ${N($$(gain401))} a year. The
  calculator treats the contribution as a traditional, pre-tax one, so enter 0 if yours is not pre-tax.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. The 2.0% default has no ceiling either, so on ${N("$250,000")} the state
  takes ${N($$(a250.etat))}, the same ${N("2.0%")} as on the first dollar.</p>

  <h2>Common mistakes</h2>

  <h3>Reading 2.0% as the Arizona income tax rate</h3>
  <p>It is the default withholding percentage. The tax rate on Arizona taxable income is 2.5%, according to the
  department&rsquo;s withholding page, and your final bill depends on your deductions and credits. The two numbers
  are close, but they are not the same thing.</p>

  <h3>Assuming everyone is withheld at 2.0%</h3>
  <p>That is true only if you never gave your employer an Arizona Form A-4. If you chose another percentage when you
  were hired, your employer uses that one, and it can be as low as ${N("0.5%")} or as high as ${N("3.5%")}.
  On ${N("$75,000")} that is a range from ${N($$(a4(75000, 0.005)))} to ${N($$(a4(75000, 0.035)))} a year.</p>

  <h3>Choosing zero without meeting the condition</h3>
  <p>The form allows zero only if you expect no Arizona tax liability, after credits, for the year, and it does
  not relieve you of any tax due at filing. An election to keep zero has to be renewed with a new form.</p>

  <h3>Forgetting the form after a life change</h3>
  <p>The form says that if conditions change so that you expect a tax liability, you should promptly submit a new
  one and choose a percentage that applies to you. A change in your life does not change your withholding by itself.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, a second job changes the federal
  withholding picture, and your employer may be using a percentage you chose on Form A-4. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Arizona in 2026, at the 2.0% default, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Arizona withholding: ${N($(a75.brut))} &times; ${N(pct1(DEFAUT))} = ${N($$(a75.etat))}
    a year, which is ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on
    a biweekly one</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates, against four states around Arizona
  that we publish (Colorado meets it only at the Four Corners point). California is not on this site yet. Arizona is shown at the ${N("2.0%")} default.</p>
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
  <p><a href="/paycheck-calculator/nevada/">Nevada</a> withholds nothing at state level, so a Nevada
  worker keeps ${N($$(nv75.net - a75.net))} more than an Arizonan at the default on the same salary.
  <a href="/paycheck-calculator/new-mexico/">New Mexico</a> leaves ${N($$(a75.net - nm75.net))} less,
  <a href="/paycheck-calculator/utah/">Utah</a> ${N($$(a75.net - ut75.net))} less and
  <a href="/paycheck-calculator/colorado/">Colorado</a> ${N($$(a75.net - co75.net))} less. If you chose
  ${N("3.5%")} on Form A-4, Arizona would take ${N($$(a4(75000, 0.035)))}, still less than any of those three
  states withholds.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/nevada/">Nevada paycheck calculator</a> &mdash; the neighbor
    that takes no state income tax from wages.</li>
    <li><a href="/paycheck-calculator/utah/">Utah paycheck calculator</a> &mdash; a neighboring
    flat-rate state, with a credit that fades out instead of a percentage you choose.</li>
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
    Arizona rates.
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
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* Garde-fous : recoupement independant contre la formule du A-4 (pourcentage x
   paie imposable), pas contre notre propre moteur. */
const verifs = [["single", a75, 75000], ["marriedJoint", j75, 75000], ["headOfHousehold", h75, 75000],
                ["single", a25, 25000], ["single", a100, 100000], ["single", a250, 250000]];
for (const [statut, r, brut] of verifs) {
  const attendu = a4(brut, 0.02);
  if (Math.abs(attendu - r.etat) > 0.01) {
    console.error("ARRET : %s a %d $ : A-4 %s, moteur %s", statut, brut, attendu.toFixed(3), r.etat.toFixed(3));
    process.exit(2);
  }
}
if (DEFAUT !== 0.02 || AZ.incomeTax.standardDeduction !== 0 || (AZ.employeePrograms || []).length) {
  console.error("ARRET : le moteur n'est plus 2,0 % sans deduction ni programme ; reecrire les sections");
  process.exit(2);
}
if (!OPTIONS.some(p => Math.abs(p - DEFAUT) < 1e-9)) {
  console.error("ARRET : le defaut n'est pas l'un des sept choix du A-4"); process.exit(2);
}
/* Les phrases de la page qui donnent une DIRECTION sont verifiees ici. */
if (!(nv75.net > a75.net && a75.net > nm75.net && a75.net > ut75.net && a75.net > co75.net)) {
  console.error("ARRET : la comparaison avec les voisins n'a plus la forme ecrite dans la page");
  process.exit(2);
}
if (!(a4(75000, 0.035) < Math.min(total(calcul("new-mexico", REF)), total(calcul("utah", REF)), total(calcul("colorado", REF))))) {
  console.error("ARRET : « 3.5 % ... still less than any of those three » est faux");
  process.exit(2);
}
if (nv75.etat !== 0 || (R.states.nevada.employeePrograms || []).length) {
  console.error("ARRET : Nevada ne retient plus rien ; la phrase « withholds nothing » est fausse");
  process.exit(2);
}
if (Math.abs(impotFinal75 - 1481.25) > 0.005 || Math.abs(ecartDefaut - 18.75) > 0.005 ||
    Math.abs(ecart25 - 393.75) > 0.005 || Math.abs(manque15 - 356.25) > 0.005 ||
    Math.abs(gain401 - 90) > 0.005 || partImpot.toFixed(1) !== "2.0") {
  console.error("ARRET : arithmetique de l'ecart retenue / impot final");
  process.exit(2);
}
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) {
  console.error("ARRET : la reponse directe fait %d mots (40-60 attendus)", nbMotsReponse);
  process.exit(2);
}
if (mots < 1500) { console.error("ARRET : %d mots, sous le plancher de 1 500", mots); process.exit(2); }
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupements A-4 (single, married, HoH a 75 000 $ ; 25 000, 100 000, 250 000 $) : OK ; reponse directe %d mots", nbMotsReponse);
