/* Construit une page "TAUX HORAIRE -> SALAIRE ANNUEL", par exemple
 * /25-an-hour-is-how-much-a-year/.
 *
 * POURQUOI CETTE FAMILLE EXISTE (mesure du 01/09/2026, SEMrush + Ahrefs) :
 *   - les 50 pages "<etat> salary to hourly" visent 5 270 de volume EN TOUT ;
 *   - le motif "X an hour is how much a year" pese 267 220 de volume sur
 *     2 295 requetes, KD median 12, et Ahrefs note la requete tete KD 0 :
 *     "Easy. Very few ref. domains to rank in top 10" ;
 *   - un domaine a DR 1 (paycheckcalculatorcalifornia.com) capte 3 543 visites
 *     sur cette requete. Nous sommes a DR 0 : le niveau requis est atteignable.
 * La demande est dans le TAUX, pas dans l'Etat.
 *
 * CE QUI NOUS DIFFERENCIE : les pages classees s'arretent au brut (25 x 2080).
 * Nous donnons le NET par Etat, ce que le moteur du site sait deja faire.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js,
 * la meme bibliotheque que la suite de tests compare au moteur du navigateur.
 *
 * Lancer : node .tooling/ops/build-rate-page.js 25
 */
const fs = require("fs");
const path = require("path");
const { FICHES, net, c2, c0, HEURES, RACINE } = require("./build-salary-to-hourly.js");

const taux = Number(process.argv[2] || 25);
if (!isFinite(taux) || taux <= 0) { console.error("Taux horaire invalide."); process.exit(1); }

const CLE = String(taux).replace(".", "-");
const SLUG = CLE + "-an-hour-is-how-much-a-year";
const URL = "https://statelinecalc.com/" + SLUG + "/";
const brut = taux * HEURES;                    // 40 h x 52 semaines
const D = "$" + c0(brut);

/* OU CE TAUX SE SITUE DANS LE MARCHE DU TRAVAIL AMERICAIN.
 *
 * Source lue le 05/09/2026 sur https://www.bls.gov/news.release/ocwage.htm :
 * Occupational Employment and Wage Statistics, donnees de MAI 2025, communique
 * du 15/05/2026. Ligne "All occupations" : 155 495 730 emplois, moyenne horaire
 * 33,54 $, moyenne annuelle 69 770 $, MEDIANE horaire 24,51 $.
 *
 * POURQUOI CE BLOC EXISTE : mesure du 05/09/2026 — les pages 25 et 27, une fois
 * les nombres neutralises, etaient identiques sur 311 lignes / 311. Des pages qui
 * ne different que par leurs chiffres sont du contenu produit a l'echelle, et le
 * site en porte deja le symptome (/salary-to-hourly-calculator/texas/ est en
 * "Crawled - currently not indexed" depuis le 28/08).
 * Ce bloc est la seule partie de la page qui change de CONCLUSION selon le taux,
 * pas seulement de montant. Ne pas le supprimer sans le remplacer par mieux.
 *
 * A REVERIFIER quand le BLS publiera les donnees de mai 2026 (vers mai 2027). */
const BLS_MEDIAN = 24.51;
const BLS_MEAN   = 33.54;
const BLS_MEAN_AN = "$69,770";
const BLS_EMPLOI = "155,495,730";
const BLS_ANNEE  = "2025";
const BLS_PUBLIE = "May 15, 2026";
const BLS_URL    = "https://www.bls.gov/news.release/ocwage.htm";

const ecartMed  = (taux / BLS_MEDIAN - 1) * 100;
const signeMed  = ecartMed >= 0 ? "above" : "below";
const pctMed    = Math.abs(ecartMed).toFixed(0);

/* Trois conclusions distinctes selon la position du taux dans la distribution. */
const phraseMarche =
  taux < BLS_MEDIAN
    ? "More than half of US jobs pay more than this, so the figures below describe pay in the " +
      "lower half of the national distribution."
  : taux < BLS_MEAN
    ? "More than half of US jobs pay less than this. The national mean of $" + BLS_MEAN.toFixed(2) +
      " is still higher, but a mean is pulled up by the best-paid occupations rather than by " +
      "typical pay."
    : "This clears both the median and the mean. Since the mean is pulled up by the highest-paid " +
      "occupations, passing it puts this rate in the upper part of the US wage distribution.";

