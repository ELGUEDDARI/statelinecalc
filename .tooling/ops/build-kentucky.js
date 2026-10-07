/* Construit /paycheck-calculator/kentucky/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Kentucky est le 40e Etat publie. Aucun mecanisme nouveau au moteur : un taux
 * unique (brackets a une tranche) + standardDeduction (meme montant aux 3 statuts),
 * comme la Louisiane. Ce qu'elle a de propre :
 *
 *   1. LA FORMULE DU DOR 42A003 (TCF) : retenue = (salaire annuel - 3 360) x 3,5 %,
 *      divisee par le nombre de periodes. Aucune exemption personnelle (« There are
 *      no personal exemptions »), aucun statut dans la formule.
 *   2. TAUX 2026 = 3,5 % (4 % en 2025, 3 270 $ de deduction sur la K-4 2025).
 *   3. LE CLASSEUR OFFICIEL DU DOR (1 994 formules) et le PDF sont relus EN LIGNE par
 *      .tooling/test/verif-retenue-ky.js. Le PDF imprime deux coquilles dans l'exemple
 *      bimensuel (35 730 au lieu de 35 640 ; « $47 » pour 47,98) : le site suit la
 *      formule, pas ces deux chiffres, et le dit.
 *   4. IMPOTS LOCAUX D'OCCUPATION (KRS 92.281 / 68.197) : NON MODELISES. Aucune table
 *      officielle de taux lue. QUI les retient : INDETERMINE -> la page dit « may apply »
 *      et que le net reel peut etre plus bas ; JAMAIS « your employer withholds ».
 *   5. RECIPROCITE (IL, IN, MI, WV, WI, VA trajet quotidien, OH) : citee, non modelisee.
 *   6. CHOMAGE : « You, the employer, pay for this support » (OUI Employer Guide 2026,
 *      p. 4) ; base salariale 12 000 $. SDI / conge paye : « we found no », JAMAIS
 *      « Kentucky has no ».
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « your employer withholds the local tax » : source absente ;
 *   - pas de taux local chiffre pour une adresse : aucune table officielle lue ;
 *   - pas de paie quotidienne : le classeur du DOR utilise 365, le site ne la chiffre pas ;
 *   - 401(k) : choix de modelisation dit sur la page (le livret ne le dit pas) ;
 *   - K-4 2026 : non trouvee (seule la K-4 2025 a ete lue) -> la page ne decrit pas ses cases.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-kentucky.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "kentucky";
const NOM = "Kentucky";
const URL = "https://statelinecalc.com/paycheck-calculator/kentucky/";
const AUJOURD_HUI = "2026-10-07";
const LISIBLE = "October 7, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const KYS = R.states[CLE];
const IT = KYS.incomeTax;
const DED = IT.standardDeduction;                       // 3 360 aux trois statuts
const TAUX = IT.brackets.single[0][1];                  // 0,035
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
const base75 = 75000 - DED.single;                       // 71 640
/* Erreurs typiques. */
const sansDeduction = 75000 * TAUX;                      // 2 625 : deduction oubliee
const ecartSansDeduction = sansDeduction - a75.etat;     // 117,60
const valeurDeduction = DED.single * TAUX;               // 117,60 par an
const aQuatre = (75000 - 3270) * 0.04;                   // 2 869,20 : taux 4 % et 3 270 $ de la K-4 2025
const ecartQuatre = aQuatre - a75.etat;                  // 361,80
const unPourCent = 75000 * 0.01;                         // 750 : repere d'echelle, pas un calcul d'impot local
const a3360 = calcul(CLE, DED.single), a3361 = calcul(CLE, DED.single + 1);

