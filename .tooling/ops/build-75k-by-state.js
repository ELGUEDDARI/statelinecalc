/* Construit /75000-salary-take-home-pay-by-state/.
 *
 * ── POURQUOI CETTE PAGE EXISTE ──────────────────────────────────────────────
 * Chantier B (autorite), decide le 11/09/2026. Le site a 0 domaine referent
 * reel (Ahrefs 05/09 : 91 domaines, ~90 tagues SPAM). Une page d'Etat n'attire
 * pas de lien : elle repond a une question personnelle. Ce qui attire un lien,
 * c'est un CLASSEMENT ou un FAIT DATE qu'un journaliste, un blog RH ou un
 * forum peut citer en une phrase. Cette page en porte deux :
 *   1. le classement des Etats publies sur un salaire de 75 000 $ ;
 *   2. ce que les lois entrees en vigueur le 1er janvier 2026 changent, en
 *      dollars, sur ce meme salaire.
 *
 * ── CE QUE CETTE PAGE NE DIT PAS ────────────────────────────────────────────
 *   - rien sur un Etat non publie : la liste sort de PUBLIES, le titre compte
 *     les Etats a la generation, et la page dit qu'elle est incomplete ;
 *   - aucun montant 2025 qui ne soit pas lu dans data/rates-2026.js. Pour le
 *     Nebraska et l'Utah, la baisse est ecrite en TAUX seulement : le fichier
 *     ne porte pas les autres parametres 2025, donc pas de dollar ;
 *   - la comparaison 2025/2026 isole l'effet de la LOI D'ETAT : meme revenu
 *     imposable, deux baremes. Elle ne dit pas « votre impot 2025 », qui
 *     dependrait de la deduction federale 2025, absente du depot.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js
 * ou des constantes 2025 lues verbatim dans data/rates-2026.js (sources et
 * dates dans ce fichier-la). Lancer : node .tooling/ops/build-75k-by-state.js
 */
const fs = require("fs");
const path = require("path");
const { R, calcul, c2, c0, progressiveTax } = require("../lib/paie.js");
const { PUBLIES } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { PAR_ETAT, VERIFIE_LE } = require("../lib/sources.js");

const RACINE = path.join(__dirname, "..", "..");
/* Memes constantes BLS que build-rate-page.js (OEWS, mai 2025, publie le 15/05/2026). */
const BLS_MEDIAN = 24.51, BLS_MEAN_AN = "$69,770", BLS_ANNEE = "2025", BLS_PUBLIE = "May 15, 2026";
const SLUG = "75000-salary-take-home-pay-by-state";
const URL = "https://statelinecalc.com/" + SLUG + "/";
const BRUT = 75000;
const D = "$" + c0(BRUT);

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\s+/g, " ").trim();
const pct = n => (n * 100).toFixed(2) + "%";
/* « A, B, and C » : une liste en position de sujet prend la conjonction. */
const liste = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + (a.length > 2 ? "," : "") + " and " + a[a.length - 1];

/* --- le classement --------------------------------------------------------- */
const ETATS = Object.entries(PUBLIES).map(([nom, cle]) => {
  const r = calcul(cle, BRUT);
  const autres = r.paidLeave + r.waCares
    + r.programmes.reduce((t, p) => t + p.montant, 0);
  return { cle, nom, etat: r.etat, autres, net: r.net,
           tauxEtat: r.etat / BRUT, lien: "/paycheck-calculator/" + cle + "/" };
}).sort((a, b) => b.net - a.net || a.nom.localeCompare(b.nom));

const N = ETATS.length;
const MOTS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty"];
const NOMBRE_DE = n => MOTS[n] || String(n);
const Nombre = n => { const m = NOMBRE_DE(n); return m[0].toUpperCase() + m.slice(1); };
const NOMBRE = NOMBRE_DE(N);
const haut = ETATS[0], bas = ETATS[N - 1];
const ecart = haut.net - bas.net;
const sansImpot = ETATS.filter(e => e.etat === 0);
const avecImpot = ETATS.filter(e => e.etat > 0);
const plusLourd = avecImpot.reduce((m, e) => e.etat > m.etat ? e : m, avecImpot[0]);
const plusLeger = avecImpot.reduce((m, e) => e.etat < m.etat ? e : m, avecImpot[0]);
/* Le federal et la FICA sont identiques partout : c'est ce qui rend le
   classement lisible. On les mesure sur un Etat sans impot pour le dire. */
