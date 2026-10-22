/* Construit /paycheck-calculator/connecticut/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Connecticut est le 45e Etat publie, et le premier dont la retenue n'est PAS un bareme + une deduction : le DRS
 * publie une formule en 16 etapes (TPG-211) avec cinq tables (exoneration qui s'efface, bareme, recuperation de la tranche
 * a 2 %, recuperation d'impot, credit personnel en decimale). Le moteur la reproduit (stepAdjustments, ajoute le 20/10/2026).
 * Ce que le Connecticut a de propre, et que la page DIT :
 *   1. SEPT TAUX, 2 % a 6,99 %, et un bareme DIFFERENT par code de retenue (A/D/F, B, C).
 *   2. L'EXONERATION S'EFFACE : 15 000 $ (celibataire, code F) jusqu'a 30 000 $ de salaire annualise, puis -1 000 $ par tranche de
 *      1 000 $, zero a partir de 44 000 $ ; 24 000 $ (code C) zero a 71 000 $ ; 19 000 $ (code B) zero a 56 000 $.
 *   3. LE CREDIT PERSONNEL (Table E) : jusqu'a 75 % de l'impot, par paliers, zero au-dela de 64 500 $ (F), 100 500 $ (C), 78 500 $ (B).
 *      Il fait SAUTER la retenue de 28,53 $ a 64 500 -> 64 501 $ (F).
 *   4. LA RECUPERATION DE LA TRANCHE A 2 % (Table C) et L'IMPOT RECUPERE (Table D) : montants ajoutes par marches de 25 $ (F).
 *   5. LES CODES : F = celibataire, C = couple dont le conjoint n'a pas d'emploi, B = chef de famille ; A (conjoint qui travaille),
 *      D, E, les tables supplementaires des couples : NON modelises, dits.
 *   6. LE CONGE PAYE (CT Paid Leave) : 0,5 % retenu sur le salaire jusqu'a la base FICA 184 500 $ (922,50 $ au maximum).
 *   7. AUCUNE TAXE LOCALE TROUVEE ; chomage a la charge de l'employeur (C.G.S. § 31-225(a)).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - « Connecticut has no local income tax » : seulement « we found no » ;
 *   - « the withholding tables are the same as the tax you owe » : la retenue est une estimation ;
 *   - « New York ... » : New York est publie depuis le 21/10/2026 : la page le lie et le compare.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors les attendus recalcules a la main en bas.
 * Lancer : node .tooling/ops/build-connecticut.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "connecticut";
const NOM = "Connecticut";
const URL = "https://statelinecalc.com/paycheck-calculator/connecticut/";
const AUJOURD_HUI = "2026-10-21";
const LISIBLE = "October 21, 2026";

const IT = R.states[CLE].incomeTax;
const PL = R.states[CLE].employeePrograms[0];                 // 0,5 %, 184 500
const fedDed = R.federal.standardDeduction;
const pct = t => String(+(t * 100).toFixed(4)) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a17 = calcul(CLE, 17000);
const a30 = calcul(CLE, 30000);
const a45 = calcul(CLE, 45000);
const a60 = calcul(CLE, 60000);
const a64 = calcul(CLE, 64500);
const a64b = calcul(CLE, 64501);
const a66 = calcul(CLE, 66500);
const a250 = calcul(CLE, 250000);
const a300 = calcul(CLE, 300000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;
const pl = r => r.programmes[0].montant;

/* Valeurs de droit lues dans le moteur (donc dans la TPG-211). */
const BS = IT.brackets.single, BM = IT.brackets.marriedJoint, BH = IT.brackets.headOfHousehold;
const EXO = { s: 15000, j: 24000, h: 19000 };               // Table A, premiere ligne (verifie en bas)
const ZERO_EXO = { s: 44000, j: 71000, h: 56000 };          // salaire annualise a partir duquel l'exoneration est nulle
const PLEIN_EXO = { s: 30000, j: 48000, h: 38000 };         // jusqu'ou l'exoneration est entiere
const FIN_CREDIT = { s: 64500, j: 100500, h: 78500 };       // le credit est nul au-dela
const initial75 = 2000 + (75000 - 50000) * 0.055;           // 3 375
const saut = a64b.etat - a64.etat;
const sansCtw4 = 75000 * 0.0699;                            // 6,99 % sans CT-W4, sans exoneration
const ecartSansCtw4 = sansCtw4 - a75.etat;
const tauxUniqueHaut = 75000 * 0.0699;
const mensuel75 = a75.etat / 12;
const plMax = PL.wageCap * PL.rate;