/* Voisins publies : Illinois, Indiana, Ohio, Tennessee, Virginie (7 frontaliers au total). */
const REF = 75000;
const COMPARE = [CLE, "illinois", "indiana", "ohio", "tennessee", "virginia"];
const NOMS = { [CLE]: "Kentucky", illinois: "Illinois", indiana: "Indiana", ohio: "Ohio", tennessee: "Tennessee", virginia: "Virginia" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const il75 = calcul("illinois", REF), in75 = calcul("indiana", REF), oh75 = calcul("ohio", REF),
      tn75 = calcul("tennessee", REF), va75 = calcul("virginia", REF);
const plusMoins = (autre) => autre.net > a75.net
  ? "keeps " + N($$(autre.net - a75.net)) + " more"
  : "keeps " + N($$(a75.net - autre.net)) + " less";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau de la formule, par statut. */
const LIGNES_STATUT = [
  ["Single", DED.single],
  ["Married filing jointly", DED.marriedJoint],
  ["Head of household", DED.headOfHousehold]
].map(([lib, d]) => "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + $(d) + "</td><td class=\"num\">" + pct(TAUX) + "</td><td>None</td></tr>").join("\n");

/* Le tableau des quatre salaires de reference : ce que la deduction fait a la retenue. */
const REPERES = [3360, 30000, 75000, 250000];
const LIGNES_REPERES = REPERES.map(g => {
  const r = calcul(CLE, g);
  return "        <tr><th scope=\"row\">" + $(g) + "</th><td class=\"num\">" + $$(Math.max(0, g - DED.single)) + "</td><td class=\"num\">" + $$(r.etat) + "</td><td class=\"num\">" + $$(r.etat / 12) + "</td></tr>";
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Kentucky income tax withholding rate in 2026?",
   "Kentucky&rsquo;s withholding formula uses one rate, " + N(pct(TAUX)) + ", for every filing status. Your employer subtracts a " + N($(DED.single)) + " standard deduction from your yearly pay and withholds " + N(pct(TAUX)) + " of what is left. " +
   "On a " + $(75000) + " salary, Kentucky withholds " + $$(a75.etat) + " a year. That rate is down from the flat 4% on the 2025 Form K-4."],

  ["How much Kentucky tax is withheld on a $75,000 salary?",
   "Kentucky withholds " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "The base is " + $(75000) + " minus the " + $(DED.single) + " standard deduction = " + $(base75) + ", and " + $(base75) + " &times; " + pct(TAUX) + " = " + $$(a75.etat) + ". " +
   "A married filer and a head of household have the same amount withheld, because the deduction does not change with filing status."],

  ["What is take-home pay on a $75,000 salary in Kentucky?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of Kentucky income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%. It is before any city or county occupational license tax, which this calculator does not include."],

  ["How much is $20, $25 or $30 an hour after taxes in Kentucky?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "Kentucky income tax withholding, with no retirement contribution and no local tax."],

  ["Are there personal exemptions or allowances on Kentucky Form K-4?",
   "Not according to the Department of Revenue. Its withholding booklet says: &ldquo;All Kentucky wage earners are taxed at a flat 3.5% tax rate with a standard deduction allowance annually adjusted by the Department of Revenue... There are no personal exemptions.&rdquo; " +
   "The withholding formula uses no allowance count and no filing status, so two employees with the same pay have the same Kentucky withholding. We read the 2025 Form K-4, not a 2026 one, and it has no allowance count either."],

  ["Is there a local income tax in Kentucky?",
   "There can be a local tax on wages. Kentucky law lets cities and counties levy one (KRS 92.281), usually called an occupational license tax. " +
   "We found no official table of the rates that apply to a given address, and we did not find a source that says who collects the tax from a paycheck, so this calculator adds no local line. If you work in a city or county that levies one, your actual take-home pay may be lower than the figure shown."],

  ["Are there other deductions from a Kentucky paycheck?",
   "We found no other state payroll deduction. The Kentucky Office of Unemployment Insurance says employers pay for unemployment insurance through taxes on their payroll, and its 2026 guide describes no deduction from employee wages. " +
   "We also found no state disability insurance or paid family leave program run through payroll. That is not proof that none exists, only what we found."],

  ["Does a 401(k) contribution lower my Kentucky withholding?",
   "In this calculator, yes. The Department of Revenue&rsquo;s withholding formula does not mention 401(k) contributions, so treating them as lowering the wages Kentucky taxes is our modeling choice, the same one we use for federal tax and in every other state here. " +
   "On " + $(75000) + " with 6% going into a 401(k), Kentucky income tax withholding falls by " + $$(gain401) + " a year. Ask your payroll department how your employer treats it."],

  ["I live in Illinois, Indiana, Michigan, Ohio, Virginia, West Virginia or Wisconsin and work in Kentucky. Is Kentucky tax withheld?",
   "You may be exempt. The Department of Revenue says an employee may be exempt from withholding if they work in Kentucky but live in Illinois, Indiana, Michigan, West Virginia or Wisconsin, in Virginia and commute daily, or in Ohio and are not a shareholder-employee who is a direct or indirect equity investor of 20% or more in an S corporation. " +
   "The booklet says an employee claims an exemption on Form K-4. This calculator assumes you live and work in Kentucky and does not model the exemption."],

  ["Why is my Kentucky paycheck different from this calculator?",
   "Common reasons: a city or county occupational license tax, if one applies to you, which this calculator does not include; a second job, because the " + $(DED.single) + " deduction is only given once and the Department says you may need an extra " + $$(DED.single * TAUX) + " withheld if you receive more than one W-2; " +
   "an extra amount you agreed with your employer to withhold; health insurance premiums and other pre-tax deductions that come out before tax; or a bonus included in your pay. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."]
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
const reponse = "Kentucky withholds a flat " + pct(TAUX) + " in 2026, after a " + $(DED.single) + " standard deduction that is the same for every filing status. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour. Local occupational taxes are not included.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Kentucky (KY) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Kentucky (KY) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Kentucky tax. Flat 3.5% withholding.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Kentucky (KY) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Kentucky withholds a flat 3.5% after a ${$(DED.single)} standard deduction, with no personal exemptions. On $75,000 a single filer keeps about ${$(a75.net)}, before any local occupational tax.">
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
      "name": "Kentucky Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Kentucky take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Kentucky income tax withheld under the Kentucky Department of Revenue formula (a $3,360 standard deduction, then 3.5%). Local occupational license taxes are not included."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Kentucky", "item": "${URL}" }
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
    <li aria-current="page">Kentucky</li>
  </ol>
</nav>

  <h1>Kentucky Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Kentucky take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction. Kentucky uses the
          same ${$(DED.single)} standard deduction for all three.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Kentucky income tax withholding too.</span>
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
    <p>Kentucky&rsquo;s withholding formula is short. The Kentucky Department of Revenue describes it in a few steps: multiply the pay for one pay period by the number of pay periods in a year, subtract the Kentucky standard deduction, apply the flat rate, and divide by the number of pay periods. In plain terms, your employer takes ${N($(DED.single))} off your yearly pay and withholds ${N(pct(TAUX))} of what is left. Pay that falls below the deduction has nothing withheld: the Department&rsquo;s own spreadsheet sets a negative result to zero.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Kentucky income tax</strong>: your wages after any 401(k) contribution, minus the ${N($(DED.single))} standard deduction,
      taxed at ${N(pct(TAUX))}.</li>
    </ul>
    <p>This calculator has no other Kentucky line. We looked for any other state payroll deduction and found none. It also adds no city or county tax, and the section on local occupational license taxes below explains why that matters.</p>

    <p>Rates come from the agencies that set them. For federal tax, that is the IRS (the brackets, the standard
    deduction and FICA), cross-checked against the Social Security Administration for the wage base. For
    Kentucky, it is the <strong>Kentucky Department of Revenue</strong>&rsquo;s 2026 withholding tax formula (form 42A003 TCF), its withholding booklet and its employer withholding page, plus the Office of Unemployment Insurance and the Kentucky legislature for the unemployment and local-tax points.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How we checked the formula.</strong> The Department publishes an Excel withholding calculator for employers. Every one of its 1,994 formulas uses the same ${N($(DED.single))} deduction and the same ${N(pct(TAUX))} rate, for pay periods of 1, 12, 24, 26, 52 and 365 a year, and we compared our engine with that formula for three filing statuses at ten annual salaries, and for four pay frequencies at five salaries for a single filer. The results agree to the cent. The formula sheet also prints two worked examples. The monthly one matches ours exactly: ${N($(3270))} a month is ${N($(39240))} a year, less ${N($(DED.single))} is ${N($(35880))}, and ${N(pct(TAUX))} of that is ${N($$(1255.80))}, or ${N($$(104.65))} a month. In the biweekly example, the sheet works out ${N($(39000))} minus ${N($(DED.single))} as ${N($(35640))}, then uses ${N($(35730))} in the next step, and it prints ${N("$47")} for a result of ${N("$47.98")}. We followed the formula, not those two printed figures.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department&rsquo;s method. Your actual Kentucky income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: city and county occupational license taxes, an exemption from withholding or an extra amount you ask your employer to withhold, a second job, bonuses, nonresidents, daily pay, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Kentucky take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  KY state tax column is Kentucky income tax withholding only; we found no Kentucky payroll program to add, and no local tax is included.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Kentucky take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">KY state tax</th>
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

    <h2>One rate, one deduction, no exemptions</h2>
    <p>There are no brackets to climb. The 2025 Form K-4 says Kentucky wage earners were taxed at a flat 4% with a ${N("$3,270")} standard deduction. For 2026, the Department of Revenue says the withholding rate is ${N(pct(TAUX))} and the standard deduction is ${N($(DED.single))}, an increase of ${N("$90")} after the yearly inflation adjustment under KRS 141.081. The same ${N($(DED.single))} applies to every employee: the formula has no filing status and no allowance count.
    For a single filer on ${N($(75000))}, the base is ${N($(75000))} &minus; ${N($(DED.single))} = ${N($(base75))}, and ${N($(base75))} &times; ${N(pct(TAUX))} = ${N($$(a75.etat))}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Kentucky standard deduction used for withholding, by filing status, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Filing status</th>
          <th scope="col">Deduction a year</th>
          <th scope="col">Withholding rate</th>
          <th scope="col">Personal exemption</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The Department adjusts the deduction every year, so the ${N($(DED.single))} figure is a 2026 number. The Department prints a single ${N($(DED.single))} amount with no filing-status split; the table repeats it for each status.</p>

    <h2>What the deduction does to your withholding</h2>
    <p>Nothing is withheld until your yearly pay passes ${N($(DED.single))}. After that, every extra dollar adds ${N((TAUX * 100).toFixed(1) + " cents")} of withholding, whether your pay is ${N($(40000))} or ${N($(250000))}. The table shows four salaries for a single filer.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Kentucky withholding at four salaries, single filer, 2026
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

    <h2>Kentucky hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Kentucky your hours also matter because of the deduction: part-time pay can fall entirely below it, and then no state tax is withheld at all.</p>

    <h3>What is $20 an hour after taxes in Kentucky?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Kentucky income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your effective hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Kentucky&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Kentucky?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, an effective hourly rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, an effective hourly rate of ${N($$(h30.netHoraire))}. Kentucky income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30. If your city or county taxes payroll, your real hourly rate may be lower.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. We found no separate withholding rate for them in the formula or booklet we read.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Kentucky take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Kentucky take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Kentucky</h2>

  <h3>Local occupational license taxes may apply, and this calculator leaves them out</h3>
  <p>Kentucky law lets cities and counties tax wages (KRS 92.281). A 2025 briefing to the Interim Joint Committee on Local Government counts ${N("170")} cities and ${N("87")} counties that tax gross earnings, and the Kentucky Secretary of State lists ${N("228")} local tax districts. These are separate lists, not the same count. The Legislative Research Commission, citing the Kentucky Association of Counties, says county rates run from ${N("0.50%")} to ${N("2.5%")}, with a median of ${N("1%")}, and that cities are not subject to a statutory rate limit. Where a city sits in a county of 30,000 people or more, KRS 68.197 gives a credit against the county fee for the city fee paid.</p>
  <p>We found no official table of the rate for a given address, and nothing we read says who collects the tax from a paycheck. So this calculator adds no local line, and we do not guess one. Just for scale, ${N("1%")} of ${N("$75,000")} is ${N($(unPourCent))} a year. If you work in a city or county that taxes payroll, your take-home pay may be lower than the figure shown. Your city or county tax office can tell you whether a local tax applies to you.</p>

  <h3>Kentucky withholds ${pct(TAUX)} as a flat rate, with one deduction for every filing status</h3>
  <p>The Department of Revenue says all Kentucky wage earners are taxed at a flat ${N(pct(TAUX))} with a standard deduction adjusted each year. A single filer, a married filer and a head of household all use ${N($(DED.single))}. Kentucky therefore withholds ${N($$(j75.etat))} on ${N("$75,000")} for all three, the same ${N($$(a75.etat))} as for a single filer. Their federal tax differs, so take-home pay does too: ${N($(j75.net))} for a married filer and ${N($(h75.net))} for a head of household, against ${N($(a75.net))} for a single filer.</p>

  <h3>Nothing is withheld on the first ${$(DED.single)} of pay</h3>
  <p>A worker earning ${N($(DED.single))} or less in a year has nothing withheld. At ${N($(30000))}, Kentucky withholds ${N($$(a30.etat))} a year. The deduction is worth ${N($$(valeurDeduction))} a year at ${N(pct(TAUX))}, and it is the same ${N($$(valeurDeduction))} whether you earn ${N($(30000))} or ${N($(250000))}.</p>

  <h3>We found no allowances or exemptions to claim</h3>
  <p>The Department&rsquo;s booklet says there are no personal exemptions. The withholding formula has no allowance count, no dependents and no subtraction for federal tax. Two employees with the same pay therefore have the same Kentucky withholding, whatever their family situation. The booklet says an employee may be exempt from withholding if the criteria on Form K-4 are met. We read the 2025 version of that form, not a 2026 one, so this page does not describe its boxes.</p>

  <h3>A second job can mean more tax withheld</h3>
  <p>The Department&rsquo;s formula sheet says that if you receive more than one W-2 in a year, you may need to have an extra ${N($$(DED.single * TAUX))} withheld. That is ${N($(DED.single))} &times; ${N(pct(TAUX))}, the value of the deduction, which each employer&rsquo;s calculation applies on its own. This calculator assumes one employer and does not add it.</p>

  <h3>Workers who live in a reciprocal state may be exempt</h3>
  <p>The Department&rsquo;s booklet says you may be exempt from Kentucky withholding if you work in Kentucky but live in Illinois, Indiana, Michigan, West Virginia or Wisconsin, in Virginia and commute daily, or in Ohio and are not a shareholder-employee who is a direct or indirect equity investor of 20% or more in an S corporation. This calculator assumes you live and work in Kentucky, so it does not apply the exemption.</p>

  <h3>Kentucky&rsquo;s unemployment tax is paid by employers</h3>
  <p>The Kentucky Office of Unemployment Insurance says employers pay for unemployment insurance through taxes on their payroll, and its 2026 employer guide gives a taxable wage base of ${N("$12,000")}. We found no deduction from employee wages for it. We also found no state disability insurance or paid family leave program run through payroll. That is a statement about what we read, not a guarantee that nothing exists, and your pay stub is the final word.</p>

  <h3>Your 401(k) lowers your Kentucky wages in this calculator</h3>
  <p>The booklet says wages mean what Section 3401 of the Internal Revenue Code defines, and it does not mention 401(k) contributions, so this is our modeling choice, the same as for federal tax and every other state on this site. On ${N("$75,000")} with 6% going in, Kentucky income tax withholding falls by ${N($$(gain401))} a year. If your contribution is a Roth, enter 0 in the 401(k) field.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Using last year&rsquo;s 4% and $3,270</h3>
  <p>Those are the figures printed on the 2025 Form K-4. Applying them to ${N("$75,000")} gives ${N($$(aQuatre))} instead of ${N($$(a75.etat))}, an overstatement of ${N($$(ecartQuatre))}. The 2026 rate is ${N(pct(TAUX))} and the deduction is ${N($(DED.single))}.</p>

  <h3>Forgetting the standard deduction</h3>
  <p>Applying ${N(pct(TAUX))} to the full ${N($(75000))} instead of ${N($(base75))} overstates Kentucky withholding by ${N($$(ecartSansDeduction))}: ${N($$(sansDeduction))} instead of ${N($$(a75.etat))}.</p>

  <h3>Looking for an allowance count or a bigger married deduction</h3>
  <p>We found none in the Department&rsquo;s formula or booklet. A married filer and a head of household use the same ${N($(DED.single))} as a single filer, and the booklet says there are no personal exemptions.</p>

  <h3>Ignoring the local occupational tax</h3>
  <p>A state-only figure is not the whole story if you work in a city or county that taxes payroll. The Kentucky tax shown here follows the Department of Revenue&rsquo;s withholding formula, but your take-home pay may be lower if a local tax applies to you.</p>

  <h3>Counting a second job as if it had its own deduction</h3>
  <p>The ${N($(DED.single))} deduction is only given once. If you have two employers, each one applies it in its own calculation, so too little may be withheld in total. The Department says you may need an extra ${N($$(DED.single * TAUX))} withheld if you receive more than one W-2.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and local taxes are not included. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Kentucky in 2026, with no retirement
  contribution and no local tax:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Kentucky base: ${N($(a75.brut))} &minus; ${N($(DED.single))} standard deduction = ${N($(base75))}</li>
    <li>Kentucky income tax withholding: ${N($(base75))} &times; ${N(pct(TAUX))} = ${N($$(a75.etat))}
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Kentucky borders seven states: Illinois, Indiana, Ohio, West Virginia, Virginia, Tennessee and Missouri. We have a calculator for the first three and for Virginia and Tennessee; West Virginia and Missouri are not published yet.
  Indiana is shown with the Marion County income tax included in its state-level deductions, and Kentucky without any local tax.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a Kentucky worker on the same salary, an <a href="/paycheck-calculator/illinois/">Illinois</a> worker ${plusMoins(il75)}, an <a href="/paycheck-calculator/indiana/">Indiana</a> worker ${plusMoins(in75)}, an <a href="/paycheck-calculator/ohio/">Ohio</a> worker ${plusMoins(oh75)}, a <a href="/paycheck-calculator/virginia/">Virginia</a> worker ${plusMoins(va75)}, and a <a href="/paycheck-calculator/tennessee/">Tennessee</a> worker ${plusMoins(tn75)}. Tennessee takes nothing from wages at the state level, as the Tennessee page explains. Ohio&rsquo;s figure leaves out city and school district income tax, which that calculator does not model. A worker who lives in one of those states and commutes into Kentucky is a different case that this calculator does not model: it assumes a Kentucky resident working in Kentucky.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/indiana/">Indiana paycheck calculator</a> &mdash; the neighbor to the north, which adds a county income tax and has a reciprocity agreement with Kentucky.</li>
    <li><a href="/paycheck-calculator/illinois/">Illinois paycheck calculator</a> &mdash; the neighbor to the west; Illinois residents who work in Kentucky are on the Department&rsquo;s reciprocal list.</li>
    <li><a href="/paycheck-calculator/ohio/">Ohio paycheck calculator</a> &mdash; the neighbor to the northeast, also on the reciprocal list.</li>
    <li><a href="/paycheck-calculator/virginia/">Virginia paycheck calculator</a> &mdash; the neighbor to the east; Virginia residents who commute daily are on the reciprocal list.</li>
    <li><a href="/paycheck-calculator/tennessee/">Tennessee paycheck calculator</a> &mdash; the neighbor to the south, which takes nothing from wages at state level.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Kentucky ranks on one salary.</li>
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
    Kentucky rates, and do not include local occupational license taxes.
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

/* 1. Recoupement independant : la formule du DOR ecrite ici A PARTIR DU TEXTE
   (retenue annuelle = (salaire - 3 360) x 3,5 %), pas du moteur. */
const imprime = s => Math.max(0, s - 3360) * 0.035;
const fed75 = 7670;                          // 58 900 imposables : 1 240 + 4 560 + 1 870
const fedJ = 4640;                           // 42 800 imposables : 2 480 + 2 160
const fedH = 5748;                           // 50 850 imposables : 1 770 + 3 978
if (Math.abs(imprime(75000) - a75.etat) > 0.006) echec("KY 75 000 $ : formule 42A003 " + imprime(75000) + ", moteur " + a75.etat);
if (Math.abs(imprime(75000) - j75.etat) > 0.006) echec("KY marie 75 000 $ : " + imprime(75000) + ", moteur " + j75.etat);
if (Math.abs(imprime(75000) - h75.etat) > 0.006) echec("KY chef de famille 75 000 $ : " + imprime(75000) + ", moteur " + h75.etat);
/* Exemple imprime par le DOR (mensuel 3 270 $) : 104,65 $. */
if (Math.abs(((3270 * 12 - 3360) * 0.035) / 12 - 104.65) > 0.005) echec("exemple mensuel du DOR (104,65 $) non retrouve");
if (Math.abs((39000 - 3360) - 35640) > 0) echec("exemple bimensuel : 39 000 - 3 360 != 35 640");
if (Math.abs(((39000 - 3360) * 0.035) / 26 - 47.98) > 0.005) echec("exemple bimensuel du DOR (47,98 $) non retrouve");
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 07/10/2026). */
const attendusProse = [
  [a75.etat, 2507.40, "etat 75 000"], [base75, 71640, "base 75 000"],
  [a75.net, 59085.10, "net 75 000"], [a75.total, 15914.90, "total 75 000"],
  [j75.etat, 2507.40, "etat marie"], [j75.net, 62115.10, "net marie"],
  [h75.etat, 2507.40, "etat chef de famille"], [h75.net, 61007.10, "net chef de famille"],
  [a30.etat, 932.40, "etat 30 000"],
  [h20.net, 34267.20, "net 20 $/h"], [h25.net, 42259.60, "net 25 $/h"], [h30.net, 50252.00, "net 30 $/h"],
  [h20.etat, 1338.40, "etat 20 $/h"], [h25.etat, 1702.40, "etat 25 $/h"], [h30.etat, 2066.40, "etat 30 $/h"],
  [sansDeduction, 2625, "sans deduction"], [ecartSansDeduction, 117.60, "ecart sans deduction"],
  [aQuatre, 2869.20, "a 4 % et 3 270 $"], [ecartQuatre, 361.80, "ecart 4 % / 3,5 %"],
  [gain401, 157.50, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [valeurDeduction, 117.60, "valeur de la deduction = supplement du 2e W-2"],
  [unPourCent, 750, "1 % de 75 000"],
  [a3360.etat, 0, "etat a 3 360 $"], [a3361.etat, 0.035, "etat a 3 361 $"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(DED.single === 3360 && DED.marriedJoint === 3360 && DED.headOfHousehold === 3360)) echec("deductions != 3 360 aux trois statuts");
if (!(IT.brackets.single.length === 1 && TAUX === 0.035 && IT.brackets.marriedJoint[0][1] === TAUX && IT.brackets.headOfHousehold[0][1] === TAUX)) echec("le taux n'est plus unique a 3,5 %");
if (IT.personalExemption !== undefined) echec("le Kentucky ne doit avoir aucune exemption dans le moteur");
if (!(progs(a75) === 0 && a75.programmes.length === 0 && a75.paidLeave === 0 && a75.waCares === 0)) echec("le Kentucky ne doit avoir aucun programme");
/* Les phrases de comparaison sont generees (plusMoins) ; on fige l'ordre observe pour qu'un changement de donnees alerte. */
const ordre = ["illinois", "indiana", "ohio", "virginia", "tennessee"].map(k => calcul(k, REF).net > a75.net ? "+" : "-").join("");
if (ordre !== "--+-+") echec("ordre de comparaison change : " + ordre + " (attendu --+-+ : IL -, IN -, OH +, VA -, TN +)");
console.log("comparaison des voisins (IL, IN, OH, VA, TN vs Kentucky) : " + ordre);
if (!(R.states.tennessee.incomeTax.hasIncomeTax === false)) echec("le Tennessee n'a plus le regime ecrit (rien retenu sur les salaires)");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements DOR (formule 42A003 ecrite a la main + exemples 104,65 $ et 47,98 $) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
