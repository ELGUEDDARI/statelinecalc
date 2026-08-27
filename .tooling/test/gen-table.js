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

const salaries = [40000, 50000, 60000, 70000, 75000, 80000, 90000,
                  100000, 110000, 125000, 140000, 150000, 175000, 200000];

const rows = salaries.map(gross => {
  const federal = progressiveTax(Math.max(0, gross - R.federal.standardDeduction.single),
                                 R.federal.brackets.single);
  const ss = Math.min(gross, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
  const med = gross * R.fica.medicare.rate
            + Math.max(0, gross - R.fica.additionalMedicare.threshold) * R.fica.additionalMedicare.rate;

  // Impot sur le revenu de l'Etat, s'il en a un.
  const stateIncome = S.incomeTax.hasIncomeTax
    ? progressiveTax(Math.max(0, gross - (S.incomeTax.standardDeduction || 0)),
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