const ref = calcul("texas", BRUT);
const federalEtFica = ref.federal + ref.ss + ref.med;

/* --- ce qui a change le 1er janvier 2026, sur le meme revenu imposable ------ */
const S = R.states;
const ded = (cle, statut = "single") => S[cle].incomeTax.standardDeduction[statut];

/* Montana : MCA 15-30-2103, bareme 2025 (21 100 $ / 5,9 %) et 2026
   (47 500 $ / 5,65 %). Les deux constantes 2025 sont dans rates-2026.js. */
const MT_S2025 = 21100, MT_T2_2025 = 0.059;
const mtImposable = BRUT - ded("montana");
const mt2025 = progressiveTax(mtImposable, [[MT_S2025, 0.047], [null, MT_T2_2025]]);
const mt2026 = progressiveTax(mtImposable, S.montana.incomeTax.brackets.single);
const mtGain = mt2025 - mt2026;

/* Caroline du Nord : 4,25 % (2025) -> 3,99 % (2026), NCDOR « Tax Rate
   Schedules ». Deduction 12 750 $ : la seule publiee, cf. rates-2026.js. */
const NC_T2025 = 0.0425;
const ncImposable = BRUT - ded("north-carolina");
const ncGain = ncImposable * (NC_T2025 - S["north-carolina"].incomeTax.brackets.single[0][1]);

/* Georgie : 5,19 % -> 4,99 %, guide de l'employeur 2026, avec la date du
   11 mai 2026 a partir de laquelle la retenue peut passer au nouveau taux. */
const GA_T2025 = 0.0519;
const gaImposable = BRUT - ded("georgia");
const gaGain = gaImposable * (GA_T2025 - S.georgia.incomeTax.brackets.single[0][1]);

/* Ohio : ORC 5747.02(A)(3), la constante de la marche passe de 342,00 $
   (2025) a 332,00 $ (2026) ; le taux au-dessus de 26 050 $ reste 2,75 %. */
const OH_MARCHE_2025 = 342, OH_MARCHE_2026 = S.ohio.incomeTax.notch.add;
const ohGain = OH_MARCHE_2025 - OH_MARCHE_2026;

/* Hawaii : Act 46 (2024), deduction standard 4 400 $ (2025) -> 8 000 $
   (2026), meme bareme les deux annees. */
const HI_DED_2025 = 4400;
const hiBandes = S.hawaii.incomeTax.brackets.single;
const hi2025 = progressiveTax(BRUT - HI_DED_2025, hiBandes);
const hi2026 = progressiveTax(BRUT - ded("hawaii"), hiBandes);
const hiGain = hi2025 - hi2026;

/* Utah : 4,5 % -> 4,45 % (Utah Code 59-10-104, Pub 14 rev. 4/26). L'Utah n'a
   pas de deduction : le taux s'applique au salaire, puis un credit se
   retranche. Le credit ne depend pas du taux, donc l'effet du taux seul est
   exact ; on ne dit rien du credit 2025, qui n'est pas dans le depot. */
const UT_T2025 = 0.045;
const utGain = BRUT * (UT_T2025 - S.utah.incomeTax.brackets.single[0][1]);

/* Nebraska : DOR « Tax Rate Chronologies », taux haut 5,20 % -> 4,55 %. Les
   seuils 2025 ne sont pas dans le depot : pas de dollar, le taux seulement. */

const gains = [
  { cle: "montana", gain: mtGain },
  { cle: "hawaii", gain: hiGain },
  { cle: "north-carolina", gain: ncGain },
  { cle: "georgia", gain: gaGain },
  { cle: "utah", gain: utGain },
  { cle: "ohio", gain: ohGain }
].map(g => Object.assign(g, { nom: S[g.cle].name })).sort((a, b) => b.gain - a.gain);
const gainMax = gains[0], gainMin = gains[gains.length - 1];

