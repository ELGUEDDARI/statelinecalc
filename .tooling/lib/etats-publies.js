/* La liste des Etats dont la page est EN LIGNE, en un seul endroit.
 *
 * Pourquoi ce fichier existe : chaque generateur de page portait sa propre
 * copie de cette liste, pour construire la grille « Browse paycheck
 * calculators by state » en bas de page. Le 02/09/2026, relancer
 * build-pennsylvania.js pour une autre raison a silencieusement RETIRE de la
 * page Pennsylvanie ses liens vers le Michigan, l'Ohio et l'Utah : sa copie de
 * la liste datait d'avant leur publication. Un generateur ne doit pas pouvoir
 * defaire le maillage en etant simplement relance.
 *
 * Regle : on publie un Etat, on l'ajoute ICI, et on relance tous les
 * generateurs. Nulle part ailleurs.
 */

/* Les 50, dans l'ordre alphabetique, pour la grille de bas de page. */
const ETATS_50 = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana",
  "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee",
  "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];

/* Nom affiche -> segment d'URL. Un Etat absent d'ici s'affiche en texte brut. */
const PUBLIES = {
  Florida: "florida",
  Georgia: "georgia",
  Hawaii: "hawaii",
  Illinois: "illinois",
  Michigan: "michigan",
  Nevada: "nevada",
  Ohio: "ohio",
  Pennsylvania: "pennsylvania",
  Texas: "texas",
  Utah: "utah",
  Washington: "washington"
};

/* Les Etats qui ont AUSSI une page « salary to hourly ». Sous-ensemble de
 * PUBLIES : la prose de ces pages est ecrite a la main, une par une, donc
 * elles n'arrivent pas au meme rythme que les pages paycheck.
 * ⛔ Ne pas confondre les deux ensembles. Le 05/09/2026, les pages par taux
 * lisaient cette liste-la (8 Etats) en croyant lire PUBLIES (11), et
 * affichaient un tableau amute de l'Ohio, de l'Utah et d'Hawaii sous une
 * phrase disant « Only the states we publish are listed ». */
const S2H_PUBLIES = {
  Florida: "florida",
  Georgia: "georgia",
  Illinois: "illinois",
  Michigan: "michigan",
  Nevada: "nevada",
  Pennsylvania: "pennsylvania",
  Texas: "texas",
  Washington: "washington"
};

/* La grille HTML, identique sur toutes les pages. */
function grilleEtats() {
  return ETATS_50.map(n => PUBLIES[n]
    ? `    <li><a href="/paycheck-calculator/${PUBLIES[n]}/">${n}</a></li>`
    : `    <li>${n}</li>`).join("\n");
}

module.exports = { ETATS_50, PUBLIES, S2H_PUBLIES, grilleEtats };
