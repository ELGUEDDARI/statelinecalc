/* Construit /paycheck-calculator/minnesota/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Minnesota est le 31e Etat publie. Ce qu'il a de propre :
 *
 *   1. LA RETENUE SE FAIT PAR « ALLOCATIONS », PAS PAR UNE DEDUCTION FIXE.
 *      Booklet 2026 du Department of Revenue (wh-inst-26.pdf), p. 34, formule
 *      informatique : salaire annuel - (allocations x 5 300 $), puis un
 *      « Chart for Step 5 » a quatre taux (5,35 / 6,80 / 7,85 / 9,85 %) avec
 *      une premiere tranche a 0 % (4 700 $ celibataire, 14 700 $ marie). Les
 *      allocations viennent du formulaire W-4MN, distinct du W-4 federal :
 *      celibataire = 2 (10 600 $), marie un seul emploi = 3, chef de famille = 3.
 *      Sur 75 000 $ : 75 000 - 10 600 = 64 400 ; 1 782,09 + 26 390 x 6,80 %.
 *   2. SANS W-4MN, ZERO ALLOCATION AU TAUX CELIBATAIRE (booklet p. 3) : +720,80 $
 *      de retenue par an sur 75 000 $.
 *   3. LE PAID LEAVE : 0,88 % au total, 0,44 % MAXIMUM retenable, sur les
 *      184 500 premiers dollars : Minn. Stat. 268B.14 subd. 4 = le plafond
 *      FICA OASDI. La page de l'agence arrondit a 185 000 $ ; on suit la LOI
 *      (defaut releve par le controle independant du 06/10).
 *   4. RECIPROCITE avec le Michigan et le Dakota du Nord (booklet p. 5), deux
 *      Etats deja publies ici.
 *   5. AUCUN NOUVEAU MECANISME DU MOTEUR : les tranches a 0 %, les
 *      « allocations » (exprimees comme standardDeduction) et le plafond
 *      propre a un programme existent deja.
 *   6. RECOUPEMENT PAR L'AGENCE : les tables imprimees du booklet (6 666
 *      valeurs lisibles) sont reproduites par la formule a moins d'un demi-dollar
 *      (script .tooling/test/verif-retenue-mn.js).
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * revenue.state.mn.us, mn.gov/deed et revisor.mn.gov repondent 200 (06/10).
 * pl.mn.gov refuse un navigateur headless (405) : lu dans l'instantane
 * Internet Archive du 31/07/2026. Dates et citations dans data/rates-2026.js
 * et .tooling/lib/sources.js (PAR_ETAT.minnesota).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Minnesota has no local income tax » : aucun document lu n'en
 *     decrit, ce qui n'est pas une preuve : « we found no » ;
 *   - pas de taux de la DECLARATION d'impot : seule la retenue est lue ;
 *   - pas de nombre d'allocations « recommande » au-dela de la feuille du W-4MN ;
 *   - pas de retenue de chomage salariee : le DEED dit « may not be withheld
 *     from employee wages » ;
 *   - pas d'accord de reciprocite avec le Wisconsin (non lu) ;
 *   - 401(k) : le booklet n'en parle pas ; la regle vient de la definition
 *     legale des « wages » (IRC 3401) : dit sur la page comme un choix de
 *     modelisation.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js,
 * hors les constantes « Add » imprimees du Chart, qui servent de garde-fou.
 * Lancer : node .tooling/ops/build-minnesota.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "minnesota";
const NOM = "Minnesota";
const URL = "https://statelinecalc.com/paycheck-calculator/minnesota/";
const AUJOURD_HUI = "2026-10-06";
const LISIBLE = "October 6, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const MN = R.states[CLE];
const B1 = MN.incomeTax.brackets.single;                  // [[4700,0],[38010,.0535],...]
const B2 = MN.incomeTax.brackets.marriedJoint;            // [[14700,0],[63400,.0535],...]
const ALLOC = 5300;                                        // booklet p. 34, etape 3
const DED = MN.incomeTax.standardDeduction;                // 10 600 / 15 900 / 15 900
const NB_ALLOC = { single: DED.single / ALLOC, marriedJoint: DED.marriedJoint / ALLOC, headOfHousehold: DED.headOfHousehold / ALLOC };
const PL = MN.employeePrograms[0];                         // 0,44 %, 184 500 $
const PL_TOTAL = 0.0088, PL_FAMILLE = 0.0027, PL_MEDICAL = 0.0061, PL_PETIT = 0.0066;
const fedDed = R.federal.standardDeduction;
const SUPPL = 0.0625;                                      // booklet p. 7

/* Les constantes « Add » IMPRIMEES dans le Chart (booklet p. 34), servent de
   garde-fou : le moteur calcule sans arrondi, l'ecart doit rester < 0,006 $. */