/* OU CE TAUX TOMBE DANS LE BAREME FEDERAL — la 2e dimension differenciante.
 *
 * POURQUOI : le bloc BLS ne separait pas 25 et 27, qui sont dans la meme bande de
 * marche (au-dessus du median, sous la moyenne) — mesure du 05/09/2026, 0 ligne
 * differente sur 311 hors chiffres. Celui-ci les separe, parce que la distance a la
 * tranche suivante est propre a chaque taux.
 *
 * C'EST AUSSI LA TOUCHE QUI NOUS DIFFERENCIE : les pages concurrentes s'arretent au
 * brut (taux x 2080). Aucune ne dit combien il reste avant que le dollar suivant soit
 * impose au taux superieur, ni combien d'heures cela represente a ce taux-la.
 *
 * Rien n'est ecrit en dur : tout sort de data/rates-2026.js, la meme source que le
 * moteur. Si l'IRS revise le bareme, ce bloc suit automatiquement. */
const RATES = require(path.join(__dirname, "..", "..", "data", "rates-2026.js"));
const DED_SINGLE = RATES.federal.standardDeduction.single;
const TRANCHES = RATES.federal.brackets.single;

const imposable = brut - DED_SINGLE;
const iT = TRANCHES.findIndex(([plafond]) => plafond === null || imposable <= plafond);
const tauxMarginal = Math.round(TRANCHES[iT][1] * 100);
const plafondT = TRANCHES[iT][0];
const plafondPrec = iT > 0 ? TRANCHES[iT - 1][0] : 0;
const tauxSuivant = TRANCHES[iT + 1] ? Math.round(TRANCHES[iT + 1][1] * 100) : null;

/* Deux situations : soit il reste de la marge dans la tranche, soit ce taux vient
 * d'en franchir une. Les deux phrases ne se ressemblent pas. */
const marge = plafondT === null ? null : plafondT - imposable;
const heuresMarge = marge === null ? null : Math.round(marge / taux);
const dansTranche = imposable - plafondPrec;

/* T est defini plus bas dans le fichier ; on refabrique le meme libelle ici. */
const TAUX_LIB = "$" + (Number.isInteger(taux) ? c0(taux) : c2(taux));

/* Ce qui est deja franchi. Vide pour les taux qui restent dans la tranche a 12 % :
 * c'est precisement ce qui distingue une page qui vient de passer un palier. */
/* ⛔ NE JAMAIS comparer la tranche federale marginale au taux effectif du tableau.
 * Le 05/09/2026 la phrase disait "the effective rates in the table below stay well
 * under 12%" alors que le tableau affiche 15,8 % a 20,5 % : la colonne "Effective
 * rate" additionne federal + FICA 7,65 % + impot d'Etat. C'etait faux sur 32 lignes
 * sur 32, et contredit par un tableau situe cinq lignes plus bas.
 * PREMIERE CORRECTION RATEE, le meme jour : "the effective rates are HIGHER than 22%"
 * etait faux a son tour sur la page 35 (7 lignes sur 8 entre 17,5 % et 21,5 %).
 * ⛔ CONCLUSION : la tranche marginale federale et le taux effectif du tableau ne se
 * comparent PAS, dans aucun sens. On dit ce que chacun mesure, jamais lequel est le
 * plus eleve — c'est justement la question que se pose le visiteur qui lit 15,8 %
 * en etant "dans la tranche 12 %". */
const phraseFranchi = plafondPrec > 0
  ? `Only part of it is taxed at that rate: the first $${c0(plafondPrec)} is taxed at the lower ` +
    `brackets and only the last <strong>$${c0(dansTranche)}</strong> at ${tauxMarginal}%. ` +
    `A bracket applies to the dollars above its threshold, never to the whole salary. ` +
    `The &ldquo;effective rate&rdquo; column in the table below measures something different ` +
    `again: the share of gross pay lost to every deduction together &mdash; federal income tax, ` +
    `Social Security and Medicare at 7.65% combined, and any state income tax. `
  : "";