/* --- garde-fous : la page ne sort pas si un chiffre ne retombe pas juste ---- */
const attendu = (nom, a, b) => {
  if (Math.abs(a - b) > 0.005) throw new Error("ARRET : " + nom + " " + a + " != " + b);
};
attendu("Montana 2026 = moteur", mt2026, calcul("montana", BRUT).etat);
attendu("Hawaii 2026 = moteur", hi2026, calcul("hawaii", BRUT).etat);
attendu("Georgia 2026 = moteur", gaImposable * S.georgia.incomeTax.brackets.single[0][1],
        calcul("georgia", BRUT).etat);
attendu("North Carolina 2026 = moteur",
        ncImposable * S["north-carolina"].incomeTax.brackets.single[0][1],
        calcul("north-carolina", BRUT).etat);
gains.forEach(g => { if (!(g.gain > 0)) throw new Error("ARRET : gain non positif " + g.cle); });
if (sansImpot.length === 0 || avecImpot.length === 0) throw new Error("ARRET : classement vide");

/* --- les lignes ------------------------------------------------------------ */
const ligneEtats = ETATS.map((e, i) => `        <tr>
          <td class="num">${i + 1}</td>
          <td><a href="${e.lien}">${e.nom}</a></td>
          <td class="num">${e.etat ? "$" + c2(e.etat) : "none"}</td>
          <td class="num">${e.autres ? "$" + c2(e.autres) : "&mdash;"}</td>
          <td class="num"><strong>$${c0(e.net)}</strong></td>
          <td class="num">$${c2(e.net / 12)}</td>
          <td class="num">${e.etat ? pct(e.tauxEtat) : "0%"}</td>
        </tr>`).join("\n");

const ligneGains = gains.map(g => `        <tr>
          <td><a href="/paycheck-calculator/${g.cle}/">${g.nom}</a></td>
          <td>${{
            montana: "first bracket widened from $" + c0(MT_S2025) + " to $" + c0(S.montana.incomeTax.brackets.single[0][0]) + "; top rate " + pct(MT_T2_2025) + " &rarr; " + pct(S.montana.incomeTax.brackets.single[1][1]),
            hawaii: "standard deduction $" + c0(HI_DED_2025) + " &rarr; $" + c0(ded("hawaii")),
            "north-carolina": "flat rate " + pct(NC_T2025) + " &rarr; " + pct(S["north-carolina"].incomeTax.brackets.single[0][1]),
            georgia: "flat rate " + pct(GA_T2025) + " &rarr; " + pct(S.georgia.incomeTax.brackets.single[0][1]),
            utah: "flat rate " + pct(UT_T2025) + " &rarr; " + pct(S.utah.incomeTax.brackets.single[0][1]) + " (rate effect only)",
            ohio: "fixed amount above $" + c0(S.ohio.incomeTax.notch.over) + ": $" + c0(OH_MARCHE_2025) + " &rarr; $" + c0(OH_MARCHE_2026)
          }[g.cle]}</td>
          <td class="num"><strong>$${c2(g.gain)}</strong></td>
          <td class="num">$${c2(g.gain / 12)}</td>
        </tr>`).join("\n");

