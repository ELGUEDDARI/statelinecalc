/* Construit /state-comparison/.
 *
 * ── POURQUOI CETTE PAGE EXISTE ──────────────────────────────────────────────
 * Veille concurrentielle du 12/09/2026, demandee par le PDG : ADP, SmartAsset,
 * PaycheckCity et Gusto/QuickBooks n'offrent AUCUN comparateur cote a cote
 * correct entre deux Etats sur le MEME salaire. Un visiteur qui envisage une
 * relocalisation tape "Illinois vs Texas paycheck" ou compare deux offres
 * d'emploi dans deux Etats differents ; aucun des quatre gros ne repond
 * directement a cette question sur une seule page.
 *
 * ── CE QUE CETTE PAGE NE FAIT PAS ────────────────────────────────────────────
 *   - aucune nouvelle regle fiscale : tout sort de .tooling/lib/paie.js
 *     (calcul()), le meme moteur que chaque page d'Etat et que le
 *     build-75k-by-state.js deja en ligne ;
 *   - aucune comparaison sur un Etat que nous ne publions pas encore. Les
 *     deux menus deroulants et le tableau ne listent que PUBLIES ;
 *   - aucune affirmation sur le cout de la vie, le loyer ou la taxe fonciere :
 *     ce calculateur ne modelise que la paie, comme les autres, et le dit.
 *
 * Lancer : node .tooling/ops/build-state-comparison.js
 */
const fs = require("fs");
const path = require("path");
const { calcul, c2, c0 } = require("../lib/paie.js");
const { PUBLIES } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");

const RACINE = path.join(__dirname, "..", "..");
const SLUG = "state-comparison";
const URL = "https://statelinecalc.com/" + SLUG + "/";
const VERIFIE_LE = "2026-09-12";

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\s+/g, " ").trim();
const pct = n => (n * 100).toFixed(1) + "%";
const liste = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + (a.length > 2 ? "," : "") + " and " + a[a.length - 1];

/* --- les deux Etats de l'exemple par defaut : contraste maximal parmi les
   18 publies, et les deux figurent deja dans les recherches de relocalisation
   les plus courantes (Illinois -> Texas). --- */
const A_NOM = "Texas", A_CLE = "texas";
const B_NOM = "Illinois", B_CLE = "illinois";

/* --- garde-fous : la page ne sort pas si le classement des Etats sans impot
   ne correspond plus a ce que le fichier de taux dit vraiment. --- */
const S = require("../../data/rates-2026.js").states;
const SANS_IMPOT = Object.entries(PUBLIES)
  .filter(([, cle]) => S[cle].incomeTax.hasIncomeTax === false)
  .map(([nom]) => nom).sort();
const AVEC_IMPOT = Object.entries(PUBLIES)
  .filter(([, cle]) => S[cle].incomeTax.hasIncomeTax === true)
  .map(([nom]) => nom).sort();
if (SANS_IMPOT.length + AVEC_IMPOT.length !== Object.keys(PUBLIES).length) {
  throw new Error("ARRET : classement incomplet");
}
if (!S[A_CLE] || S[A_CLE].incomeTax.hasIncomeTax !== false) throw new Error("ARRET : " + A_NOM + " n'est plus sans impot");
if (!S[B_CLE] || S[B_CLE].incomeTax.hasIncomeTax !== true) throw new Error("ARRET : " + B_NOM + " n'est plus a impot");

/* --- le tableau croise : meme liste de salaires que les tableaux par Etat,
   mais deux colonnes au lieu d'une, plus l'ecart. Genere par calcul(), jamais
   saisi a la main. --- */
const SALAIRES = [25000, 30000, 35000, 40000, 45000, 50000, 60000, 70000, 75000, 80000,
  90000, 100000, 125000, 150000, 200000, 250000, 300000, 400000, 500000];
const LIGNES = SALAIRES.map(brut => {
  const ra = calcul(A_CLE, brut), rb = calcul(B_CLE, brut);
  return { brut, netA: ra.net, netB: rb.net, ecart: ra.net - rb.net };
});
LIGNES.forEach(l => { if (!isFinite(l.ecart)) throw new Error("ARRET : ecart non fini a " + l.brut); });

/* --- l'exemple chiffre detaille, a 75 000 $, celibataire --- */
const EX = 75000;
const exA = calcul(A_CLE, EX), exB = calcul(B_CLE, EX);
const exEcart = exA.net - exB.net;
const federalEtFicaEx = exA.federal + exA.ss + exA.med; /* identique dans les deux colonnes */
if (Math.abs(federalEtFicaEx - (exB.federal + exB.ss + exB.med)) > 0.01) {
  throw new Error("ARRET : federal+FICA divergent entre les deux Etats a revenu egal");
}