const phraseTranche = (marge !== null && tauxSuivant)
  ? `That sits in the ${tauxMarginal}% federal bracket, which runs to $${c0(plafondT)} of taxable ` +
    `income. ${phraseFranchi}There is <strong>$${c0(marge)}</strong> of room left before the next ` +
    `dollar would be taxed at ${tauxSuivant}% &mdash; about <strong>${c0(heuresMarge)} more ` +
    `hours</strong> at ${TAUX_LIB} an hour, or a raise of about $${c2(marge / HEURES)} an hour ` +
    `held for a full year.`
  : `That reaches the top ${tauxMarginal}% federal bracket. ${phraseFranchi}`;

/* MAILLAGE INTERNE DE LA FAMILLE.
 * Mesure du 05/09/2026 : les pages 27, 30 et 35 etaient ORPHELINES — aucun lien
 * entrant, ni depuis l'accueil ni entre elles. Une page orpheline s'indexe mal et
 * ne recoit aucune autorite interne. Ajouter le nouveau taux ici en meme temps
 * qu'on le construit, sinon la page suivante repartira orpheline. */
const TAUX_PUBLIES = [25, 27, 30, 35];
const liensSoeurs = TAUX_PUBLIES.filter(x => x !== taux).map(x =>
  `<a href="/${String(x).replace(".", "-")}-an-hour-is-how-much-a-year/">$${x} an hour` +
  ` ($${c0(x * HEURES)} a year)</a>`).join(", ");

/* Les Etats publies, tries du net le plus eleve au plus faible. */
const ETATS = Object.keys(FICHES).map(k => {
  const r = net(k, brut);
  return { cle: k, nom: FICHES[k].nom, net: r.net, taux: r.taux,
           netH: r.net / HEURES, lien: "/paycheck-calculator/" + k + "/" };
}).sort((a, b) => b.net - a.net);

const haut = ETATS[0], bas = ETATS[ETATS.length - 1];
const ecartAn = haut.net - bas.net;

/* Les horaires reels : 2 080 h est une convention, pas une loi. */
const SEMAINES = [40, 37.5, 35, 32, 30, 25, 20];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\s+/g, " ").trim();
/* "$25.00 an hour" ne se dit pas et ne se tape pas : la requete visee est
   "25 an hour is how much a year". Un taux entier s'ecrit sans decimales. */
const T = "$" + (Number.isInteger(taux) ? c0(taux) : c2(taux));

const faq = [
  [T + " an hour is how much a year?",
   T + " an hour is " + D + " a year before tax, at 40 hours a week for 52 weeks. After tax it "
   + "depends entirely on where you work: " + haut.nom + " leaves you $" + c0(haut.net) + " and "
   + bas.nom + " $" + c0(bas.net) + ", a difference of $" + c0(ecartAn) + " on identical pay."],
  [T + " an hour is how much a year after taxes?",
   "Between $" + c0(bas.net) + " and $" + c0(haut.net) + " depending on the state, for a single "
   + "filer taking the standard deduction in 2026. That is an effective rate of "
   + (bas.taux * 100).toFixed(1) + " to " + (haut.taux * 100).toFixed(1) + " percent. The table "
   + "above shows every state we publish, and each figure is the same arithmetic our paycheck "
   + "calculator runs, not a rounded estimate."],
  [T + " an hour is how much a month?",
   "$" + c2(brut / 12) + " a month before tax. After tax, between $" + c2(bas.net / 12) + " and "
   + "$" + c2(haut.net / 12) + " a month depending on the state. Note that a month is not four "
   + "weeks: twelve monthly payments of $" + c2(brut / 12) + " and twenty-six biweekly payments "
   + "of $" + c2(brut / 26) + " come to the same " + D + "."],
  [T + " an hour is how much a week?",
   "$" + c2(taux * 40) + " a week before tax at 40 hours, and $" + c2(taux * 80) + " for a "
   + "biweekly pay period. Overtime, unpaid leave and short weeks all move this figure, which "
   + "is why the annual total below assumes a full 2,080 hours."],
  ["Is 2,080 hours the right number to multiply by?",
   "It is the convention -- 40 hours a week for 52 weeks -- and it assumes no unpaid time off. It "
   + "is not the law. At 35 hours a week " + T + " an hour comes to $"
   + c0(taux * 35 * 52) + " a year, and at 30 hours $" + c0(taux * 30 * 52) + ". The table of "
   + "weekly hours above gives the honest range instead of one number."],
  ["Why does the yearly figure differ from other calculators?",
   "Most pages answering this question multiply by 2,080 and stop. That is the gross figure, and "
   + "it is not the number that reaches your account. This page also shows what is left after "
   + "federal income tax, Social Security, Medicare and state withholding, which is why our "
   + "after-tax figures are lower and closer to your bank statement."],
  ["Does the state really change the answer that much?",
   "On " + D + " a year, the gap between " + haut.nom + " and " + bas.nom + " is $"
   + c0(ecartAn) + " a year, or $" + c2(ecartAn / 12) + " a month. It is the single largest "
   + "variable in the answer after the hours you actually work."]
];

