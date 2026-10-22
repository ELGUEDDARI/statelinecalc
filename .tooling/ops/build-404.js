/* Construit /404.html - la page que GitHub Pages sert pour toute URL inconnue.
 *
 * Avant (audit UX 22/10/2026) : page GitHub par defaut, sans viewport (mise en
 * page 980 px sur mobile), texte coupe, aucun lien vers le site.
 *
 * Contraintes propres a une 404 :
 *  - elle est servie sous N'IMPORTE QUEL chemin (/a/b/c/) : tout lien et tout
 *    asset doit etre ABSOLU depuis la racine, jamais relatif ;
 *  - noindex (HTTP 404 deja, mais on le dit aussi aux crawlers) ;
 *  - meme CSP que le reste du site, copiee depuis /about/ pour ne jamais deriver ;
 *  - aucun JS requis (analytics.js est le seul script, et la page marche sans).
 * Lancer : node .tooling/ops/build-404.js
 */
const fs = require("fs"), path = require("path");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { PUBLIES } = require("../lib/etats-publies.js");
const RACINE = path.join(__dirname, "..", "..");

const about = fs.readFileSync(path.join(RACINE, "about", "index.html"), "utf8");
const csp = (about.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/) || [])[0];
if (!csp) throw new Error("CSP introuvable dans /about/");

const etats = Object.keys(PUBLIES).sort().map(n =>
  `      <li><a href="/paycheck-calculator/${PUBLIES[n]}/">${n}</a></li>`).join("\n");

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/assets/analytics.js" defer></script>
<title>Page not found | StateLine Calc</title>
<meta name="description" content="This page does not exist. Go to the StateLine Calc home page or pick a state paycheck calculator.">
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>

${entete("")}

<main class="wrap">

<h1>Page not found</h1>

<p class="callout">We could not find the page you asked for. The link may be old or mistyped.
Nothing you typed was saved or sent anywhere.</p>

<div class="result-actions">
<a class="btn btn-primary" href="/paycheck-calculator/">Open the paycheck calculator</a>
<a class="btn btn-secondary" href="/">Go to the home page</a>
</div>

<h2>Pick your state</h2>
<ul class="linkgrid">
${etats}
</ul>

<h2>More tools</h2>
<p><a href="/salary-to-hourly-calculator/">Salary to hourly calculator</a>,
<a href="/state-comparison/">compare two states</a>,
<a href="/methodology/">how we calculate</a>.</p>

</main>

${piedDePage()}

</body>
</html>
`;
fs.writeFileSync(path.join(RACINE, "404.html"), html);
console.log("404.html ecrit : " + html.length + " octets, " + Object.keys(PUBLIES).length + " Etats");