/* Washington : contre-exemple cite dans "Common mistakes" ci-dessous, pour ne
   pas laisser croire que "no income tax" = "rien retenu" partout. */
const exWa = calcul("washington", EX);
const waProgrammes = exWa.paidLeave + exWa.waCares;
if (!(waProgrammes > 0)) throw new Error("ARRET : Washington sans programme d'Etat, contre-exemple invalide");

/* --- les 18 Etats, pour les deux menus et la grille du bas --- */
const OPTIONS_ETATS = Object.entries(PUBLIES).sort((a, b) => a[0].localeCompare(b[0]));

/* Ecrit en caracteres reels (em dash "—", apostrophe courbe "'"), jamais en
   entites HTML "&mdash;"/"&rsquo;" : ce meme tableau alimente le JSON-LD, que
   personne ne decode comme du HTML. La version visible plus bas reutilise ces
   memes chaines telles quelles — un navigateur affiche un em dash Unicode
   exactement comme il afficherait l'entite. */
const faq = [
  ["What actually changes when you compare two states on the same salary?",
   "Only the state part. Federal income tax, Social Security and Medicare are set by federal " +
   "law and come out the same in every state — on a $" + c0(EX) + " single filer they take " +
   "$" + c2(federalEtFicaEx) + " no matter where you work. What differs is state income tax and " +
   "any state payroll program, such as Washington's Paid Leave and WA Cares. That is the " +
   "whole gap this tool measures."],
  ["Which of the states you publish have no state income tax?",
   liste(SANS_IMPOT) + " tax no wages at all. " + liste(AVEC_IMPOT) + " do, each at its own rate " +
   "and with its own standard deduction — see each state's own calculator for the " +
   "full breakdown."],
  ["Why does Washington show a smaller paycheck than Texas even though neither taxes income?",
   "Washington withholds two state programs that Texas does not: Paid Family and Medical Leave " +
   "and WA Cares, a long-term-care premium. Together they take about 1.4% of gross wages " +
   "in Washington. “No income tax” and “nothing withheld at all” are not the " +
   "same claim, and this tool keeps them separate rather than lumping every no-tax state " +
   "together."],
  ["Does this tool account for cost of living, rent or property tax?",
   "No, and it does not claim to. It compares payroll withholding only — the same scope as " +
   "every calculator on this site. A state with no income tax can still cost more to live in " +
   "once housing and property tax are counted, and a state with a smaller paycheck can cost less " +
   "overall. Those figures are outside what a paycheck calculator can honestly tell you."]
];

const titre = "Compare Take-Home Pay Between Two States (2026)";
/* Sous ~155-160 caracteres : au-dela, Google tronque la description dans la
   SERP, souvent en plein milieu d'un mot. Controle du 12/09/2026. */
const desc = "Compare " + A_NOM + " vs " + B_NOM + ", or any two of the " + Object.keys(PUBLIES).length +
  " states we publish, on the same salary — see the exact 2026 take-home pay " +
  "difference, side by side.";

const grilleEtats = OPTIONS_ETATS.map(([nom, cle]) =>
  `        <li><a href="/paycheck-calculator/${cle}/">${nom}</a></li>`).join("\n");

const ligneTabla = LIGNES.map(l => `        <tr>
          <td class="num">$${c0(l.brut)}</td>
          <td class="num">$${c2(l.netA)}</td>
          <td class="num">$${c2(l.netB)}</td>
          <td class="num"><strong>$${c2(Math.abs(l.ecart))}</strong> ${l.ecart >= 0 ? "more in " + A_NOM : "more in " + B_NOM}</td>
        </tr>`).join("\n");

const optionsA = OPTIONS_ETATS.map(([nom, cle]) =>
  `            <option value="${cle}"${cle === A_CLE ? " selected" : ""}>${nom}</option>`).join("\n");
const optionsB = OPTIONS_ETATS.map(([nom, cle]) =>
  `            <option value="${cle}"${cle === B_CLE ? " selected" : ""}>${nom}</option>`).join("\n");

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
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
<meta property="og:type" content="website">
<meta property="og:image" content="https://statelinecalc.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "State Paycheck Comparison Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "${q("Compares 2026 take-home pay between any two of the " + Object.keys(PUBLIES).length + " US states StateLine Calc publishes, on the same gross salary, using the same payroll engine as the individual state calculators.")}",
      "publisher": { "@id": "https://statelinecalc.com/#organization" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Compare states", "item": "${URL}" }
      ]
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
    <li aria-current="page">Compare states</li>
  </ol>
