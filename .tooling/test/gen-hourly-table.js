/* Genere le tableau "taux horaire -> salaire net", version rendue cote
   serveur du calculateur horaire. Meme raison que gen-table.js : les
   crawlers d'IA n'executent pas le JS, donc sans ce tableau la
   fonctionnalite horaire leur est totalement invisible.

   Vise la famille de requetes "X an hour is how much a year" et
   "<etat> hourly paycheck calculator".

   Base : 40 heures par semaine, 52 semaines = 2 080 heures. C'est
   l'hypothese affichee dans le tableau, PAS une hypothese cachee : le
   calculateur de la page, lui, demande les vraies heures.

   Lancer :
     node .tooling/test/gen-hourly-table.js nevada     > .tooling/test/table-hourly-nevada.html
     node .tooling/test/gen-hourly-table.js washington > .tooling/test/table-hourly-washington.html
*/
const R = require("../../data/rates-2026.js");
/* Delegue le calcul a la bibliotheque unique .tooling/lib/paie.js.
   Avant le 28/08/2026 ce generateur avait sa propre copie de l'arithmetique.
   Elle ignorait les programmes salaries et la regle 401(k) de la Pennsylvanie,
   et a produit un tableau faux de 0,02 $ l'heure - publie sans rien signaler,
   trouve seulement parce qu'une suite de test compare le tableau SERVI a une
   seconde implementation. Une seule copie du calcul, desormais. */
const LIB = require("../lib/paie.js");


const cle = process.argv[2] || "washington";
const S = R.states[cle];
if (!S) {
  console.error("Etat inconnu : " + cle + "\nDisponibles : " + Object.keys(R.states).join(", "));
  process.exit(2);
}

const HEURES_AN = 40 * 52;   // 2 080

const progressiveTax = LIB.progressiveTax;

const money = n => "$" + Math.round(n).toLocaleString("en-US");
const money2 = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Meme correctif que dans gen-table.js et dans le moteur, le 28/08/2026 : la
   deduction d'un Etat peut etre une table par situation de famille (Georgie :
   15 000 $ seul, 30 000 $ en couple). Lue sans tester le type, elle donnait
   NaN, et le generateur ecrivait "$NaN" dans du HTML pret a publier. */
const deductionEtat = LIB.deductionEtat;

const taux = [
  /* 30 taux au lieu de 14, meme raison que pour le tableau des salaires.
     On descend a 12 $ : c'est en dessous du salaire minimum de plusieurs
     Etats mais au-dessus du minimum federal, et c'est une requete reelle. */
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 28, 30, 32, 35, 38,
  40, 45, 50, 55, 60, 65, 70, 75, 85, 100];

const rows = taux.map(h => {
  const gross = h * HEURES_AN;
  const federal = progressiveTax(Math.max(0, gross - R.federal.standardDeduction.single),
                                 R.federal.brackets.single);
  const ss = Math.min(gross, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
  const med = gross * R.fica.medicare.rate
            + Math.max(0, gross - R.fica.additionalMedicare.threshold) * R.fica.additionalMedicare.rate;
  const stateIncome = S.incomeTax.hasIncomeTax
    ? progressiveTax(Math.max(0, gross - deductionEtat(S, "single", gross)),
                     S.incomeTax.brackets.single)
    : 0;
  const pl = S.paidLeave
    ? (S.paidLeave.wageCap ? Math.min(gross, S.paidLeave.wageCap) : gross) * S.paidLeave.employeeRate
    : 0;
  const wc = S.waCares ? gross * S.waCares.rate : 0;
  const total = federal + ss + med + stateIncome + pl + wc;
  const net = gross - total;
  return { h, gross, net, mensuel: net / 12, netHoraire: net / HEURES_AN, taux: total / gross };
});

/* Un tableau faux ne doit jamais pouvoir etre publie : on s'arrete en erreur
   plutot que d'ecrire "$NaN" dans une page. */
rows.forEach(function (r) {
  Object.keys(r).forEach(function (k) {
    if (!isFinite(r[k])) {
      console.error("ARRET : valeur non finie pour " + k + " — bareme incomplet.");
      process.exit(2);
    }
  });
});

console.log(rows.map(r =>
  "          <tr>\n" +
  "            <td class=\"num\">" + money2(r.h) + "</td>\n" +
  "            <td class=\"num\">" + money(r.gross) + "</td>\n" +
  "            <td class=\"num\"><strong>" + money(r.net) + "</strong></td>\n" +
  "            <td class=\"num\">" + money2(r.mensuel) + "</td>\n" +
  "            <td class=\"num\">" + money2(r.netHoraire) + "</td>\n" +
  "            <td class=\"num\">" + (r.taux * 100).toFixed(1) + "%</td>\n" +
  "          </tr>"
).join("\n"));