const faq = [
  ["How much is " + D + " after taxes?",
   "Between $" + c0(bas.net) + " and $" + c0(haut.net) + " a year in the " + NOMBRE + " states on "
   + "this page, for a single filer taking the standard deduction in 2026 with no 401(k). Federal "
   + "income tax, Social Security and Medicare take $" + c0(federalEtFica) + " everywhere; the "
   + "state is the only thing that moves."],
  ["Which state keeps the most of a " + D + " salary?",
   sansImpot.length > 1
     ? liste(sansImpot.map(e => e.nom)) + " have no state income tax, so each leaves $"
       + c0(sansImpot[sansImpot.length - 1].net) + " or more. " + haut.nom + " tops the table at $"
       + c0(haut.net) + ". Among the states that do tax wages, " + plusLeger.nom + " takes the "
       + "least: $" + c2(plusLeger.etat) + " a year."
     : haut.nom + " leaves $" + c0(haut.net) + "."],
  ["Which state takes the most from " + D + "?",
   plusLourd.nom + ", at $" + c2(plusLourd.etat) + " of state income tax, or " + pct(plusLourd.tauxEtat)
   + " of gross pay. The lowest take-home on the page is " + bas.nom + " at $" + c0(bas.net)
   + " once every state deduction is counted."],
  ["Which states cut their income tax for 2026?",
   "Of the " + NOMBRE + " states here, " + NOMBRE_DE(gains.length) + " changed their law for tax year 2026, "
   + "and on a " + D + " salary the saving runs from $" + c2(gainMax.gain) + " in " + gainMax.nom
   + " to $" + c2(gainMin.gain) + " in " + gainMin.nom + ". Nebraska also cut its top rate from "
   + "5.20% to 4.55%. Each change is listed above with the law behind it."],
  ["Is " + D + " a good salary?",
   "It is above the national median. Across all US occupations the median wage is $"
   + BLS_MEDIAN.toFixed(2) + " an hour, or $" + c0(BLS_MEDIAN * 2080) + " a year at 2,080 hours, "
   + "and the mean is " + BLS_MEAN_AN + " (Bureau of Labor Statistics, Occupational Employment "
   + "and Wage Statistics, May " + BLS_ANNEE + " data, released " + BLS_PUBLIE + "). What " + D
   + " is worth to you depends on the state column above and on your rent, which this page does "
   + "not know."],
  ["Why is Washington below the other states with no income tax?",
   "Washington has no income tax, but it withholds Paid Family and Medical Leave and the WA Cares "
   + "long-term-care premium from wages. On " + D + " those come to $"
   + c2(ETATS.find(e => e.cle === "washington").autres) + " a year. They are state deductions "
   + "on a pay stub, so the table counts them."]
];

const titre = D + " Salary: Take-Home Pay in " + N + " States, and What Changed in 2026";
const desc = "A " + D + " salary keeps $" + c0(bas.net) + " to $" + c0(haut.net) + " after tax "
  + "depending on the state. " + N + " states ranked, plus the 2026 tax cuts in dollars: "
  + gainMax.nom + " saves $" + c0(gainMax.gain) + ", " + gainMin.nom + " $" + c0(gainMin.gain) + ".";

const sourcesEtat = ["montana", "hawaii", "north-carolina", "georgia", "utah", "ohio", "nebraska"]
  /* Seules les sources d'impot sur le revenu : les manuels chomage et les
     plafonds d'assurance invalidite n'ont rien a faire sur cette page. */
  .map(cle => (PAR_ETAT[cle] || []).filter(s =>
      !/Labor|Employment Security|wage base/i.test(s.titre)).map(s =>
    '    <li><a href="' + s.url + '">' + s.titre + '</a>'
    + (s.quoi ? ' &mdash; ' + s.quoi + '.' : (s.perime ? ' &mdash; ' + s.perime + '.' : '.')) + '</li>'))
  .flat().join("\n");

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Meme politique de securite que le reste du site : les points de collecte
     analytics sont nommes, rien d'autre ne peut sortir. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>${q(titre)}</title>
<meta name="description" content="${q(desc)}">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="${q(titre)}">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="${q(desc)}">
<meta property="og:url" content="${URL}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://statelinecalc.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "${D} salary take-home pay by state", "item": "${URL}" }
      ]
    },
    {
      "@type": "Dataset",
      "name": "${q(D + " salary: take-home pay in " + N + " US states, 2026")}",
      "description": "${q("State income tax, other state payroll deductions and take-home pay on a " + D + " salary for a single filer, 2026 rates, in " + N + " states, with the dollar effect of each state tax change effective January 1, 2026.")}",
      "url": "${URL}",
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "creator": { "@id": "https://statelinecalc.com/#organization" },
      "temporalCoverage": "2026",
      "spatialCoverage": "United States",
      "dateModified": "${VERIFIE_LE}"
    },
    {
      "@type": "FAQPage",
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "mainEntity": [
${faq.map(([n, a]) => `        {
          "@type": "Question",
          "name": "${q(n)}",
          "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" }
        }`).join(",\n")}
      ]
    },
    ${JSON.stringify(organisation, null, 2).split("\n").map((l, i) => i ? "    " + l : l).join("\n")}
  ]
}
</script>
</head>
<body>