</nav>

  <h1>Compare Take-Home Pay Between Two States</h1>

  <div class="answer">
    <p><strong>Moving your paycheck to another state only changes the state part.</strong>
    Federal income tax, Social Security and Medicare are set by federal law and come out the
    same everywhere &mdash; on a $${c0(EX)} salary they take $${c2(federalEtFicaEx)} no matter
    the state. Pick any two of the ${Object.keys(PUBLIES).length} states we publish below to see
    the exact 2026 dollar difference on your own salary, using the same engine as our individual
    state calculators.</p>
    <p class="answer-jump"><a href="#calc-h">Compare two states &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
  <div class="box-neutre">
    <h3 class="u-mt-0">What you need before you compare</h3>
    <ul class="prose">
      <li>Your gross annual salary &mdash; or the salary you are comparing against an offer</li>
      <li>Your filing status &mdash; single, married filing jointly, or head of household</li>
      <li>The two states you want to compare, from the ${Object.keys(PUBLIES).length} we currently publish</li>
    </ul>
  </div>

  <h2 id="calc-h" class="u-mt-0">Compare two states</h2>

  <form class="calc" data-compare-form novalidate>
    <div class="field">
      <label for="salary">Gross annual salary</label>
      <input type="text" id="salary" name="salary" inputmode="decimal" value="${EX}"
             autocomplete="off">
      <span class="help">Before any taxes or deductions. Whole-year amount, even if you are paid
      more often.</span>
      <span class="error" role="alert">Enter an amount greater than zero.</span>
    </div>

    <div class="field">
      <label for="cmp-filing">Filing status</label>
      <select id="cmp-filing" name="filing">
        <option value="single" selected>Single</option>
        <option value="marriedJoint">Married filing jointly</option>
        <option value="headOfHousehold">Head of household</option>
      </select>
    </div>

    <div class="row row-2">
      <div class="field">
        <label for="cmp-state-a">First state</label>
        <select id="cmp-state-a" name="stateA">
${optionsA}
        </select>
      </div>

      <div class="field">
        <label for="cmp-state-b">Second state</label>
        <select id="cmp-state-b" name="stateB">
${optionsB}
        </select>
      </div>
    </div>

    <button type="submit" class="btn btn-primary">Compare</button>
  </form>

  <div class="result" data-compare-result aria-live="polite"></div>

  <p class="caption u-mt-3">
    Everything is calculated in your browser. Nothing you type is sent to us or stored.
    There is no sign-up and no personal data is required.
  </p>
  </section>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">
    <h2>How this comparison works</h2>
    <p>This tool runs the same calculation twice on the same salary &mdash; once for each state
    you pick &mdash; using the identical engine behind every individual state calculator on this
    site. Nothing about the arithmetic changes: the same 2026 federal brackets, the same Social
    Security and Medicare rates, and each state&rsquo;s own income tax rules exactly as published
    on its own calculator page.</p>
    <p>What is held constant so the comparison is fair:</p>
    <ul>
      <li>The same gross annual salary in both columns.</li>
      <li>The same filing status in both columns.</li>
      <li>A single filer&rsquo;s standard deduction, no 401(k) contribution, no itemizing and no
      tax credits beyond what a state builds into its withholding formula (Utah and Nebraska
      both do; their own calculators explain how).</li>
    </ul>
    <p>What it does not do, on purpose: it does not model local or city income tax (Philadelphia,
    Detroit, and a number of Ohio municipalities all levy their own, on top of the state figure
    shown here), and it does not model cost of living, rent, or property tax. A state with a
    larger paycheck is not automatically the cheaper place to live. Full sourcing for every rate
    used here is on the <a href="/methodology/">methodology page</a>, dated ${VERIFIE_LE}.</p>
  </div>

  <h2>${A_NOM} vs ${B_NOM}: take-home pay at every salary</h2>
  <p class="prose">Single filer, standard deduction, no retirement contribution, 2026 rates.
  ${A_NOM} has no state income tax; ${B_NOM} taxes wages at a flat rate after its own standard
  deduction &mdash; the two states most often weighed against each other on this site.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">${A_NOM} vs ${B_NOM}, single filer, 2026 take-home pay</caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">${A_NOM} take-home</th>
          <th scope="col">${B_NOM} take-home</th>
          <th scope="col">Difference</th>
        </tr>
      </thead>
      <tbody>
