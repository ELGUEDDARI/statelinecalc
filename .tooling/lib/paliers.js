/* Les paliers de salaire et de taux horaire des tableaux rendus cote serveur.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * Ces deux grilles etaient ecrites en double : dans gen-table.js et
 * gen-hourly-table.js pour les onze premieres pages d'Etat, puis une troisieme
 * fois, plus courte, dans build-tennessee.js. Personne ne l'avait vu, parce que
 * rien ne comparait une page a ses semblables.
 *
 * ⛔ CE QUE LA DIVERGENCE A COUTE, mesure le 05/09/2026 : la page Tennessee,
 * publiee le jour meme, sortait a 1 979 mots avec 10 paliers de salaire et
 * 9 taux horaires, quand Texas, la Floride et le Nevada — les trois autres
 * Etats sans impot sur le revenu, donc ses vrais pairs — en portaient 30 et 30
 * pour 3 525 a 3 752 mots. Presque moitie moins de page, et surtout trois fois
 * moins de requetes de longue traine couvertes : chaque ligne de ces tableaux
 * repond mot pour mot a un « how much is $X a year after taxes in Y ».
 * Toutes les suites de tests etaient vertes : aucune ne comparait les pages
 * entre elles, elles verifiaient chacune sa page contre le moteur.
 *
 * Une seule definition, desormais. Un nouvel Etat qui l'importe ne peut plus
 * naitre a moitie.
 *
 * ⛔ NE PAS RACCOURCIR CES GRILLES pour alleger une page. Elles sont la raison
 * d'etre SEO du bloc : les crawlers d'IA n'executent pas le JavaScript, donc
 * ces tableaux sont la seule forme sous laquelle le calculateur leur est
 * visible. Les retirer rendrait l'outil invisible aux moteurs generatifs.
 */

/* 30 paliers. Choisis sur des montants que les gens tapent reellement : tous
   les 5 000 dans la zone dense 25-100k, puis des paliers ronds au-dela. */
const SALAIRES = [
  25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000,
  75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 125000, 130000,
  140000, 150000, 160000, 175000, 200000, 225000, 250000, 300000, 400000, 500000];

/* 30 taux, meme raison. On descend a 12 $ : c'est en dessous du salaire minimum
   de plusieurs Etats mais au-dessus du minimum federal, et c'est une requete
   reelle. */
const TAUX_HORAIRES = [
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 28, 30, 32, 35, 38,
  40, 45, 50, 55, 60, 65, 70, 75, 85, 100];

/* 40 h par semaine, 52 semaines. Ecrit ici parce que les deux tableaux s'en
   servent et qu'une valeur differente entre eux serait invisible a la lecture. */
const HEURES_PAR_AN = 2080;

module.exports = { SALAIRES, TAUX_HORAIRES, HEURES_PAR_AN };
