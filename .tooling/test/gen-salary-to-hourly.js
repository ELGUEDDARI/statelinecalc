/* Genere le tableau "un salaire annuel, ca fait combien de l'heure" pour un Etat.
 *
 * Pourquoi cette table existe : mesure du 28/08/2026 sur la requete
 * "$60,000 a year is how much an hour". Le top 9 reel ne contient AUCUN geant
 * de la paie - ni ADP, ni SmartAsset, ni PaycheckCity, ni Intuit - mais des
 * billets Medium et des blogs d'agregateurs. Et tous repondent en BRUT :
 * "28,85 $/h avant impots". Personne ne donne le net, personne ne le fait par
 * Etat. C'est exactement ce que notre moteur sait faire.
 *
 * Le tableau donne donc les DEUX : le brut horaire, que tout le monde publie,
 * et le net horaire, que personne ne publie.
 *
 * Lancer : node .tooling/test/gen-salary-to-hourly.js <etat>
 */
const R = require("../../data/rates-2026.js");

const cle = (process.argv[2] || "").toLowerCase();
const S = R.states[cle];
if (!S) {
  console.error("Etat inconnu : " + cle + ". Connus : " + Object.keys(R.states).join(", "));
  process.exit(1);
}

function progressiveTax(taxable, bands) {
  let du = 0, bas = 0;
  for (const [plafond, taux] of bands) {
    const haut = (plafond === null || plafond === undefined) ? Infinity : plafond;
    if (taxable > bas) du += (Math.min(taxable, haut) - bas) * taux;
    bas = haut;
    if (taxable <= haut) break;
  }
  return du;
}

/* Meme regle que dans le moteur et dans les deux autres generateurs : la
   deduction d'un Etat peut etre une table par situation de famille, et
   certains Etats la retirent entierement au-dela d'un seuil. */
function deductionEtat(S, statut, revenu) {
  const d = S.incomeTax.standardDeduction;
  if (!d) return 0;
  let v = (typeof d === "object") ? ((statut in d) ? d[statut] : d.single) : d;
  const po = S.incomeTax.deductionPhaseOut;
  if (po && revenu !== undefined) {
    const seuil = (statut in po) ? po[statut] : po.single;
    if (isFinite(seuil) && revenu > seuil) v = 0;
  }
  return v;
}

const HEURES = 2080;   // 40 h x 52 semaines, l'hypothese que tout le monde emploie

/* Les memes 30 paliers que le tableau des salaires, pour qu'un visiteur qui
   passe d'une page a l'autre retrouve ses reperes. */
const salaires = [
  25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000,
  75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 125000, 130000,
  140000, 150000, 160000, 175000, 200000, 225000, 250000, 300000, 400000, 500000];

const argent = n => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const cents  = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const lignes = salaires.map(brut => {
  const federal = progressiveTax(Math.max(0, brut - R.federal.standardDeduction.single),
                                 R.federal.brackets.single);
  const ss  = Math.min(brut, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
  const med = brut * R.fica.medicare.rate
            + Math.max(0, brut - R.fica.additionalMedicare.threshold) * R.fica.additionalMedicare.rate;
  const etat = S.incomeTax.hasIncomeTax
    ? progressiveTax(Math.max(0, brut - deductionEtat(S, "single", brut)), S.incomeTax.brackets.single)
    : 0;
  const pl = S.paidLeave
    ? (S.paidLeave.wageCap ? Math.min(brut, S.paidLeave.wageCap) : brut) * S.paidLeave.employeeRate
    : 0;
  const wc = S.waCares ? brut * S.waCares.rate : 0;
  const total = federal + ss + med + etat + pl + wc;
  const net = brut - total;
  return {
    brut,
    brutHoraire: brut / HEURES,
    netAnnuel: net,
    netHoraire: net / HEURES,
    netMensuel: net / 12,
    netHebdo: net / 52,
    taux: total / brut
  };
});

/* Un tableau faux ne doit jamais pouvoir etre publie. */
lignes.forEach(l => Object.keys(l).forEach(k => {
  if (!isFinite(l[k])) {
    console.error("ARRET : valeur non finie pour " + k + " sur " + l.brut);
    process.exit(2);
  }
}));

console.log(lignes.map(l =>
  "          <tr>\n" +
  "            <td class=\"num\">" + argent(l.brut) + "</td>\n" +
  "            <td class=\"num\">" + cents(l.brutHoraire) + "</td>\n" +
  "            <td class=\"num\"><strong>" + cents(l.netHoraire) + "</strong></td>\n" +
  "            <td class=\"num\">" + argent(l.netAnnuel) + "</td>\n" +
  "            <td class=\"num\">" + cents(l.netMensuel) + "</td>\n" +
  "            <td class=\"num\">" + cents(l.netHebdo) + "</td>\n" +
  "            <td class=\"num\">" + (l.taux * 100).toFixed(1) + "%</td>\n" +
  "          </tr>").join("\n"));
