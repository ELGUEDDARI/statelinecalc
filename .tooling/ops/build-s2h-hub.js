/* Construit le hub /salary-to-hourly-calculator/.
 *
 * Le hub existe pour une raison precise : la meme requete "60 000 $ par an, ca
 * fait combien de l'heure" a une reponse brute identique partout et une reponse
 * NETTE differente dans chaque Etat. Mettre les six cote a cote sur une page,
 * c'est la seule facon de montrer l'ecart d'un coup d'oeil - et c'est ce que
 * personne ne publie.
 *
 * Lancer : node .tooling/ops/build-s2h-hub.js
 */
const fs = require("fs");
const path = require("path");
const { FICHES, net, c2, c0, HEURES, RACINE } = require("./build-salary-to-hourly.js");

/* L'ordre est deliberé — les Etats sans impot d'abord — mais une liste ecrite
   a la main est exactement ce qui a fait oublier la Pennsylvanie dans le
   sitemap de lancement. On s'arrete en erreur si un Etat a une fiche et
   n'apparait pas ici, plutot que de publier un index incomplet en silence. */
const ordre = ["texas", "florida", "nevada", "washington", "pennsylvania", "georgia",
               "illinois", "michigan"];
const MOTS = { 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
               11: "eleven", 12: "twelve" };
const oublies = Object.keys(FICHES).filter(k => ordre.indexOf(k) === -1);
if (oublies.length) {
  console.error("ARRET : Etat(s) avec une fiche mais absent(s) de l'index : " + oublies.join(", "));
  process.exit(2);
}
const TX = c2(net("texas", 60000).net / HEURES);
const IL = c2(net("illinois", 60000).net / HEURES);

const lignes = ordre.map(k => {
  const r = net(k, 60000);
  return `        <tr>
          <td><a href="/salary-to-hourly-calculator/${k}/">${FICHES[k].nom}</a></td>
          <td class="num">$28.85</td>
          <td class="num"><strong>$${c2(r.net / HEURES)}</strong></td>
          <td class="num">$${c0(r.net)}</td>
          <td class="num">${(r.taux * 100).toFixed(1)}%</td>
        </tr>`;
}).join("\n");

const faq = [
  ["$60,000 a year is how much an hour?",
   "$28.85 an hour before tax, everywhere, because that is simply $60,000 divided by 2,080 "
   + "hours. After tax it depends entirely on where you work: $" + TX + " an hour in Texas, $"
   + IL + " in Illinois. That gap, on the same salary, is what these pages exist to show."],
  ["How do you convert a salary to an hourly rate?",
   "Divide the annual salary by 2,080, which is 40 hours a week for 52 weeks. That gives the "
   + "gross rate. For the rate that actually reaches your account, subtract federal income tax, "
   + "Social Security, Medicare and whatever your state withholds, then divide."],
  ["Why do most salary converters only show the gross rate?",
   "Because it is the easy half. Dividing by 2,080 needs no tax data at all. Showing the "
   + "after-tax rate needs the 2026 federal brackets, the Social Security wage base and each "
   + "state's own rules, kept current. That is the half we do."],
  ["Which state leaves the most from the same salary?",
   "Of the states covered here, the three with no income tax - Texas, Florida and Nevada - leave "
   + "the most, and they leave exactly the same amount as each other. Washington follows, "
   + "slightly behind, because it withholds two state programs from every check. Then Georgia, "
   + "then Illinois."]
];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js"></script>
<title>Salary to Hourly Calculator 2026 — Before and After Tax, by State</title>
<meta name="description" content="Convert a salary to an hourly rate for 2026, and see the rate after tax rather than only before. $60,000 a year is $28.85 an hour gross — what you keep depends on your state.">
<link rel="canonical" href="https://statelinecalc.com/salary-to-hourly-calculator/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">
<meta property="og:title" content="Salary to Hourly Calculator 2026 — Before and After Tax">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="$60,000 a year is $28.85 an hour before tax. What it is after tax depends on your state, and that is the figure nobody publishes.">
<meta property="og:url" content="https://statelinecalc.com/salary-to-hourly-calculator/">
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
      "@type": "CollectionPage",
      "name": "Salary to Hourly Calculator by State",
      "url": "https://statelinecalc.com/salary-to-hourly-calculator/",
      "datePublished": "2026-08-28",
      "dateModified": "2026-08-28",
      "publisher": { "@id": "https://statelinecalc.com/#organization" }
    },
    {
      "@type": "ItemList",
      "name": "Salary to hourly converters available now",
      "numberOfItems": ${ordre.length},
      "itemListElement": [
${ordre.map((k, i) => `        { "@type": "ListItem", "position": ${i + 1}, "name": "${FICHES[k].nom} Salary to Hourly Calculator", "url": "https://statelinecalc.com/salary-to-hourly-calculator/${k}/" }`).join(",\n")}
      ]
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Salary to Hourly Calculator", "item": "https://statelinecalc.com/salary-to-hourly-calculator/" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": "${q(n)}", "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" } }`).join(",\n")}
      ]
    },
    { "@id": "https://statelinecalc.com/#organization" }
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
      <a href="/methodology/">Methodology</a>
    </nav>
  </div>