${ligneTabla}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h2>Key facts about comparing states</h2>
    <ul>
      <li><strong>${SANS_IMPOT.length} of the ${Object.keys(PUBLIES).length} states we publish
      have no state income tax:</strong> ${liste(SANS_IMPOT)}.</li>
      <li><strong>${AVEC_IMPOT.length} do tax wages:</strong> ${liste(AVEC_IMPOT)} &mdash; each
      at its own rate, with its own standard deduction, and in some cases a credit or a sliding
      formula instead of a flat deduction. Their calculators show the full arithmetic.</li>
      <li><strong>"No income tax" is not the same claim as "nothing withheld."</strong> Washington
      has no income tax but withholds Paid Family and Medical Leave and WA Cares; both are state
      payroll programs, not income tax, and both show up in this comparison.</li>
      <li><strong>Federal tax, Social Security and Medicare never move between states.</strong>
      Only the rows this tool actually changes &mdash; state tax and state programs &mdash; explain
      any gap you see.</li>
    </ul>

    <h2>Common mistakes when comparing take-home pay across states</h2>
    <ul>
      <li><strong>Comparing two job offers by gross salary alone.</strong> A $5,000 raise to move
      from a no-tax state into a state with a flat 5% tax can be a smaller raise after tax than
      it looks, once the standard deduction and rate are applied.</li>
      <li><strong>Assuming every no-income-tax state withholds nothing else.</strong> Washington
      is the counter-example on this site: on a $${c0(EX)} salary its WA Cares and Paid Leave
      premiums together take $${c2(waProgrammes)} that ${A_NOM} does not, even though neither
      state has an income tax. See the <a href="/paycheck-calculator/washington/">Washington
      calculator</a> for the full breakdown.</li>
      <li><strong>Forgetting local or city income tax.</strong> This tool, like every calculator
      on this site, stops at the state figure. Philadelphia, Detroit, and several Ohio school
      districts add a further layer that a state-level comparison will not show.</li>
      <li><strong>Treating a larger paycheck as a lower cost of living.</strong> The two are not
      the same question, and this tool only answers the first one.</li>
    </ul>

    <h2>Example: $${c0(EX)} in ${A_NOM} versus ${B_NOM}</h2>
    <p>A single filer earning $${c0(EX)} keeps $${c2(exA.net)} a year in ${A_NOM} and
    $${c2(exB.net)} a year in ${B_NOM} &mdash; a difference of $${c2(Math.abs(exEcart))} a year,
    or $${c2(Math.abs(exEcart) / 12)} a month. Federal income tax, Social Security and Medicare
    account for $${c2(federalEtFicaEx)} in both states, identically. The entire gap is
    ${B_NOM}&rsquo;s state income tax of $${c2(exB.etat)}, which ${A_NOM} does not levy at all.</p>
    <p>Both figures come directly from this site&rsquo;s own state calculators: see the full
    breakdown on the <a href="/paycheck-calculator/${A_CLE}/">${A_NOM} calculator</a> and the
    <a href="/paycheck-calculator/${B_CLE}/">${B_NOM} calculator</a>.</p>

    <h2>Frequently asked questions</h2>
    <section class="faq">
${faq.map(([n, a]) => `      <h3>${n}</h3>
      <p>${a}</p>`).join("\n")}
    </section>

    <h2>Browse every state calculator</h2>
    <p>The comparator above draws from these same ${Object.keys(PUBLIES).length} pages. Each one
    shows the full deduction-by-deduction arithmetic for that state alone, with its 2026 rate
    sourced and dated.</p>
    <ul class="linkgrid">
${grilleEtats}
    </ul>
    <p class="caption">More states are being added; each one needs its own rates read from that
    state's own agency before it appears here or in the comparator &mdash; see the
    <a href="/paycheck-calculator/">state index</a>.</p>

    <p class="dates">Published ${VERIFIE_LE} &middot; Updated ${VERIFIE_LE}. Figures are read from
    the same sources as our individual state calculators; see the
    <a href="/methodology/">methodology page</a> for the full list.</p>

    <p class="disclaimer">This tool is information, not tax or relocation advice. It compares
    payroll withholding only &mdash; not local income tax, cost of living, rent, or property tax.
    Rates are read from the agency or law that sets them and dated; if a state publishes a
    correction, the figure here changes with it. See our <a href="/disclaimer/">full
    disclaimer</a>.</p>
  </div>

</div>
${colonne(null)}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
<script src="/assets/compare.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, SLUG);
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");
console.log("ECRIT : /" + SLUG + "/index.html  (" + html.length + " octets)");
console.log("  " + A_NOM + " a $" + c0(EX) + " : net $" + c2(exA.net));
console.log("  " + B_NOM + " a $" + c0(EX) + " : net $" + c2(exB.net));
console.log("  ecart : $" + c2(Math.abs(exEcart)));
