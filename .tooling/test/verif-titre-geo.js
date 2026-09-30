/* Controle title GEO + dates JSON-LD des 26 pages d'Etat (decision PDG 30/09/2026).
 * Pour chaque page : le chiffre du title == engine == un chiffre present dans le
 * TEXTE visible de la meme page (hors <title>, meta, JSON-LD) ; og:title == title ;
 * longueur <= 65 ; datePublished/dateModified du WebApplication == <time> visibles ;
 * JSON valide sans entite litterale. Lancer : node .tooling/test/verif-titre-geo.js */
const fs = require("fs"), path = require("path");
const { PUBLIES } = require("../lib/etats-publies.js");
const { calcul, c0 } = require("../lib/paie.js");
const { LIMITE } = require("../lib/titre-geo.js");
const RACINE = path.join(__dirname, "..", "..");
let ok = 0; const ko = [];
const dit = (b, q, d) => { if (b) ok++; else { ko.push(q); console.log("  ECHEC | " + q + (d ? " | " + d : "")); } };
for (const nom of Object.keys(PUBLIES)) {
  const slug = PUBLIES[nom], u = "/paycheck-calculator/" + slug + "/";
  const h = fs.readFileSync(path.join(RACINE, "paycheck-calculator", slug, "index.html"), "utf8");
  const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const og = (h.match(/<meta property="og:title" content="([^"]*)">/) || [])[1];
  const m = t.match(/^(.+) Paycheck Calculator( 2026)?: \$75,000 = \$([\d,]+) Take-Home$/);
  dit(!!m, u + " title au format", t);
  if (!m) continue;
  dit(m[1] === nom, u + " nom d'Etat du title", m[1]);
  const net = c0(calcul(slug, 75000).net);
  dit(m[3] === net, u + " chiffre du title == moteur", m[3] + " vs " + net);
  dit(t.length <= LIMITE, u + " title <= " + LIMITE, t.length + "");
  dit(!m[2] ? (nom + " Paycheck Calculator 2026: $75,000 = $" + net + " Take-Home").length > LIMITE : true,
      u + " forme B seulement si A depasse", "");
  dit(og === t, u + " og:title == title", og);
  dit(!/twitter:title/.test(h), u + " pas de twitter:title (rien a aligner)", "");
  const corps = h.replace(/<title>[\s\S]*?<\/title>/, "").replace(/<script[\s\S]*?<\/script>/g, "")
                 .replace(/<meta[^>]*>/g, "").replace(/<[^>]+>/g, " ");
  dit(corps.includes("$" + m[3]), u + " chiffre du title present dans le texte visible", "$" + m[3]);
  const plain = h.replace(/\s+/g, " ");
  const pub = plain.match(/Published\s*<time datetime="([\d-]+)"/)[1];
  const maj = plain.match(/Last updated\s*<time datetime="([\d-]+)"/)[1];
  const blocs = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x => x[1]);
  dit(blocs.every(b => !/&(#x?[0-9a-f]+|[a-z]+);/i.test(b)), u + " 0 entite litterale dans le JSON-LD", "");
  const wa = blocs.map(b => JSON.parse(b)).flatMap(j => j["@graph"] || [j]).filter(n => n["@type"] === "WebApplication");
  dit(wa.length === 1, u + " un seul WebApplication", wa.length + "");
  if (wa.length === 1) {
    dit(wa[0].datePublished === pub, u + " datePublished == <time>", wa[0].datePublished + " vs " + pub);
    dit(wa[0].dateModified === maj, u + " dateModified == <time>", wa[0].dateModified + " vs " + maj);
  }
}
console.log("\n=== TITRE GEO : " + ok + " OK, " + ko.length + " ECHEC ===");
process.exit(ko.length ? 1 : 0);
