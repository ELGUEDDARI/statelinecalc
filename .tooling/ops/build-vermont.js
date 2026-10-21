/* Construit /paycheck-calculator/vermont/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Vermont est le 46e Etat publie. Aucun mecanisme nouveau au moteur : meme forme que le Kansas (un montant deduit par statut,
 * ici les ALLOCATIONS du W-4VT, + un bareme par statut dont la premiere tranche est a 0 %), avec QUATRE taux. Ce que le Vermont a
 * de propre, et que la page DIT :
 *
 *   1. QUATRE TAUX, DEUX BAREMES : celibataire (chef de famille inclus) 0 % jusqu'a 3 925 $, 3,35 % jusqu'a 54 675 $, 6,6 % jusqu'a
 *      126 775 $, 7,6 % jusqu'a 260 225 $, 8,75 % au-dela ; marie 0 % jusqu'a 11 775 $, ..., 323 825 $ (GB-1210-2026, table annuelle).
 *   2. LES ALLOCATIONS DU W-4VT : 5 400 $ chacune. Ligne 1 (soi-meme), ligne 2 (conjoint sans emploi, couple conjoint), ligne 3 (personnes
 *      a charge), ligne 4 (chef de famille). Le site : 1 / 2 / 2 allocations. La case de statut du W-4VT n'a pas de « chef de famille » :
 *      le site applique le bareme celibataire, lecture dite comme la notre.
 *   3. LE CONJOINT QUI TRAVAILLE : une seule allocation au lieu de deux (ligne 2 reservee au conjoint sans emploi) ; chiffre sur la page.
 *   4. LA CHILD CARE CONTRIBUTION : 0,44 % a la charge de l'EMPLOYEUR ; l'employeur PEUT retenir jusqu'a 0,11 % sur le salaire (GB-1326),
 *      ne le doit pas. NON modelisee (rien n'est exige du salarie), chiffree : 82,50 $ a 75 000 $.
 *   5. CONGE FAMILIAL : programme volontaire (governor.vermont.gov/vtfmli) ; aucune cotisation salariale obligatoire trouvee.
 *   6. AUCUNE TAXE LOCALE TROUVEE dans le guide.
 *   7. SANS W-4VT : l'employeur peut se servir du W-4 federal, avec un risque de retenue insuffisante (guide p. 3) : dit tel quel, pas de
 *      chiffre invente.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - « Vermont has no local income tax » : seulement « we found no » ;
 *   - « the Department prints no 2026 rate change » : on dit ce que le guide dit (« EFFECTIVE JANUARY 1, 2026 ») ;
 *   - « Vermont has no paid family leave » : seulement « voluntary » (source) et « we found no required deduction » ;
 *   - « a head of household checks Single » : lecture a nous, dite comme telle ;
 *   - « employers must withhold 0,11 % » : c'est un CHOIX de l'employeur.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-vermont.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "vermont";
const NOM = "Vermont";
const URL = "https://statelinecalc.com/paycheck-calculator/vermont/";
const AUJOURD_HUI = "2026-10-20";
const LISIBLE = "October 20, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const VTD = R.states[CLE];
const IT = VTD.incomeTax;
const AL = IT.standardDeduction;                       // 5 400 / 10 800 / 10 800 : allocations annuelles
const BS = IT.brackets.single;                         // 0 / 3,35 / 6,6 / 7,6 / 8,75 % (chef de famille inclus)
const BM = IT.brackets.marriedJoint;
const fedDed = R.federal.standardDeduction;
const UNE = 5400;                                      // une allocation du W-4VT
const [S1, S2, S3, S4] = [BS[0][0], BS[1][0], BS[2][0], BS[3][0]];   // 3 925 ; 54 675 ; 126 775 ; 260 225
const [M1, M2, M3, M4] = [BM[0][0], BM[1][0], BM[2][0], BM[3][0]];   // 11 775 ; 96 475 ; 216 525 ; 323 825
const [T1, T2, T3, T4] = [BS[1][1], BS[2][1], BS[3][1], BS[4][1]];   // 3,35 ; 6,6 ; 7,6 ; 8,75 %
const BASE = k => progressiveTax(k, BS);               // impot celibataire en haut d'une tranche
const BASM = k => progressiveTax(k, BM);
const CCC_MAX = 0.0011;                                // 0,11 % : plafond de la part que l'employeur peut retenir

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a30 = calcul(CLE, 30000);
const a250 = calcul(CLE, 250000);
const a400 = calcul(CLE, 400000);
const a17 = calcul(CLE, 17000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const imp75 = 75000 - AL.single;                                          // 69 600
const dansT2 = S2 - S1;                                                   // 50 750 imposes a 3,35 %
const tranche1 = dansT2 * T1;                                             // 1 700,125
const auDessus = imp75 - S2;                                              // 14 925 imposes a 6,6 %
const haut75 = auDessus * T2;                                             // 985,05
const jImp = 75000 - AL.marriedJoint;                                     // 64 200
const jDansT1 = jImp - M1;                                                // 52 425 imposes a 3,35 %
const hImp = 75000 - AL.headOfHousehold;                                  // 64 200
const hAuDessus = hImp - S2;                                              // 9 525
/* Conjoint qui travaille : UNE allocation (ligne 1 seulement) sur le bareme marie. */
const jTravaille = progressiveTax(75000 - UNE, BM);                       // 1 937,1375
const ecartConjoint = jTravaille - j75.etat;                              // 180,90
/* Ce que vaut une allocation de 5 400 $ selon l'echelon. */
const valeurAlloc = { bas: UNE * T1, milieu: UNE * T2, haut: UNE * T4 };  // 180,90 ; 356,40 ; 472,50
/* Erreurs typiques. */
const sansAllocation = progressiveTax(75000, BS);                         // table appliquee a la paie entiere
const ecartSansAllocation = sansAllocation - a75.etat;                    // 5 400 x 6,6 %
const tauxUnique = imp75 * T2;                                            // tout au taux de 6,6 %
const ecartTauxUnique = tauxUnique - a75.etat;
/* Child Care Contribution : part que l'employeur peut retenir. */
const ccc75 = 75000 * CCC_MAX;                                            // 82,50
const netAvecCcc = a75.net - ccc75;
/* 400 000 $ : tranche a 8,75 %. */
const imp400 = 400000 - AL.single;
const dansT5 = imp400 - S4;
/* Paies mensuelle et toutes les deux semaines. */
const mensuel75 = a75.etat / 12;
const bimensuel75 = a75.etat / 26;
/* Seuils de salaire annuel (paie = allocation + seuil de la table). */
const PAIE = {
  s: [AL.single + S1, AL.single + S2, AL.single + S3, AL.single + S4],
  h: [AL.headOfHousehold + S1, AL.headOfHousehold + S2, AL.headOfHousehold + S3, AL.headOfHousehold + S4],
  j: [AL.marriedJoint + M1, AL.marriedJoint + M2, AL.marriedJoint + M3, AL.marriedJoint + M4]
};

