/* Genere les 14 lignes HTML du tableau "take-home pay by salary".
   Ce tableau est la version RENDUE COTE SERVEUR du calculateur : les
   crawlers d'IA n'executent pas le JS, donc sans lui l'outil leur est
   invisible. C'est le bloc le plus important de la page.

   Lancer : node test/gen-table.js > test/table-washington.html */

const R = require("../data/rates-2026.js");
const WA = R.states.washington;

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
  const pl = Math.min(gross, WA.paidLeave.wageCap) * WA.paidLeave.employeeRate;
  const wc = gross * WA.waCares.rate;
  const total = federal + ss + med + pl + wc;
  const net = gross - total;
  return { gross, federal, fica: ss + med, state: pl + wc, net, monthly: net / 12,
           rate: total / gross };
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
