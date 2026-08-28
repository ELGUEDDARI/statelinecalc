/* Genere les 14 lignes HTML du tableau "take-home pay by salary".
   Ce tableau est la version RENDUE COTE SERVEUR du calculateur : les
   crawlers d'IA n'executent pas le JS, donc sans lui l'outil leur est
   invisible. C'est le bloc le plus important de la page.

   Lancer :
     node .tooling/test/gen-table.js washington > .tooling/test/table-washington.html
     node .tooling/test/gen-table.js nevada     > .tooling/test/table-nevada.html

   Generalise le 27/08/2026, apres avoir ecrit Washington entierement a la
   main (regle E : jamais d'outil avant d'avoir fait la tache une fois).
   Le state est lu dans rates-2026.js : les retenues d'Etat qui n'existent
   pas dans la fiche de l'Etat valent zero, elles ne sont pas supposees.
   Les 84 nombres ne sont jamais saisis a la main.

   Colonne "state" = TOUTES les retenues salariales d'Etat cumulees.
   Washington : Paid Leave + WA Cares. Nevada : rien, donc $0. */

const R = require("../../data/rates-2026.js");

const cle = process.argv[2] || "washington";
const S = R.states[cle];
if (!S) {
  console.error("Etat inconnu : " + cle + "\nDisponibles : " + Object.keys(R.states).join(", "));
  process.exit(2);
}

function progressiveTax(taxable, bands) {
  let tax = 0, lower = 0;
  for (const [upper, rate] of bands) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

const money = n => "$" + Math.round(n).toLocaleString("en-US");
const money2 = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* La deduction d'un Etat peut etre un montant unique ou une table par situation
   de famille : la Georgie deduit 15 000 $ pour un celibataire et 30 000 $ pour
   un couple. Les tableaux de cette page sont tous en celibataire, mais lire la
   valeur sans tester le type donnait "gross - {objet}" = NaN, et le generateur
   ecrivait tranquillement "$NaN" dans du HTML destine a la mise en ligne.
   Ajoute le 28/08/2026, en meme temps que le meme correctif dans le moteur. */
function deductionEtat(S, statut, revenu) {
  const d = S.incomeTax.standardDeduction;
  if (!d) return 0;
  let v = (typeof d === "object") ? ((statut in d) ? d[statut] : d.single) : d;
  /* Certains Etats retirent la deduction au-dela d'un seuil au lieu de la
     reduire progressivement (Illinois : plus d'exoneration au-dela de
     250 000 $, 500 000 $ en couple). Sans ca le tableau donnerait une
     deduction que l'Etat n'accorde pas. Ajoute le 28/08/2026. */
  const po = S.incomeTax.deductionPhaseOut;
  if (po && revenu !== undefined) {
    const seuil = (statut in po) ? po[statut] : po.single;
    if (isFinite(seuil) && revenu > seuil) v = 0;
  }
  return v;
}

const salaries = [
  /* 30 paliers au lieu de 14. Choisis sur des montants que les gens tapent
     reellement : tous les 5 000 dans la zone dense 25-100k, puis des paliers
     ronds au-dela. Chaque ligne repond mot pour mot a une requete du type
     "how much is $X a year after taxes in Y". */
  25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000,
  75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 125000, 130000,
  140000, 150000, 160000, 175000, 200000, 225000, 250000, 300000, 400000, 500000];

const rows = salaries.map(gross => {
  const federal = progressiveTax(Math.max(0, gross - R.federal.standardDeduction.single),
                                 R.federal.brackets.single);
  const ss = Math.min(gross, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
  const med = gross * R.fica.medicare.rate
            + Math.max(0, gross - R.fica.additionalMedicare.threshold) * R.fica.additionalMedicare.rate;

  // Impot sur le revenu de l'Etat, s'il en a un.
  const stateIncome = S.incomeTax.hasIncomeTax
    ? progressiveTax(Math.max(0, gross - deductionEtat(S, "single", gross)),
                     S.incomeTax.brackets.single)
    : 0;

  // Programmes de paie de l'Etat : absents = zero, jamais devines.
  const pl = S.paidLeave
    ? (S.paidLeave.wageCap ? Math.min(gross, S.paidLeave.wageCap) : gross) * S.paidLeave.employeeRate
    : 0;
  const wc = S.waCares ? gross * S.waCares.rate : 0;

  const total = federal + ss + med + stateIncome + pl + wc;
  const net = gross - total;
  return { gross, federal, fica: ss + med, state: stateIncome + pl + wc, net,
           monthly: net / 12, rate: total / gross };
});

/* Un tableau faux ne doit JAMAIS pouvoir etre publie. Avant le 28/08 le
   generateur ecrivait "$NaN" sans broncher ; c'est exactement le genre de
   sortie qu'on colle dans une page sans la relire. On s'arrete en erreur. */
rows.forEach(function (r) {
  Object.keys(r).forEach(function (k) {
    if (!isFinite(r[k])) {
      console.error("ARRET : valeur non finie pour " + k + " sur " + r.gross +
                    " — le barème de cet Etat est incomplet ou mal lu.");
      process.exit(2);
    }
  });
});

console.log(rows.map(r =>
  "          <tr>\n" +
  "            <td class=\"num\">" + money(r.gross) + "</td>\n" +
  "            <td class=\"num\">" + money(r.federal) + "</td>\n" +
  "            <td class=\"num\">" + money(r.fica) + "</td>\n" +
  "            <td class=\"num\">" + money(r.state) + "</td>\n" +
  "            <td class=\"num\"><strong>" + money(r.net) + "</strong></td>\n" +
  "            <td class=\"num\">" + money2(r.monthly) + "</td>\n" +
  "            <td class=\"num\">" + (r.rate * 100).toFixed(1) + "%</td>\n" +
  "          </tr>"
).join("\n"));
