/* L'implementation NODE unique du calcul de paie.
 *
 * Pourquoi ce fichier existe : au 28/08/2026 la meme arithmetique etait
 * recopiee dans quatre generateurs et deux suites de test. Chaque nouvelle
 * regle d'Etat devait donc etre appliquee six fois, et le 28/08 au matin une
 * regle appliquee au moteur mais pas aux generateurs a produit "$NaN" dans du
 * HTML publiable. Une seule copie, un seul endroit ou se tromper.
 *
 * Ce fichier doit rester le miroir exact de assets/calc-paycheck.js. Les tests
 * comparent les deux sur les memes entrees ; s'ils divergent, la suite echoue.
 */
const R = require("../../data/rates-2026.js");

const HEURES = 2080;                 // 40 h x 52 semaines

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

/* La deduction d'un Etat peut etre un nombre, une table par situation de
   famille (Georgie), et certains Etats la retirent entierement au-dela d'un
   seuil (Illinois). */
function deductionEtat(S, statut, base) {
  const d = S.incomeTax.standardDeduction;
  if (!d) return 0;
  let v = (typeof d === "object") ? ((statut in d) ? d[statut] : d.single) : d;
  const po = S.incomeTax.deductionPhaseOut;
  if (po && base !== undefined) {
    const seuil = (statut in po) ? po[statut] : po.single;
    if (isFinite(seuil) && base > seuil) v = 0;
  }
  return v;
}

/* Certains Etats ne reduisent pas le revenu imposable : ils calculent l'impot
   plein, puis en retranchent un CREDIT qui s'efface a mesure que le revenu
   monte. L'Utah est le premier ici - Publication 14, schedules 1 a 8 :
   impot = 4,45 % des salaires, moins (allocation de base - 1,3 % de la part
   des salaires au-dessus d'un seuil), le tout jamais negatif. Traiter ce
   credit comme une deduction donnerait un resultat faux a tous les niveaux
   de revenu, pas seulement aux extremes. */
function creditEtat(S, statut, base) {
  const c = S.incomeTax.taxCredit;
  if (!c) return 0;
  const pick = (t) => (statut in t) ? t[statut] : t.single;
  const socle = pick(c.base);
  const seuil = pick(c.phaseOutStart);
  return Math.max(0, socle - Math.max(0, base - seuil) * c.phaseOutRate);
}

/* retraitePct : part du brut versee au 401(k). Zero par defaut, parce que les
   tableaux publies supposent un salarie sans versement - l'hypothese est
   ecrite sur chaque page. */
function calcul(cle, brut, statut = "single", retraitePct = 0) {
  const S = R.states[cle];
  if (!S) throw new Error("Etat inconnu : " + cle);

  const pretax = Math.min(retraitePct * brut, brut);
  const apresPretax = brut - pretax;

  const federal = progressiveTax(
    Math.max(0, apresPretax - R.federal.standardDeduction[statut]),
    R.federal.brackets[statut] || R.federal.brackets.single);

  const ss  = Math.min(brut, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
  const med = brut * R.fica.medicare.rate
            + Math.max(0, brut - R.fica.additionalMedicare.threshold)
              * R.fica.additionalMedicare.rate;

  /* La Pennsylvanie taxe le versement 401(k) : sa base est le brut. */
  const baseEtat = S.incomeTax.taxesRetirementDeferrals ? brut : apresPretax;
  const etat = S.incomeTax.hasIncomeTax
    ? Math.max(0, progressiveTax(Math.max(0, baseEtat - deductionEtat(S, statut, baseEtat)),
                                 S.incomeTax.brackets[statut] || S.incomeTax.brackets.single)
                  - creditEtat(S, statut, baseEtat))
    : 0;

  const pl = S.paidLeave
    ? (S.paidLeave.wageCap ? Math.min(brut, S.paidLeave.wageCap) : brut) * S.paidLeave.employeeRate
    : 0;
  const wc = S.waCares ? brut * S.waCares.rate : 0;

  const programmes = (S.employeePrograms || []).map(pg => ({
    label: pg.label,
    montant: (pg.wageCap ? Math.min(brut, pg.wageCap) : brut) * pg.rate
  }));
  const totalProg = programmes.reduce((t, pg) => t + pg.montant, 0);

  const total = federal + ss + med + etat + pl + wc + totalProg;
  const net = brut - total - pretax;

  const r = { brut, pretax, federal, ss, med, etat, paidLeave: pl, waCares: wc,
              programmes, total, net, taux: total / brut,
              netHoraire: net / HEURES, brutHoraire: brut / HEURES };

  /* Un chiffre non fini ne doit jamais pouvoir atteindre une page. */
  for (const k of ["federal", "ss", "med", "etat", "total", "net", "taux", "netHoraire"]) {
    if (!isFinite(r[k])) throw new Error("ARRET : " + k + " non fini pour " + cle + " a " + brut);
  }
  return r;
}

const c2 = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const c0 = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

module.exports = { R, HEURES, progressiveTax, deductionEtat, creditEtat, calcul, c2, c0 };
