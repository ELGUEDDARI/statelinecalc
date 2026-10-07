/* Construit /paycheck-calculator/iowa/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Iowa est le 39e Etat publie. Aucun mecanisme nouveau au moteur : un taux unique
 * (brackets a une tranche) + standardDeduction par statut, comme la Louisiane, et un
 * credit par « allowance » retranche de l'impot apres calcul (withholdingAllowances,
 * comme l'Oregon, sans plafond de revenu). Ce qu'elle a de propre :
 *
 *   1. LA FORMULE EN QUATRE ETAPES : T1 = G - D ; T2 = T1 x 3,8 % ; T3 = T2 - W/P ;
 *      T4 = T3 + A. D annuel = 13 000 $ (« Other », y compris marie dont le conjoint a un
 *      revenu), 19 500 $ (chef de famille), 26 000 $ (marie dont le conjoint n'a aucun revenu,
 *      ou conjoint survivant). Le PDF precise que ce D « is not the same as the federal
 *      standard deduction amount » : la page le dit, la mauvaise habitude de prendre 16 100 $
 *      est une erreur courante chiffree.
 *   2. UN CREDIT DE 40 $ PAR ALLOWANCE (IA W-4 2026, ligne 1) : 40 $ pour soi, 80 $ chef de
 *      famille, + 40 $ pour un conjoint sans revenu. Le moteur suppose ces allowances
 *      personnelles seules ; les lignes 2 a 6 et la ligne 8 ne sont pas modelisees (dit).
 *   3. LES TABLES IMPRIMEES se recoupent avec la formule AU CENTIME, ECART ZERO, sur 31 328
 *      cellules (classeur Excel de l'agence : .tooling/test/verif-retenue-ia.js), a condition
 *      d'arrondir T2 au cent puis T3 au cent comme les exemples du PDF.
 *   4. LA SURTAXE DE DISTRICT SCOLAIRE n'est PAS dans la retenue : elle se calcule sur la
 *      declaration (« Multiply the amount on line 18 by the surtax rate ») et l'IA W-4 2026
 *      conseille de reduire les allowances ou de faire retenir un supplement. Source positive.
 *      La page ne chiffre pas de taux 2026 (liste 2025 seule lue) et ne dit pas « Iowa has no ».
 *   5. CHOMAGE : Code of Iowa 96.15(1), « No employer shall ... accept any deduction from wages
 *      to finance the employer's contributions » ; communique IWD du 30/06/2025 : « Iowa employers
 *      pay unemployment insurance taxes for each employee ». SDI / conge paye : « we found no »,
 *      JAMAIS « Iowa has no ».
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Iowa has no SDI » : negatif non prouvable ;
 *   - pas de base salariale chomage (20 400 $ annonce en 2025 : non reverifie sur une page 2026) ;
 *   - pas de taux de surtaxe 2026, pas de nom de district autre que dans la liste 2025 ;
 *   - pas de « Iowa a abandonne ses tranches » (source tierce seulement) ;
 *   - 401(k) : choix de modelisation dit sur la page (la formule ne parle que des versements
 *     de l'employeur) ;
 *   - lignes 2 a 6 et 8 de l'IA W-4, statut EXEMPT, conjoint avec revenu (colonne A), primes,
 *     non-residents, anciens IA W-4 (2023 et avant) : non modelises.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-iowa.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "iowa";
const NOM = "Iowa";
const URL = "https://statelinecalc.com/paycheck-calculator/iowa/";
const AUJOURD_HUI = "2026-10-07";
const LISIBLE = "October 7, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const IAS = R.states[CLE];
const IT = IAS.incomeTax;
const DED = IT.standardDeduction;                       // 13 000 / 26 000 / 19 500
const TAUX = IT.brackets.single[0][1];                  // 0,038
const ALL = IT.withholdingAllowances;                   // 40 $ x 1 / 2 / 2
const A1 = ALL.credit * ALL.perFiler.single;            // 40
const A2 = ALL.credit * ALL.perFiler.marriedJoint;      // 80
const AH = ALL.credit * ALL.perFiler.headOfHousehold;   // 80
const STD_FED = { single: 16100, headOfHousehold: 24150, marriedJoint: 32200 };   // IA W-4 2026, ligne 3(b)
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
const base75 = 75000 - DED.single;                       // 62 000
const impot75 = base75 * TAUX;                           // 2 356 avant l'allowance
const jBase = 75000 - DED.marriedJoint;                  // 49 000
const jImpot = jBase * TAUX;                             // 1 862
const hBase = 75000 - DED.headOfHousehold;               // 55 500
const hImpot = hBase * TAUX;                             // 2 109
/* Erreurs typiques. */
const sansDeduction = 75000 * TAUX - A1;                 // 2 810 : deduction oubliee, allowance gardee
const ecartSansDeduction = sansDeduction - a75.etat;     // 494
const aFed = (75000 - STD_FED.single) * TAUX - A1;       // 2 198,20 : 16 100 $ au lieu de 13 000 $
const ecartFed = a75.etat - aFed;                        // 117,80
const sansAllowance = impot75;                           // 2 356 : « $0 » a la ligne 1
const ecartConjoint = a75.etat - j75.etat;               // 534 : « conjoint sans revenu » alors que le conjoint travaille
const valeurDeduction = DED.single * TAUX;               // 494 par an, celibataire
const seuilS = DED.single + A1 / TAUX;                   // 14 052,63
const seuilM = DED.marriedJoint + A2 / TAUX;             // 28 105,26
const seuilH = DED.headOfHousehold + AH / TAUX;          // 21 605,26
const a14052 = calcul(CLE, 14052), a14053 = calcul(CLE, 14053);
const surtaxe10 = a75.etat * 0.10, surtaxe20 = a75.etat * 0.20;