</header>

<main class="wrap">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li aria-current="page">Salary to Hourly Calculator</li>
  </ol>
</nav>

  <h1>Salary to Hourly Calculator 2026</h1>

  <div class="answer">
    <p><strong>$60,000 a year is $28.85 an hour</strong> before tax &mdash; that is simply
    $60,000 divided by 2,080 hours, and it is the same in every state. What it is
    <strong>after</strong> tax is not, and that is the figure almost nobody publishes:
    <span class="num">$${TX}</span> an hour in Texas,
    <span class="num">$${IL}</span> in Illinois.</p>
  </div>

  <h2>The same $60,000, converted in ${MOTS[ordre.length] || ordre.length} states</h2>
  <p class="prose">Single filer, 40 hours a week, 2026 rates. The gross column is identical
  everywhere, which is exactly why it is the useless one.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">$60,000 a year as an hourly rate, before and after tax, 2026</caption>
      <thead>
        <tr>
          <th scope="col">State</th>
          <th scope="col">Hourly before tax</th>
          <th scope="col">Hourly AFTER tax</th>
          <th scope="col">Take-home a year</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${lignes}
      </tbody>
    </table>
  </div>

  <div class="prose">

  <h2>Why the after-tax rate is the one that matters</h2>
  <p>Dividing a salary by 2,080 is arithmetic anyone can do in their head, and it is what every
  other converter gives you. It answers a question nobody actually has. What you want to know,
  when you are weighing an offer or working out whether a commute is worth it, is what an hour of
  your time leaves in your account &mdash; after federal income tax, Social Security, Medicare
  and whatever your state takes.</p>

  <p>That second figure needs the 2026 federal brackets, the Social Security wage base and each
  state&rsquo;s own rules, all kept current. Every rate we use is read from the agency that sets
  it and published with the date it was checked, on the
  <a href="/methodology/">methodology page</a>.</p>

  <h2>Common questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    breakdown of what comes out of a check, state by state.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; every 2026 figure with its official
    source and the date it was verified.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; and how much difference
    is normal.</li>
  </ul>

  </div>

  <p class="dates">
    Published <time datetime="2026-08-28">August 28, 2026</time> &middot;
    Last updated <time datetime="2026-08-28">August 28, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 rates, the
    standard deduction and 2,080 hours a year.
  </p>

</main>

<footer class="site-footer">
  <div class="wrap">
    <p><strong>StateLine Calc</strong> &mdash; free money calculators for all 50 states.
    No sign-up. No personal data required.</p>
    <p class="micro u-on-dark">
      <a href="/about/">About</a> &middot;
      <a href="/methodology/">Methodology</a> &middot;
      <a href="/contact/">Contact</a> &middot;
      <a href="/privacy/">Privacy</a> &middot;
      <a href="/terms/">Terms</a> &middot;
      <a href="/disclaimer/">Disclaimer</a>
    </p>
  </div>
</footer>

</body>
</html>
`;

const dossier = path.join(RACINE, "salary-to-hourly-calculator");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");
const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("hub ecrit : %d mots, %d H2, %d H3", mots,
  (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length);
