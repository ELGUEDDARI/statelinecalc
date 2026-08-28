/* Construit les pages "salaire annuel -> taux horaire" pour les Etats deja publies.
 *
 * Pourquoi un constructeur et pas six fichiers ecrits a la main : la charpente
 * est identique a 90 %, et six copies manuelles, c'est six occasions de se
 * tromper dans l'arithmetique. J'en ai fait trois aujourd'hui, toutes rattrapees
 * en comparant au generateur. Ce qui DOIT differer d'un Etat a l'autre - les
 * chiffres, la phrase de reponse, ce que l'Etat change - est ecrit un par un
 * dans FICHES ci-dessous, pas genere.
 *
 * Lancer : node .tooling/ops/build-salary-to-hourly.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const R = require("../../data/rates-2026.js");
const LIB = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const HEURES = 2080;

/* --- ce qui est propre a chaque Etat, ecrit a la main ------------------- */
const FICHES = {
  texas: {
    nom: "Texas",
    // ce que l'Etat retient, en une phrase, pour la reponse directe
    retenue: "Texas takes nothing at state level",
    // le paragraphe qui rend la page differente de celle des cinq autres
    specifique: `Texas is the cleanest conversion in the country, because there is no state
      layer at all. Whatever the federal government and FICA leave you is what you keep, so the
      gap between your gross hourly rate and your real one is entirely federal. The state
      constitution forbids the legislature from taxing net income at all, which is why that gap
      is unlikely to move.`,
    lienEtat: "/paycheck-calculator/texas/"
  },
  florida: {
    nom: "Florida",
    retenue: "Florida takes nothing at state level",
    specifique: `Florida withholds nothing from wages, so your real hourly rate is your gross
      rate minus federal tax and FICA and nothing else. Worth knowing if you work in hospitality
      or on shifts: the conversion below assumes 2,080 hours, and a season that runs short moves
      the annual figure far more than any tax rule does.`,
    lienEtat: "/paycheck-calculator/florida/"
  },
  nevada: {
    nom: "Nevada",
    retenue: "Nevada takes nothing at state level",
    specifique: `Nevada withholds nothing at state level, and unlike Washington it has no payroll
      programme deducted from wages either. For anyone converting a casino, hotel or warehouse
      salary into an hourly figure, that means the only distance between the gross rate and the
      real one is federal.`,
    lienEtat: "/paycheck-calculator/nevada/"
  },
  washington: {
    nom: "Washington",
    retenue: "Washington withholds two state programmes but no income tax",
    specifique: `Washington has no income tax, but it is not a no-deduction state: Paid Family
      and Medical Leave takes 0.807159% of wages up to $184,500, and WA Cares takes 0.58% with
      no cap. Together they are worth about $1,040 a year on a $75,000 salary, and they are the
      reason a Washington hourly rate lands slightly below a Texas or Nevada one on identical
      pay.`,
    lienEtat: "/paycheck-calculator/washington/"
  },
  georgia: {
    nom: "Georgia",
    retenue: "Georgia takes a flat 4.99%",
    specifique: `Georgia applies a flat 4.99% above a $15,000 standard deduction, so the state
      takes the same share of every extra hour you work once you are past that threshold. That
      makes the conversion predictable: no bracket to cross, no cliff, the same 4.99% on your
      first overtime hour of the year and your last.`,
    lienEtat: "/paycheck-calculator/georgia/"
  },
  pennsylvania: {
    nom: "Pennsylvania",
    retenue: "Pennsylvania takes a flat 3.07% plus a 0.07% unemployment contribution",
    specifique: `Pennsylvania applies a flat 3.07% with no standard deduction and no personal
      exemption at all, so the state takes exactly 3.07% of every hour you work - the advertised
      rate and the real rate are the same number, which is rare. It also withholds 0.07% for
      unemployment, which most states take only from the employer. And one rule catches savers
      out: a 401(k) contribution cuts your federal tax but not your Pennsylvania tax, because the
      state counts the deferral as compensation the moment it is made.`,
    lienEtat: "/paycheck-calculator/pennsylvania/"
  },

  illinois: {
    nom: "Illinois",
    retenue: "Illinois takes a flat 4.95%",
    specifique: `Illinois applies a flat 4.95% above a personal exemption of $2,925. Because
      that exemption is small, the state takes very nearly its headline rate out of every hour
      you work - much closer to it than in Georgia, where a $15,000 deduction pulls the real
      share well below the advertised one.`,
    lienEtat: "/paycheck-calculator/illinois/"
  }
};

/* --- le calcul, identique a celui du moteur ----------------------------- */
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
/* Delegue a la bibliotheque unique. Avant le 28/08/2026 ce fichier avait sa
   propre copie du calcul, qui ne connaissait ni les programmes salaries ni la
   regle 401(k) de la Pennsylvanie : elle aurait sous-estime la retenue PA sans
   rien signaler. Une seule implementation, dans .tooling/lib/paie.js. */
function net(cle, brut) {
  const r = LIB.calcul(cle, brut);
  return { total: r.total, net: r.net, taux: r.taux };
}

const c2 = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const c0 = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

module.exports = { FICHES, net, c2, c0, HEURES, RACINE, progressiveTax, deductionEtat };

if (require.main === module) {
  console.log("Ce fichier expose les donnees ; la page est assemblee par build-s2h-page.js");
  Object.keys(FICHES).forEach(k => {
    const r = net(k, 60000);
    console.log("  %s : 60 000 $ -> net %s $/an, %s $/h, taux %s%%",
      FICHES[k].nom.padEnd(11), c0(r.net), c2(r.net / HEURES), (r.taux * 100).toFixed(1));
  });
}
