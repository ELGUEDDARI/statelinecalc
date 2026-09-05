/* Le bloc « choisis ton Etat » : la carte cliquable des Etats-Unis.
 *
 * ── POURQUOI ELLE EXISTE ────────────────────────────────────────────────────
 * Releve le 05/09/2026 sur la page du n°1 du secteur : il affiche une carte des
 * Etats-Unis, en gris pale, et elle ne fait RIEN. Elle est decorative. C'est la
 * plus visible de ses quatre faiblesses. La notre est cliquable.
 *
 * ── LA DECISION HONNETE ─────────────────────────────────────────────────────
 * 11 Etats sur 50 ont une page. Les 39 autres sont en gris et ne sont PAS des
 * liens — pas d'infobulle « bientot », pas de lien mort. Le PDG a tranche le
 * 05/09 : montrer les 50 et dire la verite sur la couverture, plutot que cacher
 * le trou. Une carte ou 39 clics ne font rien serait pire que pas de carte.
 *
 * ── POURQUOI LE SVG EST INLINE ──────────────────────────────────────────────
 * On ne peut pas le charger a part : la CSP du site ne liste PAS 'self' dans
 * connect-src, donc un fetch('/assets/usa.svg') serait bloque net. Et un <img>
 * ne serait ni stylable ni cliquable Etat par Etat. Inline est le seul montage
 * qui donne une carte vivante sans toucher a la politique de securite.
 * Consequence assumee : environ 25 Ko de plus sur les pages qui la portent, ce
 * qui est la raison pour laquelle elle ne va PAS sur About, Contact, Privacy,
 * Terms et Disclaimer — une carte n'y sert a rien.
 *
 * ── ACCESSIBILITE ───────────────────────────────────────────────────────────
 * Un trace SVG n'est pas une cible confortable : les petits Etats du nord-est
 * font quelques pixels sur telephone. La liste de liens qui suit la carte n'est
 * donc pas un pis-aller, c'est le chemin principal sur petit ecran — la carte
 * y devient une illustration reperante. Chaque Etat publie est atteignable au
 * clavier par cette liste.
 */
const { CADRE, CHEMINS } = require("./carte-usa.js");
const { PUBLIES } = require("./etats-publies.js");

/* nom d'Etat -> code postal, pour croiser PUBLIES (qui porte des noms) avec les
   traces (qui portent des codes). Construit depuis les traces eux-memes : pas
   de seconde liste a maintenir. */
const CODE_PAR_NOM = {};
CHEMINS.forEach(c => { CODE_PAR_NOM[c.nom] = c.ab; });

/* actif   : nom d'Etat a mettre en avant ("Hawaii"), ou null.
   options : { avecListe } — met ou non la liste des Etats sous la carte.
     La liste est le chemin CLAVIER et le chemin TELEPHONE vers les pages : un
     trace SVG de quatre pixels n'est pas une cible. On ne la retire donc que
     lorsqu'une autre liste des memes Etats suit immediatement sur la page,
     comme sur l'accueil. Retirer les deux rendrait la carte inutilisable au
     clavier, ce qui n'est pas negociable. */
function carteUsa(actif, options) {
  const avecListe = !options || options.avecListe !== false;
  const publiesParCode = {};
  Object.keys(PUBLIES).forEach(nom => {
    if (CODE_PAR_NOM[nom]) publiesParCode[CODE_PAR_NOM[nom]] = { nom: nom, slug: PUBLIES[nom] };
  });

  const traces = CHEMINS.map(c => {
    const p = publiesParCode[c.ab];
    if (!p) {
      /* Non publie : un trace inerte. aria-hidden parce que la liste qui suit
         dit deja lesquels existent — annoncer 39 Etats muets ne renseigne
         personne et allonge la lecture d'ecran de trente secondes. */
      return '<path class="etat etat-vide" d="' + c.d + '" aria-hidden="true"></path>';
    }
    const ici = (p.nom === actif);
    return '<a href="/paycheck-calculator/' + p.slug + '/" class="etat-lien"' +
           (ici ? ' aria-current="page"' : "") + '>' +
           '<path class="etat etat-publie' + (ici ? " etat-ici" : "") + '" d="' + c.d + '"></path>' +
           "<title>" + p.nom + (ici ? " — you are here" : " paycheck calculator") + "</title></a>";
  }).join("");

  const nbPublies = Object.keys(publiesParCode).length;
  const liste = Object.keys(PUBLIES).sort().map(nom =>
    '<li><a href="/paycheck-calculator/' + PUBLIES[nom] + '/"' +
    (nom === actif ? ' aria-current="page"' : "") + ">" + nom + "</a></li>").join("");

  const ou = avecListe ? "listed below the map" : "listed just below";
  return `<section class="bloc-carte">
  <h2>Pick your state</h2>
  <p class="bloc-carte-intro">Every state treats income differently, and nine of them do not tax
  wages at all. ${nbPublies} states are live so far &mdash; they are shown in blue and ${ou}.
  The rest are being added.</p>
  <div class="carte-usa-wrap">
    <svg class="carte-usa" viewBox="0 0 ${CADRE.largeur} ${CADRE.hauteur}"
         role="img" aria-label="Map of the United States. ${nbPublies} states have a paycheck calculator; they are ${ou}.">
${traces}
    </svg>
  </div>${avecListe ? `
  <ul class="etats-liste">
${liste}
  </ul>` : ""}
</section>`;
}

module.exports = { carteUsa, CODE_PAR_NOM };