${entete(null)}

<main class="wrap">
<div class="col-contenu">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li aria-current="page">${D} salary by state</li>
  </ol>
</nav>

  <h1>${D} Salary: Take-Home Pay in ${N} States, and What Changed in 2026</h1>

  <div class="answer">
    <p class="answer-big"><span class="answer-figure">$${c0(bas.net)} to $${c0(haut.net)}</span>
    <span class="answer-label">a year after tax, depending on the state</span></p>
    <p>On a <strong>${D} salary</strong>, federal income tax, Social Security and Medicare take
    the same <strong class="num">$${c0(federalEtFica)}</strong> in every state. Everything after
    that is the state&rsquo;s decision, and across the ${NOMBRE} states we publish it is worth up
    to <strong>$${c0(ecart)}</strong> a year &mdash; $${c2(ecart / 12)} a month &mdash; between
    ${haut.nom} and ${bas.nom}, on identical pay.</p>
    <p>Single filer, standard deduction, 2026 rates, no 401(k). Every figure is produced by the
    same engine as our state calculators, from each state&rsquo;s own published 2026 law, and the
    sources are listed at the bottom with the date we checked them.</p>
  </div>

  <h2>${D} after tax, ranked by state</h2>
  <p>&ldquo;Other state deductions&rdquo; are the amounts a state takes from a pay stub that are
  not income tax &mdash; paid-leave and long-term-care premiums, mostly. They are why two states
  with no income tax do not land on the same line.</p>

  <div class="table-scroll">
    <table>
      <caption>${D} a year, single filer, 2026 &mdash; ${N} states</caption>
      <thead>
        <tr><th scope="col" class="num">#</th><th scope="col">State</th>
        <th scope="col" class="num">State income tax</th>
        <th scope="col" class="num">Other state deductions</th>
        <th scope="col" class="num">Take-home a year</th>
        <th scope="col" class="num">A month</th>
        <th scope="col" class="num">State tax rate on gross</th></tr>
      </thead>
      <tbody>
${ligneEtats}
      </tbody>
    </table>
  </div>

  <p>${Nombre(sansImpot.length)} of the ${NOMBRE} states tax no wages at all:
  ${sansImpot.map(e => `<a href="${e.lien}">${e.nom}</a>`).join(", ")}. Among the ${NOMBRE_DE(avecImpot.length)}
  that do, the spread on ${D} runs from <strong class="num">$${c2(plusLeger.etat)}</strong> in
  ${plusLeger.nom} to <strong class="num">$${c2(plusLourd.etat)}</strong> in ${plusLourd.nom}.
  That is ${pct(plusLeger.tauxEtat)} against ${pct(plusLourd.tauxEtat)} of gross pay &mdash; the
  headline rates of these states are further apart than that, because the deduction each one
  allows first shelters a different share of a ${D} salary.</p>

  <h2>What the January 1, 2026 tax changes are worth on ${D}</h2>
  <p>${Nombre(gains.length)} of these ${NOMBRE} states changed their income tax law for 2026. The figures
  below isolate the law: same ${D} salary, same standard deduction, the 2025 rule against the 2026
  rule. They are not a full 2025-versus-2026 return, which would also depend on that year&rsquo;s
  federal figures.</p>

  <div class="table-scroll">
    <table>
      <caption>2026 state income tax changes, measured on a ${D} salary, single filer</caption>
      <thead>
        <tr><th scope="col">State</th><th scope="col">What changed</th>
        <th scope="col" class="num">Saving a year</th><th scope="col" class="num">A month</th></tr>
      </thead>
      <tbody>