const ADD_S = [0, 1782.09, 6958.25, 14315.27];
const ADD_M = [0, 2605.45, 12450.49, 23789.82];

const a75 = calcul(CLE, 75000);
const a60 = calcul(CLE, 60000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const pl250 = a250.programmes[0].montant;

const sansW4 = progressiveTax(75000, B1);                  // zero allocation, table celibataire
const surcout = sansW4 - a75.etat;
const naif = 75000 * B1[2][1];                             // « 6,8 % du salaire »
const debutHaut1 = B1[3][0] + DED.single;                  // 218 450 : le 9,85 % commence ici (celibataire)
const debutHaut2 = B2[3][0] + DED.marriedJoint;            // 368 530
const base250 = 250000 - DED.single;                       // 239 400
const partieHaute250 = base250 - B1[3][0];                 // 31 550

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct1 = t => (t * 100).toFixed(1) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

/* Voisins : Wisconsin et Dakota du Nord (frontaliers publies), Michigan
   (reciprocite avec le Minnesota, booklet p. 4). */
const REF = 75000;
const COMPARE = [CLE, "wisconsin", "iowa", "north-dakota", "michigan"];
const NOMS = { [CLE]: "Minnesota", wisconsin: "Wisconsin", iowa: "Iowa", "north-dakota": "North Dakota", michigan: "Michigan" };
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const wi75 = calcul("wisconsin", REF), ia75 = calcul("iowa", REF), nd75 = calcul("north-dakota", REF), mi75 = calcul("michigan", REF);

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Les deux Charts imprimes : lignes lues dans les bandes du moteur, constantes
   « Add » imprimees. */
function lignesChart(bandes, add) {
  const rows = [];
  let bas = 0;
  bandes.forEach(([haut, taux], i) => {
    const libelle = i === 0
      ? "$0 &ndash; " + $(haut)
      : (haut === Infinity ? $(bas) + " and over" : $(bas) + " &ndash; " + $(haut));
    const base = i === 0 ? 0 : add[i - 1];
    rows.push("        <tr><th scope=\"row\">" + libelle + "</th><td class=\"num\">" + $$(base) +
              "</td><td class=\"num\">" + (taux * 100).toFixed(2) + "%</td></tr>");
    bas = haut;
  });
  return rows.join("\n");
}
const chartSingle = lignesChart(B1, ADD_S);
const chartMarried = lignesChart(B2, ADD_M);

/* Le tableau des allocations : la valeur d'une allocation est 5 300 $. */
const ligneAlloc = (n, note) =>
  "        <tr><th scope=\"row\">" + n + "</th><td class=\"num\">" + $(ALLOC * n) + "</td><td>" + note + "</td></tr>";
const tableAllocations = [
  ligneAlloc(0, "No Form W-4MN on file; the employer withholds at the single rate"),
  ligneAlloc(1, "Step A only, for example a single filer with a second job"),
  ligneAlloc(2, "Steps A and B: a single filer with one job, the case this calculator uses"),
  ligneAlloc(3, "Steps A, B and C for a married employee with one job and a spouse who does not work, or steps A, B and E for a head of household &mdash; the cases this calculator uses"),
  ligneAlloc(4, "Three allowances plus one dependent (step D)"),
  ligneAlloc(5, "Three allowances plus two dependents")
].join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Minnesota income tax withholding rate in 2026?",
   "There is no single rate. The Department of Revenue&rsquo;s 2026 withholding formula uses four: " + N("5.35%") + ", " + N("6.80%") + ", " + N("7.85%") +
   " and " + N("9.85%") + ". They apply to your annual wages after the employer subtracts " + $(ALLOC) + " for each allowance on your Form W-4MN, and nothing is withheld " +
   "on the first " + $(B1[0][0]) + " that is left for a single employee or the first " + $(B2[0][0]) + " for a married one. " +
   "On a single filer&rsquo;s " + $(75000) + " salary with two allowances, withholding is " + $$(a75.etat) + " a year, or " + pct1(a75.etat / 75000) + " of pay."],

  ["How much Minnesota tax is withheld on a $75,000 salary?",
   "For a single filer with two allowances, " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "That is $75,000 minus " + $(DED.single) + " of allowances, or " + $(75000 - DED.single) + ", run through the single chart: " +
   $$(ADD_S[1]) + " plus 6.80% of the " + $(75000 - DED.single - B1[1][0]) + " above " + $(B1[1][0]) + ". A married couple using the three allowances this calculator assumes has " +
   $$(j75.etat) + " withheld, and a head of household has " + $$(h75.etat) + "."],

  ["What is take-home pay on a $75,000 salary in Minnesota?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " +
   $$(a75.etat) + " of Minnesota income tax withholding and " + $$(progs(a75)) + " for Minnesota Paid Leave &mdash; " +
   "an effective rate of " + (a75.taux * 100).toFixed(1) + "%."],

  ["How much is $20, $25 or $30 an hour after taxes in Minnesota?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) +
   " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) + " an hour. " +
   "$30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures with two " +
   "allowances, after federal tax, FICA, Minnesota withholding and the paid leave premium, with no retirement contribution."],

  ["What Minnesota payroll deductions are there besides income tax?",
   "We model one: the Minnesota Paid Leave premium. For 2026 the program&rsquo;s rate is " + N(pct(PL_TOTAL)) + " of wages, split " + N(pct(PL_MEDICAL)) +
   " for medical leave and " + N(pct(PL_FAMILLE)) + " for family leave, and the state says employers can collect up to " + N(pct(PL.rate)) +
   " of wages from employees. It applies to wages up to " + $(PL.wageCap) + ". On " + $(75000) + " that is " + $$(progs(a75)) +
   " a year, and at most " + $$(PL.wageCap * PL.rate) + " at any salary. &ldquo;Up to&rdquo; matters: employers may choose to cover more of the premium, so your pay stub may show less. " +
   "The Department of Employment and Economic Development says state unemployment insurance tax &ldquo;may not be withheld from employee wages,&rdquo; so there is no unemployment deduction."],

  ["Does a 401(k) contribution lower my Minnesota withholding?",
   "In this calculator, yes. Minnesota law defines &ldquo;wages&rdquo; for withholding as the same term used in section 3401 of the Internal Revenue Code, " +
   "and the federal tax on this page already treats a traditional 401(k) contribution as reducing taxable pay. The withholding booklet itself does not discuss employee 401(k) contributions, " +
   "so we apply the same treatment to Minnesota as a modeling choice, and we can't confirm how a given employer handles it. On $75,000 with 6% going into a 401(k), Minnesota withholding falls by " +
   $$(gain401) + " a year. Social Security, Medicare and the paid leave premium are still calculated on your gross pay."],

  ["How many allowances should I claim on Form W-4MN?",
   "The form has a worksheet. Step A gives you one allowance if nobody else can claim you as a dependent. Step B adds one if you are single with one job, " +
   "if you are married with one job and a spouse who does not work, or if the wages from a second job or your spouse&rsquo;s job are $1,500 or less. Step C adds one if you are married, " +
   "unless you have a working spouse or more than one job, in which case it adds none. Step D adds one for each dependent you will claim and step E adds one for head of household. " +
   "This calculator assumes two for a single filer and three for a married couple or a head of household, with no dependents. The form says that if you expect to owe more than will be withheld, " +
   "you can claim fewer allowances or ask for extra withholding."],

  ["What happens if I never fill out Form W-4MN?",
   "The booklet says that if an employee does not complete a Form W-4MN, the employer must withhold as if you were single, with zero allowances. On " + $(75000) +
   " that is " + $$(sansW4) + " a year instead of " + $$(a75.etat) + ", or " + $$(surcout) + " more. A federal Form W-4 does not replace it: the booklet says the federal form does not compute " +
   "the allowances Minnesota uses, and every employee who completes a W-4 must also complete a W-4MN."],

  ["Do Minnesota cities or counties tax paychecks?",
   "The withholding booklet, Form W-4MN and the withholding statute we read describe one state income tax withholding system and no local one. We found no Minnesota local income tax " +
   "in those documents, but we have not checked every city and county, so look for a local line on your pay stub. This calculator includes none."],

  ["I live in Michigan or North Dakota and work in Minnesota. Is Minnesota tax withheld?",
   "Often not. The Department of Revenue says Minnesota has income tax reciprocity agreements with Michigan and North Dakota, and that an employer is not required to withhold Minnesota income tax " +
   "if the employee is a resident of one of those states, works in Minnesota and gives the employer a properly completed Form MWR each year. The booklet adds that the employer may withhold " +
   "as a courtesy to the employee. This calculator does not model the exemption: it assumes a Minnesota employee."],

  ["How are bonuses withheld in Minnesota?",
   "The booklet says supplemental payments made separately from regular wages, such as bonuses, commissions and overtime, are withheld at a flat " + N(pct(SUPPL)) +
   " no matter how many allowances you claim. If a bonus comes with a regular paycheck and is listed separately, the employer may either add it to the regular wages and use the tables, or " +
   "withhold " + pct(SUPPL) + " on the bonus alone. The calculator does not model bonuses."],

  ["Why is my Minnesota paycheck different from this calculator?",
   "The usual reasons: you claimed a different number of allowances on Form W-4MN, or never filed the form, which means zero; an extra amount per paycheck is being withheld; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; your employer covers part of the paid leave premium; " +
   "or your employer uses the booklet&rsquo;s printed tables, which round to the whole dollar, rather than the formula. Bonuses are not modeled either."]
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
const reponse = "Minnesota withholds 5.35% to 9.85% in 2026, after the employer subtracts " + $(ALLOC) +
  " for each allowance on your Form W-4MN. It also takes up to 0.44% for paid leave. On $75,000, a single filer with two allowances keeps about " +
  $(a75.net) + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Minnesota (MN) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Minnesota (MN) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA, state withholding and Minnesota Paid Leave.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Minnesota (MN) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Minnesota withholds 5.35% to 9.85% in 2026 after W-4MN allowances, plus up to 0.44% for paid leave. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Minnesota Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Minnesota take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Minnesota income tax withheld by the Department of Revenue's computer formula (allowances of ${$(ALLOC)} each, then rates of 5.35% to 9.85%), and the Minnesota Paid Leave premium."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Minnesota", "item": "${URL}" }
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
    <li aria-current="page">Minnesota</li>
  </ol>
