/* Construit /paycheck-calculator/oregon/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Oregon est le 33e Etat publie. Ce qu'il a de propre :
 *
 *   1. LA RETENUE RETRANCHE L'IMPOT FEDERAL RETENU. Oregon Withholding Tax
 *      Formulas 2026 (150-206-436), p. 5-7 : « BASE = wages - federal tax
 *      withheld (not to exceed $8,750) - standard deduction ». Plafond de 8 750 $,
 *      qui s'efface par paliers de 1 750 $ de 125 000 a 145 000 $ de salaire
 *      (celibataire), de 250 000 a 290 000 $ (maries). Premier Etat du site ou la
 *      base de l'Etat depend de l'impot federal : nouveau mecanisme du moteur
 *      (federalTaxSubtraction), dans paie.js ET calc-paycheck.js.
 *   2. LES « ALLOWANCES » SONT DES CREDITS DE 263 $, retranches de l'impot APRES
 *      le calcul, et le calcul n'en tient plus aucun compte au-dela de 100 000 $
 *      (celibataire) ou 200 000 $ (maries) : un dollar de salaire de plus a
 *      100 000 $ coute 263,09 $ d'impot d'Etat (withholdingAllowances).
 *   3. TROIS PETITES RETENUES, dont une PAR HEURE : transit d'Etat 0,1 %, Paid
 *      Leave Oregon 0,6 % jusqu'a 184 500 $, Workers' Benefit Fund 0,9 cent par
 *      heure (18,72 $ pour 2 080 h ; perHour). Aucune retenue chomage lue.
 *   4. LES TAXES LOCALES SONT CLASSEES, pas ignorees : TriMet et Lane sont des
 *      taxes de l'EMPLOYEUR ; Metro (logement) et Multnomah (Preschool for All)
 *      ne sont retenues d'office qu'au-dela de 200 000 $, ou sur demande.
 *   5. LE LIVRET SE CONTREDIT : sa formule « moins de 50 000 $ » ajoute 263 $ que
 *      ses TABLES IMPRIMEES et sa formule « 50 000 $ et plus » n'ajoutent pas ; son
 *      texte dit 8 500 $ de plafond (valeur 2025) et ses formules 8 750 $ (2026).
 *      La page le dit, et dit ce qui a ete choisi. Recoupement :
 *      .tooling/test/verif-retenue-or.js.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * oregon.gov, paidleave.oregon.gov, wcd.oregon.gov, portland.gov, multco.us,
 * trimet.org : HTTP 200 le 06/10/2026. Dates et citations : data/rates-2026.js
 * (bloc OREGON) et .tooling/lib/sources.js (PAR_ETAT.oregon). Le site de
 * l'assemblee (ORS 656.506) ne repond pas : le texte de la loi est lu sur
 * oregon.public.law, non lie.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Oregon has no unemployment deduction » : la page de taux de
 *     l'Employment Department n'en decrit aucune, ce qui n'est pas une preuve :
 *     « we found no » ;
 *   - pas de taux Metro : seule la regle de retenue (200 000 $ / sur demande) a
 *     ete lue sur une page de l'administration, pas le taux ;
 *   - pas de « reciprocite » : aucune lue ;
 *   - transit : le champ « wages » de la loi (ORS 316.162) n'est pas lu ; le calcul
 *     porte sur le brut, dit sur la page comme un choix ;
 *   - pas d'avis sur l'issue de la hausse du transit : le DOR dit « continue to
 *     withhold at ... .001 », l'Employment Department parle d'un vote en novembre.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-oregon.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, impotTable, plafondImpotFederal } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "oregon";
const NOM = "Oregon";
const URL = "https://statelinecalc.com/paycheck-calculator/oregon/";
const AUJOURD_HUI = "2026-10-06";
const LISIBLE = "October 6, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const OR = R.states[CLE];
const IT = OR.incomeTax;
const DED = IT.standardDeduction;                           // 2 910 / 5 820 / 2 910
const CRED = IT.withholdingAllowances.credit;               // 263
const LIM_S = IT.withholdingAllowances.noneAbove.single;    // 100 000
const LIM_M = IT.withholdingAllowances.noneAbove.marriedJoint; // 200 000
const CAP = IT.federalTaxSubtraction.capByWages.single[0][1];  // 8 750
const TAB_S = IT.bracketTable.single, TAB_M = IT.bracketTable.marriedJoint;
const [TRANSIT, PL, WBF] = OR.employeePrograms;
const WBF_AN = WBF.perHour * HEURES;                        // 18,72
const fedDed = R.federal.standardDeduction;
const SEUIL_PL = PL.wageCap;                                // 184 500
const PL_MAX = PL.rate * PL.wageCap;                        // 1 107

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const prog = (r, re) => r.programmes.find(p => re.test(p.label)).montant;

const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a100 = calcul(CLE, 100000);
const a100p = calcul(CLE, 100001);
const a124 = calcul(CLE, 124999);
const a125 = calcul(CLE, 125000);
const a145 = calcul(CLE, 145000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const a25k = calcul(CLE, 25000);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const sub75 = Math.min(a75.federal, plafondImpotFederal(R.states[CLE], "single", 75000));
const base75 = 75000 - sub75 - DED.single;
const avantCredit75 = impotTable(TAB_S, base75);
const sansSub = impotTable(TAB_S, 75000 - DED.single) - CRED;     // l'erreur : oublier l'impot federal
const ecartSansSub = sansSub - a75.etat;
const jSub = Math.min(j75.federal, plafondImpotFederal(R.states[CLE], "marriedJoint", 75000));
const jBase = 75000 - jSub - DED.marriedJoint;
const jAvantCredit = impotTable(TAB_M, jBase);
const falaise = a100p.etat - a100.etat;                            // 263,09
const marche125 = a125.etat - a124.etat;                           // 153,21

/* Le salaire a partir duquel l'impot federal depasse le plafond de 8 750 $. */
function salairePlafond(statut, seuil = CAP) {
  let w = 50000;
  while (calcul(CLE, w, statut).federal < seuil) w += 10;
  return w;
}
const PLAFOND_ATTEINT_S = salairePlafond("single");
const PLAFOND_8500_S = Math.round(salairePlafond("single", 8500) / 100) * 100;   // ~78 800 : la ou le texte du livret (2025) et ses formules (2026) divergent         // ~79 910
const PLAFOND_ATTEINT_M = salairePlafond("marriedJoint");   // ~109 250