const ligneEtats = ETATS.map(e => `        <tr>
          <td><a href="${e.lien}">${e.nom}</a></td>
          <td class="num"><strong>$${c0(e.net)}</strong></td>
          <td class="num">$${c2(e.net / 12)}</td>
          <td class="num">$${c2(e.netH)}</td>
          <td class="num">${(e.taux * 100).toFixed(1)}%</td>
        </tr>`).join("\n");

const ligneHeures = SEMAINES.map(h => `        <tr>
          <td class="num">${h}</td>
          <td class="num">${c0(h * 52)}</td>
          <td class="num">$${c2(taux * h)}</td>
          <td class="num"><strong>$${c0(taux * h * 52)}</strong></td>
        </tr>`).join("\n");

const titre = T + " an Hour Is How Much a Year? " + D + " Before Tax, Less After";
const desc = T + " an hour is " + D + " a year before tax at 40 hours a week. After tax it is $"
  + c0(bas.net) + " to $" + c0(haut.net) + " depending on your state. 2026 rates, every "
  + "deduction shown.";

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
<script src="/assets/analytics.js"></script>
<title>${T} an Hour Is How Much a Year? ${D} Before Tax</title>
<meta name="description" content="${q(desc)}">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="${q(titre)}">
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
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "${T} an hour is how much a year", "item": "${URL}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        {
          "@type": "Question",
          "name": "${q(n)}",
          "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" }
        }`).join(",\n")}
      ]
    },
    {
      "@type": "Organization",
      "name": "StateLine Calc",
      "url": "https://statelinecalc.com/",
      "logo": "https://statelinecalc.com/assets/icon-512.png"
    }
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
      <a href="/salary-to-hourly-calculator/">Salary to Hourly</a>
      <a href="/methodology/">Methodology</a>
    </nav>
  </div>
</header>

<main class="wrap">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li aria-current="page">${T} an hour is how much a year</li>
  </ol>
</nav>

  <h1>${T} an Hour Is How Much a Year?</h1>

  <div class="answer">
    <p><strong>${T} an hour is ${D} a year</strong> before tax, at 40 hours a week for 52 weeks.
    That is the figure every other page gives you, and it is the easy half of the question.</p>
    <p>The half that decides what reaches your account is your state. On the same ${D},
    ${haut.nom} leaves you <strong class="num">$${c0(haut.net)}</strong> and ${bas.nom}
    <strong class="num">$${c0(bas.net)}</strong> &mdash; a gap of <strong>$${c0(ecartAn)}</strong>
    a year, or $${c2(ecartAn / 12)} a month, on identical pay.</p>
  </div>

  <h2>Where ${T} an hour sits in the US labor market</h2>
  <p>Across all US occupations the median wage is <strong class="num">$${BLS_MEDIAN.toFixed(2)}</strong>
  an hour and the mean is <strong class="num">$${BLS_MEAN.toFixed(2)}</strong> &mdash; Bureau of Labor
  Statistics, <a href="${BLS_URL}" rel="nofollow">Occupational Employment and Wage Statistics</a>,
  May ${BLS_ANNEE} data covering ${BLS_EMPLOI} jobs, released ${BLS_PUBLIE}.</p>
  <p>At ${T} an hour you are about <strong>${pctMed}% ${signeMed} the national median</strong>.
  ${phraseMarche}</p>
  <p>Annualized, ${D} compares with a national mean of ${BLS_MEAN_AN} a year. The median and the
  mean differ because a minority of very high-paying occupations pulls the average up; the median
  is the better description of a typical job.</p>

  <h2>How close ${T} an hour is to the next federal bracket</h2>
  <p>Most pages answering this question stop at ${D}. The number that decides what a raise is
  actually worth is a different one: where ${D} falls in the federal brackets.</p>
  <p>After the $${c0(DED_SINGLE)} standard deduction, ${D} leaves
  <strong class="num">$${c0(imposable)}</strong> of taxable income for a single filer.
  ${phraseTranche}</p>

  <h2>${T} an hour after tax, state by state</h2>
  <p>Single filer, standard deduction, 2026 rates, no 401(k) contribution. Every figure below is
  produced by the same engine as our paycheck calculators &mdash; nothing here is rounded by hand.</p>

  <div class="table-scroll">
    <table>
      <caption>${D} a year (${T} an hour &times; 2,080 hours), after all deductions</caption>
      <thead>
        <tr><th scope="col">State</th><th scope="col" class="num">Take-home a year</th>
        <th scope="col" class="num">A month</th><th scope="col" class="num">Real hourly rate</th>
        <th scope="col" class="num">Effective rate</th></tr>
      </thead>
      <tbody>
${ligneEtats}
      </tbody>
    </table>
  </div>

  <h2>Before tax: the whole conversion</h2>
  <div class="table-scroll">
    <table>
      <caption>${T} an hour, at 40 hours a week</caption>
      <thead><tr><th scope="col">Period</th><th scope="col" class="num">Gross pay</th></tr></thead>
      <tbody>
        <tr><td>An hour</td><td class="num">$${c2(taux)}</td></tr>
        <tr><td>A day (8 hours)</td><td class="num">$${c2(taux * 8)}</td></tr>
        <tr><td>A week</td><td class="num">$${c2(taux * 40)}</td></tr>
        <tr><td>Two weeks</td><td class="num">$${c2(taux * 80)}</td></tr>
        <tr><td>A month</td><td class="num">$${c2(brut / 12)}</td></tr>
        <tr><td>A year</td><td class="num"><strong>${D}</strong></td></tr>
      </tbody>
    </table>
  </div>

  <h2>If you do not work 40 hours</h2>
  <p>2,080 hours is a convention, not a fact about your job. It assumes 40 hours a week, 52 weeks,
  and no unpaid time off. Change the hours and the annual figure moves far more than any tax rule
  does.</p>
  <div class="table-scroll">
    <table>
      <caption>${T} an hour at other weekly hours</caption>
      <thead><tr><th scope="col" class="num">Hours a week</th><th scope="col" class="num">Hours a year</th>
      <th scope="col" class="num">A week</th><th scope="col" class="num">A year, before tax</th></tr></thead>
      <tbody>
${ligneHeures}
      </tbody>
    </table>
  </div>

  <h2>Questions</h2>
  <dl class="faq">
${faq.map(([n, a]) => `    <dt>${n}</dt>
    <dd>${a}</dd>`).join("\n")}
  </dl>

  <h2>Work out your own figure</h2>
  <p>These tables assume a single filer taking the standard deduction with no retirement
  contribution. If any of that is wrong for you, the state calculators take your own numbers and
  show every deduction line by line:
${ETATS.map(e => `<a href="${e.lien}">${e.nom}</a>`).join(", ")}.</p>

  <h2>Other hourly rates</h2>
  <p>The same question, answered the same way, at nearby rates:
${liensSoeurs}.</p>

  <p class="caption">Rates: IRS 2026 federal brackets and standard deduction, Social Security and
  Medicare rates from the SSA, and each state&rsquo;s own published 2026 figures. Every source and
  the date it was checked is listed on our <a href="/methodology/">methodology page</a>. This is
  information, not tax advice.</p>

</main>

<footer class="site-footer">
  <div class="wrap">
    <p><a href="/">StateLine Calc</a> &mdash; free paycheck and money calculators for all 50 states.</p>
    <p><a href="/about/">About</a> &middot; <a href="/methodology/">Methodology</a> &middot;
       <a href="/contact/">Contact</a> &middot; <a href="/privacy/">Privacy</a> &middot;
       <a href="/terms/">Terms</a> &middot; <a href="/disclaimer/">Disclaimer</a></p>
  </div>
</footer>

</body>
</html>
`;

const dossier = path.join(RACINE, SLUG);
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");
console.log("ECRIT : /" + SLUG + "/index.html  (" + html.length + " octets)");
console.log("  " + T + "/h -> " + D + " brut/an");
ETATS.forEach(e => console.log("  %s net %s $/an  (%s $/h, %s%%)",
  e.nom.padEnd(13), c0(e.net), c2(e.netH), (e.taux * 100).toFixed(1)));