</nav>

  <h1>Minnesota Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your Minnesota take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and the Minnesota
          allowances: two (${$(DED.single)}) for single, three (${$(DED.marriedJoint)}) for married or head of household.
          Married filers use the married chart.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Minnesota withholding too.</span>
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
    <p>Minnesota does not withhold a flat percentage, and it does not use the federal standard deduction. Each employee fills out Form W-4MN, the
    state&rsquo;s own withholding certificate, which turns your situation into a number of <strong>allowances</strong>. The Department of Revenue&rsquo;s
    withholding formula then tells the employer to take your wages for the year, subtract ${N($(ALLOC))} for every allowance, and run what is left through a chart of four rates:
    ${N("5.35%")}, ${N("6.80%")}, ${N("7.85%")} and ${N("9.85%")}. Nothing is withheld on the first ${N($(B1[0][0]))} that remains for a single
    employee, or the first ${N($(B2[0][0]))} for a married one. The booklet says that every employee who completes a federal Form W-4 must also complete a W-4MN,
    because the federal form does not compute Minnesota&rsquo;s allowances.
    </p>

    <p>The calculator applies five deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Minnesota income tax withholding</strong>: your wages after any 401(k) contribution, minus
      ${N($(DED.single))} for a single filer (two allowances) or ${N($(DED.marriedJoint))} for a married couple or head of household (three), run through the
      single chart or, for married filers, the married chart.</li>
      <li><strong>Minnesota Paid Leave</strong> at ${N(pct(PL.rate))} of the first ${N($(PL.wageCap))} of wages.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Minnesota, the <strong>Department of Revenue</strong>&rsquo;s 2026 withholding booklet and Form W-4MN, the state&rsquo;s <strong>Paid Leave</strong> program,
    the Department of Employment and Economic Development, and the withholding statute. Minnesota Paid Leave&rsquo;s own site refuses automated requests, so we
    read it from a dated snapshot in the Internet Archive; the snapshot and its date are linked in the sources
    below. Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>We checked the formula against the department&rsquo;s own tables.</strong> The booklet also prints withholding tables, with a column for every number of allowances from 0 to 10.
    On ${LISIBLE} we rebuilt the single and married tables for weekly, every-two-weeks, twice-a-month and monthly pay with the formula described above. Of the 6,666 values we could read cleanly
    out of the document, every one matched the printed whole-dollar figure; none was off by as much as half a dollar. A few rows whose layout our PDF reader scrambled were left out.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the department&rsquo;s formula. Your Minnesota income tax itself is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately does not do: it does not let you enter a number of allowances other than the
    one it assumes, it does not count dependents or itemized deductions, it does not add an extra amount per paycheck, it does not offer the form&rsquo;s
    option to have tax withheld at the higher single rate while married, and it does not model multiple jobs, bonuses and other supplemental wages, the Michigan and North Dakota
    reciprocity exemption, or health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Minnesota take-home pay by salary</h2>
  <p class="prose">Single filer with two allowances, no retirement contribution, 2026 state and federal rates. The
  MN state tax + programs column adds Minnesota income tax withholding to the Minnesota Paid Leave premium.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Minnesota take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">MN state tax + programs</th>
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

    <h2>The Minnesota withholding charts and allowances</h2>
    <p>The department&rsquo;s formula has two charts, one for single employees and one for married employees. Take annual wages, subtract ${N($(ALLOC))} for each allowance, then find the result in the
    chart. The base amount below is what the chart adds before the rate is applied to the part above the bracket&rsquo;s starting point. For a single filer on
    ${N($(75000))}, that is ${N($(75000))} &minus; ${N($(DED.single))} = ${N($(75000 - DED.single))}, which falls in the 6.80% bracket: ${N($$(ADD_S[1]))} plus 6.80% of
    ${N($(75000 - DED.single - B1[1][0]))}, or ${N($$(a75.etat))}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Minnesota withholding chart, single employee, annual wages after allowances
      </caption>
      <thead>
        <tr>
          <th scope="col">Wages after allowances</th>
          <th scope="col">Base amount</th>
          <th scope="col">Rate on the excess</th>
        </tr>
      </thead>
      <tbody>