/* Voisins : Washington, Idaho, Nevada (frontaliers publies). */
const REF = 75000;
const COMPARE = [CLE, "washington", "idaho", "nevada"];
const NOMS = { [CLE]: "Oregon", washington: "Washington", idaho: "Idaho", nevada: "Nevada" };
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const wa75 = calcul("washington", REF), id75 = calcul("idaho", REF), nv75 = calcul("nevada", REF);

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des quatre taux : seuils lus dans bracketTable. */
const SEUILS = [0, 1, 2, 3].map(i => {
  const libS = i === 0 ? "$0 &ndash; " + $(TAB_S[0].upTo)
    : TAB_S[i].upTo === null ? "Over " + $(TAB_S[i].from) : $(TAB_S[i].from) + " &ndash; " + $(TAB_S[i].upTo);
  const libM = i === 0 ? "$0 &ndash; " + $(TAB_M[0].upTo)
    : TAB_M[i].upTo === null ? "Over " + $(TAB_M[i].from) : $(TAB_M[i].from) + " &ndash; " + $(TAB_M[i].upTo);
  return "        <tr><th scope=\"row\">" + pct(TAB_S[i].rate) + "</th><td class=\"num\">" + libS +
         "</td><td class=\"num\">" + libM + "</td></tr>";
}).join("\n");

