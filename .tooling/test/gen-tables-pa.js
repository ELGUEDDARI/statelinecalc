/* Genere les deux tableaux de la page Pennsylvanie a partir de la
   bibliotheque unique .tooling/lib/paie.js.
   La Pennsylvanie a besoin de HUIT colonnes et non sept : elle preleve un
   impot sur le revenu ET une cotisation chomage salariee. Les fondre dans une
   seule colonne rendrait la ligne fausse a la lecture - un visiteur qui
   additionne les colonnes doit retrouver exactement le brut moins le net.
   Lancer : node .tooling/test/gen-tables-pa.js [salaires|horaire] */
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const CLE = "pennsylvania";
const salaires = [25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000,
  75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 125000, 130000,
  140000, 150000, 160000, 175000, 200000, 225000, 250000, 300000, 400000, 500000];
const taux = [12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 32,
  34, 35, 38, 40, 42, 45, 50, 55, 60, 70, 85, 100];

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);

/* Garde-fou : la somme des colonnes doit rendre le net a un cent pres. */
function verifier(r) {
  const somme = r.federal + r.ss + r.med + r.etat
              + r.programmes.reduce((t, p) => t + p.montant, 0);
  if (Math.abs((r.brut - somme) - r.net) > 0.01) {
    console.error("ARRET : les colonnes ne rendent pas le net sur " + r.brut);
    process.exit(2);
  }
}

if ((process.argv[2] || "salaires") === "salaires") {
  console.log(salaires.map(b => {
    const r = calcul(CLE, b); verifier(r);
    return "          <tr>\n" +
      "            <td class=\"num\">" + $(r.brut) + "</td>\n" +
      "            <td class=\"num\">" + $(r.federal) + "</td>\n" +
      "            <td class=\"num\">" + $(r.ss + r.med) + "</td>\n" +
      "            <td class=\"num\">" + $(r.etat) + "</td>\n" +
      "            <td class=\"num\">" + $$(r.programmes[0].montant) + "</td>\n" +
      "            <td class=\"num\"><strong>" + $(r.net) + "</strong></td>\n" +
      "            <td class=\"num\">" + $$(r.net / 12) + "</td>\n" +
      "            <td class=\"num\">" + (r.taux * 100).toFixed(1) + "%</td>\n" +
      "          </tr>";
  }).join("\n"));
} else {
  console.log(taux.map(t => {
    const b = t * HEURES;
    const r = calcul(CLE, b); verifier(r);
    return "          <tr>\n" +
      "            <td class=\"num\">" + $$(t) + "</td>\n" +
      "            <td class=\"num\">" + $(r.brut) + "</td>\n" +
      "            <td class=\"num\"><strong>" + $(r.net) + "</strong></td>\n" +
      "            <td class=\"num\">" + $$(r.net / 12) + "</td>\n" +
      "            <td class=\"num\">" + $$(r.netHoraire) + "</td>\n" +
      "            <td class=\"num\">" + (r.taux * 100).toFixed(1) + "%</td>\n" +
      "          </tr>";
  }).join("\n"));
}