/* Voisins : Massachusetts, Rhode Island et New York (publie le 21/10/2026) sont publies. */
const REF = 75000;
const COMPARE = [CLE, "new-york", "massachusetts", "rhode-island"];
const NOMS = { [CLE]: "Connecticut", "new-york": "New York", massachusetts: "Massachusetts", "rhode-island": "Rhode Island" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const plusMoins = k => {
  const r = calcul(k, REF), nom = NOMS[k];
  const lien = "<a href=\"/paycheck-calculator/" + k + "/\">" + nom + "</a>";
  return "a " + lien + " worker keeps " + N($$(Math.abs(r.net - a75.net))) + (r.net > a75.net ? " more" : " less");
};
const phraseVoisins = plusMoins("new-york") + ", " + plusMoins("massachusetts") + " and " + plusMoins("rhode-island");

const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Tableau des trois baremes (Table B). */
const LIGNES_BAREMES = [
  ["Codes A, D, F (F is single; A is also used by married filers who both work; D elects the highest withholding)", BS],
  ["Code B (head of household)", BH],
  ["Code C (married filing jointly, spouse not employed)", BM]
].map(([lib, b]) => "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + b.slice(0, 6).map(x => $(x[0])).join(", ") + "</td></tr>").join("\n");

/* Tableau de la formule sur les trois statuts a 75 000 $ : exoneration, imposable, impot initial, ajouts, credit, retenue. */
const etapes = (statut, brut) => {
  const sa = IT.stepAdjustments;
  const val = (t, b) => { for (const [h, v] of t) if (b <= h) return v; return t[t.length - 1][1]; };
  const tier = IT.deductionByIncome.find(x => x.upTo === null || brut <= x.upTo).amounts[statut];
  const b = IT.brackets[statut];
  let init = 0, bas = 0;
  for (const [h, t] of b) { if (brut - tier > bas) init += (Math.min(brut - tier, h) - bas) * t; bas = h; }
  return { exo: tier, imposable: brut - tier, init, ajout: val(sa.addBack[statut], brut), recup: val(sa.recapture[statut], brut), credit: val(sa.credit[statut], brut) };
};
const e75s = etapes("single", 75000), e75j = etapes("marriedJoint", 75000), e75h = etapes("headOfHousehold", 75000);
const LIGNES_75 = [["Single (code F)", e75s, a75], ["Married filing jointly, spouse not employed (code C)", e75j, j75], ["Head of household (code B)", e75h, h75]]
  .map(([lib, e, r]) => "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + $(e.exo) + "</td><td class=\"num\">" + $(e.imposable) +
    "</td><td class=\"num\">" + $$(e.init) + "</td><td class=\"num\">" + $$(e.ajout + e.recup) + "</td><td class=\"num\">" + pct(e.credit) +
    "</td><td class=\"num\">" + $$(r.etat) + "</td></tr>").join("\n");

/* Tableau des codes du CT-W4. */
const LIGNES_CODES = [
  ["F", "Single, expected gross income above $15,000", "Single", $(EXO.s), $(ZERO_EXO.s), $(FIN_CREDIT.s)],
  ["C", "Married filing jointly, spouse not employed, combined income above $24,000", "Married filing jointly (we assume a spouse with no job)", $(EXO.j), $(ZERO_EXO.j), $(FIN_CREDIT.j)],
  ["B", "Head of household, expected gross income above $19,000", "Head of household", $(EXO.h), $(ZERO_EXO.h), $(FIN_CREDIT.h)]
].map(([c, ct, site, e, z, f]) => "        <tr><th scope=\"row\">" + c + "</th><td>" + ct + "</td><td>" + site + "</td><td class=\"num\">" + e +
  "</td><td class=\"num\">" + z + "</td><td class=\"num\">" + f + "</td></tr>").join("\n");

/* Tableau des ajouts d'un celibataire autour de 56 500 - 101 500 et du saut du credit. */
const LIGNES_PAS = [[17000, a17], [30000, a30], [45000, a45], [60000, a60], [64500, a64], [64501, a64b], [66500, a66], [75000, a75], [250000, a250]]
  .map(([g, r]) => "        <tr><th scope=\"row\">" + $(g) + "</th><td class=\"num\">" + $$(r.etat) + "</td><td class=\"num\">" + (r.etat / g * 100).toFixed(2) + "%</td></tr>").join("\n");

const faq = [
  ["What is the Connecticut income tax withholding rate?",
   "Connecticut&rsquo;s withholding formula has seven rates, from " + N("2%") + " to " + N("6.99%") + ". For a single filer, " + N("2%") + " applies to the first " + N($(10000)) + " of taxable pay, " + N("4.5%") + " to the next " + N($(40000)) +
   ", " + N("5.5%") + " to the next " + N($(50000)) + ", and the top rate of " + N("6.99%") + " applies above " + N($(500000)) + ". The Department of Revenue Services then adjusts the result with a personal exemption, a phase-out add-back, a recapture and a credit. On " + N($(75000)) +
   ", a single filer has " + N($$(a75.etat)) + " of Connecticut income tax withheld a year."],

  ["How much Connecticut tax is withheld on a $75,000 salary?",
   "For a single filer (withholding code F), Connecticut withholds " + N($$(a75.etat)) + " a year, which is " + N($$(mensuel75)) + " a month. The personal exemption is gone at this pay, so taxable pay is the full " + N($(75000)) + ". The initial tax is " + N($$(initial75)) +
   ", the 2% phase-out add-back is " + N("$100.00") + ", the tax recapture is " + N("$0.00") + " and the personal tax credit is " + N("0%") + ". A married filer whose spouse is not employed (code C) has " + N($$(j75.etat)) + " withheld, and a head of household (code B) has " + N($$(h75.etat)) +
   " withheld. Connecticut also takes " + N($$(pl(a75))) + " for Paid Leave out of a single filer&rsquo;s pay at this level."],

  ["What is take-home pay on a $75,000 salary in Connecticut?",
   "About " + N($(a75.net)) + " a year, or " + N($$(a75.net / 12)) + " a month, for a single filer with no retirement contribution. That is after " + N($$(a75.federal)) + " of federal income tax, " + N($(a75.ss + a75.med)) + " of Social Security and Medicare, " + N($$(a75.etat)) +
   " of Connecticut income tax and " + N($$(pl(a75))) + " of CT Paid Leave, an effective rate of " + (a75.taux * 100).toFixed(1) + "%. We found no Connecticut city or county income tax in the withholding documents, so there is no local line."],

  ["How much is $20, $25 or $30 an hour after taxes in Connecticut?",
   "At 40 hours a week, $20 an hour leaves about " + N($(h20.net)) + " a year, or " + N($$(h20.netHoraire)) + " an hour. $25 an hour leaves about " + N($(h25.net)) + ", or " + N($$(h25.netHoraire)) + " an hour. $30 an hour leaves about " + N($(h30.net)) + ", or " + N($$(h30.netHoraire)) +
   " an hour. Those are single-filer figures after federal tax, FICA, Connecticut income tax withholding and the Paid Leave contribution, with no retirement contribution."],

  ["Which withholding code should I use on the Connecticut CT-W4?",
   "Form CT-W4 asks you to pick your expected filing status and a statement about your income, and each pairing gives a letter. A single filer expecting more than " + N($(15000)) + " of gross income enters " + N("F") + ". A head of household expecting more than " + N($(19000)) +
   " enters " + N("B") + ". A married couple filing jointly where the spouse is not employed and combined income is above " + N($(24000)) + " enters " + N("C") + ". If both spouses work and combined income is more than " + N($(24000)) + " and up to " + N($(100500)) + ", each enters " + N("A") + " (above " + N($(100500)) + " it is code " + N("D") + ")" +
   ". Code " + N("D") + " is for people with significant nonwage income who want the most withheld, and code " + N("E") + " means no withholding is necessary. This calculator uses F, C and B for its three filing statuses."],

  ["Why does Connecticut withholding jump at certain pay levels?",
   "Because several of the formula&rsquo;s tables work in steps. A single filer&rsquo;s personal tax credit falls from 75% of the tax to 0% as annualized pay rises to " + N($(FIN_CREDIT.s)) + ", and the last 1% disappears at " + N($(64501)) +
   ": withholding goes from " + N($$(a64.etat)) + " on " + N($(64500)) + " to " + N($$(a64b.etat)) + " on " + N($(64501)) + ", a " + N($$(saut)) + " jump from one extra dollar of pay. The add-back table adds " + N("$25") + " for every " + N($(5000)) + " between " + N($(56500)) + " and " + N($(101500)) +
   " for a single filer. Your tax return is smoother than these steps because it is figured on your whole year&rsquo;s income."],

  ["Is there a Connecticut state disability or paid leave deduction?",
   "In the documents we read, one: CT Paid Leave. It is paid by the employee: the CT Paid Leave Authority says employers deduct " + N("0.5%") + " from an employee&rsquo;s pay, up to the Social Security contribution limit, which is " + N($(PL.wageCap)) + " in 2026. On " + N($(75000)) + " that is " + N($$(pl(a75))) +
   " a year, and the most one employer deducts in a year is " + N($$(plMax)) + ". Your 401(k) contribution does not lower it, because benefits that are excluded from FICA wages are excluded. The Authority says individuals may not opt out. Connecticut law (C.G.S. § 31-225) says an employer&rsquo;s unemployment contributions &ldquo;shall not be deducted or deductible from wages,&rdquo; so that cost falls on your employer."],

  ["Do Connecticut cities or counties tax my paycheck?",
   "The Connecticut withholding documents we read describe state withholding only, and we found no Connecticut city or county income tax on wages in them. That is not proof that none exists. This calculator adds no local line, and your pay stub is the final word."],

  ["I live in Connecticut and work in another state. Which state withholds?",
   "The Department&rsquo;s Circular CT says all wages of a Connecticut resident are subject to Connecticut withholding even if the resident works outside Connecticut, and it explains how an employer that must withhold for another state handles the difference. This calculator assumes you live and work in Connecticut and does not model that case. A nonresident who works partly in and partly outside Connecticut for the same employer should also complete Form CT-W4NA, which is not modeled either."],

  ["Does a 401(k) contribution lower my Connecticut withholding?",
   "In this calculator, yes for the income tax, not for Paid Leave. The Circular CT says that, in general, wages subject to federal withholding are also wages for Connecticut withholding. It does not name 401(k) plans; because a traditional 401(k) deferral is not subject to federal income tax withholding, this calculator takes it out first for Connecticut too. On " + N($(75000)) + " with 6% going into a 401(k), Connecticut income tax withholding falls by " + N($$(gain401)) +
   " a year. The Paid Leave contribution stays at " + N($$(pl(r401))) + ", because the Authority bases it on FICA wages."],

  ["How does Connecticut withhold tax on a bonus?",
   "The Circular CT says that when supplemental pay such as a bonus or overtime comes at the same time as regular wages, the tax is figured as if the total were one regular payment. Bonuses paid at a different time follow another method that the Circular describes. This calculator does not model bonuses, so ask your employer how yours will be handled."],

  ["What happens if I never gave my employer a CT-W4?",
   "The Circular CT says an employer must withhold at a flat " + N("6.99%") + ", with no exemption allowed, if an employee never gives it a completed CT-W4. On " + N($(75000)) + " that would be " + N($$(sansCtw4)) + " a year, which is " + N($$(ecartSansCtw4)) + " more than the " + N($$(a75.etat)) + " this page shows."],

  ["Why is my Connecticut paycheck different from this calculator?",
   "Common reasons: you chose a different withholding code on your CT-W4, such as A for a working spouse or D for the most withholding, or asked for extra withholding on line 2; your employer rounds to the cent differently; health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; or part of your pay is a bonus. " +
   "Withholding is only an estimate of what you will owe, and the final amount is settled when you file."],

  ["How current is the Connecticut formula on this page?",
   "It comes from the Department of Revenue Services&rsquo; Withholding Calculation Rules, TPG-211, revised 12/25, which says the 2026 rules and tables are unchanged from 2025. We read it on " + LISIBLE + ", with Form CT-W4 and Circular CT for 2026, and link all three in the Sources section."]
];

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

const reponse = "Connecticut withholds from 2% to 6.99% through a formula with a personal exemption and a credit that fade as pay rises, and add-backs that grow. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year, after a 0.5% Paid Leave contribution. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/assets/analytics.js" defer></script>
<title>Connecticut (CT) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Connecticut (CT) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA, CT tax and CT Paid Leave. Rates 2% to 6.99%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Connecticut (CT) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Connecticut withholds 2% to 6.99% plus 0.5% for Paid Leave. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Connecticut Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Connecticut take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Connecticut income tax withheld under the Department of Revenue Services formula (TPG-211: personal exemption, rates of 2% to 6.99%, phase-out add-back, tax recapture and personal tax credit) and the 0.5% CT Paid Leave contribution."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Connecticut", "item": "${URL}" }
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
    <li aria-current="page">Connecticut</li>
  </ol>
</nav>

  <h1>Connecticut Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Connecticut take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and your Connecticut withholding code (F, C or B).
          For a married filer we assume a spouse who is not employed; if yours works, the result will not match.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Connecticut income tax withholding too, but not Paid Leave.</span>
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
    <p>The Connecticut Department of Revenue Services publishes its withholding method as a list of sixteen steps, and this calculator follows them. Your pay is converted to a yearly amount. A personal exemption comes off, and it shrinks as pay rises. The rest is taxed at rates from ${N("2%")} to ${N("6.99%")}. Two amounts are added, a phase-out add-back and a tax recapture, and the total is multiplied by one minus a personal tax credit that also shrinks as pay rises. The yearly result is divided by the number of pay periods. The Department says there is no percentage method for Connecticut: employers use either these rules or its printed tables.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Connecticut income tax</strong>: your wages after any 401(k) contribution, run through the Department&rsquo;s formula for your withholding code.</li>
      <li><strong>CT Paid Leave</strong> at ${N("0.5%")} of gross wages up to ${N($(PL.wageCap))}.</li>
    </ul>
    <p>This calculator has no other Connecticut line. We looked for a state payroll deduction on your check beyond Paid Leave and found none.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Connecticut, the <strong>Department of Revenue Services</strong>&rsquo; Withholding Calculation Rules, Form CT-W4 and Circular CT, the <strong>CT Paid Leave Authority</strong> and the Connecticut General Statutes.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How current the source is.</strong> The Department&rsquo;s rules are revised 12/25 and say that the 2026 withholding calculation rules and 2026 withholding tables are unchanged from 2025. We read them, Form CT-W4 and Circular CT on ${LISIBLE}. The federal figures, Social Security wage base and Medicare thresholds are the 2026 ones.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The Department also prints withholding tables for weekly, every-two-weeks, twice-a-month and monthly pay, with one column for each of its five withholding codes. The printed file has no text layer, so we read it with optical character recognition, kept the rows whose pay ranges we could read cleanly, and recomputed every amount from the formula at the middle of each pay range. That midpoint method reproduces the Department&rsquo;s own printed row for ${N("$461 to $471")} a week. ${N("2,445")} printed amounts matched to the cent, for all five codes. The rows the scan could not read cleanly were left out rather than guessed.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department&rsquo;s formula. Your actual Connecticut income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: withholding code A (a working spouse), D and E, the extra and reduced withholding lines of the CT-W4, the Department&rsquo;s supplemental tables for married couples who both work, bonuses, work in another state, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Connecticut take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 federal and Connecticut rates. The
  CT tax column is Connecticut income tax withholding plus the 0.5% CT Paid Leave contribution (on $75,000: $3,475 + $375 = $3,850).</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Connecticut take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">CT tax + Paid Leave</th>
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

    <h2>The sixteen steps, worked through on ${N($(75000))}</h2>
    <p>The Department&rsquo;s steps are short enough to follow by hand. For a single filer paid ${N($(75000))} a year with withholding code F: the annualized pay is ${N($(75000))}; the personal exemption for code F is ${N("$0")} at this pay, so taxable pay is ${N($(75000))}; the initial tax is ${N($(2000))} plus ${N("5.5%")} of the ${N($(25000))} above ${N($(50000))}, which is ${N($$(initial75))}; the 2% phase-out add-back for pay between ${N($(71500))} and ${N($(76500))} is ${N("$100")}; the tax recapture is ${N("$0")} below ${N($(105000))}; and the personal tax credit is ${N("0%")} above ${N($(FIN_CREDIT.s))}. The total is ${N($$(a75.etat))} a year. The table shows the same steps for the three filing statuses this calculator offers.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Connecticut withholding formula on $75,000, by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Withholding code</th>
          <th scope="col">Personal exemption</th>
          <th scope="col">Taxable pay</th>
          <th scope="col">Initial tax</th>
          <th scope="col">Add-back and recapture</th>
          <th scope="col">Credit</th>
          <th scope="col">Withheld a year</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_75}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Connecticut&rsquo;s rates and the withholding codes</h2>
    <p>Form CT-W4 turns your filing status and a statement about your income into a one-letter withholding code, and the code decides which exemption, which rate table and which credit your employer uses. The table shows the three codes this calculator uses, and the pay at which each personal exemption is gone and each personal tax credit has faded to nothing.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Connecticut withholding codes used by this calculator
      </caption>
      <thead>
        <tr>
          <th scope="col">Code</th>
          <th scope="col">Form CT-W4 statement</th>
          <th scope="col">Used here for</th>
          <th scope="col">Personal exemption</th>
          <th scope="col">Exemption gone above</th>
          <th scope="col">Credit gone above</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_CODES}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The seven rates are the same for every filer, but the pay at which each step ends differs by rate table. The table lists where the first six steps end; above the sixth step the rate is ${N("6.99%")}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Where Connecticut&rsquo;s rate steps end (rates 2%, 4.5%, 5.5%, 6%, 6.5%, 6.9%, then 6.99%)
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate table</th>
          <th scope="col">Taxable pay at which each step ends</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_BAREMES}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>Because of the exemption, the add-backs and the credit, a single filer&rsquo;s withholding does not climb smoothly. The table shows Connecticut withholding at a few pay levels, including the one-dollar step at ${N($(64500))}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Connecticut withholding at selected pay levels, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Yearly pay</th>
          <th scope="col">Connecticut withholding</th>
          <th scope="col">As a share of pay</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_PAS}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>If you live or work across a state line</h2>
    <p>Connecticut borders New York, Massachusetts and Rhode Island, and many people live in one state and work in another. The rules that apply depend on where you live and where you do the work, and this calculator models none of them. It assumes you live and work in Connecticut.</p>

    <h3>If you live in Connecticut and work elsewhere</h3>
    <p>The Department&rsquo;s Circular CT says all wages of a Connecticut resident are subject to Connecticut income tax withholding even if the resident works outside Connecticut. Where an employer does business in both Connecticut and the other state, the Circular tells it to work out the Connecticut tax on the total wages and then adjust for the other state&rsquo;s withholding. Ask your employer which state it is withholding for.</p>

    <h3>If you live elsewhere and work in Connecticut</h3>
    <p>The Circular CT says wages of a nonresident are subject to Connecticut withholding if they are paid for services rendered in Connecticut. Form CT-W4NA is for a nonresident who works partly in and partly outside Connecticut for the same employer; it is not modeled here.</p>

    <h3>Which neighboring states have a calculator here</h3>
    <p>We publish a calculator for <a href="/paycheck-calculator/massachusetts/">Massachusetts</a>, <a href="/paycheck-calculator/new-york/">New York</a> and <a href="/paycheck-calculator/rhode-island/">Rhode Island</a>.</p>

    <h2>Connecticut hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Connecticut your hours also matter because of the exemption: a single filer earning ${N($(15000))} or less a year has nothing withheld.</p>

    <h3>What is $20 an hour after taxes in Connecticut?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Connecticut income tax withholding and Paid Leave, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Connecticut income tax is
    ${N($$(h20.etat))} for the year, and Paid Leave is ${N($$(pl(h20)))}.</p>

    <h3>What are $25 and $30 an hour after taxes in Connecticut?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Connecticut income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The Circular CT says that when overtime or a bonus is paid at the same time as regular wages, the tax is figured on the total as one payment. If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Connecticut take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year).</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Connecticut take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Connecticut</h2>

  <h3>A single filer&rsquo;s ${$(EXO.s)} exemption applies in full up to ${$(PLEIN_EXO.s)} of pay</h3>
  <p>Withholding code F takes a ${N($(EXO.s))} personal exemption off pay up to ${N($(PLEIN_EXO.s))}. Pay of ${N($(17000))} leaves ${N($(2000))} of taxable pay, and Connecticut withholds ${N($$(a17.etat))} a year; at ${N($(30000))}, it withholds ${N($$(a30.etat))}.</p>

  <h3>The exemption fades by $1,000 for every $1,000 of pay</h3>
  <p>Above ${N($(PLEIN_EXO.s))} of pay the single exemption falls by ${N("$1,000")} for each ${N("$1,000")} of pay and is gone above ${N($(ZERO_EXO.s))}. For code C the full ${N($(EXO.j))} runs to ${N($(PLEIN_EXO.j))} and the exemption is gone above ${N($(ZERO_EXO.j))}; for code B the full ${N($(EXO.h))} runs to ${N($(PLEIN_EXO.h))} and it is gone above ${N($(ZERO_EXO.h))}. A pay raise in that range is taxed more heavily than the rate table alone suggests.</p>

  <h3>The personal tax credit takes up to 75% off the tax</h3>
  <p>Table E gives a decimal that the formula subtracts from one before multiplying. For a single filer it is ${N("0.75")} up to ${N($(18800))} of pay, falls in steps, stays at ${N("0.10")} between ${N($(33300))} and ${N($(60000))}, and reaches zero above ${N($(FIN_CREDIT.s))}. At ${N($(45000))} the credit is ${N("10%")} and Connecticut withholds ${N($$(a45.etat))}.</p>

  <h3>One dollar of pay can move withholding by ${$$(saut)}</h3>
  <p>The last ${N("1%")} of credit ends at ${N($(64500))}. A single filer paid ${N($(64500))} has ${N($$(a64.etat))} withheld and one paid ${N($(64501))} has ${N($$(a64b.etat))} withheld. The jump is real. It is in the Department&rsquo;s tables, it is not an error in this calculator, and it does not carry over to your tax return.</p>

  <h3>A 2% phase-out add-back starts at $56,500</h3>
  <p>Table C, the Department&rsquo;s &ldquo;2% tax rate phase-out add-back,&rdquo; takes back the benefit of the 2% step as pay rises. For a single filer it adds ${N("$25")} back for every ${N($(5000))} of pay above ${N($(56500))}, up to ${N("$250")} above ${N($(101500))}. At ${N($(75000))} it is ${N("$100")}.</p>

  <h3>Tax recapture adds more above $105,000</h3>
  <p>Table D adds a further amount for higher pay: ${N("$25")} above ${N($(105000))}, ${N("$250")} between ${N($(150000))} and ${N($(200000))}, and more above that. At ${N($(250000))} a single filer has ${N($$(a250.etat))} withheld, and at ${N($(300000))} it is ${N($$(a300.etat))}.</p>

  <h3>The married code C has its own rates and a wider exemption</h3>
  <p>A married couple filing jointly with a spouse who is not employed uses code C: a ${N($(EXO.j))} exemption, a ${N("2%")} step up to ${N($(20000))} and a ${N("4.5%")} step to ${N($(100000))}. On ${N("$75,000")} Connecticut withholds ${N($$(j75.etat))} from that filer and ${N($$(a75.etat))} from a single one.</p>

  <h3>Head of household uses code B</h3>
  <p>Code B has a ${N($(EXO.h))} exemption and a ${N("2%")} step up to ${N($(16000))}. On ${N("$75,000")} Connecticut withholds ${N($$(h75.etat))}. Federal tax is lower for a head of household (${N($$(h75.federal))}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>If both spouses work, the codes change</h3>
  <p>When both spouses work and combined income is more than ${N($(24000))} and up to ${N($(100500))}, the CT-W4 has each choose code A (above ${N($(100500))} it is code D), and the Department publishes supplemental tables for those couples. This calculator does not model code A or those tables, so choose Single to see one earner&rsquo;s result.</p>

  <h3>No CT-W4 means 6.99%</h3>
  <p>The Circular CT says an employer must withhold at a flat ${N("6.99%")}, with no exemption, if an employee never gives it a completed CT-W4. On ${N("$75,000")} that is ${N($$(sansCtw4))} a year, ${N($$(ecartSansCtw4))} more than this page shows.</p>

  <h3>CT Paid Leave takes ${pct(PL.rate)} of your pay</h3>
  <p>The CT Paid Leave Authority says employers deduct ${N("0.5%")} from an employee&rsquo;s pay, and that employees contribute until they reach the Social Security contribution limit. On ${N("$75,000")} that is ${N($$(pl(a75)))}. The most one employer deducts in 2026 is ${N($$(plMax))}, at ${N($(PL.wageCap))} of pay. The Authority says employers should exclude benefits that are excluded from FICA wages, so a 401(k) contribution does not reduce it.</p>

  <h3>Unemployment insurance is your employer&rsquo;s cost</h3>
  <p>Connecticut law (C.G.S. § 31-225) says an employer&rsquo;s unemployment contributions &ldquo;shall not be deducted or deductible from wages.&rdquo; We did not find another state payroll program run through payroll in the documents we read. That is a statement about what we read, not a guarantee that nothing else exists, and your pay stub is the final word.</p>

  <h3>Your 401(k) lowers your Connecticut taxable wages in this calculator</h3>
  <p>The Circular CT says that, in general, wages subject to federal withholding are also wages for Connecticut withholding. It does not name 401(k) plans; because a traditional deferral is not subject to federal income tax withholding, this calculator starts from pay after a traditional 401(k) contribution, as it does for every state on this site. On ${N("$75,000")} with 6% going in, Connecticut income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>The Department says the 2026 rules are unchanged from 2025</h3>
  <p>The Department&rsquo;s rules page says that the 2026 withholding calculation rules and 2026 withholding tables are unchanged from 2025. We will update this page when the Department publishes new rules.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Picking the wrong withholding code</h3>
  <p>Code F is for a single filer. If you are married and both spouses work, you each pick A (combined income above $24,000 and up to $100,500) or D (above $100,500), not C. Code C assumes a spouse who is not employed, and Form CT-W4 warns that couples where both spouses work can end up with too much or too little tax withheld, so follow the form.</p>

  <h3>Applying one rate to everything</h3>
  <p>Taxing all ${N($(75000))} at ${N("6.99%")} would give ${N($$(tauxUniqueHaut))}, which is ${N($$(tauxUniqueHaut - a75.etat))} more than the formula gives. The top rate starts at ${N($(500000))} of taxable pay for a single filer.</p>

  <h3>Forgetting the add-backs</h3>
  <p>Running ${N($(75000))} through the rate table alone gives ${N($$(initial75))}. The ${N("$100")} add-back is part of the Department&rsquo;s result, which is ${N($$(a75.etat))}.</p>

  <h3>Expecting the paycheck to rise smoothly with pay</h3>
  <p>It does not. The exemption fades, the credit falls in steps and the add-backs rise in steps, so a small raise can cost more than the top rate suggests. At ${N($(64500))} the step is ${N($$(saut))}.</p>

  <h3>Leaving out Paid Leave</h3>
  <p>A take-home figure that ignores the ${N("0.5%")} Paid Leave contribution is too high by ${N($$(pl(a75)))} on ${N("$75,000")}.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the code and extra withholding you chose on your CT-W4 may differ from the
  one we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Connecticut in 2026, withholding code F and no retirement
  contribution, under the Department&rsquo;s formula:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Connecticut personal exemption at this pay: ${N("$0")}; taxable pay ${N($(75000))}</li>
    <li>Initial tax: ${N($(2000))} + ${N($(25000))} &times; 5.5% = ${N($$(initial75))}</li>
    <li>Phase-out add-back (Table C): ${N("$100.00")}; recapture (Table D): ${N("$0.00")}</li>
    <li>Personal tax credit (Table E): ${N("0%")}, so withholding = ${N($$(initial75))} + ${N("$100.00")} = ${N($$(a75.etat))}
    a year, ${N($$(mensuel75))} on a monthly paycheck</li>
    <li>CT Paid Leave: ${N($(a75.brut))} &times; 0.5% = ${N($$(pl(a75)))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Connecticut borders three states: New York, Massachusetts and Rhode Island, and we publish all three.
  Each row leaves out that state&rsquo;s own local taxes. The New York row includes Paid Family Leave and disability insurance at their maximums but no New York City or Yonkers tax.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a Connecticut worker on the same salary, ${phraseVoisins}. A worker who lives in one of those states and commutes into Connecticut, or the reverse, is a different case that this calculator does not model: it assumes a Connecticut resident working in Connecticut.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/new-york/">New York paycheck calculator</a> &mdash; the neighbor to the west.</li>
    <li><a href="/paycheck-calculator/massachusetts/">Massachusetts paycheck calculator</a> &mdash; the neighbor to the north.</li>
    <li><a href="/paycheck-calculator/rhode-island/">Rhode Island paycheck calculator</a> &mdash; the neighbor to the east.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Connecticut ranks on one salary.</li>
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
    financial, tax or legal advice. Results are estimates based on published 2026 federal rates and
    the Connecticut Department of Revenue Services&rsquo; withholding formula, and do not include a working spouse, extra withholding on Form CT-W4 or any local tax.
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

/* 1. Recoupement independant : la formule du TPG-211 ecrite ici A PARTIR DU TEXTE (etapes, Table B), pas du moteur. */
const base = (ti, seuils) => { let t = 0, bas = 0; for (const [h, r] of seuils) { if (ti > bas) t += (Math.min(ti, h) - bas) * r; bas = h; } return t; };
const tpgS = (s, ex, seuils, ajout, recup, cred) => Math.max(0, s - ex) > 0 ? (base(s - ex, seuils) + ajout + recup) * (1 - cred) : 0;
const SEUILS_F = [[10000, .02], [50000, .045], [100000, .055], [200000, .06], [250000, .065], [500000, .069], [Infinity, .0699]];
const SEUILS_C = [[20000, .02], [100000, .045], [200000, .055], [400000, .06], [500000, .065], [1000000, .069], [Infinity, .0699]];
const SEUILS_B = [[16000, .02], [80000, .045], [160000, .055], [320000, .06], [400000, .065], [800000, .069], [Infinity, .0699]];
if (Math.abs(tpgS(75000, 0, SEUILS_F, 100, 0, 0) - a75.etat) > 0.006) echec("CT 75 000 celibataire : formule " + tpgS(75000, 0, SEUILS_F, 100, 0, 0) + ", moteur " + a75.etat);
if (Math.abs(tpgS(75000, 0, SEUILS_C, 0, 0, 0.10) - j75.etat) > 0.006) echec("CT 75 000 marie");
if (Math.abs(tpgS(75000, 0, SEUILS_B, 0, 0, 0.08) - h75.etat) > 0.006) echec("CT 75 000 chef de famille");
if (Math.abs(a75.federal - 7670) > 1e-9 || Math.abs(j75.federal - 4640) > 1e-9 || Math.abs(h75.federal - 5748) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (recalculee a la main le 20/10/2026). */
const attendus = [
  [a75.etat, 3475, "etat 75 000"], [initial75, 3375, "2 000 + 25 000 x 5,5 %"], [j75.etat, 2587.5, "etat marie"], [h75.etat, 2737, "etat chef de famille"],
  [a75.net, 57742.5, "net 75 000"], [pl(a75), 375, "Paid Leave 75 000"], [a75.total, 17257.5, "total 75 000"],
  [j75.net, 61660, "net marie"], [h75.net, 60402.5, "net chef de famille"],
  [a17.etat, 10, "etat 17 000 (2 000 x 2 % = 40 x 0,25)"], [a30.etat, 361.25, "etat 30 000"], [a45.etat, 1597.5, "etat 45 000 (1 775 x 0,90)"],
  [a60.etat, 2317.5, "etat 60 000 (2 575 x 0,90)"], [a64.etat, 2819.025, "etat 64 500 (2 847,50 x 0,99)"], [a64b.etat, 2847.555, "etat 64 501"],
  [a66.etat, 2957.5, "etat 66 500 (2 907,50 + 50)"], [a250.etat, 15400, "etat 250 000 (14 000 + 250 + 1 150)"], [a300.etat, 19750, "etat 300 000"],
  [sansCtw4, 5242.5, "75 000 x 6,99 %"], [ecartSansCtw4, 1767.5, "ecart sans CT-W4"], [gain401, 272.5, "gain 401(k)"],
  [plMax, 922.5, "Paid Leave maximal"], [pl(r401), 375, "Paid Leave avec 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [mensuel75, 289.5833, "mensuel"], [saut, 28.53, "saut a 64 501 $"]
];
for (const [obtenu, attendu, nom] of attendus) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
/* 20 $/h = 41 600 $ : exoneration 15 000 jusqu'a 30 000, puis 0 au-dela de 44 000 ; 41 600 -> exo 4 000 (41 000 < s <= 42 000 : 3 000). Recalcul : exo 3 000, imposable 38 600 :
   200 + 28 600 x 4,5 % = 1 487 ; credit E(F) a 41 600 = 0,10 -> 1 338,30. */
attendus.push();
if (Math.abs(h20.etat - 1338.3) > 0.006) echec("etat 20 $/h : " + h20.etat);
if (Math.abs(h25.etat - 1899) > 0.006) echec("etat 25 $/h : " + h25.etat);
if (Math.abs(h30.etat - 2595.4) > 0.006) echec("etat 30 $/h : " + h30.etat);
const ex = IT.deductionByIncome;
const exAt = (s, st) => ex.find(x => x.upTo === null || s <= x.upTo).amounts[st];
if (!(exAt(30000, "single") === EXO.s && exAt(30001, "single") === 14000 && exAt(44000, "single") === 1000 && exAt(44001, "single") === 0 && exAt(48000, "marriedJoint") === EXO.j && exAt(71000, "marriedJoint") === 1000 && exAt(71001, "marriedJoint") === 0 && exAt(38000, "headOfHousehold") === EXO.h && exAt(56000, "headOfHousehold") === 1000 && exAt(56001, "headOfHousehold") === 0)) echec("exonerations != TPG-211 Table A (15 000 / 24 000 / 19 000, nulles a 44 001 / 71 001 / 56 001)");
const cr = IT.stepAdjustments.credit;
if (!(cr.single[0][1] === 0.75 && cr.single[cr.single.length - 2][0] === 64500 && cr.single[cr.single.length - 2][1] === 0.01 && cr.single[cr.single.length - 1][1] === 0)) echec("credit E != TPG-211");
if (!(PL.rate === 0.005 && PL.wageCap === R.fica.socialSecurity.wageBase)) echec("Paid Leave != 0,5 % jusqu'a la base FICA");
for (const k of COMPARE.slice(1)) if (!R.states[k]) echec("voisin absent du moteur : " + k);
if (a75.programmes.length !== 1) echec("le Connecticut doit avoir un seul programme salarie (Paid Leave)");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 2500) echec(motsProse + " mots hors tableaux, sous le plancher de 2 500");
if ((html.match(/<h3/g) || []).length < 30) echec("moins de 30 H3");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements de la TPG-211 (formule ecrite a la main, 75 000 $ celibataire, marie et chef de famille) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
