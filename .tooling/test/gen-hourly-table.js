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

const cle = process.argv[2] || "washington";
const S = R.states[cle];
if (!S) {
  console.error("Etat inconnu : " + cle + "\nDisponibles : " + Object.keys(R.states).join(", "));
  process.exit(2);
}

const HEURES_AN = 40 * 52;   // 2 080

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

const taux = [15, 16, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 60, 75];

const rows = taux.map(h => {
  const gross = h * HEURES_AN;
  const federal = progressiveTax(Math.max(0, gross - R.federal.standardDeduction.single),
                                 R.federal.brackets.single);
  const ss = Math.min(gross, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
  const med = gross * R.fica.medicare.rate
            + Math.max(0, gross - R.fica.additionalMedicare.threshold) * R.fica.additionalMedicare.rate;
  const stateIncome = S.incomeTax.hasIncomeTax
    ? progressiveTax(Math.max(0, gross - (S.incomeTax.standardDeduction || 0)),
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