/* Voisins : Minnesota, Wisconsin, Illinois, Nebraska, South Dakota (publies) ; le Missouri ne l'est pas. */
const REF = 75000;
const COMPARE = [CLE, "illinois", "minnesota", "wisconsin", "nebraska", "south-dakota"];
const NOMS = { [CLE]: "Iowa", illinois: "Illinois", minnesota: "Minnesota", wisconsin: "Wisconsin", nebraska: "Nebraska", "south-dakota": "South Dakota" };
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

/* Le tableau de la formule, par statut de l'IA W-4. */
const LIGNES_STATUT = [
  ["Other (single, married filing separately, or married with a spouse who also earns)", DED.single, A1],
  ["Head of household", DED.headOfHousehold, AH],
  ["Married filing jointly with a spouse who has no earned income, or qualified surviving spouse", DED.marriedJoint, A2]
].map(([lib, d, w]) => "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + $(d) + "</td><td class=\"num\">" + $(w) + "</td><td class=\"num\">" + pct(TAUX) + "</td></tr>").join("\n");

/* Le tableau des quatre salaires de reference : ce que la deduction et l'allowance font a la retenue. */
const REPERES = [13000, 30000, 75000, 250000];
const LIGNES_REPERES = REPERES.map(g => {
  const r = calcul(CLE, g);
  const base = Math.max(0, g - DED.single);
  return "        <tr><th scope=\"row\">" + $(g) + "</th><td class=\"num\">" + $$(base) + "</td><td class=\"num\">" + $$(base * TAUX) + "</td><td class=\"num\">" + $$(r.etat) + "</td><td class=\"num\">" + $$(r.etat / 12) + "</td></tr>";
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Iowa income tax withholding rate in 2026?",
   "Iowa&rsquo;s withholding formula uses one rate, " + N(pct(TAUX)) + ", for every filing status. Your employer subtracts a deduction from your yearly pay (" + $(DED.single) + " for most single filers, " + $(DED.headOfHousehold) + " for a head of household, " + $(DED.marriedJoint) + " for a married filer whose spouse has no earned income), withholds " + N(pct(TAUX)) + " of what is left, and then subtracts the allowance amount from your IA W-4. " +
   "On a single filer&rsquo;s " + $(75000) + " salary with a " + $(A1) + " allowance, Iowa withholds " + $$(a75.etat) + " a year."],

  ["How much Iowa tax is withheld on a $75,000 salary?",
   "For a single filer, Iowa withholds " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "The base is " + $(75000) + " minus the " + $(DED.single) + " deduction = " + $(base75) + ", " + $(base75) + " &times; " + pct(TAUX) + " = " + $$(impot75) + ", and " + $$(impot75) + " minus the " + $(A1) + " allowance = " + $$(a75.etat) + ". " +
   "A married filer whose spouse has no earned income has " + $$(j75.etat) + " withheld on the same salary, and a head of household has " + $$(h75.etat) + "."],

  ["What is take-home pay on a $75,000 salary in Iowa?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of Iowa income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%. We found no other state payroll deduction, so this calculator shows no other Iowa line."],

  ["How much is $20, $25 or $30 an hour after taxes in Iowa?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "Iowa income tax withholding, with no retirement contribution."],

  ["Is the Iowa withholding deduction the same as the federal standard deduction?",
   "No. The Iowa Department of Revenue says so in its formula: &ldquo;Note that the deduction amount in this calculation step is not the same as the federal standard deduction amount.&rdquo; " +
   "For a single filer the withholding deduction is " + $(DED.single) + ", while the federal standard deduction the IA W-4 instructions use is " + $(STD_FED.single) + ". " +
   "Using the federal figure on " + $(75000) + " would understate Iowa withholding by " + $$(ecartFed) + " a year: " + $$(aFed) + " instead of " + $$(a75.etat) + "."],

  ["What does the $40 allowance on the Iowa IA W-4 do?",
   "Each allowance is a dollar amount that comes off your tax after it is figured, not off your pay. The 2026 IA W-4 gives " + $(A1) + " for yourself, " + $(AH) + " if you are unmarried and eligible to file as head of household, and " + $(A1) + " more for a spouse who does not work or does not claim allowances on a separate W-4. " +
   "On " + $(75000) + ", a single filer who claims " + $(A1) + " has " + $$(a75.etat) + " withheld instead of " + $$(sansAllowance) + ". The form says that to have the highest amount of tax withheld you should claim &ldquo;$0&rdquo; on line 1."],

  ["Does Iowa withhold school district surtax from my paycheck?",
   "Not in the formula we read. The surtax is figured on your Iowa return: the return instructions we read say to &ldquo;multiply the amount on line 18 by the surtax rate,&rdquo; and the Department&rsquo;s 2025 list of school district rates runs from 0% to 20%. " +
   "The 2026 IA W-4 tells employees who live in a district with a surtax to consider reducing their allowances or asking for extra withholding. " +
   "This calculator does not add it, so if your district charges one, your final bill will be higher than the withholding shown here."],

  ["Does a 401(k) contribution lower my Iowa withholding?",
   "In this calculator, yes. The Department of Revenue&rsquo;s formula says only that certain payments made by the employer into employee retirement plans or for employee health insurance are not considered taxable wages, and it does not say how an employee&rsquo;s own contribution is treated, so treating it as lowering the wages Iowa taxes is our modeling choice, the same one we use for federal tax and in every other state here. " +
   "On " + $(75000) + " with 6% going into a 401(k), Iowa income tax withholding falls by " + $$(gain401) + " a year. Ask your payroll department how your employer treats it."],

  ["Why is my Iowa paycheck different from this calculator?",
   "Common reasons: your IA W-4 claims more allowances than the " + $(A1) + " we assume, or it says your spouse has earned income, which puts a married filer on the single deduction; you asked for an extra amount to be withheld; your employer uses the printed wage-bracket tables, which give one amount for each pay range, instead of the formula; " +
   "your own health insurance premiums and other pre-tax deductions are not modeled here; or part of your pay is a bonus. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."]
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
const reponse = "Iowa withholds a flat " + pct(TAUX) + " rate in 2026, after a " + $(DED.single) + " deduction for most single filers (" + $(DED.marriedJoint) + " for a married filer whose spouse does not earn) and a " + $(A1) + " allowance credit. " +
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
<title>Iowa (IA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Iowa (IA) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Iowa tax. Withholding rate 3.8%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Iowa (IA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Iowa withholds a flat ${pct(TAUX)} after a ${$(DED.single)} deduction and a ${$(A1)} allowance credit for a single filer. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Iowa Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Iowa take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Iowa income tax withheld under the Iowa Department of Revenue formula (a $13,000, $19,500 or $26,000 deduction, 3.8%, then a $40 or $80 allowance credit)."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Iowa", "item": "${URL}" }
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
    <li aria-current="page">Iowa</li>
  </ol>
</nav>

  <h1>Iowa Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Iowa take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and the Iowa
          withholding deduction: ${$(DED.single)} for single, ${$(DED.headOfHousehold)} for head of household, and ${$(DED.marriedJoint)} for
          married filing jointly when your spouse has no earned income.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Iowa income tax withholding too.</span>
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
    <p>Iowa&rsquo;s withholding formula has four steps, and the Iowa Department of Revenue publishes them with worked examples. Your employer takes a deduction off your pay, multiplies what is left by ${N(pct(TAUX))}, subtracts the allowance amount from your IA W-4 (spread over your pay periods), and adds any extra amount you asked for. This calculator does the same on a yearly basis, then shows the result for the period you choose.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Iowa income tax</strong>: your wages after any 401(k) contribution, minus the Iowa withholding deduction for your status (${N($(DED.single))} single, ${N($(DED.headOfHousehold))} head of household, ${N($(DED.marriedJoint))} married with a spouse who has no earned income),
      taxed at ${N(pct(TAUX))}, less the allowance credit (${N($(A1))} single, ${N($(A2))} married or head of household), never below zero.</li>
    </ul>
    <p>This calculator has no other Iowa line. We looked for any other state payroll deduction and found none.</p>

    <p>Rates come from the agencies that set them. For federal tax, that is the IRS (the brackets, the standard
    deduction and FICA), cross-checked against the Social Security Administration for the wage base. For
    Iowa, it is the <strong>Iowa Department of Revenue</strong>&rsquo;s 2026 withholding formula and tables (effective January 1, 2026), its 2026 IA W-4 and instructions, and its announcement of the 2026 rate, plus Iowa Workforce Development and the Code of Iowa for the unemployment point.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The Department also prints wage-bracket tables, as Excel workbooks, for daily, weekly, biweekly, semimonthly, monthly and annual pay. There is one table for each of the three IA W-4 filing choices, with a column for every ${N("$40")} step of allowances.
    We read every amount in all 18 tables (31,328 amounts) and recomputed each one with the formula at the midpoint of its pay range, rounding to the cent after the rate step and again after the allowance step, the way the Department&rsquo;s own worked examples do. We downloaded the tables on October 7, 2026, and every printed amount in that version matches to the cent.
    Because a table gives one amount for a whole range of pay, a pay stub that follows a table can differ from this calculator&rsquo;s result by a small amount for that reason alone.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer withholds from each check using the Department&rsquo;s method. Your actual Iowa income tax is figured
    on your return, so what you owe or get back when you file can differ. This is an estimate, not tax advice; check your IA W-4 with your employer or a tax professional.</p>

    <p>What the calculator deliberately leaves out: dependents and the other extra allowances on the IA W-4, such as those for age 65 or older, blindness or itemized deductions, extra withholding, an EXEMPT status, the school district surtax, bonuses, nonresidents, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Iowa take-home pay by salary</h2>
  <p class="prose">Single filer, one ${$(A1)} allowance, no retirement contribution, 2026 state and federal rates. The
  IA state tax column is Iowa income tax withholding; we found no Iowa payroll program to add.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Iowa take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">IA state tax</th>
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

    <h2>One rate, a deduction that depends on your IA W-4, and a $40 credit</h2>
    <p>There are no brackets to climb. The Iowa Department of Revenue announced in October 2025 that Iowa law provides for a flat tax rate of 3.8 percent, and that in 2026 all levels of taxable individual income will be subject to it. Withholding uses the same ${N(pct(TAUX))}. What changes from one employee to the next is the deduction (set by the filing status and the spouse question on the IA W-4) and the allowance amount.
    For a single filer on ${N($(75000))}, the base is ${N($(75000))} &minus; ${N($(DED.single))} = ${N($(base75))}, ${N($(base75))} &times; ${N(pct(TAUX))} = ${N($$(impot75))}, and ${N($$(impot75))} &minus; ${N($(A1))} = ${N($$(a75.etat))}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Iowa withholding deduction and allowance by IA W-4 filing choice, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">IA W-4 choice</th>
          <th scope="col">Deduction a year</th>
          <th scope="col">Personal allowance we assume</th>
          <th scope="col">Withholding rate</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The married column assumes a spouse with no earned income, so the allowance is ${N($(A1))} for you plus ${N($(A1))} for your spouse. The head-of-household allowance is ${N($(AH))} because the IA W-4 gives ${N($(AH))} instead of ${N($(A1))} to an unmarried filer who is eligible for that status. The IA W-4 has more lines, for dependents and other items, that we do not model.</p>

    <h2>What the deduction and the allowance do to your withholding</h2>
    <p>The allowance cancels the first few dollars of tax, so a single filer has nothing withheld until pay passes about ${N($(seuilS))} a year. The same point is about ${N($(seuilH))} for a head of household and ${N($(seuilM))} for a married filer whose spouse does not earn. After that, every extra dollar adds ${N((TAUX * 100).toFixed(1) + " cents")} of withholding, whether your pay is ${N($(40000))} or ${N($(250000))}. The table shows four salaries for a single filer.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Iowa withholding at four salaries, single filer, one $40 allowance, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Annual pay</th>
          <th scope="col">Base after the deduction</th>
          <th scope="col">Tax at 3.8%</th>
          <th scope="col">Withheld a year, after the $40</th>
          <th scope="col">Withheld a month</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_REPERES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Iowa hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Iowa your hours also matter because of the deduction: part-time pay can fall entirely below it, and then no state tax is withheld at all.</p>

    <h3>What is $20 an hour after taxes in Iowa?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Iowa income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your effective hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Iowa&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Iowa?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, an effective hourly rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, an effective hourly rate of ${N($$(h30.netHoraire))}. Iowa income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The Department&rsquo;s formula has no separate bonus step, so ask your employer how a bonus is withheld.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Iowa take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Iowa take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Iowa</h2>

  <h3>The withholding deduction is not the federal standard deduction</h3>
  <p>The Iowa Department of Revenue says so in writing: the deduction amount in the formula &ldquo;is not the same as the federal standard deduction amount.&rdquo; For a single filer it is ${N($(DED.single))}, while the federal standard deduction the IA W-4 instructions use is ${N($(STD_FED.single))} (${N($(STD_FED.headOfHousehold))} for a head of household and ${N($(STD_FED.marriedJoint))} for a married couple filing jointly). The deduction is worth ${N($$(valeurDeduction))} a year to a single filer at ${N(pct(TAUX))}, and twice that to a married filer whose spouse does not earn.</p>

  <h3>Nothing is withheld on the first part of a single filer&rsquo;s pay</h3>
  <p>A single filer with one ${N($(A1))} allowance has nothing withheld on pay up to about ${N($(seuilS))} a year. At ${N($(14052))} the allowance is larger than the tax, so Iowa withholds ${N($$(a14052.etat))}, and at ${N($(14053))} it withholds ${N($$(a14053.etat))}. At ${N($(30000))}, Iowa withholds ${N($$(a30.etat))} a year.</p>

  <h3>A spouse who earns changes the column</h3>
  <p>The IA W-4 asks married filers whether the spouse also has earned income. The Department&rsquo;s instructions say that if you select married filing jointly and answer yes, &ldquo;the withholding calculation will be completed as if you are using filing status single.&rdquo; So the ${N($(DED.marriedJoint))} deduction applies only when your spouse has no earned income. On ${N("$75,000")} that is ${N($$(j75.etat))} withheld for a married filer in this calculator, against ${N($$(a75.etat))} on the single deduction. Their federal tax differs too, so take-home pay is ${N($(j75.net))} for a married filer and ${N($(a75.net))} for a single filer.</p>

  <h3>Head of household has its own column</h3>
  <p>Iowa prints a separate head-of-household table: a ${N($(DED.headOfHousehold))} deduction and an ${N($(AH))} allowance. On ${N("$75,000")} Iowa withholds ${N($$(h75.etat))} for a head of household, and take-home pay is ${N($(h75.net))}.</p>

  <h3>The allowance is a credit, and claiming $0 means the most withholding</h3>
  <p>The allowances on the IA W-4 are dollar amounts that come off the tax after it is figured, not off your pay. The form gives ${N($(A1))} for yourself, ${N($(AH))} if you are unmarried and eligible to file as head of household, and ${N($(A1))} more for a spouse who does not work or does not claim allowances on a separate W-4. It also says that to have the highest amount of tax withheld, you should claim &ldquo;$0&rdquo; on line 1. On ${N("$75,000")} that would mean ${N($$(sansAllowance))} withheld instead of ${N($$(a75.etat))}.</p>

  <h3>School district surtax is not part of the standard withholding</h3>
  <p>Iowa school districts can charge a surtax, a percentage of your Iowa income tax. The return instructions we read say to &ldquo;multiply the amount on line 18 by the surtax rate,&rdquo; and that taxpayers without children, or without children in public school, are still subject to it. The Department&rsquo;s list for 2025 runs from 0% to 20% depending on the district, and the rates listed for six counties (Appanoose, Cass, Pocahontas, Sac, Shelby and Winnebago) already include a 1% emergency medical services surtax. We did not read a 2026 list.
  The 2026 IA W-4 tells employees who live in a district with a surtax to consider reducing their allowances or having extra tax withheld, and the withholding formula we read has no surtax step. As an illustration only, a district at 10% would add about ${N($$(surtaxe10))} on an Iowa tax of ${N($$(a75.etat))}, and one at 20% would add about ${N($$(surtaxe20))}. This calculator adds neither.</p>

  <h3>Your employer pays unemployment tax, not you</h3>
  <p>Iowa Workforce Development says Iowa employers pay unemployment insurance taxes for each employee, and the Code of Iowa (section 96.15) says no employer shall make or accept any deduction from wages to finance its own unemployment contributions. Because the employer pays it, it does not change your take-home pay, and this calculator uses no employer wage base. We also found no state disability insurance or paid family leave program run through payroll. That is a statement about what we read, not a guarantee that nothing else can come out of your pay.</p>

  <h3>Your 401(k) lowers your Iowa wages in this calculator</h3>
  <p>The formula says certain payments made by the employer into employee retirement plans or for employee health insurance are not considered taxable wages. It does not say how your own contribution is treated, so treating it as lowering your wages is our modeling choice, the same one we make for federal tax and every other state on this site. On ${N("$75,000")} with 6% going in, Iowa income tax withholding falls by ${N($$(gain401))} a year. If your contribution is a Roth, enter 0 in the 401(k) field.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Using the federal standard deduction instead of ${$(DED.single)}</h3>
  <p>The two are different numbers. Taking ${N($(STD_FED.single))} instead of ${N($(DED.single))} understates Iowa withholding by ${N($$(ecartFed))} on ${N("$75,000")}: ${N($$(aFed))} instead of ${N($$(a75.etat))}.</p>

  <h3>Forgetting the deduction</h3>
  <p>Applying ${N(pct(TAUX))} to the full ${N($(75000))} instead of ${N($(base75))} overstates Iowa withholding by ${N($$(ecartSansDeduction))}: ${N($$(sansDeduction))} instead of ${N($$(a75.etat))}.</p>

  <h3>Treating the allowance as a deduction from pay</h3>
  <p>A ${N($(A1))} allowance takes ${N($(A1))} off the tax, not ${N($(A1))} off your pay. Subtracting it from your pay first would change the tax by only ${N($$(A1 * TAUX))}.</p>

  <h3>Picking &ldquo;no earned income&rdquo; for a spouse who works</h3>
  <p>If your spouse works and you both pick the ${N($(DED.marriedJoint))} column, too little is withheld from each check. If you each earn ${N("$75,000")}, the gap is ${N($$(ecartConjoint))} a year for each of you, and you could owe it when you file. Answering yes to the spouse question puts you on the single deduction.</p>

  <h3>Expecting the surtax to be withheld automatically</h3>
  <p>It is figured on your return and is not a step in the withholding formula we read, so if you live in a district with a surtax, your final bill will be higher than the withholding on your pay stub suggests. You can ask your employer to withhold extra on your IA W-4.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances on your IA W-4 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Iowa in 2026, claiming one ${N($(A1))} allowance and making no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Iowa base: ${N($(a75.brut))} &minus; ${N($(DED.single))} deduction = ${N($(base75))}</li>
    <li>Iowa tax before the allowance: ${N($(base75))} &times; ${N(pct(TAUX))} = ${N($$(impot75))}</li>
    <li>Iowa income tax withholding: ${N($$(impot75))} &minus; ${N($(A1))} allowance = ${N($$(a75.etat))}
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Iowa borders six states: Minnesota, Wisconsin, Illinois, Nebraska, South Dakota and Missouri. We have a calculator for the first five; Missouri is not published yet.
  For Iowa, the state-level deductions are only the income tax withholding; the other states may add payroll programs.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with an Iowa worker on the same salary, ${phraseVoisins}. South Dakota&rsquo;s page documents that it levies no state tax on wages. A worker who lives in one of those states and commutes into Iowa is a different case that this calculator does not model: it assumes an Iowa resident working in Iowa.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/minnesota/">Minnesota paycheck calculator</a> &mdash; the neighbor to the north.</li>
    <li><a href="/paycheck-calculator/wisconsin/">Wisconsin paycheck calculator</a> &mdash; the neighbor to the northeast.</li>
    <li><a href="/paycheck-calculator/illinois/">Illinois paycheck calculator</a> &mdash; the neighbor to the east.</li>
    <li><a href="/paycheck-calculator/nebraska/">Nebraska paycheck calculator</a> &mdash; the neighbor to the west.</li>
    <li><a href="/paycheck-calculator/south-dakota/">South Dakota paycheck calculator</a> &mdash; the neighbor to the northwest; that page documents why it levies no state tax on wages.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Iowa ranks on one salary.</li>
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
    Iowa rates.
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

/* 1. Recoupement independant : la formule du PDF ecrite ici A PARTIR DU TEXTE
   (T1 = G - D ; T2 = T1 x 0,038 ; T3 = T2 - W/P ; P = 1 ; D = 13 000 / 19 500 / 26 000 ; W = 40 / 80 / 80),
   pas du moteur. */
const imprime = (s, d, w) => Math.max(0, Math.max(0, s - d) * 0.038 - w);
const fed75 = 7670;                          // 58 900 imposables : 1 240 + 4 560 + 1 870
const fedJ = 4640;                           // 42 800 imposables : 2 480 + 2 160
const fedH = 5748;                           // 50 850 imposables : 1 770 + 3 978
if (Math.abs(imprime(75000, 13000, 40) - a75.etat) > 0.006) echec("IA 75 000 $ : formule " + imprime(75000, 13000, 40) + ", moteur " + a75.etat);
if (Math.abs(imprime(75000, 26000, 80) - j75.etat) > 0.006) echec("IA marie 75 000 $ : formule " + imprime(75000, 26000, 80) + ", moteur " + j75.etat);
if (Math.abs(imprime(75000, 19500, 80) - h75.etat) > 0.006) echec("IA chef de famille 75 000 $ : formule " + imprime(75000, 19500, 80) + ", moteur " + h75.etat);
/* Exemples imprimes dans le PDF de la formule (biweekly 2 100 $ « Other » 40 $ -> 59,26 $ ; monthly 5 000 $ HoH 160 $ -> 114,92 $). */
const arr = x => Math.round(x * 100) / 100;
if (arr(arr((2100 - 500) * 0.038) - 40 / 26) !== 59.26) echec("exemple 1 du PDF de la formule (59,26 $) non retrouve");
if (arr(arr((5000 - 1625) * 0.038) - 160 / 12) !== 114.92) echec("exemple 6 du PDF de la formule (114,92 $) non retrouve");
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 07/10/2026). */
const attendusProse = [
  [a75.etat, 2316, "etat 75 000"], [base75, 62000, "base 75 000"], [impot75, 2356, "impot avant allowance 75 000"],
  [a75.net, 59276.5, "net 75 000"], [a75.total, 15723.5, "total 75 000"],
  [j75.etat, 1782, "etat marie"], [jBase, 49000, "base mariee"], [jImpot, 1862, "impot marie avant allowance"], [j75.net, 62840.5, "net marie"],
  [h75.etat, 2029, "etat chef de famille"], [hBase, 55500, "base chef de famille"], [hImpot, 2109, "impot chef de famille avant allowance"], [h75.net, 61485.5, "net chef de famille"],
  [a30.etat, 606, "etat 30 000"],
  [h20.net, 34558.8, "net 20 $/h"], [h25.net, 42520, "net 25 $/h"], [h30.net, 50481.2, "net 30 $/h"],
  [h20.etat, 1046.8, "etat 20 $/h"], [h25.etat, 1442, "etat 25 $/h"], [h30.etat, 1837.2, "etat 30 $/h"],
  [sansDeduction, 2810, "sans deduction"], [ecartSansDeduction, 494, "ecart sans deduction"],
  [aFed, 2198.2, "avec 16 100 $"], [ecartFed, 117.8, "ecart 16 100 $ / 13 000 $"],
  [sansAllowance, 2356, "sans allowance"], [ecartConjoint, 534, "ecart conjoint qui travaille"],
  [gain401, 171, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"], [a250.etat, 8966, "etat 250 000"],
  [valeurDeduction, 494, "valeur de la deduction, celibataire"],
  [seuilS, 14052.6316, "seuil celibataire"], [seuilM, 28105.2632, "seuil marie"], [seuilH, 21605.2632, "seuil chef de famille"],
  [a14052.etat, 0, "etat a 14 052 $"], [a14053.etat, 0.014, "etat a 14 053 $"],
  [surtaxe10, 231.6, "surtaxe 10 %"], [surtaxe20, 463.2, "surtaxe 20 %"], [A1 * TAUX, 1.52, "allowance retranchee du salaire"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(DED.single === 13000 && DED.marriedJoint === 26000 && DED.headOfHousehold === 19500)) echec("deductions != 13 000 / 26 000 / 19 500");
if (!(A1 === 40 && A2 === 80 && AH === 80)) echec("allowances != 40 / 80 / 80");
if (!(IT.brackets.single.length === 1 && TAUX === 0.038 && IT.brackets.marriedJoint[0][1] === TAUX && IT.brackets.headOfHousehold[0][1] === TAUX)) echec("le taux n'est plus unique a 3,8 %");
if (IT.personalExemption !== undefined) echec("l'Iowa ne doit avoir aucune exemption dans le moteur");
if (STD_FED.single !== 16100 || STD_FED.headOfHousehold !== 24150 || STD_FED.marriedJoint !== 32200) echec("deductions federales de l'IA W-4 != 16 100 / 24 150 / 32 200");
if (fedDed.single !== 16100) echec("la deduction federale du moteur n'est plus 16 100 $");
/* La phrase de comparaison est generee (plusMoins) ; on affiche l'ordre observe pour qu'un changement de donnees se voie. */
const ordre = COMPARE.slice(1).map(k => calcul(k, REF).net > a75.net ? "+" : "-").join("");
console.log("comparaison des voisins (" + COMPARE.slice(1).join(", ") + " vs Iowa) : " + ordre);
if (!(R.states["south-dakota"].incomeTax.hasIncomeTax === false)) echec("le South Dakota n'a plus le regime ecrit (pas d'impot sur les salaires)");
if (!(progs(a75) === 0 && a75.programmes.length === 0 && a75.paidLeave === 0 && a75.waCares === 0)) echec("l'Iowa ne doit avoir aucun programme");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements de la formule du PDF (ecrite a la main + exemples 59,26 $ et 114,92 $ du PDF) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