/* Le tableau des plafonds de l'impot federal retranche, lu dans federalTaxSubtraction. */
const CAPS = IT.federalTaxSubtraction.capByWages;
const bornes = (t, i) => ({ de: i === 0 ? null : t[i - 1][0], a: t[i][0], cap: t[i][1] });
const lignesCaps = CAPS.single.map((_, i) => {
  const s = bornes(CAPS.single, i), m = bornes(CAPS.marriedJoint, i);
  const lib = b => b.de === null ? "Under " + $(b.a)
    : b.a === Infinity ? $(b.de) + " or more" : $(b.de) + " to " + $(b.a - 1);
  return "        <tr><th scope=\"row\">" + lib(s) + "</th><td class=\"num\">" + $(s.cap) + "</td><td class=\"num\">" +
         lib(m) + "</td><td class=\"num\">" + $(m.cap) + "</td></tr>";
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Oregon income tax withholding rate in 2026?",
   "Oregon has four rates, " + N(pct(TAB_S[0].rate)) + ", " + N(pct(TAB_S[1].rate)) + ", " + N(pct(TAB_S[2].rate)) + " and " + N(pct(TAB_S[3].rate)) +
   ", and the one you reach depends on a base that is smaller than your pay. Your employer subtracts the federal income tax withheld from your check (up to " + $(CAP) +
   ") and a " + $(DED.single) + " standard deduction ($" + c0(DED.marriedJoint) + " if married), applies the rates to what is left, then takes off " + $(CRED) +
   " for each allowance on Form OR-W-4. On a single filer&rsquo;s " + $(75000) + " salary Oregon withholds " + $$(a75.etat) + " a year."],

  ["How much Oregon tax is withheld on a $75,000 salary?",
   "For a single filer with one allowance, Oregon withholds " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "The base is " + $(75000) + " minus " + $$(sub75) + " of federal tax minus " + $(DED.single) + " = " + $(base75) + ". The rates on that base come to " + $$(avantCredit75) +
   ", and one " + $(CRED) + " allowance brings it down to " + $$(a75.etat) + ". A married filer with two allowances has " + $$(j75.etat) + " withheld."],

  ["What is take-home pay on a $75,000 salary in Oregon?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " + $$(a75.etat) + " of Oregon income tax and " +
   $$(progs(a75)) + " of Oregon payroll deductions (the statewide transit tax, Paid Leave Oregon and the Workers&rsquo; Benefit Fund) &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%."],

  ["How much is $20, $25 or $30 an hour after taxes in Oregon?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures with one allowance, after federal tax, FICA, " +
   "Oregon income tax withholding, and the three Oregon payroll deductions, with no retirement contribution."],

  ["Why does Oregon subtract my federal income tax?",
   "Oregon&rsquo;s tax law works that way, and the withholding formula copies it. On the Oregon return, the federal income tax you owe is a subtraction from your income, up to a yearly limit. " +
   "So the Department of Revenue tells employers to take the federal tax withheld from your pay, up to " + $(CAP) + ", off your wages before applying Oregon&rsquo;s rates. " +
   "Federal withholding is " + $$(a75.federal) + " on " + $(75000) + ", which is under the limit, so all of it is subtracted. Federal tax here does not include Social Security or Medicare."],

  ["What happens to the federal tax subtraction when I earn more?",
   "It stops growing and then disappears. For a single filer the limit is " + $(CAP) + ", and a single filer&rsquo;s federal withholding reaches it at about " + $(PLAFOND_ATTEINT_S) + " of wages. " +
   "Starting at " + $(125000) + " of wages, the limit steps down by $1,750 for every $5,000 until it is zero at " + $(145000) + ". Married filers start at " + $(250000) + " and reach zero at " + $(290000) + ", in steps of $10,000 instead of $5,000" +
   ". The dollar that takes pay from " + $(124999) + " to " + $(125000) + " raises the state withholding by " + $$(marche125) + ", because the limit drops by $1,750 at the same moment."],

  ["How many allowances should I claim on Form OR-W-4?",
   "The Department of Revenue&rsquo;s worksheet gives you one for yourself if no one else can claim you as a dependent, one for a spouse if you plan to file a joint return, and one for each dependent you will claim. " +
   "This calculator assumes one for a single filer or head of household and two for a married filer whose spouse does not work, with no dependents. Each allowance cuts your Oregon tax by " + $(CRED) +
   " a year. Above " + $(LIM_S) + " of wages for a single filer, or " + $(LIM_M) + " for a married one, the formula ignores your allowances completely. (The form&rsquo;s own worksheet draws the line at $8,300 a month, about $99,600 a year, or $16,600 a month if married.) " +
   "If you have two jobs or other income, the form&rsquo;s worksheets and Oregon&rsquo;s online withholding calculator are more accurate than this page."],

  ["Do I pay Portland or Multnomah County income tax out of my paycheck?",
   "Probably not at this pay level. The Metro supportive housing tax and Multnomah County&rsquo;s Preschool for All tax are personal income taxes on high incomes. Employers withhold them automatically only for employees earning more than $200,000 a year, " +
   "or for employees who ask. Multnomah County&rsquo;s tax is 1.5% on income over $125,000 for a single filer and 3% in total above $250,000. The TriMet and Lane County transit taxes are paid by employers, not taken from your pay. " +
   "This calculator does not model any of them."],

  ["What other deductions come out of an Oregon paycheck?",
   "We found three besides income tax, and the calculator includes all three. The statewide transit tax takes " + N(pct(TRANSIT.rate)) + " of your wages, " + $$(prog(a75, /transit/)) + " on " + $(75000) + ". " +
   "Paid Leave Oregon takes " + N(pct(PL.rate)) + " of wages up to " + $(SEUIL_PL) + ", " + $$(prog(a75, /Paid Leave/)) + " on " + $(75000) + " and no more than " + $$(PL_MAX) + " in a year. " +
   "The Workers&rsquo; Benefit Fund takes 0.9 cent for each hour you work, which is " + $$(WBF_AN) + " for a full-time year of 2,080 hours. We found no deduction for unemployment insurance on the Employment Department&rsquo;s rate page, which lists employer rates only."],

  ["Does a 401(k) contribution lower my Oregon withholding?",
   "Yes. The Department of Revenue says retirement plan contributions are not part of the wages used in the formula, and the calculator treats a traditional 401(k) contribution the same way for federal tax. " +
   "On " + $(75000) + " with 6% going into a 401(k), Oregon income tax withholding falls by " + $$(gain401) + " a year, even though the lower federal tax also shrinks the subtraction. " +
   "The payroll deductions are calculated on your full pay here, which is a modeling choice for the transit tax."],

  ["How are bonuses withheld in Oregon?",
   "The Department of Revenue says employers may use a flat 8% rate on supplemental wages, including bonuses, overtime pay and commissions, when they are paid at a different time from your regular pay. " +
   "On a $5,000 bonus that is $400 of Oregon withholding. The calculator does not model bonuses. The same 8% is what an employer must withhold if you never give it a Form OR-W-4 or an earlier W-4 it can use."],

  ["Why is my Oregon paycheck different from this calculator?",
   "Common reasons include: you claimed a different number of allowances on Form OR-W-4, for dependents or a spouse; you asked for an extra amount to be withheld; your employer follows the printed tables instead of the formula; " +
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
const reponse = "Oregon withholds 4.75% to 9.9% in 2026 on your pay after subtracting the federal income tax withheld (up to $8,750) and a $2,910 standard deduction, then takes off $263 per allowance. " +
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
<title>Oregon (OR) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Oregon (OR) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA, Oregon income tax with the federal tax subtraction, transit tax and Paid Leave Oregon.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Oregon (OR) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Oregon subtracts your federal income tax from your wages before taxing them at 4.75% to 9.9%. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Oregon Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Oregon take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Oregon income tax withheld by the Department of Revenue formula (federal tax subtraction, 4.75% to 9.9% rates, ${$(CRED)} credit per allowance), the statewide transit tax, Paid Leave Oregon and the Workers' Benefit Fund."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Oregon", "item": "${URL}" }
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
    <li aria-current="page">Oregon</li>
  </ol>
</nav>

  <h1>Oregon Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Oregon take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and the Oregon
          withholding table and allowances: one for single or head of household, two for a married
          filer whose spouse does not work.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Oregon income tax withholding too.</span>
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
    <p>Oregon does not tax your whole paycheck at a flat percentage, and it does not start from the federal standard deduction. The Department of Revenue&rsquo;s withholding formula tells the employer to figure a base: your wages for the year, minus the federal income tax withheld from them
    (up to ${N($(CAP))}), minus a ${N($(DED.single))} standard deduction (${N($(DED.marriedJoint))} for a married filer). Oregon&rsquo;s four rates are applied to that base, and then ${N($(CRED))} is taken off for each allowance claimed on Form OR-W-4, the state&rsquo;s own withholding certificate.
    Employers divide the yearly amount by the number of pay periods.</p>

    <p>The calculator applies these deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Oregon income tax</strong>: your wages after any 401(k) contribution, minus the federal tax above (up to ${N($(CAP))}) and the Oregon standard deduction,
      taxed at ${N(pct(TAB_S[0].rate))} to ${N(pct(TAB_S[3].rate))}, minus ${N($(CRED))} per allowance.</li>
      <li><strong>Oregon payroll deductions</strong>: the statewide transit tax at ${N(pct(TRANSIT.rate))}, Paid Leave Oregon at ${N(pct(PL.rate))} up to ${N($(SEUIL_PL))} of wages, and the Workers&rsquo; Benefit Fund at ${N("0.9 cent")} per hour worked.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Oregon, the <strong>Department of Revenue</strong>&rsquo;s 2026 Oregon Withholding Tax Formulas, Withholding Tax Tables and Form OR-W-4 instructions, the Employment Department and Paid Leave Oregon, the Department of Consumer and Business Services, and the local governments that run the Portland-area taxes.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Where Oregon&rsquo;s own booklet disagrees with itself.</strong> Below ${N($(50000))} of yearly wages, the formulas booklet prints a formula that adds ${N($(CRED))} to the tax. The booklet&rsquo;s own printed wage-bracket tables do not add it, and neither does its formula for wages of ${N($(50000))} and up.
    We follow the tables and the higher-pay formula, which agree with each other: for pay under about ${N($(50000))} a year, the Oregon formula we use reproduces every single-filer cell we compared in the printed tables to within a dollar a month when it is given the same federal withholding the tables assume. The tables appear to assume an older federal W-4, so this calculator can differ from them by a few dollars a month. If your employer uses the formula as printed for lower pay, it will withhold up to ${N($(CRED))} a year more than this page shows.
    The booklet also mentions an ${N("$8,500")} limit on the federal tax subtraction in its text, which was the 2025 limit; its 2026 formulas say ${N($(CAP))}, and so do we. The difference only matters above about ${N($(PLAFOND_8500_S))} of pay.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department of Revenue&rsquo;s method. Your actual Oregon income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: a different number of allowances than the
    one it assumes, dependents, multiple jobs, additional withholding, the 8% rate used when no form is on file, bonuses and other one-time payments, local income taxes, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Oregon take-home pay by salary</h2>
  <p class="prose">Single filer with one allowance, no retirement contribution, 2026 state and federal rates. The
  OR state tax + programs column adds Oregon income tax withholding to the statewide transit tax, Paid Leave Oregon and the Workers&rsquo; Benefit Fund (at 2,080 hours).</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Oregon take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">OR state tax + programs</th>
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

    <h2>Oregon&rsquo;s four rates and the base they apply to</h2>
    <p>These are the rates and thresholds in the Department of Revenue&rsquo;s 2026 withholding formulas. They apply to the base described above, not to your pay. For a single filer on ${N($(75000))}, that base is ${N($(75000))} &minus; ${N($$(sub75))} of federal tax &minus; ${N($(DED.single))} = ${N($(base75))},
    which lands in the ${N(pct(TAB_S[2].rate))} band.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Oregon withholding rates by size of the base, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Single or head of household</th>
          <th scope="col">Married</th>
        </tr>
      </thead>
      <tbody>
${SEUILS}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>How much federal tax Oregon lets you subtract</h2>
    <p>The limit depends on your wages, not on the tax itself. It is ${N($(CAP))} for most workers, then falls in five steps for high earners: one step for every ${N("$5,000")} of wages for single filers and every ${N("$10,000")} for married filers. These are the 2026 figures from the withholding formulas.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Most federal income tax Oregon subtracts, by yearly wages, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Single or head of household: wages</th>
          <th scope="col">Limit</th>
          <th scope="col">Married: wages</th>
          <th scope="col">Limit</th>
        </tr>
      </thead>
      <tbody>
${lignesCaps}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Oregon hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. One Oregon deduction depends on hours rather than pay: the Workers&rsquo; Benefit Fund. We figure it for a full-time year of 2,080 hours, which comes to ${N($$(WBF_AN))}, so the calculator shows that amount even if you enter fewer hours. At 20 hours a week the real amount would be about half.</p>

    <h3>What is $20 an hour after taxes in Oregon?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Oregon income tax withholding and Oregon&rsquo;s three payroll deductions, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Oregon&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding plus ${N($$(progs(h20)))} of payroll deductions for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Oregon?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Oregon income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses.
    The Department of Revenue says employers may withhold a flat 8% on bonuses, overtime and commissions paid at a different time from your regular pay.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Oregon take-home pay by hourly rate</h3>
    <p>Single filer with one allowance, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Oregon take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Oregon</h2>

  <h3>Your federal income tax lowers your Oregon wages</h3>
  <p>This is the feature that makes Oregon different. Employers subtract the federal income tax withheld from your pay, up to ${N($(CAP))}, before applying Oregon&rsquo;s rates. A single filer on ${N("$75,000")} has ${N($$(sub75))} of federal withholding, so the Oregon base is ${N($(base75))} rather than ${N($(75000 - DED.single))}.
  Federal tax does not include Social Security or Medicare. A single filer&rsquo;s federal withholding hits the ${N($(CAP))} limit at about ${N($(PLAFOND_ATTEINT_S))} of wages, and a married filer&rsquo;s at about ${N($(PLAFOND_ATTEINT_M))}; above that the subtraction stays at the limit until the limit itself starts to fall at higher pay.</p>

  <h3>The subtraction disappears for high earners</h3>
  <p>For a single filer the limit starts falling at ${N($(125000))} of wages and is zero at ${N($(145000))}. For married filers it runs from ${N($(250000))} to ${N($(290000))}. The drop is abrupt: the dollar that takes pay from ${N($(124999))} to ${N($(125000))} raises Oregon withholding by ${N($$(marche125))}, because the limit falls by $1,750 at that exact point.
  A single filer on ${N($(145000))} gets no subtraction at all and has ${N($$(a145.etat))} withheld by Oregon.</p>

  <h3>A standard deduction of ${$(DED.single)}, not ${$(fedDed.single)}</h3>
  <p>Oregon&rsquo;s standard deduction is ${N($(DED.single))} for a single filer and ${N($(DED.marriedJoint))} for a married one. The federal ${N($(fedDed.single))} standard deduction plays no part. That small deduction is why the federal tax subtraction matters so much: it is the main thing that shrinks the base.
  For most workers the top rate is out of reach. A single filer pays ${N(pct(TAB_S[3].rate))} only on the part of the base above ${N($(TAB_S[3].from))}, and a married filer on the part above ${N($(TAB_M[3].from))}.</p>

  <h3>Allowances are credits, and they stop at ${$(LIM_S)}</h3>
  <p>On Form OR-W-4 you claim allowances, and each one is a ${N($(CRED))} credit taken off the tax after it is figured, unlike a deduction, which shrinks the base. The calculator gives a single filer or head of household one allowance and a married filer two, which cuts ${N($$(CRED))} and ${N($$(2 * CRED))} from the yearly tax.
  The formula ignores allowances completely when wages are above ${N($(LIM_S))} for a single filer or ${N($(LIM_M))} for a married one. One dollar of pay above ${N($(LIM_S))} removes the ${N($$(CRED))} credit, so state withholding on ${N($(100001))} is ${N($$(falaise))} higher than on ${N($(100000))}.</p>

  <h3>Three small payroll deductions</h3>
  <p>The statewide transit tax is ${N(pct(TRANSIT.rate))} of wages with no cap in the Department of Revenue&rsquo;s description, ${N($$(prog(a75, /transit/)))} on ${N("$75,000")}. Paid Leave Oregon is ${N(pct(PL.rate))} of wages up to ${N($(SEUIL_PL))}: the program&rsquo;s total rate is 1% and employees pay 60% of it, so the most anyone pays is ${N($$(PL_MAX))} a year.
  The Workers&rsquo; Benefit Fund assessment is 1.8 cents for every hour worked in 2026, split between employer and worker, so your share is 0.9 cent an hour, or ${N($$(WBF_AN))} for 2,080 hours. State law (ORS 656.506) requires employers to withhold that share from your pay.</p>

  <h3>The transit tax rate may change</h3>
  <p>Two state agencies describe a pending change to the statewide transit tax rate a little differently. The Department of Revenue says Measure 120 did not pass in the May 19, 2026 primary election. The Employment Department&rsquo;s page says the increase has been delayed pending a vote in November 2026. Both tell employers to keep withholding one-tenth of 1 percent, and we use ${N(pct(TRANSIT.rate))}.
  If your pay stub shows a different rate, the stub is right.</p>

  <h3>Local taxes are mostly not on your paycheck</h3>
  <p>Oregon&rsquo;s local taxes are easy to confuse. The Metro supportive housing tax and Multnomah County&rsquo;s Preschool for All tax are personal income taxes on high incomes; employers withhold them automatically only above ${N("$200,000")} of pay or when an employee asks. TriMet and Lane County transit taxes are paid by the employer, and TriMet&rsquo;s rate is 0.8237% of wages.
  For most paychecks, nothing local is withheld.</p>

  <h3>Your 401(k) lowers your Oregon wages</h3>
  <p>The formulas booklet says retirement plan contributions are not part of the wages in the formula. The federal tax on this page treats a traditional 401(k) contribution as reducing taxable pay, and so does the Oregon calculation here. On ${N("$75,000")} with 6% going in, Oregon income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.
  We calculate the transit tax and Paid Leave on your full pay. For the transit tax this is a modeling choice, because its law defines wages by reference to another statute that we did not read.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting to subtract federal tax</h3>
  <p>Applying Oregon&rsquo;s rates to pay minus the ${N($(DED.single))} deduction alone overstates Oregon withholding by ${N($$(ecartSansSub))} on ${N("$75,000")}: ${N($$(sansSub))} instead of ${N($$(a75.etat))}.</p>

  <h3>Treating an allowance as a deduction</h3>
  <p>Each allowance takes ${N($(CRED))} off the tax. It does not remove ${N($(CRED))} from your wages, which would be worth only about ${N($$(CRED * TAB_S[2].rate))} at the ${N(pct(TAB_S[2].rate))} rate.</p>

  <h3>Counting on allowances above ${$(LIM_S)}</h3>
  <p>A single filer earning more than ${N($(LIM_S))} gets no allowances in the formula, however many are on Form OR-W-4. The form&rsquo;s instructions say to claim them on a job that pays less than the limit, or on a spouse&rsquo;s job.</p>

  <h3>Expecting Portland or Multnomah County tax on every check</h3>
  <p>Those taxes are withheld automatically only above ${N("$200,000")} of pay, or if you ask your employer to. TriMet&rsquo;s payroll tax is paid by your employer, not you.</p>

  <h3>Assuming the printed formula and the printed table agree</h3>
  <p>Below ${N($(50000))} of yearly wages the booklet&rsquo;s two methods differ by ${N($(CRED))} a year. If your employer&rsquo;s payroll software and a state table give different numbers, that may be the reason, and it is not a mistake on your part.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances on your Form OR-W-4 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Oregon in 2026, claiming one allowance, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Federal tax subtracted for Oregon: ${N($$(a75.federal))} (under the ${N($(CAP))} limit)</li>
    <li>Oregon base: ${N($(a75.brut))} &minus; ${N($$(sub75))} &minus; ${N($(DED.single))} standard deduction = ${N($(base75))}</li>
    <li>Tax on the base: ${N($(TAB_S[2].base))} + (${N($(base75))} &minus; ${N($(TAB_S[2].from))}) &times; ${N(pct(TAB_S[2].rate))} = ${N($$(avantCredit75))}</li>
    <li>Allowance credit: 1 &times; ${N($(CRED))}, which leaves Oregon income tax withholding of ${N($$(a75.etat))}
    a year, ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
    <li>Statewide transit tax: ${N($(a75.brut))} &times; ${N(pct(TRANSIT.rate))} = ${N($$(prog(a75, /transit/)))}</li>
    <li>Paid Leave Oregon: ${N($(a75.brut))} &times; ${N(pct(PL.rate))} = ${N($$(prog(a75, /Paid Leave/)))}</li>
    <li>Workers&rsquo; Benefit Fund: 2,080 hours &times; ${N("$0.009")} = ${N($$(prog(a75, /Benefit Fund/)))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Oregon borders California, Idaho, Nevada and Washington; Idaho, Nevada and Washington are the three we publish so far.
  For Oregon, the state-level deductions include income tax withholding for one allowance plus the three payroll deductions.</p>
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
  <p>A <a href="/paycheck-calculator/washington/">Washington</a> worker keeps ${N($$(wa75.net - a75.net))} more than an Oregon worker on the same salary, because Washington has no tax on wages, though it does take Paid Family and Medical Leave and WA Cares premiums. A
  <a href="/paycheck-calculator/nevada/">Nevada</a> worker keeps ${N($$(nv75.net - a75.net))} more, and an <a href="/paycheck-calculator/idaho/">Idaho</a> worker keeps ${N($$(id75.net - a75.net))} more. A worker who lives in one of those states and commutes into Oregon is a different case that this calculator does not model: it assumes an Oregon resident working in Oregon.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/washington/">Washington paycheck calculator</a> &mdash; the neighbor to the north, with no income tax on wages and two payroll premiums.</li>
    <li><a href="/paycheck-calculator/idaho/">Idaho paycheck calculator</a> &mdash; the neighbor to the east, with a flat state rate.</li>
    <li><a href="/paycheck-calculator/nevada/">Nevada paycheck calculator</a> &mdash; the neighbor to the southeast, with no state income tax.</li>
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
    Oregon rates.
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

/* 1. Recoupement independant : la formule du livret ecrite ici A PARTIR DU TEXTE
   (BASE = salaire - impot federal plafonne - deduction ; « 678 + (BASE - 11,400) x
   0.0875 - 263 x allowances »), pas du moteur, sur les cas imprimes dans la page. */
const fed75 = 7670;                                   // 58 900 imposables : 1 240 + 4 560 + 8 500 x 22 %
const b75 = 75000 - Math.min(fed75, 8750) - 2910;     // 64 420
const t75 = 678 + (b75 - 11400) * 0.0875 - 263 * 1;
if (Math.abs(t75 - a75.etat) > 0.006) echec("OR 75 000 $ : livret " + t75 + ", moteur " + a75.etat);
const fedJ = 4640;                                    // 42 800 imposables : 2 480 + 18 000 x 12 %
const bJ = 75000 - Math.min(fedJ, 8750) - 5820;
const tJ = 1357 + (bJ - 22800) * 0.0875 - 263 * 2;
if (Math.abs(tJ - j75.etat) > 0.006) echec("OR marie 75 000 $ : livret " + tJ + ", moteur " + j75.etat);
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 06/10/2026). */
const attendusProse = [
  [a75.etat, 5054.25, "etat 75 000"], [sub75, 7670, "impot federal retranche"], [base75, 64420, "base 75 000"],
  [avantCredit75, 5317.25, "impot avant credit"], [progs(a75), 543.72, "programmes 75 000"],
  [prog(a75, /transit/), 75, "transit"], [prog(a75, /Paid Leave/), 450, "Paid Leave"], [prog(a75, /Benefit Fund/), 18.72, "WBF"],
  [a75.total, 19005.47, "total 75 000"], [a75.net, 55994.53, "net 75 000"],
  [j75.etat, 4483.25, "etat marie"], [jBase, 64540, "base mariee"], [jAvantCredit, 5009.25, "marie avant credit"],
  [h75.etat, 5222.425, "etat chef de famille"],
  [h20.net, 32738.86, "net 20 $/h"], [h25.net, 40221.655, "net 25 $/h"], [h30.net, 47704.46, "net 30 $/h"],
  [h25.etat, 3357.625, "etat 25 $/h"],
  [ecartSansSub, 671.125, "ecart sans impot federal"], [sansSub, 5725.375, "sans impot federal"],
  [falaise, 263.0875, "falaise 100 001"], [marche125, 153.2125, "marche 125 000"], [a145.etat, 12309.91, "etat 145 000"],
  [gain401, 307.125, "gain 401(k)"], [PL_MAX, 1107, "Paid Leave maximum"], [WBF_AN, 18.72, "WBF annuel"],
  [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"], [CRED * TAB_S[2].rate, 23.0125, "credit en deduction"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(DED.single === 2910 && DED.marriedJoint === 5820 && DED.headOfHousehold === 2910 && CRED === 263 && CAP === 8750 && LIM_S === 100000 && LIM_M === 200000)) echec("deductions / credit / plafond / seuils != moteur");
if (!(TRANSIT.rate === 0.001 && PL.rate === 0.006 && PL.wageCap === 184500 && PL.wageCap === R.fica.socialSecurity.wageBase && WBF.perHour === 0.009)) echec("programmes != moteur");
if (!(TAB_S.length === 4 && TAB_S[3].rate === 0.099 && TAB_S[2].rate === 0.0875 && TAB_S[1].rate === 0.0675 && TAB_S[0].rate === 0.0475)) echec("les quatre taux ne sont plus 4,75 / 6,75 / 8,75 / 9,9 %");
if (!(PLAFOND_ATTEINT_S >= 79900 && PLAFOND_ATTEINT_S <= 79920 && PLAFOND_ATTEINT_M >= 109240 && PLAFOND_ATTEINT_M <= 109260)) echec("salaire ou l'impot federal atteint 8 750 $ : " + PLAFOND_ATTEINT_S + " / " + PLAFOND_ATTEINT_M);
if (!(wa75.net > a75.net && nv75.net > a75.net && id75.net > a75.net)) echec("la comparaison (WA, NV, ID au-dessus de l'Oregon) n'est plus celle ecrite");
if (!(R.states.washington.incomeTax.hasIncomeTax === false && R.states.nevada.incomeTax.hasIncomeTax === false && R.states.idaho.incomeTax.hasIncomeTax)) echec("un voisin n'a plus le regime ecrit");
if (!(progs(a75) === a75.programmes.reduce((t, p) => t + p.montant, 0) && a75.programmes.length === 3)) echec("a 75 000 $, trois programmes attendus");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
console.log("recoupements livret 150-206-436 (formule ecrite a la main, 75 000 $ celibataire et marie) : OK ; reponse directe %d mots", nbMotsReponse);