/* Voisins : New Hampshire, Massachusetts et New York (publie le 21/10/2026) sont publies. */
const REF = 75000;
const COMPARE = [CLE, "new-hampshire", "massachusetts", "new-york"];
const NOMS = { [CLE]: "Vermont", "new-hampshire": "New Hampshire", massachusetts: "Massachusetts", "new-york": "New York" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const plusMoins = k => {
  const r = calcul(k, REF), nom = NOMS[k];
  const lien = "<a href=\"/paycheck-calculator/" + k + "/\">" + nom + "</a>";
  return "a " + lien + " worker keeps about " + N($(Math.abs(r.net - a75.net))) + (r.net > a75.net ? " more" : " less");
};
const phraseVoisins = plusMoins("new-hampshire") + ", " + plusMoins("massachusetts") + " and " + plusMoins("new-york");

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des deux baremes, echelon par echelon. */
const ECHELONS = [
  ["0%", "First " + $(S1), $(0), "First " + $(M1), $(0)],
  [pct(T1), $(S1) + " to " + $(S2), $$(BASE(S2)), $(M1) + " to " + $(M2), $$(BASM(M2))],
  [pct(T2), $(S2) + " to " + $(S3), $$(BASE(S3)), $(M2) + " to " + $(M3), $$(BASM(M3))],
  [pct(T3), $(S3) + " to " + $(S4), $$(BASE(S4)), $(M3) + " to " + $(M4), $$(BASM(M4))],
  [pct2(T4), "Over " + $(S4), "&mdash;", "Over " + $(M4), "&mdash;"]
];
const LIGNES_BAREMES = ECHELONS.map(([taux, s, bs, m, bm]) => "        <tr><th scope=\"row\">" + taux + "</th><td>" + s + "</td><td class=\"num\">" + bs + "</td><td>" + m +
  "</td><td class=\"num\">" + bm + "</td></tr>").join("\n");

/* Le tableau des cases du W-4VT. */
const LIGNES_STATUT = [
  ["Line 1 only: no one can claim you as a dependent", "Single", "1 allowance", $(AL.single), $(PAIE.s[0]), $(PAIE.s[3])],
  ["Lines 1 and 2: you file jointly and your spouse does not work", "Married filing jointly", "2 allowances", $(AL.marriedJoint), $(PAIE.j[0]), $(PAIE.j[3])],
  ["Lines 1 and 4: you plan to file as head of household", "Head of household", "2 allowances", $(AL.headOfHousehold), $(PAIE.h[0]), $(PAIE.h[3])]
].map(([lib, site, nb, a, z, h]) => "        <tr><th scope=\"row\">" + lib + "</th><td>" + site + "</td><td>" + nb + "</td><td class=\"num\">" + a +
  "</td><td class=\"num\">" + z + "</td><td class=\"num\">" + h + "</td></tr>").join("\n");

/* Le tableau des periodes de paie : valeurs IMPRIMEES dans le guide (pages 5-6), controlees contre annuel / N. */
const IMPRIME = [
  ["Weekly", 52, 103.85, 75, 226],
  ["Every two weeks", 26, 207.69, 151, 453],
  ["Twice a month", 24, 225.00, 164, 491],
  ["Monthly", 12, 450.00, 327, 981],
  ["Quarterly", 4, 1350.00, 981, 2944],
  ["Yearly", 1, 5400.00, 3925, 11775]
];
const LIGNES_PERIODES = IMPRIME.map(([lib, n, a, zs, zm]) =>
  "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + n + "</td><td class=\"num\">" + $$(a) +
  "</td><td class=\"num\">" + $(zs) + "</td><td class=\"num\">" + $(zm) + "</td></tr>").join("\n");

/* Le recoupement avec les grilles imprimees : le script de verification est LANCE ici, ses chiffres sont repris tels quels. */
let verifSortie = "";
try {
  verifSortie = execFileSync(process.execPath, [path.join(RACINE, ".tooling", "test", "verif-retenue-vt.js")], { encoding: "utf8" });
} catch (e) { console.error(String(e.stdout || e)); console.error("ARRET : verif-retenue-vt.js echoue"); process.exit(2); }
const mv = verifSortie.match(/^(\d+) seuils et montants imprimes recoupes ; (\d+) cellules des grilles par tranches : (\d+) reproduites exactement, (\d+) a un bord d'arrondi, (\d+) tranches a cheval.*: OK/m);
if (!mv) { console.error(verifSortie); console.error("ARRET : sortie de verif-retenue-vt.js illisible"); process.exit(2); }
const [, V_SEUILS, V_CELLULES, V_EXACT, V_BORD, V_ZERO] = mv;
const virgule = s => Number(s).toLocaleString("en-US");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Vermont income tax withholding rate?",
   "Vermont&rsquo;s withholding table has four rates, " + N(pct(T1)) + ", " + N(pct(T2)) + ", " + N(pct(T3)) + " and " + N(pct2(T4)) + ", on top of a first step at " + N("0%") + ". For a single filer, nothing is withheld on the first " + $(S1) +
   " of what is left after the allowance, " + N(pct(T1)) + " is withheld on the next " + $(S2 - S1) + ", " + N(pct(T2)) + " on the next " + $(S3 - S2) + ", " + N(pct(T3)) + " on the next " + $(S4 - S3) + ", and " + N(pct2(T4)) + " above " + $(S4) +
   ". A married filer gets wider steps. &ldquo;What is left&rdquo; means your yearly pay minus the withholding allowances from your Form W-4VT, which are " + $(UNE) + " each. On " + $(75000) + ", a single filer has " + $$(a75.etat) + " withheld a year."],

  ["How much Vermont tax is withheld on a $75,000 salary?",
   "For a single filer with one allowance, Vermont withholds " + $$(a75.etat) + " a year, which is " + $$(mensuel75) + " a month or " + $$(bimensuel75) + " on a biweekly check. " +
   "Taxable pay is " + $(75000) + " minus the " + $(AL.single) + " allowance, or " + $(imp75) + ". The first " + $(S1) + " of it is not taxed, the next " + $(dansT2) + " produces " + $$(tranche1) +
   ", and the remaining " + $(auDessus) + " is taxed at " + pct(T2) + ". A married filer whose spouse does not work, with two allowances (" + $(AL.marriedJoint) + ") and the married table, has " + $$(j75.etat) +
   " withheld, and a head of household with two allowances has " + $$(h75.etat) + " withheld."],

  ["What is take-home pay on a $75,000 salary in Vermont?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of Vermont income tax, an effective rate of " + (a75.taux * 100).toFixed(1) + "%. We found no Vermont city or county income tax in the withholding guide, so there is no local line."],

  ["How much is $20, $25 or $30 an hour after taxes in Vermont?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "Vermont income tax withholding, with no retirement contribution."],

  ["What is a Vermont withholding allowance?",
   "It is the amount your employer subtracts from your pay before applying the Vermont table. The Department of Taxes&rsquo; guide says one withholding allowance equals " + $$(UNE) + " a year, and the number you claim comes from the worksheet on Form W-4VT: one for yourself if no one can claim you as a dependent, one more if you file jointly and your spouse does not work, one for each dependent you plan to claim, and one if you plan to file as head of household. " +
   "Your actual Vermont tax is figured on your return, where the deductions and credits you actually qualify for apply."],

  ["How many allowances do I claim on the Vermont W-4VT if I am married?",
   "It depends on your spouse&rsquo;s work. Line 2 of the worksheet says to enter 1 if you are filing jointly and your spouse does not work. With line 1, that makes two allowances, " + $(AL.marriedJoint) + " in all, and the married table applies. This calculator uses that case for &ldquo;Married filing jointly.&rdquo; " +
   "If your spouse works, line 2 stays empty and you have one allowance. On " + $(75000) + ", that would withhold " + $$(ecartConjoint) + " more Vermont tax a year than this calculator shows. The form also has a box for &ldquo;Married, but withhold at higher single rate,&rdquo; which the guide does not explain further and which we do not model."],

  ["How does head of household work on the Vermont W-4VT?",
   "The worksheet adds one allowance on line 4 if you plan to file as head of household. With the one for yourself on line 1, that is two allowances, " + $(AL.headOfHousehold) + " in all. The filing-status line of the form lists Single, Married/Civil Union Filing Jointly, Married/Civil Union Filing Separately, and Married but withhold at higher single rate, with no head of household box. " +
   "We assume a head of household checks Single and uses the single table, which is our reading of the form, not a statement from the Department. On " + $(75000) + " that gives " + $$(h75.etat) + " of Vermont withholding, and take-home pay of " + $(h75.net) + " after the lower federal tax."],

  ["What is the Vermont Child Care Contribution, and does it come out of my pay?",
   "It is a payroll tax of " + pct2(0.0044) + " that Vermont employers pay on wages, which started on July 1, 2024. The Department of Taxes says an employer may choose to deduct and withhold up to 25 percent of it, or " + pct2(CCC_MAX) + " of an employee&rsquo;s wages, and may withhold a smaller portion or none at all. Employees have no filing requirement. " +
   "This calculator does not subtract it, because nothing requires your employer to take it from you. If yours does, the most it can take on " + $(75000) + " is " + $$(ccc75) + " a year, which would lower take-home pay from " + $(a75.net) + " to about " + $(netAvecCcc) + ". Any amount withheld is reported on your W-2."],

  ["Is there a Vermont paid family leave deduction?",
   "We found none that is required. The state describes its paid family and medical leave program as voluntary: employers can choose to offer a plan, and the contributions can be paid by the employer, split with employees, or paid by employees as a voluntary benefit. If your employer offers a plan and deducts a premium, it will show on your pay stub, and this calculator does not include it. " +
   "That is what we read on the governor&rsquo;s page for the program, which carries the launch announcements from December 2022 and January 2024, not proof that nothing else exists, and your pay stub is the final word."],

  ["Do Vermont cities or towns tax my paycheck?",
   "The Vermont withholding guide describes state withholding only, and we found no Vermont city, town or county income tax on wages in it. That is not proof that none exists. This calculator adds no local line for Vermont."],

  ["I live in Vermont and work in New Hampshire, or the reverse. Which state withholds?",
   "The Department&rsquo;s guide says Vermont withholding applies to wages paid to a Vermont resident and to a nonresident for services performed in Vermont. For a Vermont resident, the guide says that when a payment includes pay for work done outside the state, withholding is computed on the full payment and then reduced by the tax withheld for the state where the work was done. " +
   "For a nonresident who works in Vermont and another state in the same pay period, the guide multiplies the Vermont tax on the full payment by the share of hours worked in Vermont. This calculator assumes you live and work in Vermont and does not model either case. New Hampshire, a neighbor whose calculator here shows no state tax on wages, has its own <a href=\"/paycheck-calculator/new-hampshire/\">calculator</a>."],

  ["My employer is in another state, but I work from home in Vermont. Does Vermont withhold?",
   "The Department says an out-of-state employer does not have to begin withholding Vermont income tax until an employee has been working from a Vermont location for thirty days. If an employee lives and works remotely in Vermont, income earned during the whole period of living in Vermont is subject to Vermont income tax, even if the employee claims another state as home. The Department says employers should work with these employees, and the W-4VT helps them set their allowances. This calculator assumes your employer withholds."],

  ["Does a 401(k) contribution lower my Vermont withholding?",
   "In this calculator, yes. The guide says Vermont withholding is calculated similarly to federal withholding and does not give a separate rule for 401(k) contributions, so we start from pay after a traditional 401(k) contribution, the same choice we make in most states here. " +
   "On " + $(75000) + " with 6% going into a 401(k), Vermont income tax withholding falls by " + $$(gain401) + " a year."],

  ["How does Vermont withhold tax on a bonus?",
   "The guide&rsquo;s section on annuities, supplemental payments and deferred compensation says that for periodic payments the tax is computed using the Vermont tables, and that for non-periodic payments the Vermont withholding &ldquo;can be estimated at 30% of the federal withholding.&rdquo; " +
   "It does not say whether a bonus falls under that estimate or goes through the tables. This calculator does not model bonuses, so ask your employer which method it uses."],

  ["Why is my Vermont paycheck different from this calculator?",
   "Common reasons: you claimed a different number of allowances on your W-4VT, such as one for each dependent; you asked for extra withholding; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; part of your pay is a bonus; or your employer deducts something optional, such as part of the Child Care Contribution or a leave plan. " +
   "If you never gave your employer a W-4VT, the guide says it may use your federal Form W-4 instead, and the Department warns that not enough tax might be withheld that way. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."],

  ["How current is the Vermont formula on this page?",
   "It comes from the Department of Taxes&rsquo; 2026 Income Tax Withholding Instructions, Tables, and Charts, document GB-1210-2026, whose cover reads &ldquo;effective January 1, 2026 - expires December 31, 2026.&rdquo; " +
   "We read it on the Department&rsquo;s own site on " + LISIBLE + ". The W-4VT we read is the one the Department posts, and its footer reads &ldquo;Rev. 12/18.&rdquo; If the Department posts new tables, we update this page from them."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. */
const dec = s => s.replace(/<[^>]+>/g, "").replace(/&mdash;/g, "—").replace(/&rsquo;/g, "’")
  .replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
  .replace(/&hellip;/g, "…").replace(/&times;/g, "×").replace(/&minus;/g, "−")
  .replace(/&ndash;/g, "–").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

/* La reponse directe : 40 a 60 mots, verifie plus bas. */
const reponse = "Vermont withholds 3.35%, 6.6%, 7.6% or 8.75% of the pay left after a $5,400 allowance, with nothing withheld on the first $3,925 of that. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year; we found no required state payroll deduction. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Vermont (VT) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Vermont (VT) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Vermont tax. Rates 3.35% to 8.75%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Vermont (VT) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Vermont withholds 3.35% to 8.75% after a $5,400 allowance. On $75,000 a single filer keeps about ${$(a75.net)}.">
<meta property="og:url" content="${URL}">
<meta property="og:image" content="https://statelinecalc.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:type" content="website">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "Vermont Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Vermont take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Vermont income tax withheld under the Vermont Department of Taxes formula (withholding allowances from Form W-4VT, then rates of 3.35%, 6.6%, 7.6% and 8.75%). Local taxes and optional employer deductions are not included."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Vermont", "item": "${URL}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": ${JSON.stringify(dec(n))}, "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(dec(a))} } }`).join(",\n")}
      ]
    },
    ${JSON.stringify(organisation, null, 2).split("\n").map((l, i) => i ? "    " + l : l).join("\n")}
  ]
}
</script>
</head>
<body>

${entete("paycheck")}

<main class="wrap">
<div class="col-contenu">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/paycheck-calculator/">Paycheck Calculator</a></li>
    <li aria-current="page">Vermont</li>
  </ol>
</nav>

  <h1>Vermont Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Vermont take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="${CLE}" novalidate>
      <div class="field">
        <label for="salary">Your gross pay or hourly rate</label>
        <input type="text" id="salary" name="salary" inputmode="decimal" value="75000"
               autocomplete="off">
        <span class="help">Before any taxes or deductions. Do not include tips paid in cash.</span>
        <span class="error" role="alert">Enter an amount greater than zero.</span>
      </div>

      <div class="field" data-hours-field hidden>
        <label for="hours">Hours per week</label>
        <input type="text" id="hours" name="hours" inputmode="decimal" value="40"
               autocomplete="off">
        <span class="help">Only asked when something here is per hour. We use the hours you
        actually work to turn an hourly rate into a yearly figure, not an assumed 2,080 a year.</span>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="period">How often you are paid</label>
          <select id="period" name="period">
            <option value="annual" selected>Per year</option>
            <option value="hourly">Per hour</option>
            <option value="monthly">Per month</option>
            <option value="semimonthly">Twice a month</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Per week</option>
          </select>
          <span class="help">This tells us what the amount above represents.</span>
        </div>

        <div class="field">
          <label for="filing">Filing status</label>
          <select id="filing" name="filing">
            <option value="single" selected>Single</option>
            <option value="marriedJoint">Married filing jointly</option>
            <option value="headOfHousehold">Head of household</option>
          </select>
          <span class="help">Sets your federal brackets and standard deduction, and your Vermont allowances and table.
          For a married filer we assume a spouse who does not work; if yours works, this calculator will show less Vermont tax than your employer withholds.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Vermont income tax withholding too.</span>
        </div>

        <div class="field">
          <label for="display">Show results</label>
          <select id="display" name="display">
            <option value="monthly" selected>Per month</option>
            <option value="hourly">Per hour</option>
            <option value="annual">Per year</option>
            <option value="semimonthly">Twice a month</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Per week</option>
          </select>
          <span class="help">Changes the period, not the calculation.</span>
        </div>
      </div>

      <button type="submit" class="btn btn-primary">Calculate</button>
    </form>

    <div class="result" data-paycheck-result aria-live="polite"></div>

    <p class="caption u-mt-3">
      Everything is calculated in your browser. Nothing you type is sent to us or stored.
    </p>
  </section>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

    <h2>How this calculator works</h2>
    <p>The Vermont Department of Taxes publishes a withholding method, and this calculator follows it. Your pay is converted to a yearly amount. The withholding allowances come off (${N($(AL.single))} for a single filer, ${N($(AL.marriedJoint))} for a married filer whose spouse does not work). The rest is taxed through a table with a ${N("0%")} step, then ${N(pct(T1))}, ${N(pct(T2))}, ${N(pct(T3))} and ${N(pct2(T4))} steps, and the yearly result is divided by the number of pay periods. Vermont prints two tables, one for single filers and one for married filers, and the married table has wider steps.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Vermont income tax</strong>: your wages after any 401(k) contribution, minus the Vermont withholding allowances for your status, taxed through the table.</li>
    </ul>
    <p>This calculator has no other Vermont line. We looked for a state payroll deduction that an employer must take from your check and found none. Two optional ones are covered below: part of the Child Care Contribution, and a voluntary leave plan.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Vermont, the <strong>Department of Taxes</strong>&rsquo; withholding guide, Form W-4VT and Child Care Contribution pages, and the Governor&rsquo;s page for the paid leave program.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How current the source is.</strong> The guide is document GB-1210-2026, and its cover reads &ldquo;effective January 1, 2026 - expires December 31, 2026.&rdquo; We read it on the Department&rsquo;s own site on ${LISIBLE}, and the Sources section links to it. The Form W-4VT the Department posts is dated &ldquo;Rev. 12/18&rdquo; in its footer; its allowance amounts are not in the form, they come from the guide, which says one allowance equals ${N($$(UNE))} a year. The federal figures, Social Security wage base and Medicare thresholds are the 2026 ones.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The guide prints the withholding for hundreds of pay ranges and for 0 to 10 allowances, in wage-bracket charts for weekly, biweekly, twice-a-month, monthly and daily pay, one chart for single filers and one for married filers. We rebuilt ${N(virgule(V_CELLULES))} of those printed cells from the formula, using the middle of each pay range. ${N(virgule(V_EXACT))} matched exactly, and the other ${N(virgule(V_BORD))} are off by rounding. We left out the chart rows whose columns do not read cleanly in the file. We also checked ${N(virgule(V_SEUILS))} printed breakpoints, allowance amounts and base amounts: each base amount equals the one before it plus the tax on the step, and each breakpoint equals the yearly one divided by the number of pay periods. In the guide&rsquo;s own worked example, a married employee with two allowances paid ${N("$1,800")} a week has ${N("$45.77")} withheld, and the weekly table reproduces it.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department&rsquo;s method. Your actual Vermont income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: dependents on Form W-4VT, a spouse who works, the &ldquo;higher single rate&rdquo; box, extra withholding and the &ldquo;Exempt&rdquo; line, bonuses, rounding by your employer, work in another state, optional employer deductions, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Vermont take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 federal and Vermont rates. The
  VT state tax column is Vermont income tax withholding; we found no required Vermont payroll deduction to add.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Vermont take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">VT state tax</th>
          <th scope="col">Take-home</th>
          <th scope="col">Per month</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${tableSalaires}
      </tbody>
    </table>
  </div>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

    <h2>Vermont&rsquo;s five steps and the pay they apply to</h2>
    <p>The Department&rsquo;s yearly percentage table has five steps, and they apply to what is left of your pay after the allowances, not to your pay itself. For a single filer on ${N($(75000))}, that is ${N($(75000))} &minus; ${N($(AL.single))} = ${N($(imp75))}.
    The first ${N($(S1))} of it is not taxed, the next ${N($(dansT2))} is taxed at ${N(pct(T1))}, and the rest, ${N($(auDessus))}, falls in the ${N(pct(T2))} step, which runs up to ${N($(S3))}. The ${N(pct2(T4))} step starts above ${N($(S4))} of taxable pay, which for a single filer is ${N($(PAIE.s[3]))} of yearly pay.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Vermont withholding tables, applied to pay after the allowances
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Single (the table we use for head of household): taxable pay</th>
          <th scope="col">Single: tax at the top of the step</th>
          <th scope="col">Married: taxable pay</th>
          <th scope="col">Married: tax at the top of the step</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_BAREMES}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The Department prints the same tables for each pay period, with the breakpoints and the allowance scaled to the period. The employer applies them to the pay for that check after subtracting the allowance for that period. The table below shows where the ${N("0%")} step ends and what one allowance is worth on each kind of paycheck, as the guide prints them. The guide also prints a daily table.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Where the 0% step ends, by pay period, as printed in the guide
      </caption>
      <thead>
        <tr>
          <th scope="col">Pay period</th>
          <th scope="col">Periods a year</th>
          <th scope="col">One allowance</th>
          <th scope="col">Single: 0% step ends at</th>
          <th scope="col">Married: 0% step ends at</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_PERIODES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>The withholding allowance: what changes with your Vermont W-4VT</h2>
    <p>The Department&rsquo;s withholding method uses allowances rather than a standard deduction, and Form W-4VT is how you tell your employer how many to apply. Each one is worth ${N($(UNE))} a year. This is how the calculator maps its three choices.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Vermont withholding allowances by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Form W-4VT worksheet</th>
          <th scope="col">Used by this calculator for</th>
          <th scope="col">Allowances</th>
          <th scope="col">Yearly allowance</th>
          <th scope="col">Pay at which tax starts</th>
          <th scope="col">Pay at which ${pct2(T4)} starts</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The allowances come off your pay before the table, so each extra ${N($(1000))} of allowance is worth ${N($$(1000 * T2))} a year to anyone in the ${N(pct(T2))} step. If both spouses work, each leaves line 2 empty, so each has one allowance. If only one spouse has income and the couple files jointly, the two allowances and the wider married table apply to that one paycheck. The guide also says civil union partners use the married table.</p>

    <h2>If you cross a state line: how Vermont withholds</h2>
    <p>Vermont borders New Hampshire, Massachusetts and New York, and some people live on one side of a state line and work on the other. Rules apply in both states, and this calculator models none of them. It assumes you live and work in Vermont.</p>

    <h3>If you live in Vermont and work outside it</h3>
    <p>The guide says that when a payment to a Vermont resident includes pay for work done outside Vermont, the withholding is computed on the full payment and then reduced by the income tax withheld for the state where the work was done. It also says an employee who moves into Vermont during a tax year is a resident for withholding purposes.</p>

    <h3>If you live elsewhere and work in Vermont</h3>
    <p>Wages paid to a nonresident for services performed in Vermont are subject to Vermont withholding if they are subject to federal withholding. For a nonresident who works in Vermont and another state during a pay period, the guide computes the tax on the full payment and multiplies it by the ratio of Vermont hours to total hours. Its example: 16 hours in Vermont out of a 40-hour pay period, with ${N("$48.00")} of Vermont withholding on the whole pay, makes ${N("$19.20")}.</p>

    <h3>If you work from home in Vermont for an employer in another state</h3>
    <p>The Department says an out-of-state employer does not have to begin withholding Vermont income tax until an employee has been working from a Vermont location for thirty days. Income earned during the entire period of living in Vermont is subject to Vermont income tax, even if the employee claims another state as home; the thirty days only decide when the employer must start withholding. The Department says employers should work with these employees, and the W-4VT helps them set their allowances.</p>

    <h3>New Hampshire, Massachusetts and New York</h3>
    <p>We publish a calculator for <a href="/paycheck-calculator/new-hampshire/">New Hampshire</a>, <a href="/paycheck-calculator/massachusetts/">Massachusetts</a> and <a href="/paycheck-calculator/new-york/">New York</a>.</p>

    <h2>Two optional deductions: the Child Care Contribution and paid leave</h2>

    <h3>The Child Care Contribution is an employer tax, with an option to share part of it</h3>
    <p>Vermont employers pay a ${N(pct2(0.0044))} payroll tax on wages called the Child Care Contribution, on wages paid on or after July 1, 2024. The Department says an employer may choose to deduct and withhold a maximum of 25 percent of it, which is ${N(pct2(CCC_MAX))} of the employee&rsquo;s wages, and the employer may withhold a smaller portion or none at all. Employers do not have to treat every employee the same way, and employees have no filing requirement.</p>

    <h3>What the maximum withholding would cost you</h3>
    <p>On ${N($(75000))}, ${N(pct2(CCC_MAX))} is ${N($$(ccc75))} a year, or ${N($$(ccc75 / 12))} a month. Because nothing requires your employer to take it, this calculator does not subtract it. If your employer does, your take-home pay on ${N($(75000))} would be about ${N($(netAvecCcc))} instead of ${N($(a75.net))}. The Department&rsquo;s Child Care Contribution page says an employer that withholds part of it reports the amount on the employee&rsquo;s W-2.</p>

    <h3>Paid family and medical leave is voluntary</h3>
    <p>The Governor&rsquo;s page for the Vermont Family and Medical Leave plan describes &ldquo;a voluntary paid family and medical leave program.&rdquo; Employers can choose to design a plan, and the contributions can be paid by the employer, split between the employer and employees, or paid by employees as a voluntary benefit. We found no Vermont paid leave deduction that every employee must pay. If your employer offers a plan and deducts a premium, it will appear on your stub, and this calculator does not include it.</p>

    <h2>Vermont hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Vermont your hours also matter because of the allowance: a single filer earning ${N($(PAIE.s[0]))} or less a year has no Vermont tax withheld.</p>

    <h3>What is $20 an hour after taxes in Vermont?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Vermont income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Vermont&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Vermont?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Vermont income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The guide says that for non-periodic payments, the Vermont withholding can be estimated at ${N("30%")} of the federal withholding, and it does not say whether a bonus counts as one. Ask your employer how it withholds on a bonus.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Vermont take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year).</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Vermont take-home pay by hourly rate, single filer, 40 hours a week
      </caption>
      <thead>
        <tr>
          <th scope="col">Hourly rate</th>
          <th scope="col">Gross a year</th>
          <th scope="col">Take-home a year</th>
          <th scope="col">Per month</th>
          <th scope="col">Real hourly rate</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${tableHoraire}
      </tbody>
    </table>
  </div>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

${blocLimites(CLE)}

  <h2>Key facts that affect your take-home pay in Vermont</h2>

  <h3>The first ${$(S1)} of what is left is not taxed</h3>
  <p>The table starts with a ${N("0%")} step. With the ${N($(AL.single))} allowance, a single filer&rsquo;s yearly pay has to pass ${N($(PAIE.s[0]))} before Vermont withholds anything. At ${N($(17000))}, Vermont withholds ${N($$(a17.etat))}; at ${N($(30000))}, it withholds ${N($$(a30.etat))} a year.</p>

  <h3>The 6.6% step starts at ${$(PAIE.s[1])} of pay</h3>
  <p>The ${N(pct(T1))} step covers ${N($(S2 - S1))} of taxable pay and produces ${N($$(BASE(S2)))} of tax. The ${N(pct(T2))} step covers the next ${N($(S3 - S2))} and adds ${N($$(BASE(S3) - BASE(S2)))}. For a single filer, ${N(pct(T2))} starts at ${N($(PAIE.s[1]))} of yearly pay and ends at ${N($(PAIE.s[2]))}.</p>

  <h3>The ${pct(T3)} and ${pct2(T4)} steps start higher</h3>
  <p>For a single filer, ${N(pct(T3))} applies to taxable pay from ${N($(S3))} to ${N($(S4))}, which is pay from ${N($(PAIE.s[2]))} to ${N($(PAIE.s[3]))}. Above that, every dollar of taxable pay is taxed at ${N(pct2(T4))}. On ${N($(400000))}, taxable pay is ${N($(imp400))}, ${N($(dansT5))} of it is in the top step, and Vermont withholds ${N($$(a400.etat))}.</p>

  <h3>The married table is wider, and the allowance doubles</h3>
  <p>A single filer&rsquo;s taxable pay is pay minus ${N($(AL.single))}. A married filer whose spouse does not work, with two allowances, gets ${N($(AL.marriedJoint))} off and a table whose ${N("0%")} step runs to ${N($(M1))} and whose ${N(pct(T2))} step starts above ${N($(M2))}. That is why Vermont withholds ${N($$(j75.etat))} from that filer on ${N("$75,000")} and ${N($$(a75.etat))} from a single one. Taxable pay for the married filer is ${N($(jImp))}, all of it in the ${N(pct(T1))} step after the first ${N($(M1))}.</p>

  <h3>Head of household: two allowances and, in our reading, the single table</h3>
  <p>With lines 1 and 4 of the W-4VT worksheet, a head of household has two allowances, ${N($(AL.headOfHousehold))}. We use the single table, our reading of a form that has no head of household box. On ${N("$75,000")}, taxable pay is ${N($(hImp))} and Vermont withholds ${N($$(h75.etat))}. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>Each allowance is worth up to ${$$(valeurAlloc.haut)} a year</h3>
  <p>Line 3 of the worksheet asks for the number of dependents you plan to claim, and each one adds an allowance of ${N($(UNE))}. In the ${N(pct(T2))} step that lowers yearly withholding by ${N($$(valeurAlloc.milieu))}; in the ${N(pct(T1))} step it is ${N($$(valeurAlloc.bas))}, and in the top step ${N($$(valeurAlloc.haut))}. This calculator does not ask for dependents, so a worker with children who claims them on the W-4VT will see less Vermont tax withheld than the figure shown. The form adds that if you and your spouse both claim your dependents, not enough tax will be withheld.</p>

  <h3>Without a W-4VT, your employer may use your federal W-4</h3>
  <p>The guide says an employer may use the information from the federal Form W-4 if a Vermont form is not submitted, and that not enough tax might be withheld that way. It says employees who adjusted their federal withholding in anticipation of a credit, and employees in civil unions or civil marriages, will not have the correct Vermont tax withheld unless they complete a W-4VT. The Department strongly recommends that employers require one.</p>

  <h3>Extra withholding: about 30% of the federal extra</h3>
  <p>If the federal W-4 shows an extra amount to withhold each pay period, the guide says Vermont&rsquo;s withholding should be increased by ${N("30%")} of that extra federal amount. The W-4VT makes the same suggestion for its own line for an additional amount. This calculator does not model extra withholding.</p>

  <h3>With two jobs, put the allowances where you earn the most</h3>
  <p>The form says that if you have more than one employer, you should consider claiming zero allowances with the employer where you earn less income. This calculator treats your pay as your only income, so it cannot show the effect.</p>

  <h3>Your 401(k) lowers your Vermont taxable wages in this calculator</h3>
  <p>The guide says Vermont withholding is calculated similarly to the federal one, and it gives no separate rule for 401(k) contributions. This calculator therefore starts from pay after a traditional 401(k) contribution, as it does in most states on this site. On ${N("$75,000")} with 6% going in, Vermont income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the allowance</h3>
  <p>Applying the table to the full ${N($(75000))} instead of ${N($(imp75))} overstates Vermont withholding by ${N($$(ecartSansAllocation))}: ${N($$(sansAllocation))} instead of ${N($$(a75.etat))}.</p>

  <h3>Taxing everything at one rate</h3>
  <p>The ${N(pct(T2))} rate applies only to the part of taxable pay between ${N($(S2))} and ${N($(S3))} for a single filer. Applying it to all of ${N($(imp75))} gives ${N($$(tauxUnique))}, which overstates withholding by about ${N($(ecartTauxUnique))}.</p>

  <h3>Claiming two allowances when your spouse works</h3>
  <p>Line 2 of the W-4VT worksheet is only for a spouse who does not work. If both of you work and one of you claims it anyway, one allowance too many comes off. On ${N("$75,000")} that lowers withholding from ${N($$(jTravaille))} to ${N($$(j75.etat))}, which is ${N($$(ecartConjoint))} too little withheld over a year. The shortfall can show up as a balance due when you file.</p>

  <h3>Both spouses claiming the dependents</h3>
  <p>The form says that if you and your spouse both claim your dependents on your own W-4VTs, not enough income tax will be withheld, and you might owe when you file. Only one of you should claim them.</p>

  <h3>Assuming the Child Care Contribution is always yours to pay</h3>
  <p>It is an employer tax. An employer may take up to ${N(pct2(CCC_MAX))} of your wages toward it, or nothing. If your stub shows a deduction for it, that is your employer&rsquo;s choice, and the most it can be on ${N("$75,000")} is ${N($$(ccc75))} a year.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances you claimed on your Form W-4VT may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Vermont in 2026, with one allowance and no retirement
  contribution, under the Department&rsquo;s method:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Vermont taxable pay: ${N($(a75.brut))} &minus; ${N($(AL.single))} allowance = ${N($(imp75))}</li>
    <li>Tax on the first ${N($(S1))}: ${N($(S1))} &times; ${N("0%")} = ${N("$0.00")}</li>
    <li>Tax on the next ${N($(dansT2))}: ${N($(dansT2))} &times; ${N(pct(T1))} = ${N($$(tranche1))}</li>
    <li>Tax on the remaining ${N($(auDessus))}: ${N($(auDessus))} &times; ${N(pct(T2))} = ${N($$(haut75))}</li>
    <li>Vermont income tax withholding: ${N($$(tranche1))} + ${N($$(haut75))} = ${N($$(a75.etat))}
    a year, ${N($$(mensuel75))} on a monthly paycheck or ${N($$(bimensuel75))} on a biweekly one</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>

  <h2>Frequently asked questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Compare with other states</h2>
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Vermont borders three states: New Hampshire, Massachusetts and New York, and we publish all three.
  Each row leaves out its own local taxes and optional employer deductions. The New York row includes Paid Family Leave and disability insurance at their maximums but no New York City or Yonkers tax.</p>
  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        State-level deductions and take-home pay on ${$(REF)}, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">State</th>
          <th scope="col">State-level deductions</th>
          <th scope="col">Take-home pay</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${lignesCompare.map(l => `        <tr><th scope="row">${l.cle === CLE ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</th><td class="num">${$$(l.deductions)}</td><td class="num">${$(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a Vermont worker on the same salary, ${phraseVoisins}. A worker who lives in one of those states and commutes into Vermont, or the reverse, is a different case that this calculator does not model: it assumes a Vermont resident working in Vermont.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/new-hampshire/">New Hampshire paycheck calculator</a> &mdash; the neighbor to the east, where this calculator shows no state tax on wages.</li>
    <li><a href="/paycheck-calculator/massachusetts/">Massachusetts paycheck calculator</a> &mdash; the neighbor to the south.</li>
    <li><a href="/paycheck-calculator/new-york/">New York paycheck calculator</a> &mdash; the neighbor to the west, with a withholding schedule that climbs in steps from 3.9%.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Vermont ranks on one salary.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa(NOM, { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="${AUJOURD_HUI}">${LISIBLE}</time> &middot;
    Last updated <time datetime="${AUJOURD_HUI}">${LISIBLE}</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal rates and
    the Vermont Department of Taxes&rsquo; withholding method, and do not include dependents claimed on Form W-4VT, local taxes or optional employer deductions.
  </p>

</div>
${colonne(NOM)}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", CLE);
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), require("../lib/jsonld.js").nettoieJsonLd(html), "utf8");

const mots = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")
  .split(/\s+/).filter(Boolean).length;
const motsProse = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<table[\s\S]*?<\/table>/g, " ")
  .replace(/<select[\s\S]*?<\/select>/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots (%d hors tableaux et menus), %d H2, %d H3, %d lignes de tableau",
  mots, motsProse, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* ── Garde-fous ──────────────────────────────────────────────────────────── */
const echec = m => { console.error("ARRET : " + m); process.exit(2); };

/* 1. Recoupement independant : la formule du guide ecrite ici A PARTIR DU TEXTE (tables annuelles, p. 6), pas du moteur. */
const guide = (imposable, marie) => {
  const b = marie ? [11775, 96475, 216525, 323825] : [3925, 54675, 126775, 260225];
  const base = marie ? [0, 2837.45, 10760.75, 18915.55] : [0, 1700.13, 6458.73, 16600.93];
  const t = [0.0335, 0.066, 0.076, 0.0875];
  let k = -1; for (let i = 0; i < 4; i++) if (imposable > b[i]) k = i;
  return k < 0 ? 0 : base[k] + (imposable - b[k]) * t[k];
};
const fed75 = 7670, fedJ = 4640, fedH = 5748;
/* Les montants de base imprimes sont arrondis au cent : ecart tolere de 0,005 $ avec le calcul exact. */
if (Math.abs(guide(75000 - 5400, false) - a75.etat) > 0.006) echec("VT 75 000 $ : guide " + guide(69600, false) + ", moteur " + a75.etat);
if (Math.abs(guide(75000 - 10800, true) - j75.etat) > 0.006) echec("VT marie 75 000 $ : guide " + guide(64200, true) + ", moteur " + j75.etat);
if (Math.abs(guide(75000 - 10800, false) - h75.etat) > 0.006) echec("VT chef de famille 75 000 $ : guide " + guide(64200, false) + ", moteur " + h75.etat);
if (Math.abs(guide(250000 - 5400, false) - a250.etat) > 0.006) echec("VT 250 000 $ : guide " + guide(244600, false) + ", moteur " + a250.etat);
if (Math.abs(guide(400000 - 5400, false) - a400.etat) > 0.006) echec("VT 400 000 $ : guide " + guide(394600, false) + ", moteur " + a400.etat);
if (Math.abs((1800 - 2 * 103.85 - 226) * 0.0335 - 45.77) > 0.006) echec("l'exemple du guide (1 800 $ par semaine, marie, 2 allocations) ne se reproduit plus");
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (recalculee a la main le 20/10/2026). */
const attendusProse = [
  [a75.etat, 2685.175, "etat 75 000"], [imp75, 69600, "imposable 75 000"], [dansT2, 50750, "54 675 - 3 925"], [tranche1, 1700.125, "50 750 x 3,35 %"],
  [auDessus, 14925, "imposable au-dessus de 54 675 $"], [haut75, 985.05, "14 925 x 6,6 %"],
  [a75.net, 58907.325, "net 75 000"], [a75.total, 16092.675, "total 75 000"],
  [j75.etat, 1756.2375, "etat marie"], [jImp, 64200, "imposable marie"], [jDansT1, 52425, "marie : 64 200 - 11 775"], [j75.net, 62866.2625, "net marie"],
  [h75.etat, 2328.775, "etat chef de famille"], [hImp, 64200, "imposable chef de famille"], [hAuDessus, 9525, "chef de famille : 64 200 - 54 675"], [h75.net, 61185.725, "net chef de famille"],
  [a30.etat, 692.6125, "etat 30 000"], [a17.etat, 257.1125, "etat 17 000"],
  [jTravaille, 1937.1375, "marie, conjoint qui travaille (une allocation)"], [ecartConjoint, 180.9, "ecart conjoint qui travaille"],
  [sansAllocation, 3041.575, "table appliquee a la paie entiere"], [ecartSansAllocation, 356.4, "ecart sans allocation"],
  [tauxUnique, 4593.6, "69 600 x 6,6 %"], [ecartTauxUnique, 1908.425, "ecart taux unique"],
  [valeurAlloc.bas, 180.9, "5 400 x 3,35 %"], [valeurAlloc.milieu, 356.4, "5 400 x 6,6 %"], [valeurAlloc.haut, 472.5, "5 400 x 8,75 %"],
  [BASE(S2), 1700.125, "base 54 675"], [BASE(S3), 6458.725, "base 126 775"], [BASE(S4), 16600.925, "base 260 225"],
  [BASM(M2), 2837.45, "base marie 96 475"], [BASM(M3), 10760.75, "base marie 216 525"], [BASM(M4), 18915.55, "base marie 323 825"],
  [BASE(S3) - BASE(S2), 4758.6, "72 100 x 6,6 %"],
  [ccc75, 82.5, "0,11 % de 75 000"], [netAvecCcc, 58824.825, "net apres 0,11 %"],
  [a400.etat, 28358.7375, "etat 400 000"], [imp400, 394600, "imposable 400 000"], [dansT5, 134375, "394 600 - 260 225"],
  [gain401, 297, "gain 401(k) : 4 500 x 6,6 %"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [mensuel75, 223.76458, "mensuel"], [bimensuel75, 103.27596, "bimensuel"],
  [PAIE.s[0], 9325, "paie au premier palier (celibataire)"], [PAIE.s[1], 60075, "paie au 2e palier (celibataire)"], [PAIE.s[2], 132175, "paie au 3e palier (celibataire)"], [PAIE.s[3], 265625, "paie au 4e palier (celibataire)"],
  [PAIE.h[0], 14725, "paie au premier palier (chef de famille)"], [PAIE.h[3], 271025, "paie au 4e palier (chef de famille)"],
  [PAIE.j[0], 22575, "paie au premier palier (marie)"], [PAIE.j[3], 334625, "paie au 4e palier (marie)"]
];
/* 20 $/h = 41 600 $, imposable 36 200 : (36 200 - 3 925) x 3,35 % = 32 275 x 0,0335 = 1 081,2125.
   25 $/h = 52 000 $, imposable 46 600 : 42 675 x 0,0335 = 1 429,6125.
   30 $/h = 62 400 $, imposable 57 000 : 1 700,125 + (57 000 - 54 675) x 6,6 % = 1 700,125 + 153,45 = 1 853,575. */
attendusProse.push([h20.etat, 1081.2125, "etat 20 $/h"], [h25.etat, 1429.6125, "etat 25 $/h"], [h30.etat, 1853.575, "etat 30 $/h"]);
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(AL.single === 5400 && AL.marriedJoint === 10800 && AL.headOfHousehold === 10800)) echec("allocations != 5 400 / 10 800 / 10 800");
if (!(BS.length === 5 && BS[0][0] === 3925 && BS[0][1] === 0 && BS[1][0] === 54675 && BS[2][0] === 126775 && BS[3][0] === 260225 && BS[4][1] === 0.0875 &&
      BM.length === 5 && BM[0][0] === 11775 && BM[1][0] === 96475 && BM[2][0] === 216525 && BM[3][0] === 323825)) echec("bareme != celui du guide");
for (const [lib, n, a, zs, zm] of IMPRIME) {
  if (Math.abs(5400 / n - a) > 0.01) echec("allocation imprimee " + lib + " : " + a + " != 5 400 / " + n);
  if (Math.abs(S1 / n - zs) > 1 || Math.abs(M1 / n - zm) > 1) echec("seuils imprimes " + lib + " != annuel / " + n);
}
for (const k of COMPARE.slice(1)) if (!R.states[k]) echec("voisin absent du moteur : " + k);
if (a75.programmes.length !== 0 || a75.paidLeave !== 0 || a75.waCares !== 0) echec("le Vermont ne doit avoir aucun programme salarie");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 2500) echec(motsProse + " mots hors tableaux, sous le plancher de 2 500");
if ((html.match(/<h3/g) || []).length < 30) echec("moins de 30 H3");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements du guide (formule imprimee ecrite a la main, 75 000 $ celibataire, marie et chef de famille, exemple imprime) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
