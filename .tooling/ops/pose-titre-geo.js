/* Applique title GEO + dates JSON-LD aux 26 pages d'Etat (dont les 6 sans
 * generateur : Floride, Georgie, Illinois, Nevada, Texas, Washington).
 * Idempotent. Lancer : node .tooling/ops/pose-titre-geo.js */
const fs = require("fs"), path = require("path");
const { PUBLIES } = require("../lib/etats-publies.js");
const { nettoieJsonLd } = require("../lib/jsonld.js");
const RACINE = path.join(__dirname, "..", "..");
let n = 0;
for (const nom of Object.keys(PUBLIES)) {
  const f = path.join(RACINE, "paycheck-calculator", PUBLIES[nom], "index.html");
  const avant = fs.readFileSync(f, "utf8");
  const apres = nettoieJsonLd(avant);
  if (apres !== avant) { fs.writeFileSync(f, apres, "utf8"); n++; }
}
console.log(Object.keys(PUBLIES).length + " pages d'Etat lues, " + n + " modifiees");
