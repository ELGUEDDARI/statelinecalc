/* Title GEO + dates JSON-LD des pages d'Etat /paycheck-calculator/{etat}/.
 *
 * Decision PDG 30/09/2026 :
 *  1. le <title> porte le chiffre reel : 75 000 $ celibataire, net arrondi au
 *     dollar, calcule par le MOTEUR (lib/paie.js) au moment du build. Jamais
 *     saisi a la main.
 *  2. le WebApplication du JSON-LD porte datePublished et dateModified, lues
 *     dans le <time> VISIBLE de la page (« Published » / « Last updated ») :
 *     une seule source, donc jamais de contradiction entre texte et balisage.
 *
 * REGLE DE LONGUEUR (dite, testee) :
 *   forme A  « {Etat} Paycheck Calculator 2026: $75,000 = ${net} Take-Home »
 *   si A depasse 65 caracteres (limite d'audit-silencieux), forme B, meme
 *   mot-cle mais sans l'annee :
 *            « {Etat} Paycheck Calculator: $75,000 = ${net} Take-Home »
 *   Le plus long cas (North Carolina) fait 63 caracteres en forme B.
 * og:title reprend exactement le title. (Aucune page n'a de twitter:title.)
 *
 * appliqueGeo(html) est idempotent et ne fait RIEN sur une page qui n'est pas
 * /paycheck-calculator/{etat}/ d'un Etat du moteur. nettoieJsonLd() l'appelle :
 * tout generateur existant reste donc correct sans modification. */
const { calcul, c0 } = require("./paie.js");

const LIMITE = 65;
const MONTANT = 75000;

function nomAffiche(slug) {
  const { PUBLIES } = require("./etats-publies.js");
  return Object.keys(PUBLIES).find(n => PUBLIES[n] === slug) || null;
}

function titreGeo(nom, slug) {
  const net = c0(calcul(slug, MONTANT).net);
  const fin = "$75,000 = $" + net + " Take-Home";
  const a = nom + " Paycheck Calculator 2026: " + fin;
  return { titre: a.length <= LIMITE ? a : nom + " Paycheck Calculator: " + fin, net };
}

function appliqueGeo(html) {
  const c = html.match(/<link rel="canonical" href="https:\/\/statelinecalc\.com\/paycheck-calculator\/([a-z-]+)\/">/);
  if (!c) return html;
  const slug = c[1];
  const R = require("../../data/rates-2026.js");
  if (!R.states[slug]) return html;
  const nom = nomAffiche(slug);
  if (!nom) throw new Error("titre-geo : nom d'Etat introuvable pour " + slug);
  const { titre } = titreGeo(nom, slug);

  let h = html
    .replace(/<title>[^<]*<\/title>/, () => "<title>" + titre + "</title>")
    .replace(/(<meta property="og:title" content=")[^"]*(">)/, (m, a, b) => a + titre + b);

  const plain = h.replace(/\s+/g, " ");
  const pub = plain.match(/Published\s*<time datetime="(\d{4}-\d\d-\d\d)"/);
  const maj = plain.match(/Last updated\s*<time datetime="(\d{4}-\d\d-\d\d)"/);
  if (!pub || !maj) throw new Error("titre-geo : dates visibles introuvables pour " + slug);

  /* WebApplication : retire d'abord d'eventuelles dates (idempotence), puis les
     pose juste apres sa ligne "url". */
  const i = h.indexOf('"@type": "WebApplication"');
  if (i < 0) throw new Error("titre-geo : WebApplication absent pour " + slug);
  const fin = h.indexOf("\n    },", i);
  let bloc = h.slice(i, fin).replace(/\n\s*"date(Published|Modified)": "[^"]*",/g, "");
  bloc = bloc.replace(/(\n(\s*)"url": "[^"]*",)/, (m, l, ind) =>
    l + "\n" + ind + '"datePublished": "' + pub[1] + '",\n' + ind + '"dateModified": "' + maj[1] + '",');
  if (!bloc.includes('"datePublished"')) throw new Error("titre-geo : ligne url introuvable pour " + slug);
  return h.slice(0, i) + bloc + h.slice(fin);
}

module.exports = { appliqueGeo, titreGeo, LIMITE, MONTANT };
