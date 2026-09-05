/* La colonne laterale des pages de contenu.
 *
 * ── POURQUOI ────────────────────────────────────────────────────────────────
 * Mesure du 05/09/2026 sur la page du n°1 du secteur : sa mise en page est
 * « contenu principal + colonne de droite », et cette colonne porte ses liens
 * connexes. C'est la derniere difference de structure entre son site et le
 * notre.
 * Et cote maison, la refonte a rendu le probleme visible : le texte plafonne a
 * 68 caracteres dans une carte de 960 px, ce qui laissait un grand vide a
 * droite. On l'avait bouche en resserrant la carte ; la colonne le REMPLIT.
 *
 * ── CE QU'ON N'Y MET PAS ────────────────────────────────────────────────────
 * ⛔ Aucun lien invente. Le brief de refonte proposait « Tax Guides »,
 * « Overtime Calculator », « Tax Calculator » et « Hourly to Salary » : rien de
 * tout cela n'existe ici. Les Etats sortent de PUBLIES, les taux de TAUX_LATERAL,
 * donc la colonne ne peut pas se desynchroniser du site.
 * ⛔ Pas de pave publicitaire, pas de « nos partenaires », pas de temoignage.
 * Une colonne laterale est une aide a la navigation, pas un panneau d'affichage.
 *
 * ── SUR PETIT ECRAN ─────────────────────────────────────────────────────────
 * Elle passe en dessous du contenu, en flux normal. Elle est ecrite en DERNIER
 * dans le HTML precisement pour ca : un lecteur d'ecran et un clavier la
 * rencontrent apres le contenu principal, ce qui est l'ordre correct pour du
 * complementaire. La placer a droite est un effet de grille, pas d'ordre.
 */
const { PUBLIES } = require("./etats-publies.js");

const TAUX_LATERAL = [25, 30, 35];

/* actif : nom d'Etat de la page courante, ou null. Il est retire de la liste —
   proposer au visiteur la page ou il se trouve deja est du bruit. */
function colonne(actif) {
  const etats = Object.keys(PUBLIES).filter(n => n !== actif).sort().slice(0, 8);

  const bloc = (titre, liens) => `    <section class="col-bloc">
      <h2 class="col-titre">${titre}</h2>
      <ul>
${liens.map(l => `        <li><a href="${l.href}">${l.libelle}</a></li>`).join("\n")}
      </ul>
    </section>`;

  return `<aside class="colonne" aria-label="Related calculators">
${bloc("Other states", etats.map(n =>
    ({ href: "/paycheck-calculator/" + PUBLIES[n] + "/", libelle: n })))}
${bloc("More calculators", [
    { href: "/paycheck-calculator/", libelle: "Paycheck calculator" },
    { href: "/salary-to-hourly-calculator/", libelle: "Salary to hourly" }
  ].concat(TAUX_LATERAL.map(t =>
    ({ href: "/" + t + "-an-hour-is-how-much-a-year/", libelle: "$" + t + " an hour a year" }))))}
    <section class="col-bloc col-note">
      <h2 class="col-titre">How these figures are made</h2>
      <p>Every rate is read from the agency that sets it, and published with the
      date it was checked. Nothing you type leaves your browser.</p>
      <a href="/methodology/">Read the methodology &rarr;</a>
    </section>
</aside>`;
}

module.exports = { colonne };