${ligneGains}
      </tbody>
    </table>
  </div>

  <p><strong>${gainMax.nom}</strong> is the largest cut on this salary${gainMax.cle === "montana"
    ? `: House Bill 337 more than doubled the first bracket, from $${c0(MT_S2025)} to
  $${c0(S.montana.incomeTax.brackets.single[0][0])}, and lowered the top rate from ${pct(MT_T2_2025)} to
  ${pct(S.montana.incomeTax.brackets.single[1][1])}. The same law already sets 2027 at $65,000 and
  5.40%, so the figure moves again next year.` : "."}</p>
  <p><strong>Hawaii</strong> did not touch its rates; it doubled the standard deduction, from
  $${c0(HI_DED_2025)} to $${c0(ded("hawaii"))} for a single filer, under Act 46 of 2024. On ${D} the
  extra $${c0(ded("hawaii") - HI_DED_2025)} sheltered is taxed at Hawaii&rsquo;s upper brackets,
  which is why a deduction change is worth $${c2(hiGain)} here.</p>
  <p><strong>Georgia</strong>&rsquo;s cut carries a date most pages skip: the Department of
  Revenue&rsquo;s 2026 employer guide says employers must keep withholding at ${pct(GA_T2025)} until
  May 11, 2026, and may switch to ${pct(S.georgia.incomeTax.brackets.single[0][1])} from that day.
  The tax owed for the year is at ${pct(S.georgia.incomeTax.brackets.single[0][1])}; a Georgia pay
  stub from March is not.</p>
  <p><strong>Ohio</strong> is the smallest number on the table, and it is worth saying why. Ohio
  taxes nothing up to $${c0(S.ohio.incomeTax.notch.over)} of taxable income, then a fixed
  $${c0(OH_MARCHE_2026)} plus ${pct(S.ohio.incomeTax.brackets.single[1][1])} of the excess. For 2026
  the fixed amount fell from $${c0(OH_MARCHE_2025)} to $${c0(OH_MARCHE_2026)} and the rate above it did
  not change, so at ${D} the reform is worth $${c0(ohGain)}.</p>
  <p><strong>Nebraska</strong> lowered its top rate from 5.20% to 4.55% between January 1, 2025
  and January 1, 2026 (Department of Revenue, Tax Rate Chronologies, Table 1). Its 2025 brackets
  are not in our rate file, so we do not put a dollar figure on it here; the
  <a href="/paycheck-calculator/nebraska/">Nebraska page</a> carries the 2026 figures in full.</p>

  <h2>What this page assumes</h2>
  <ul>
    <li>A single filer taking the standard deduction, with no 401(k) or other pre-tax
    contribution. Married and head-of-household figures differ; every state calculator linked
    above takes those.</li>
    <li>2026 federal figures from Rev. Proc. 2025-32 and the 2026 Social Security wage base.
    Federal tax is identical in every row, which is the point: the table isolates the state.</li>
    <li>No local income tax. Cities and school districts in some of these states levy their own;
    the state pages say which.</li>
    <li>Only the ${NOMBRE} states we have published. The list grows as states are added, and the
    count in the title is generated from it, so this page never claims a state it does not
    cover.</li>
  </ul>

  <h2>Questions</h2>
  <dl class="faq">
${faq.map(([n, a]) => `    <dt>${n}</dt>
    <dd>${a}</dd>`).join("\n")}
  </dl>

  <h2>Use these figures</h2>
  <p>The tables on this page may be quoted or reproduced with a link to
  <a href="${URL}">${URL.replace("https://", "")}</a> as the source. Every number is
  reproducible from the state laws linked below and the 2026 federal figures, using the
  arithmetic described on our <a href="/methodology/">methodology page</a>.</p>

  <h2>Sources</h2>
  <p>Checked on ${VERIFIE_LE}. The state pages carry the complete list for each state.</p>
  <ul>
${sourcesEtat}
  </ul>

  <p class="caption">This is information, not tax advice. Rates are read from the agency or law
  that sets them and dated; if a state publishes a correction, the figure here changes with it.</p>

</div>
${colonne(null)}

</main>

${piedDePage()}

</body>
</html>
`;

const dossier = path.join(RACINE, SLUG);
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");
console.log("ECRIT : /" + SLUG + "/index.html  (" + html.length + " octets)");
console.log("  federal + FICA partout : $" + c2(federalEtFica));
ETATS.forEach((e, i) => console.log("  %s %s  etat %s  autres %s  net %s",
  String(i + 1).padStart(2), e.nom.padEnd(15), c2(e.etat).padStart(9), c2(e.autres).padStart(8), c0(e.net)));
console.log("  Baisses 2026 sur " + D + " :");
gains.forEach(g => console.log("    %s  $%s", g.nom.padEnd(15), c2(g.gain)));