${chartSingle}
      </tbody>
    </table>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Minnesota withholding chart, married employee, annual wages after allowances
      </caption>
      <thead>
        <tr>
          <th scope="col">Wages after allowances</th>
          <th scope="col">Base amount</th>
          <th scope="col">Rate on the excess</th>
        </tr>
      </thead>
      <tbody>
${chartMarried}
      </tbody>
    </table>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        What each Form W-4MN allowance count subtracts from annual wages
      </caption>
      <thead>
        <tr>
          <th scope="col">Allowances</th>
          <th scope="col">Subtracted from annual wages</th>
          <th scope="col">What it can mean</th>
        </tr>
      </thead>
      <tbody>
${tableAllocations}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Minnesota hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in Minnesota?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Minnesota withholding and the paid leave premium, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Minnesota&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding plus ${N($$(progs(h20)))} of paid leave premium for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Minnesota?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Minnesota income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses.
    The department&rsquo;s booklet says supplemental payments made separately from regular wages, including overtime, commissions and bonuses, are withheld at a flat ${N(pct(SUPPL))}
    regardless of allowances, so a bonus can be withheld at a different rate than your regular pay.
    If you work variable hours, enter the average you expect for the year.</p>

    <h3>Minnesota take-home pay by hourly rate</h3>
    <p>Single filer with two allowances, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Minnesota take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Minnesota</h2>

  <h3>Allowances, not a standard deduction</h3>
  <p>Minnesota subtracts ${N($(ALLOC))} for each allowance on your Form W-4MN, and it does not look at the federal standard deduction of ${N($(fedDed.single))}. A single filer with one job
  has two allowances, which come to ${N($(DED.single))}. On ${N("$75,000")} that leaves ${N($(75000 - DED.single))} to run through the chart. If no Form W-4MN is on file, the booklet says the number
  of allowances is zero and the employer withholds at the single rate, so the full ${N("$75,000")} goes into the chart.</p>

  <h3>The top rate starts higher than you might think</h3>
  <p>The ${N("9.85%")} bracket begins above ${N($(B1[3][0]))} of wages after allowances for a single employee, which is ${N($(debutHaut1))} of gross pay with two allowances. For a married employee it begins above
  ${N($(B2[3][0]))}, or ${N($(debutHaut2))} of gross pay with three. On ${N("$250,000")} a single filer has ${N($(base250))} left after allowances, and only the ${N($(partieHaute250))} above ${N($(B1[3][0]))} is taxed at
  ${N("9.85%")}; the withholding is ${N($$(a250.etat))}, about ${N((a250.etat / 250000 * 100).toFixed(1) + "%")} of pay.</p>

  <h3>The married chart is not the single chart doubled</h3>
  <p>A married employee&rsquo;s first bracket starts at ${N($(B2[0][0]))}, not ${N($(2 * B1[0][0]))}, and the 5.35% bracket ends at ${N($(B2[1][0]))}, not ${N($(2 * B1[1][0]))}. Combined with three allowances instead of two,
  a married filer on ${N("$75,000")} has ${N($$(j75.etat))} withheld, against ${N($$(a75.etat))} for a single filer. The single chart is used for a head of household, who gets a third allowance on step E,
  so the withholding is ${N($$(h75.etat))}.</p>

  <h3>Minnesota Paid Leave comes out of your pay, up to 0.44%</h3>
  <p>The state&rsquo;s 2026 premium rate is ${N(pct(PL_TOTAL))} of wages: ${N(pct(PL_MEDICAL))} for medical leave and ${N(pct(PL_FAMILLE))} for family leave. Employers can collect up to ${N(pct(PL.rate))} of wages from
  employees to cover their portion, and can choose to cover more, so what you actually pay can be lower. Employers that qualify as small pay a reduced premium rate of ${N(pct(PL_PETIT))}, and the state says the maximum
  contribution from employees in that case is the same as at a large employer. Minnesota law sets the maximum wages subject to premium at the maximum earnings subject to the Social Security tax, which is ${N($(PL.wageCap))} in 2026. (The program&rsquo;s own web page rounds that to $185,000; we follow the statute.) On ${N("$75,000")} the premium is ${N($$(progs(a75)))}; at ${N("$250,000")} the cap holds it to ${N($$(pl250))}.</p>

  <h3>Unemployment insurance is an employer cost</h3>
  <p>The Department of Employment and Economic Development says employers pay the state unemployment insurance tax, and that it &ldquo;may not be withheld from employee wages.&rdquo; The calculator takes no unemployment deduction.</p>

  <h3>Your 401(k) lowers your Minnesota wages</h3>
  <p>Minnesota&rsquo;s withholding statute defines &ldquo;wages&rdquo; as the same term used in section 3401 of the Internal Revenue Code, and the federal tax on this page already treats a traditional 401(k) contribution as reducing taxable pay. The withholding booklet does not discuss
  employee 401(k) contributions, so we apply the same treatment to Minnesota; it is a modeling choice, not a rule the booklet spells out. On ${N("$75,000")} with 6% going in, Minnesota withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Changes in federal law did not affect this formula</h3>
  <p>The booklet says the definitions used in Minnesota withholding are based on the Internal Revenue Code as amended through May 1, 2023, and that Minnesota has not adopted the withholding changes in the 2025 federal tax law (H.R. 1).
  The formula above never looks at your federal standard deduction anyway. Federal income tax on this page is calculated separately, with the 2026 federal figures.</p>

  <h3>Living in Michigan or North Dakota changes the answer</h3>
  <p>The Department of Revenue says Minnesota has income tax reciprocity agreements with <a href="/paycheck-calculator/michigan/">Michigan</a> and <a href="/paycheck-calculator/north-dakota/">North Dakota</a>. An employer is not required to withhold Minnesota income tax from an employee who lives in one of those
  states, works in Minnesota and hands over a properly completed Form MWR every year. This calculator assumes a Minnesota employee and does not model the exemption.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in all.</p>

  <h2>Common mistakes</h2>

  <h3>Leaving Form W-4MN blank</h3>
  <p>Without a Form W-4MN, the employer withholds as if you were single with no allowances. On ${N("$75,000")} that is ${N($$(sansW4))} instead of ${N($$(a75.etat))}, which is ${N($$(surcout))} more than a single
  filer with two allowances would have withheld.</p>

  <h3>Assuming your federal W-4 covers Minnesota</h3>
  <p>It does not. The booklet says federal Form W-4 does not compute the allowances Minnesota uses and that every employee who completes a W-4 must complete a W-4MN as well.</p>

  <h3>Multiplying your pay by 6.8%</h3>
  <p>The chart&rsquo;s rate on a ${N("$75,000")} salary is 6.80%, but it applies only to the part above ${N($(B1[1][0]))} after allowances, with a base of ${N($$(ADD_S[1]))} below that. The withholding is ${N($$(a75.etat))}, not ${N($$(naif))}.</p>

  <h3>Assuming the 9.85% rate reaches an ordinary salary</h3>
  <p>For a single filer it starts above ${N($(debutHaut1))} of gross pay with two allowances. A ${N("$75,000")} salary is nowhere near it.</p>

  <h3>Forgetting the paid leave premium</h3>
  <p>On ${N("$75,000")}, Minnesota Paid Leave can take up to ${N($$(progs(a75)))} a year from your pay, on top of income tax. A
  calculator that shows only income tax, Social Security and Medicare will show a figure that is too high.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, your employer may cover part of the paid leave premium, and the allowances on your Form W-4MN may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Minnesota in 2026, claiming two allowances, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Minnesota allowances: 2 &times; ${N($(ALLOC))} = ${N($(DED.single))}</li>
    <li>Wages after allowances: ${N($(a75.brut))} &minus; ${N($(DED.single))} = ${N($(a75.brut - DED.single))}</li>
    <li>Minnesota withholding: ${N($$(ADD_S[1]))} + 6.80% &times; (${N($(a75.brut - DED.single))} &minus; ${N($(B1[1][0]))}) = ${N($$(a75.etat))}
    a year, which is ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
    <li>Minnesota Paid Leave: ${N($(a75.brut))} &times; 0.44% = ${N($$(a75.programmes[0].montant))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Minnesota borders Wisconsin, Iowa, South Dakota and North Dakota, and we publish all four; the table compares Wisconsin, Iowa and North Dakota, and South Dakota has its own page.
  Michigan is included because it has an income tax reciprocity agreement with Minnesota. Minnesota is shown with two allowances.</p>
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
  <p>A <a href="/paycheck-calculator/wisconsin/">Wisconsin</a> worker keeps ${N($$(Math.abs(wi75.net - a75.net)))} ${wi75.net < a75.net ? "less" : "more"} than a Minnesota worker on the
  same salary, an <a href="/paycheck-calculator/iowa/">Iowa</a> worker keeps ${N($$(Math.abs(ia75.net - a75.net)))} ${ia75.net < a75.net ? "less" : "more"}, a <a href="/paycheck-calculator/north-dakota/">North Dakota</a> worker keeps ${N($$(Math.abs(nd75.net - a75.net)))} ${nd75.net < a75.net ? "less" : "more"}, and a
  <a href="/paycheck-calculator/michigan/">Michigan</a> worker keeps ${N($$(Math.abs(mi75.net - a75.net)))} ${mi75.net < a75.net ? "less" : "more"}.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/wisconsin/">Wisconsin paycheck calculator</a> &mdash; the neighbor to the east, with a standard
    deduction that slides down as you earn more.</li>
    <li><a href="/paycheck-calculator/iowa/">Iowa paycheck calculator</a> &mdash; the neighbor to the south, with a flat 3.8% withheld after a deduction and a $40 allowance credit.</li>
    <li><a href="/paycheck-calculator/north-dakota/">North Dakota paycheck calculator</a> &mdash; the neighbor to the west, with one of the lowest
    state income tax bills on this site and a reciprocity agreement with Minnesota.</li>
    <li><a href="/paycheck-calculator/michigan/">Michigan paycheck calculator</a> &mdash; the other state with a reciprocity agreement with Minnesota.</li>
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
    Minnesota rates.
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

/* ── Garde-fous ──────────────────────────────────────────────────────────── */
/* 1. Recoupement independant : la formule du booklet p. 34, ecrite ici A PARTIR
   DU TEXTE (colonnes « Subtract / Multiply / Add » imprimees), pas du moteur. */
function chart(table, x) {            // x = resultat de l'etape 4
  const T = table === "s"
    ? [[4700, 38010, 4700, .0535, 0], [38010, 114130, 38010, .068, 1782.09], [114130, 207850, 114130, .0785, 6958.25], [207850, Infinity, 207850, .0985, 14315.27]]
    : [[14700, 63400, 14700, .0535, 0], [63400, 208180, 63400, .068, 2605.45], [208180, 352630, 208180, .0785, 12450.49], [352630, Infinity, 352630, .0985, 23789.82]];
  for (const [lo, hi, sub, taux, add] of T) if (x > lo && x <= hi) return (x - sub) * taux + add;
  return 0;
}
function formule(brut, nbAlloc, table) {
  const x = brut - nbAlloc * 5300;    // etapes 2 a 4
  return x <= 0 ? 0 : chart(table, x);
}
const verifs = [["single", a75, 75000, 2, "s"], ["marriedJoint", j75, 75000, 3, "m"], ["headOfHousehold", h75, 75000, 3, "s"],
                ["single", a250, 250000, 2, "s"], ["single", a60, 60000, 2, "s"], ["single", h20, 20 * HEURES, 2, "s"],
                ["single", h25, 25 * HEURES, 2, "s"], ["single", h30, 30 * HEURES, 2, "s"],
                ["single", calcul(CLE, 15300), 15300, 2, "s"], ["single", calcul(CLE, 120000), 120000, 2, "s"],
                ["marriedJoint", calcul(CLE, 500000, "marriedJoint"), 500000, 3, "m"]];
for (const [statut, r, brut, n, t] of verifs) {
  const attendu = formule(brut, n, t);
  if (Math.abs(attendu - r.etat) > 0.006) {
    console.error("ARRET : %s a %d $ : booklet %s, moteur %s", statut, brut, attendu.toFixed(3), r.etat.toFixed(3));
    process.exit(2);
  }
}
/* 2. Les constantes « Add » imprimees == cumul des tranches du moteur. */
[[B1, ADD_S], [B2, ADD_M]].forEach(([B, add]) => {
  for (let i = 1; i <= 3; i++) {
    if (Math.abs(progressiveTax(B[i][0], B) - add[i]) > 0.006) {
      console.error("ARRET : constante « Add » %s != cumul moteur %s a %d", add[i], progressiveTax(B[i][0], B).toFixed(4), B[i][0]);
      process.exit(2);
    }
  }
});
/* 3. L'arithmetique ecrite dans la prose (verifiee a la main le 06/10/2026). */
const attendusProse = [
  [a75.etat, 3576.605, "etat 75 000"], [j75.etat, 2375.40, "marie"], [h75.etat, 3216.205, "chef de famille"],
  [sansW4, 4297.41, "sans W-4MN"], [surcout, 720.80, "surcout"], [naif, 5100, "6,8 % x 75 000"],
  [gain401, 306.00, "gain 401(k)"], [progs(a75), 330, "paid leave 75 000"], [pl250, 811.80, "paid leave 250 000"],
  [a250.etat, 17422.94, "etat 250 000"], [debutHaut1, 218450, "9,85 % celibataire"], [debutHaut2, 368530, "9,85 % marie"],
  [base250, 239400, "base 250 000"], [partieHaute250, 31550, "partie haute 250 000"],
  [75000 - DED.single - B1[1][0], 26390, "exces 75 000"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) { console.error("ARRET : arithmetique de la prose, %s : %s != %s", nom, obtenu, attendu); process.exit(2); }
}
if (!(ALLOC === 5300 && NB_ALLOC.single === 2 && NB_ALLOC.marriedJoint === 3 && NB_ALLOC.headOfHousehold === 3)) {
  console.error("ARRET : allocations (5 300 $ x 2 / 3 / 3) != moteur"); process.exit(2);
}
if (!(B1[0][0] === 4700 && B2[0][0] === 14700 && B1[1][0] === 38010 && B1[3][0] === 207850 && B2[1][0] === 63400 && B2[3][0] === 352630 &&
      B1[0][1] === 0 && B1[1][1] === 0.0535 && B1[2][1] === 0.068 && B1[3][1] === 0.0785 && B1[4][1] === 0.0985)) {
  console.error("ARRET : les seuils / taux ecrits dans la prose ne sont plus ceux du moteur"); process.exit(2);
}
if (!(2 * B1[0][0] === 9400 && 2 * B1[1][0] === 76020 && B2[0][0] !== 9400 && B2[1][0] !== 76020)) {
  console.error("ARRET : « le tableau marie n'est pas le double » est faux"); process.exit(2);
}
if (!(PL.rate === 0.0044 && PL.wageCap === 184500 && PL.wageCap === R.fica.socialSecurity.wageBase && Math.abs(PL_FAMILLE + PL_MEDICAL - PL_TOTAL) < 1e-12 &&
      Math.abs(PL_TOTAL / 2 - PL.rate) < 1e-12)) {
  console.error("ARRET : paid leave (0,27 + 0,61 = 0,88 ; 0,44 ; plafond 184 500 = FICA) != moteur"); process.exit(2);
}
if (!(wi75.net !== a75.net && nd75.net > a75.net && R.states["north-dakota"].incomeTax.hasIncomeTax && R.states.wisconsin.incomeTax.hasIncomeTax && R.states.michigan.incomeTax.hasIncomeTax)) {
  console.error("ARRET : la comparaison (WI, ND, MI) n'est plus celle ecrite"); process.exit(2);
}
/* Le 401(k) ne change ni la FICA ni le paid leave (calcules sur le brut). */
if (!(Math.abs(progs(r401) - progs(a75)) < 1e-9)) { console.error("ARRET : le paid leave depend du 401(k)"); process.exit(2); }
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) {
  console.error("ARRET : la reponse directe fait %d mots (40-60 attendus)", nbMotsReponse);
  process.exit(2);
}
if (mots < 1500) { console.error("ARRET : %d mots, sous le plancher de 1 500", mots); process.exit(2); }
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupements booklet MN p. 34 (single, married, HoH a 75 000 $ ; 250 000, 60 000, 15 300, 120 000, 500 000 $ et 20/25/30 $/h) : OK ; reponse directe %d mots", nbMotsReponse);
