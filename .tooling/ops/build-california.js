/* Construit /paycheck-calculator/california/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * La Californie est le 50e et DERNIER Etat publie. Etat COMPLEXE par l'ecart entre ce que les gens croient (« 13,3 % ») et ce que l'employeur retient
 * (un bareme de RETENUE a dix tranches, de 1,1 % a 14,63 %, une deduction standard qui change avec le nombre d'allocations du DE 4, un credit de 168,30 $
 * par allocation) et par la SDI (1,3 % de TOUS les salaires, sans plafond depuis le 1er janvier 2024). Voie choisie (21/10/2026), dite sur la page :
 *
 *   1. LE CALCULATEUR SUIT LA METHODE B (« Exact Calculation Method ») du DE 44 (Rev. 52 (4-26)), p. 51 et 54 a 56. AUCUN mecanisme nouveau :
 *      standardDeduction par statut (5 706 $ / 11 412 $), bracketTable (tables 5, 6 et 7 annuelles), withholdingAllowances (168,30 $ par allocation,
 *      1 / 2 / 2), un programme salarial sans plafond (SDI 1,3 %).
 *   2. CE QUE LE MOTEUR NE MODELISE PAS EST DIT : primes et options (10,23 % ; 6,6 % pour les autres paiements supplementaires), allocations pour personnes
 *      a charge ou cecite, deductions estimees (DE 4, feuille B), retenue supplementaire, deuxieme emploi ou conjoint qui travaille (le livret recommande
 *      « Single »), arrondi par paie, Methode A.
 *   3. LES TABLES PAR TRANCHES DU LIVRET (Methode A, 15 grilles) SONT RECOUPEES cellule par cellule par verif-retenue-ca.js ; la TROUVAILLE (grilles
 *      marie bimensuelle et journaliere : deduction de 5 706 $ pour toutes les allocations au lieu de 11 412 $ des 2 allocations) est presentee comme
 *      NOTRE lecture, jamais comme une erreur averee de l'agence.
 *   4. TAXES LOCALES : aucune lue dans le livret ; la page dit « we found none », pas « California has none ».
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - que les taux de retenue (10,23 % ...) sont 1,1 x les taux de la declaration : le livret ne le dit pas et le bareme de la declaration (FTB) n'a pas ete lu ici ;
 *     la page signale seulement le motif arithmetique (10,23 = 1,1 x 9,3) comme une observation de NOTRE part, sans en tirer de cause ;
 *   - la « mental health services tax » de 1 % : non lue ;
 *   - (la retenue d'un non-resident est lue : DE 44 p. 26 ; la page la resume sans la modeliser).
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-california.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, impotTable } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "california";
const NOM = "California";
const URL = "https://statelinecalc.com/paycheck-calculator/california/";
const AUJOURD_HUI = "2026-10-21";
const LISIBLE = "October 21, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const MED = R.states[CLE];
const IT = MED.incomeTax;
const SDI = MED.employeePrograms[0];
const BS = IT.bracketTable.single;
const BM = IT.bracketTable.marriedJoint;
const BH = IT.bracketTable.headOfHousehold;
const fedDed = R.federal.standardDeduction;
const DED_S = IT.standardDeduction.single;                 // 5 706
const DED_M = IT.standardDeduction.marriedJoint;           // 11 412
const CREDIT = IT.withholdingAllowances.credit;            // 168,30
const AL = IT.withholdingAllowances.perFiler;              // 1 / 2 / 2
const SEUIL_S = 18896, SEUIL_M = 37791;                    // Table 1 (annuel)
const FLAT_PRIME = 0.1023, FLAT_AUTRE = 0.066;             // DE 44 p. 26

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
const pl = (r, i) => r.programmes[i].montant;
const dec2 = n => (Math.round(n * 100) / 100);

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a30 = calcul(CLE, 30000);
const a50 = calcul(CLE, 50000);
const a100 = calcul(CLE, 100000);
const a150 = calcul(CLE, 150000);
const j150 = calcul(CLE, 150000, "marriedJoint");
const a250 = calcul(CLE, 250000);
const a500 = calcul(CLE, 500000);
const a1m = calcul(CLE, 1000000);
const a15m = calcul(CLE, 1500000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;
const sdi75 = pl(a75, 0);
const mensuel75 = a75.etat / 12;
const bimensuel75 = a75.etat / 26;
const netBimensuel75 = a75.net / 26;

/* L'exemple pas a pas, a 75 000 $ celibataire (1 allocation). */
const imp75 = 75000 - DED_S;                                                  // 69 294
const [L5_FROM, L5_BASE, L5_RATE] = [BS[4].from, BS[4].base, BS[4].rate];     // 57 542 ; 2 186,15 ; 8,8 %
const L5_FIN = BS[4].upTo;                                                    // 72 724
const exces75 = imp75 - L5_FROM;                                              // 11 752
const hautDeLigne75 = exces75 * L5_RATE;                                      // 1 034,176
const avantCredit75 = L5_BASE + hautDeLigne75;                                // 3 220,326
const jImp = 75000 - DED_M;                                                   // 63 588
const [LM_FROM, LM_BASE, LM_RATE] = [BM[2].from, BM[2].base, BM[2].rate];     // 52 528 ; 911,88 ; 4,4 %
const jExces = jImp - LM_FROM;                                                // 11 060
const jAvantCredit = LM_BASE + jExces * LM_RATE;                              // 1 398,52
const [LH_FROM, LH_BASE, LH_RATE] = [BH[2].from, BH[2].base, BH[2].rate];     // 52 530 ; 911,75 ; 4,4 %
const hExces = jImp - LH_FROM;                                                // 11 058
const sansDE4 = avantCredit75;                                                // aucune allocation : 3 220,33
const marieGap = a75.etat - j75.etat;                                         // 1 990,106
/* Erreurs typiques. */
const sansDeduc = impotTable(BS, 75000) - CREDIT;                             // aucune deduction : 3 586,70
const ecartSansDeduc = dec2(sansDeduc) - dec2(a75.etat);                                  // 534,68
const sdiPlafonne250 = 184500 * SDI.rate;                                     // 2 398,50 : le plafond de la Social Security appliquee a tort a la SDI
const ecartPlafond250 = pl(a250, 0) - sdiPlafonne250;                         // 851,50
const prime5000 = 5000 * FLAT_PRIME, autre5000 = 5000 * FLAT_AUTRE;           // 511,50 ; 330,00
/* Seuils de la premiere tranche et des tranches de depart, en salaire brut (avant le credit). */
const brutDe = (tab, ded, i) => tab[i].from + ded;

/* Voisins : Oregon, Nevada, Arizona (les trois Etats frontaliers de la Californie par la terre). */
const REF = 75000;
const COMPARE = [CLE, "oregon", "nevada", "arizona"];
const NOMS = { [CLE]: "California", oregon: "Oregon", nevada: "Nevada", arizona: "Arizona" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const plusMoins = k => {
  const r = calcul(k, REF), nom = NOMS[k];
  const lien = "<a href=\"/paycheck-calculator/" + k + "/\">" + nom + "</a>";
  return (/^[AEIOU]/.test(nom) ? "an " : "a ") + lien + " worker keeps about " + N($(Math.abs(r.net - a75.net))) + (r.net > a75.net ? " more" : " less");
};
const phraseVoisins = ["nevada", "arizona"].map(plusMoins).join(", ") + " and " + plusMoins("oregon");

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Les trois baremes imprimes, ligne par ligne. */
const ligneBareme = (tab, ded) => tab.map(s => {
  const haut = s.upTo;
  return "        <tr><th scope=\"row\">" + (haut === null ? "Over " + $(s.from) : $(s.from) + " to " + $(haut)) + "</th><td class=\"num\">" + $(s.from + ded) + "</td><td class=\"num\">" + pct2(s.rate) +
    "</td><td class=\"num\">" + $$(s.base) + "</td></tr>";
}).join("\n");
const LIGNES_S = ligneBareme(BS, DED_S);
const LIGNES_M = ligneBareme(BM, DED_M);
const LIGNES_H = ligneBareme(BH, DED_M);

/* Le tableau des cases du DE 4. */
const LIGNES_STATUT = [
  ["Single or Married (with two or more incomes)", "Single", AL.single, $$(AL.single * CREDIT), $(DED_S), $(SEUIL_S)],
  ["Married (one income)", "Married filing jointly", AL.marriedJoint, $$(AL.marriedJoint * CREDIT), $(DED_M), $(SEUIL_M)],
  ["Head of Household", "Head of household", AL.headOfHousehold, $$(AL.headOfHousehold * CREDIT), $(DED_M), $(SEUIL_M)],
  ["No DE 4 on file (the employer must use Single with zero allowances)", "Not offered", 0, $$(0), $(DED_S), $(SEUIL_S)]
].map(([lib, site, nb, c, d, s]) => "        <tr><th scope=\"row\">" + lib + "</th><td>" + site + "</td><td class=\"num\">" + nb + "</td><td class=\"num\">" + c +
  "</td><td class=\"num\">" + d + "</td><td class=\"num\">" + s + "</td></tr>").join("\n");

/* Le recoupement avec les tables imprimees : le script de verification est LANCE ici, ses chiffres sont repris tels quels. */
let verifSortie = "";
try {
  verifSortie = execFileSync(process.execPath, [path.join(RACINE, ".tooling", "test", "verif-retenue-ca.js")], { encoding: "utf8" });
} catch (e) { console.error(String(e.stdout || e)); console.error("ARRET : verif-retenue-ca.js echoue"); process.exit(2); }
const mv = verifSortie.match(/^(\d+) verifications : .*?, (\d+) cas moteur == methode B \(ecart maximal [^)]*\), (\d+) cellules de grille : (\d+) au dixieme de dollar pres, (\d+) a moins de 20 cents, ecart maximal ([\d.]+) \$ ; tables marie bimensuelle et journaliere : (\d+) \/ (\d+) cellules reproduites avec 5 706 \$, ecart a la Table 3 jusqu'a ([\d.]+) \$ et ([\d.]+) \$ : OK/m);
if (!mv) { console.error(verifSortie); console.error("ARRET : sortie de verif-retenue-ca.js illisible"); process.exit(2); }
const [, V_TOTAL, V_MOTEUR, V_CELL, V_DIXIEME, V_BORD, V_ECART, V_ALT, V_ALT_N, V_T7, V_T16] = mv;
const virgule = s => Number(s).toLocaleString("en-US");
/* Un ecart maximal affiche ne doit jamais etre PLUS PETIT que le vrai : arrondi vers le haut au cent. */
const cmax = x => "$" + (Math.ceil(Number(x) * 100 - 1e-9) / 100).toFixed(2);
const pourcent = (a, b) => Math.floor(100 * Number(a) / Number(b)) + "%";

/* Le cas concret de la trouvaille : marie, 2 allocations, 75 000 $ paye toutes les deux semaines (2 884,62 $), ligne « 2 850 a 2 900 $ » de la Table 7. */
const GRILLES = JSON.parse(fs.readFileSync(path.join(RACINE, ".tooling", "sources", "california-wage-bracket-tables.json"), "utf8"));
const biLigne = GRILLES["7"].find(r => 75000 / 26 >= r[0] && 75000 / 26 < r[1]);
const biImprime = biLigne[2][2];                       // 50,10 $
const biExact = j75.etat / 26;                         // 40,84 $
const biEcart = biImprime - biExact;                   // 9,26 $

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the California state income tax withholding rate?",
   "California does not withhold at one rate. Its withholding table climbs in ten brackets, from " + N(pct(BS[0].rate)) + " to " + N(pct(BS[9].rate)) + ". For a single filer, the first " + $(BS[1].from) + " of taxable pay is withheld at " + N(pct(BS[0].rate)) + ", then " + N(pct(BS[1].rate)) + ", " + N(pct(BS[2].rate)) + " and " + N(pct(BS[3].rate)) +
   ", and the " + N(pct(L5_RATE)) + " bracket covers taxable pay from " + $(L5_FROM) + " to " + $(L5_FIN) + ", which is " + $(brutDe(BS, DED_S, 4)) + " to " + $(brutDe(BS, DED_S, 5)) + " of gross pay. " +
   "&ldquo;Taxable pay&rdquo; means your yearly pay minus " + $(DED_S) + " for a single filer or " + $(DED_M) + " for a married filer with two or more allowances or a head of household. After the tax is figured, " + $$(CREDIT) + " comes off for each allowance on Form DE 4. On " + $(75000) + ", a single filer has " + $$(a75.etat) + " withheld a year."],

  ["How much California state tax is withheld on a $75,000 salary?",
   "For a single filer with one allowance, California withholds " + $$(a75.etat) + " a year, which is " + $$(mensuel75) + " a month or " + $$(bimensuel75) + " on a biweekly check. " +
   "Taxable pay after the " + $(DED_S) + " deduction is " + $(imp75) + ". That falls in the " + pct(L5_RATE) + " bracket, which starts at " + $$(L5_BASE) + " and adds " + pct(L5_RATE) + " of the " + $(exces75) + " above " + $(L5_FROM) + ", or " + $$(hautDeLigne75) +
   ", for " + $$(avantCredit75) + " before the " + $$(CREDIT) + " allowance credit. A married filer with two allowances has " + $$(j75.etat) + " withheld, and a head of household with two allowances has " + $$(h75.etat) + " withheld."],

  ["What is take-home pay on a $75,000 salary in California?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with one allowance and no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " + $$(a75.etat) +
   " of California income tax and " + $$(sdi75) + " of State Disability Insurance, an effective rate of " + (a75.taux * 100).toFixed(1) + "%. " +
   "Paid every two weeks, that is about " + $$(netBimensuel75) + " a paycheck. A married filer with two allowances keeps about " + $(j75.net) + ", and a head of household with two allowances about " + $(h75.net) + "."],

  ["How much is $20, $25 or $30 an hour after taxes in California?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures with one allowance, after federal tax, FICA, " +
   "California income tax withholding and State Disability Insurance, with no retirement contribution and no overtime."],

  ["What is California State Disability Insurance, and is there a wage cap?",
   "State Disability Insurance (SDI) is a deduction from your pay. The Employment Development Department says the 2026 rate is " + N("1.3%") + ", which provides for both State Disability Insurance and Paid Family Leave benefits, and that there has been no taxable wage limit since January 1, 2024, when Senate Bill 951 removed it. " +
   "So the deduction is " + N("1.3%") + " of every dollar, with no ceiling: " + $$(sdi75) + " on " + $(75000) + ", " + $$(pl(a500, 0)) + " on " + $(500000) + ". Pages written before 2024 may still describe a wage ceiling."],

  ["Is there a separate Paid Family Leave deduction in California?",
   "No. The Employment Development Department says the 1.3% rate " +
   "&ldquo;provides for both State Disability Insurance (SDI) and Paid Family Leave (PFL) benefits,&rdquo; so there is no separate Paid Family Leave line to subtract. This calculator shows one combined line for both."],

  ["What is Form DE 4, and how many allowances do I claim?",
   "The Employee&rsquo;s Withholding Allowance Certificate is how you tell your employer how much California income tax to withhold. The form&rsquo;s worksheet gives one allowance for yourself, one for your spouse if your spouse does not claim it separately, one for your own blindness, one for your spouse&rsquo;s blindness and one for each dependent, and each allowance is worth " + $$(CREDIT) + " of tax a year. " +
   "This calculator uses one allowance for a single filer and two for a married filer or a head of household. If your employer has no DE 4 from you, it must use Single with zero allowances, which on " + $(75000) + " withholds " + $$(sansDE4) + " instead of " + $$(a75.etat) + "."],

  ["How does head of household work on the DE 4?",
   "You check the &ldquo;Head of Household&rdquo; box, and the withholding tables for unmarried heads of household apply. The DE 4 says that to qualify you must be unmarried or legally separated and pay more than half the cost of keeping up a home for the entire year for yourself and a dependent or another qualifying individual, so we count two allowances: yourself and one dependent. " +
   "On " + $(75000) + " that gives " + $$(h75.etat) + " of California withholding, against " + $$(a75.etat) + " for a single filer, and the federal tax is lower too, so take-home pay is " + $(h75.net) + "."],

  ["Should a married couple with two incomes use the Married box?",
   "To avoid under-withholding, the Employment Development Department recommends that a married employee with an employed spouse use Single filing status for both people, or have an additional flat amount withheld. The DE 4 has its own box for it, &ldquo;Single or Married (with two or more incomes),&rdquo; and says it is best to check it when you have a working spouse. " +
   "This calculator&rsquo;s &ldquo;Married filing jointly&rdquo; choice is the one-income case with two allowances. On " + $(75000) + " it withholds " + $$(j75.etat) + ", which is " + $$(marieGap) + " less than the single figure. In this calculator, choosing Single also uses the single federal brackets."],

  ["Why does the California withholding table go up to 14.63%?",
   "The California Employer&rsquo;s Guide (DE 44) does not explain the odd-looking rates. They are the rates it tells employers to withhold at. Each printed rate is 1.1 times a number with at most one decimal place (1.1 is 1.1 &times; 1, and 10.23 is 1.1 &times; 9.3); we noticed the pattern but have not checked it against the return&rsquo;s rate schedule, so we do not claim a reason. " +
   "We apply the rates as printed, with the printed constant for each bracket, and the guide&rsquo;s worked examples come out right with them. Your actual California tax is figured on your return."],

  ["How does California withhold tax on a bonus?",
   "The Employment Development Department&rsquo;s California Employer&rsquo;s Guide (DE 44) says that if a bonus is paid at the same time as regular wages, the two are added together and tax is withheld on the total. If it is paid separately, an employer can either figure the tax on the combined wages and subtract what was already withheld, or withhold a flat percentage with no allowances: " + N("10.23%") + " on bonuses and stock options, and " + N("6.6%") + " on other supplemental pay such as overtime, commissions and severance. " +
   "On a " + $(5000) + " bonus that is " + $$(prime5000) + " at the first rate and " + $$(autre5000) + " at the second. This calculator does not model bonuses, so ask your employer which method it uses."],

  ["Is there a local income tax in California?",
   "We found none in the guide we read. The Employment Development Department&rsquo;s summary of California payroll taxes lists the state&rsquo;s unemployment insurance, training tax, disability insurance and personal income tax, and no city or county tax on wages. That is not proof that none exists, and this calculator adds none."],

  ["Does a 401(k) contribution lower my California withholding?",
   "For the income tax, yes. The Employment Development Department&rsquo;s guide (DE 44) says that employee salary reduction contributions to a qualified retirement plan are generally included as subject wages but are not reportable as income tax wages, so we start from pay after a traditional 401(k) contribution and leave the State Disability Insurance on your full pay. " +
   "On " + $(75000) + " with 6% going into a 401(k), California withholding falls by " + $$(gain401) + " a year, and the " + $$(sdi75) + " of SDI does not change. Enter 0 if your contribution is a Roth."],

  ["Is there a California unemployment tax on employees?",
   "No. The Employment Development Department says the unemployment insurance program is funded through payroll taxes paid by the employer, and that the Employment Training Tax, " + N("0.1%") + " on the first " + $(7000) + " of each employee&rsquo;s wages, is employer-paid. This calculator has no unemployment line for that reason."],

  ["Why is my California paycheck different from this calculator?",
   "Common reasons: you claimed allowances for dependents, blindness or estimated deductions on your DE 4; you asked for extra withholding; your spouse works and you checked a different box; health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; part of your pay is a bonus or overtime; or your employer uses the printed wage-bracket tables instead of the exact calculation. " +
   "In the printed tables we tested, the cells and the formula differ by no more than " + cmax(V_ECART) + " per check, except in the married biweekly and daily tables, described in the section on the printed wage-bracket tables. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."],

  ["Does California tax the paycheck of someone who works in California but lives in another state?",
   "The Employment Development Department guide says wages paid to a nonresident who does all of their work in California are subject to California withholding, and that if the work is split between California and another state, only the part earned in California is. This calculator assumes you live and work in California, so in any other case check your DE 4 and ask your employer."],

  ["How current is the California formula on this page?",
   "It comes from the Employment Development Department&rsquo;s California Employer&rsquo;s Guide (DE 44), revision 52, dated April 2026, and the DE 4 form revised in January 2026, which we read on the agency&rsquo;s own site on " + LISIBLE + ". " +
   "The State Disability Insurance rate also comes from the department&rsquo;s payroll tax page. If the agency posts new tables, we update this page from them."]
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

/* La reponse directe : 40 a 60 mots, verifiee plus bas. */
const reponse = "California&rsquo;s withholding table has ten brackets, from " + pct(BS[0].rate) + " to " + pct(BS[9].rate) + ". These are payroll withholding rates, not your final tax rate. A single filer gets a " + $(DED_S) + " deduction and a " + $$(CREDIT) + " credit per allowance, and State Disability Insurance takes 1.3% of every dollar, with no cap. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/assets/analytics.js" defer></script>
<title>California (CA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free California (CA) paycheck calculator, 2026. Hourly or salary take-home after federal tax, FICA, CA income tax withholding and 1.3% SDI with no wage cap.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="California (CA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="California withholding runs from ${pct(BS[0].rate)} to ${pct(BS[9].rate)} after a ${$(DED_S)} deduction, and SDI takes 1.3% of all pay with no cap. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "California Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 California take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, California income tax withheld under the Employment Development Department's exact calculation method (a standard deduction of $5,706 or $11,412, the annual tax rate tables from 1.1%, and a $168.30 credit for each withholding allowance) and State Disability Insurance at 1.3% of all wages. Bonuses, dependents and optional employer deductions are not modeled."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "California", "item": "${URL}" }
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
    <li aria-current="page">California</li>
  </ol>
</nav>

  <h1>California Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your California take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and your California schedule and allowances.
          We use one allowance for a single filer (yourself), two for a married filer (you and your spouse, one income) and two for a head of household (you and one dependent).</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your California income tax withholding too, but not the State Disability Insurance deduction.</span>
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
    <p>California&rsquo;s Employment Development Department (EDD) publishes two ways to work out income tax withholding: a table of pay ranges (Method A) and an exact calculation (Method B). Its guide says Method B &ldquo;will give an exact amount of tax to withhold,&rdquo; and this calculator follows it. Your pay is converted to a yearly amount. A standard deduction of ${N($(DED_S))} comes off for a single filer, or ${N($(DED_M))} for a married filer with two or more allowances or a head of household. What is left goes through the annual tax rate table, which starts at ${N(pct(BS[0].rate))} and climbs in ten brackets to ${N(pct(BS[9].rate))}. Then a credit of ${N($$(CREDIT))} for each withholding allowance on Form DE 4 comes off the tax, and the result cannot fall below zero.</p>
    <p><strong>This page covers the paycheck, not the tax return.</strong> The rates in the withholding table are the ones the EDD tells employers to use, and your California tax for the year is figured on your return, so what you owe or get back when you file can differ. Bonuses, dependents and the other items on the DE 4 are listed at the end of this section.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>California income tax</strong>: your wages after any 401(k) contribution, minus the standard deduction, run through the annual rate table, minus ${N($$(CREDIT))} for each allowance.</li>
      <li><strong>California State Disability Insurance</strong> at ${N("1.3%")} of all your wages, with no cap. It also pays for Paid Family Leave benefits.</li>
    </ul>
    <p>We looked for any other California deduction that an employer must take from your check and found none in the EDD guide. Its table of the state&rsquo;s payroll taxes shows unemployment insurance and the Employment Training Tax paid by the employer, and State Disability Insurance and personal income tax withheld from the employee.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    California, the <strong>Employment Development Department</strong>&rsquo;s California Employer&rsquo;s Guide (DE 44) and Form DE 4.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How current the source is.</strong> The guide is DE 44 Rev. 52, dated April 2026, and its withholding schedules are headed &ldquo;California Withholding Schedules for 2026.&rdquo; The DE 4 is the revision dated January 2026. We read both on the agency&rsquo;s own site on ${LISIBLE}, and the Sources section links to them. The 2026 State Disability Insurance rate is also on the department&rsquo;s payroll tax page. The federal figures are the 2026 IRS amounts.</p>

    <p><strong>How we checked the formula.</strong> We read the annual tax rate tables, the standard deduction table and the allowance table directly from the guide&rsquo;s text, separately from the calculator&rsquo;s code, and the calculator&rsquo;s figures match them line by line. We also worked six of the guide&rsquo;s own examples. One withholds nothing, and the other five reproduce to within three cents a pay period, including ${N("$4.13")} for a married employee paid ${N("$2,400")} twice a month with four allowances, and ${N("$7.17")} for one earning ${N("$57,000")} a year, paid monthly. The calculator stays within ${N(cmax(V_ECART))} of the printed wage-bracket tables on ${N(virgule(V_BORD))} cells, with two exceptions, the married biweekly and daily tables, that the section on the printed tables below explains.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the agency&rsquo;s method, before the rounding in the tables. Your actual California income tax is figured
    on your return.</p>

    <p>What the calculator deliberately leaves out: bonuses and other supplemental pay, allowances for dependents, blindness and estimated deductions, a spouse who works, extra withholding, rounding by your employer, work in another state, optional employer deductions, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>California take-home pay by salary</h2>
  <p class="prose">Single filer with one allowance, no retirement contribution, 2026 federal and California rates. The
  CA state tax column is California income tax withholding plus State Disability Insurance (on $75,000: ${$$(a75.etat)} + ${$$(sdi75)}).</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        California take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">CA state tax + disability insurance</th>
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

    <h2>California withholding rates and the pay they apply to</h2>
    <p>The EDD prints one annual rate table for each filing status, and it applies to what is left of your pay after the standard deduction, not to your pay itself. For a single filer on ${N($(75000))}, that is ${N($(75000))} &minus; ${N($(DED_S))} = ${N($(imp75))}.
    That falls in the bracket that starts at ${N($(L5_FROM))}, where the tax is ${N($$(L5_BASE))} plus ${N(pct(L5_RATE))} of the amount above ${N($(L5_FROM))}: ${N($(exces75))} &times; ${N(pct(L5_RATE))} = ${N($$(hautDeLigne75))}, for ${N($$(avantCredit75))}. One allowance then takes off ${N($$(CREDIT))}, which leaves ${N($$(a75.etat))}. The first column of each table shows taxable pay; the second shows the gross pay at which the bracket starts, before the allowance credit.</p>

    <h3>The single schedule</h3>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        California annual withholding table, single filer (applied to pay after the ${$(DED_S)} deduction)
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable pay after the deduction</th>
          <th scope="col">Gross pay at which the bracket starts</th>
          <th scope="col">Rate on each extra dollar</th>
          <th scope="col">Tax at the bottom of the bracket</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_S}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h3>The married schedule</h3>
    <p>A married filer with two allowances has a ${N($(DED_M))} deduction and a table whose first five bracket limits are exactly twice the single ones. The ${N(pct(BM[5].rate))} bracket then runs from ${N($(BM[5].from))} to ${N($(BM[5].upTo))} of taxable pay.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        California annual withholding table, married filer (applied to pay after the ${$(DED_M)} deduction)
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable pay after the deduction</th>
          <th scope="col">Gross pay at which the bracket starts</th>
          <th scope="col">Rate on each extra dollar</th>
          <th scope="col">Tax at the bottom of the bracket</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_M}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h3>The head of household schedule</h3>
    <p>An unmarried head of household has the same ${N($(DED_M))} deduction as a married filer but a table of its own: its first two bracket limits are within ${N($(15))} of the married ones, and its 4.4%, 6.6%, 8.8%, 10.23% and 11.33% brackets are narrower than the married ones.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        California annual withholding table, unmarried head of household (applied to pay after the ${$(DED_M)} deduction)
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable pay after the deduction</th>
          <th scope="col">Gross pay at which the bracket starts</th>
          <th scope="col">Rate on each extra dollar</th>
          <th scope="col">Tax at the bottom of the bracket</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_H}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h3>Why the printed rates look odd</h3>
    <p>The table&rsquo;s rates are ${N(pct(BS[0].rate))}, ${N(pct(BS[1].rate))}, ${N(pct(BS[2].rate))}, ${N(pct(BS[3].rate))}, ${N(pct(BS[4].rate))}, ${N(pct(BS[5].rate))}, ${N(pct(BS[6].rate))}, ${N(pct(BS[7].rate))}, ${N(pct(BS[8].rate))} and ${N(pct(BS[9].rate))}. They are withholding rates, not the rates on the tax return, and the guide does not explain them. Each one is ${N("1.1")} times a number with at most one decimal place (${N("1.1")} is ${N("1.1")} &times; ${N("1")}, and ${N("10.23")} is ${N("1.1")} &times; ${N("9.3")}). We noticed that pattern but have not checked it against the return&rsquo;s rate schedule, so we do not claim a reason. We apply the rates as printed, together with the constant printed for each bracket.</p>

    <h2>The deduction and the allowance: what changes with your DE 4</h2>
    <p>Form DE 4 is how you tell your employer your filing status and how many allowances to use, and each allowance is worth ${N($$(CREDIT))} of tax a year. The form says an employer that has no completed DE 4 from you must use Single with zero withholding allowances. This is how the calculator maps its three choices to the form.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        California allowances and deduction by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Form DE 4 box</th>
          <th scope="col">Used by this calculator for</th>
          <th scope="col">Allowances</th>
          <th scope="col">Yearly credit</th>
          <th scope="col">Standard deduction</th>
          <th scope="col">Yearly pay with nothing withheld</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h3>An allowance is a credit, not a deduction</h3>
    <p>Each allowance takes ${N($$(CREDIT))} off the tax after it is figured, so it is worth the same to a worker in the ${N(pct(BS[1].rate))} bracket as to one in the ${N(pct(BS[5].rate))} bracket. On ${N($(75000))}, a single filer with zero allowances has ${N($$(sansDE4))} withheld, and with one allowance has ${N($$(a75.etat))}. The worksheet on the DE 4 adds allowances for a spouse, for blindness and for each dependent, and this calculator does not ask about any of them beyond the allowances in the table above.</p>

    <h3>Nothing is withheld on low pay</h3>
    <p>The guide has a low income exemption table: a single filer with one allowance paid ${N($(SEUIL_S))} a year or less has nothing withheld, and a married filer or head of household with two allowances has nothing withheld up to ${N($(SEUIL_M))}. The calculator reaches the same answer without a special rule: at those amounts the tax on the table, less the allowance credit, comes to roughly zero (under two cents). At ${N($(30000))}, a single filer has ${N($$(a30.etat))} withheld.</p>

    <h3>Married with a working spouse</h3>
    <p>The guide has a special note for married employees with employed spouses. To avoid under-withholding, it recommends that you use Single filing status to compute the withholding for the employee and the spouse, or have an additional flat amount withheld. The DE 4 has a box for this, &ldquo;Single or Married (with two or more incomes).&rdquo; This calculator&rsquo;s married choice is the one-income case.</p>

    <h2>Bonuses and other supplemental pay</h2>
    <p>This calculator does not model bonuses, but the guide&rsquo;s rule is short, so here it is. A bonus paid with your regular wages is added to them, and tax is withheld on the total. Tax on a bonus paid separately can be withheld in one of two ways.</p>

    <h3>Option one: combine the wages</h3>
    <p>The employer figures the tax on your regular wages plus the bonus using the withholding schedules, then subtracts the tax already withheld from the regular wages. The difference is withheld from the bonus.</p>

    <h3>Option two: a flat percentage</h3>
    <p>The employer withholds a flat percentage without allowing for any of your allowances: ${N("10.23%")} on bonuses and stock options, and ${N("6.6%")} on other supplemental wages such as overtime, commissions, sales awards, severance and vacation pay. On a ${N($(5000))} bonus that is ${N($$(prime5000))} at the first rate and ${N($$(autre5000))} at the second. The guide says that stock options are only covered where they are wages subject to withholding.</p>

    <h2>State Disability Insurance: ${pct(SDI.rate)} of every dollar</h2>

    <h3>What the deduction is</h3>
    <p>State Disability Insurance (SDI) is funded by a payroll deduction from employees&rsquo; wages. The guide says employers withhold ${N("1.3%")} for SDI on all subject wages paid to each employee in a calendar year, and that the 2026 rate &ldquo;provides for both State Disability Insurance (SDI) and Paid Family Leave (PFL) benefits.&rdquo; The calculator shows it as one line.</p>

    <h3>It has no wage cap</h3>
    <p>The guide says there has been no taxable wage limit since January 1, 2024, and that Senate Bill 951 removed the taxable wage limit and the maximum withholdings. So the deduction is ${N($$(sdi75))} on ${N($(75000))}, ${N($$(pl(a250, 0)))} on ${N($(250000))} and ${N($$(pl(a500, 0)))} on ${N($(500000))}. Social Security stops at ${N("$184,500")} of wages in 2026; State Disability Insurance does not stop.</p>

    <h3>It does not shrink with your 401(k)</h3>
    <p>The guide says that employee salary reduction contributions to a qualified retirement or pension plan are generally included as subject wages but are not reportable as income tax wages. That is why a 401(k) lowers the California income tax withholding in this calculator and leaves the ${N($$(sdi75))} of SDI on ${N($(75000))} unchanged.</p>

    <h3>Unemployment insurance is not taken from your pay</h3>
    <p>The guide says the unemployment insurance program is funded through payroll taxes paid by the employer, and that the Employment Training Tax, ${N("0.1%")} on the first ${N($(7000))} of each employee&rsquo;s wages, is an employer-paid tax. This calculator has no unemployment line for that reason.</p>

    <h3>Local taxes</h3>
    <p>The guide&rsquo;s summary of California payroll taxes lists the state&rsquo;s own taxes and no city or county income tax on wages. We found none in the guide we read, which is not proof that none exists, and this calculator adds none.</p>

    <h2>The printed wage-bracket tables: what we found when we rebuilt them</h2>

    <h3>Two ways to find the tax</h3>
    <p>The guide gives employers Method A, tables that list the tax for each pay range and for 0 to 10 allowances, for weekly, biweekly, twice-a-month, monthly and daily pay, with one table for each filing status; and Method B, the exact calculation. Method A is limited to wages under ${N($(1000000))}, and when pay is above a level it prints for each period (${N($(1600))} a week for a single filer, for instance), it tells employers to use Method B.</p>

    <h3>What we found for most tables</h3>
    <p>We rebuilt ${N(virgule(V_BORD))} cells of thirteen of the guide&rsquo;s fifteen printed tables from the annual table, using the middle of each pay range as the wage. ${N(virgule(V_DIXIEME))} of them, ${N(pourcent(V_DIXIEME, V_BORD))}, match to the nearest ten cents, and every one of them is within ${N(cmax(V_ECART))}. The guide does not say how it rounds, so we report the spread and do not guess at the cause.</p>

    <h3>What we found for two of them</h3>
    <p>The married biweekly table and the married daily table behave differently. In our reading, they match the formula only if the ${N($(DED_S))} deduction is used for every number of allowances, while the guide&rsquo;s own standard deduction table prints ${N($(DED_M))} from two allowances up. We reproduced ${N(virgule(V_ALT))} of their ${N(virgule(V_ALT_N))} cells with the ${N($(DED_S))} deduction, and the gap to the exact method runs up to ${N(cmax(V_T7))} on a biweekly check and ${N(cmax(V_T16))} on a daily one. We do not know why, and we do not claim an error: the agency may have a reason we did not find.</p>

    <h3>What it means for your check</h3>
    <p>A married employee with two allowances paid ${N($$(75000 / 26))} every two weeks, which is ${N($(75000))} a year, has ${N($$(biExact))} withheld under the exact method and ${N($$(biImprime))} under the printed table, a difference of ${N($$(biEcart))} a check. For a single filer or a head of household, or a married filer paid weekly, twice a month or monthly, the tables and the calculator agree to within ${N(cmax(V_ECART))} a pay period. If your stub shows a larger gap, the cause is most likely an input the calculator does not have: allowances, a bonus, a pre-tax deduction or extra withholding.</p>

    <h2>California hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In California your hours also matter because of the low income exemption: a single filer paid ${N($(SEUIL_S))} a year or less has no California income tax withheld, though the State Disability Insurance deduction still comes out of every dollar.</p>

    <h3>What is $20 an hour after taxes in California?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, California income tax withholding and State Disability Insurance, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. California&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year, plus ${N($$(pl(h20, 0)))} of State Disability Insurance.</p>

    <h3>What are $25 and $30 an hour after taxes in California?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. California income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The guide says overtime pay is a supplemental wage, and when it is paid separately an employer can withhold ${N("6.6%")} of it for California income tax instead of using your allowances. Ask your employer how it handles overtime and bonuses.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>California take-home pay by hourly rate</h3>
    <p>Single filer, one allowance, 40 hours a week (2,080 hours a year).</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        California take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in California</h2>

  <h3>A single filer paid ${$(SEUIL_S)} a year or less has nothing withheld</h3>
  <p>A single filer with one allowance has nothing withheld on yearly pay of ${N($(SEUIL_S))} or less (the calculator shows $0.01 at exactly that amount, from rounding in the printed table), and a married filer or head of household with two allowances has nothing withheld up to ${N($(SEUIL_M))}. At ${N($(30000))}, a single filer has ${N($$(a30.etat))} withheld; at ${N($(50000))}, ${N($$(a50.etat))} a year.</p>

  <h3>The ${pct(L5_RATE)} bracket runs from ${$(brutDe(BS, DED_S, 4))} to ${$(brutDe(BS, DED_S, 5))} of pay</h3>
  <p>For a single filer, the ${N(pct(L5_RATE))} bracket runs from ${N($(brutDe(BS, DED_S, 4)))} to ${N($(brutDe(BS, DED_S, 5)))} of yearly pay. Across that range the tax is the ${N($$(L5_BASE))} printed for the bracket plus ${N(pct(L5_RATE))} of the amount above ${N($(L5_FROM))} of taxable pay, less the allowance credit. On ${N($(75000))}, a single filer falls inside it, with ${N($$(a75.etat))} withheld.</p>

  <h3>From ${$(brutDe(BS, DED_S, 5))} of pay, the rate is ${pct(BS[5].rate)}</h3>
  <p>The ${N(pct(BS[5].rate))} bracket is the widest in the table. For a single filer it runs from ${N($(brutDe(BS, DED_S, 5)))} to ${N($(brutDe(BS, DED_S, 6)))} of yearly pay. A single filer paid ${N($(100000))} has ${N($$(a100.etat))} withheld, one paid ${N($(150000))} has ${N($$(a150.etat))}, and one paid ${N($(250000))} has ${N($$(a250.etat))}.</p>

  <h3>Above ${$(brutDe(BS, DED_S, 9))} of pay, the rate is ${pct(BS[9].rate)}</h3>
  <p>The top bracket starts at ${N($(BS[9].from))} of taxable pay for a single filer, which is ${N($(brutDe(BS, DED_S, 9)))} of yearly pay. On ${N($(500000))}, California withholds ${N($$(a500.etat))}; on ${N($(1000000))}, ${N($$(a1m.etat))}; on ${N($(1500000))}, ${N($$(a15m.etat))}. The guide prints ${N(pct(BS[9].rate))} for all taxable pay above ${N($(BS[9].from))}.</p>

  <h3>The married schedule is wider, and the deduction is larger</h3>
  <p>A single filer&rsquo;s taxable pay is pay minus ${N($(DED_S))}. A married filer with two allowances gets ${N($(DED_M))} off and a table whose first five bracket limits are twice as high, and two ${N($$(CREDIT))} credits come off the tax. That is why California withholds ${N($$(j75.etat))} from that filer on ${N($(75000))} and ${N($$(a75.etat))} from a single one, a gap of ${N($$(marieGap))}. On ${N($(150000))} the figures are ${N($$(j150.etat))} for the married filer and ${N($$(a150.etat))} for the single one.</p>

  <h3>Head of household: two allowances on a table of its own</h3>
  <p>A head of household has the married deduction of ${N($(DED_M))}, two allowances and the head of household table. On ${N($(75000))}, taxable pay is ${N($(jImp))} and California withholds ${N($$(h75.etat))}. The federal tax is lower for a head of household too (${N($$(h75.federal))} on ${N($(75000))}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>Each allowance is worth ${$$(CREDIT)} a year</h3>
  <p>Because an allowance is a credit, it lowers yearly withholding by ${N($$(CREDIT))} at any pay level where tax is owed, whatever the bracket. This calculator does not ask about dependents, blindness or estimated deductions, so a worker who claims more allowances on the DE 4 will see less California tax withheld than the figure shown.</p>

  <h3>Extra withholding is on the form</h3>
  <p>Line 2 of the DE 4 is an additional amount you want withheld each pay period, if your employer agrees. The form says that if the employer will not, you can increase withholding as much as possible by using the Single status with zero allowances. This calculator models none of it.</p>

  <h3>Your 401(k) lowers your California taxable wages in this calculator</h3>
  <p>The guide treats salary reduction contributions to a qualified retirement plan as not reportable as income tax wages. On ${N("$75,000")} with 6% going in, California withholding falls by ${N($$(gain401))} a year, and State Disability Insurance stays at ${N($$(sdi75))}. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare and SDI do not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. State Disability Insurance has no ceiling either. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total, and State Disability Insurance takes ${N($$(pl(a250, 0)))}.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the deduction</h3>
  <p>Applying the table to all of ${N($(75000))} means treating ${N($(75000))} as taxable pay, which overstates California withholding by ${N($$(ecartSansDeduc))}: ${N($$(sansDeduc))} instead of ${N($$(a75.etat))}.</p>

  <h3>Assuming State Disability Insurance has a ceiling</h3>
  <p>Social Security has a wage base and State Disability Insurance does not. Applying Social Security&rsquo;s ${N("$184,500")} cap to the ${N("1.3%")} deduction would give ${N($$(sdiPlafonne250))} on ${N($(250000))} instead of ${N($$(pl(a250, 0)))}, which understates it by ${N($$(ecartPlafond250))}.</p>

  <h3>Treating a two-income couple as married</h3>
  <p>The Employment Development Department&rsquo;s guide recommends Single for a married employee with an employed spouse. On ${N($(75000))}, the married choice withholds ${N($$(j75.etat))} against ${N($$(a75.etat))} for a single filer, which is ${N($$(marieGap))} less over a year, and a couple who both work can end up under-withheld when they file.</p>

  <h3>Assuming the table&rsquo;s rate is your rate</h3>
  <p>The table&rsquo;s printed rates, such as ${N(pct(BS[4].rate))} or ${N(pct(BS[5].rate))}, are the rates the department tells employers to withhold at, not the rates on your return. A tax return works from your actual income and deductions, so what you owe in April can be smaller or larger than what was withheld.</p>

  <h3>Leaving out State Disability Insurance</h3>
  <p>It is taken from your pay in addition to income tax, and it does not reduce your California taxable pay. A take-home figure that leaves it out is too high by ${N($$(sdi75))} on ${N("$75,000")}.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances you claimed on your Form DE 4 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in California in 2026, with one allowance and no retirement
  contribution, under the exact calculation method:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>California taxable pay: ${N($(a75.brut))} &minus; ${N($(DED_S))} standard deduction = ${N($(imp75))}</li>
    <li>Tax at the start of the bracket that begins at ${N($(L5_FROM))}: ${N($$(L5_BASE))}</li>
    <li>Tax on the ${N($(exces75))} above ${N($(L5_FROM))}: ${N($(exces75))} &times; ${N(pct(L5_RATE))} = ${N($$(hautDeLigne75))}</li>
    <li>Tax before the credit: ${N($$(L5_BASE))} + ${N($$(hautDeLigne75))} = ${N($$(avantCredit75))}</li>
    <li>One allowance: ${N($$(avantCredit75))} &minus; ${N($$(CREDIT))} = ${N($$(a75.etat))}, which is
    ${N($$(mensuel75))} on a monthly paycheck or ${N($$(bimensuel75))} on a biweekly one</li>
    <li>State Disability Insurance: ${N($(a75.brut))} &times; ${N("1.3%")} = ${N($$(sdi75))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. We list the three states that border California by land: Oregon, Nevada and Arizona.
  Each row leaves out its own local taxes and optional employer deductions, and the California row includes State Disability Insurance at ${N("1.3%")}.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a California worker on the same salary, ${phraseVoisins}. These are withholding figures for one allowance, not the tax each state will charge on a return. A worker who lives in one of those states and commutes into California, or the reverse, is a different case that this calculator does not model: it assumes a California resident working in California.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/oregon/">Oregon paycheck calculator</a> &mdash; the neighbor to the north, with a federal tax subtraction and three payroll deductions.</li>
    <li><a href="/paycheck-calculator/nevada/">Nevada paycheck calculator</a> &mdash; the neighbor to the east, with no state income tax.</li>
    <li><a href="/paycheck-calculator/arizona/">Arizona paycheck calculator</a> &mdash; the neighbor to the southeast, with a flat rate you choose on Form A-4.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where California ranks on one salary.</li>
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
    the California Employment Development Department&rsquo;s exact calculation method for income tax withholding, and do not include bonuses, dependents or other allowances claimed on Form DE 4, or optional employer deductions.
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

/* 1. Recoupement independant : la methode B ecrite ici A PARTIR DU TEXTE (DE 44 p. 51 et 54 a 56), pas du moteur. Les trois tables annuelles recopiees a la main. */
const SS = [[11079, 0, 0, 0.011], [26264, 11079, 121.87, 0.022], [41452, 26264, 455.94, 0.044], [57542, 41452, 1124.21, 0.066], [72724, 57542, 2186.15, 0.088], [371479, 72724, 3522.17, 0.1023],
            [445771, 371479, 34084.81, 0.1133], [742953, 445771, 42502.09, 0.1243], [1000000, 742953, 79441.81, 0.1353], [Infinity, 1000000, 114220.27, 0.1463]];
const MM = [[22158, 0, 0, 0.011], [52528, 22158, 243.74, 0.022], [82904, 52528, 911.88, 0.044], [115084, 82904, 2248.42, 0.066], [145448, 115084, 4372.30, 0.088], [742958, 145448, 7044.33, 0.1023],
            [891542, 742958, 68169.60, 0.1133], [1000000, 891542, 85004.17, 0.1243], [1485906, 1000000, 98485.50, 0.1353], [Infinity, 1485906, 164228.58, 0.1463]];
const HH = [[22173, 0, 0, 0.011], [52530, 22173, 243.90, 0.022], [67716, 52530, 911.75, 0.044], [83805, 67716, 1579.93, 0.066], [98990, 83805, 2641.80, 0.088], [505208, 98990, 3978.08, 0.1023],
            [606251, 505208, 45534.18, 0.1133], [1000000, 606251, 56982.35, 0.1243], [1010417, 1000000, 105925.35, 0.1353], [Infinity, 1010417, 107334.77, 0.1463]];
const livret = (annuel, st) => {
  const sd = st === "single" ? 5706 : 11412;
  const allocs = st === "single" ? 1 : 2;
  const T = st === "single" ? SS : st === "married" ? MM : HH;
  const net = annuel - sd;
  if (net <= 0) return 0;
  let v = 0;
  for (const [haut, bas, base, taux] of T) if (net <= haut) { v = base + (net - bas) * taux; break; }
  return Math.max(0, v - allocs * 168.30);
};
for (const [lib, obtenu, attendu] of [
  ["75 000 $ celibataire", a75.etat, livret(75000, "single")], ["75 000 $ marie", j75.etat, livret(75000, "married")],
  ["75 000 $ chef de famille", h75.etat, livret(75000, "hoh")], ["30 000 $", a30.etat, livret(30000, "single")],
  ["50 000 $", a50.etat, livret(50000, "single")], ["100 000 $", a100.etat, livret(100000, "single")], ["150 000 $", a150.etat, livret(150000, "single")],
  ["150 000 $ marie", j150.etat, livret(150000, "married")], ["250 000 $", a250.etat, livret(250000, "single")], ["500 000 $", a500.etat, livret(500000, "single")],
  ["1 000 000 $", a1m.etat, livret(1000000, "single")], ["1 500 000 $", a15m.etat, livret(1500000, "single")]
]) if (Math.abs(obtenu - attendu) > 0.001) echec("CA " + lib + " : livret " + attendu + ", moteur " + obtenu);
const fed75 = 7670, fedJ = 4640, fedH = 5748;
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (recalculee a la main le 21/10/2026). */
const attendusProse = [
  [a75.etat, 3052.026, "etat 75 000 : 2 186,15 + 11 752 x 8,8 % - 168,30"], [imp75, 69294, "imposable 75 000"], [exces75, 11752, "69 294 - 57 542"], [hautDeLigne75, 1034.176, "11 752 x 8,8 %"],
  [avantCredit75, 3220.326, "avant credit"], [a75.net, 57565.474, "net 75 000"], [a75.total, 17434.526, "total 75 000"], [sdi75, 975, "SDI 75 000"],
  [j75.etat, 1061.92, "etat marie"], [jImp, 63588, "imposable marie"], [jExces, 11060, "63 588 - 52 528"], [jAvantCredit, 1398.52, "911,88 + 11 060 x 4,4 %"], [j75.net, 62585.58, "net marie"],
  [h75.etat, 1061.702, "etat chef de famille"], [hExces, 11058, "63 588 - 52 530"], [h75.net, 61477.798, "net chef de famille"],
  [marieGap, 1990.106, "3 052,026 - 1 061,92"], [sansDE4, 3220.326, "0 allocation = impot avant credit"],
  [a30.etat, 244.3, "etat 30 000 : 121,87 + 13 215 x 2,2 % - 168,30"], [a50.etat, 1143.482, "etat 50 000 : 1 124,21 + 2 842 x 6,6 % - 168,30"],
  [a100.etat, 5560.481, "etat 100 000"], [a150.etat, 10675.481, "etat 150 000 : 3 522,17 + 71 570 x 10,23 % - 168,30"], [j150.etat, 6104.052, "etat marie 150 000 : 4 372,30 + 23 504 x 8,8 % - 336,60"],
  [a250.etat, 20905.481, "etat 250 000"], [a500.etat, 48365.1989, "etat 500 000"], [a1m.etat, 113279.9473, "etat 1 000 000 : 79 441,81 + 251 341 x 13,53 % - 168,30"], [a15m.etat, 186367.1822, "etat 1 500 000"],
  [sansDeduc, 3586.7048, "sans deduction : 3 522,17 + 2 276 x 10,23 % - 168,30"], [ecartSansDeduc, 534.67, "ecart sans deduction (3 586,70 - 3 052,03)"],
  [prime5000, 511.5, "5 000 x 10,23 %"], [autre5000, 330, "5 000 x 6,6 %"],
  [pl(a250, 0), 3250, "SDI 250 000"], [pl(a500, 0), 6500, "SDI 500 000"], [sdiPlafonne250, 2398.5, "184 500 x 1,3 %"], [ecartPlafond250, 851.5, "3 250 - 2 398,50"],
  [gain401, 396, "gain 401(k) : 4 500 x 8,8 %"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [mensuel75, 254.3355, "mensuel"], [bimensuel75, 117.38562, "bimensuel"],
  [h20.etat, 711.36, "etat 20 $/h : 455,94 + 9 630 x 4,4 % - 168,30"], [h25.etat, 1275.482, "etat 25 $/h : 1 124,21 + 4 842 x 6,6 % - 168,30"], [h30.etat, 1961.882, "etat 30 $/h : 1 124,21 + 15 242 x 6,6 % - 168,30"],
  [biExact, 40.84307692, "75 000 marie par quinzaine : 1 061,92 / 26"], [biImprime, 50.1, "ligne 2 850-2 900, 2 allocations, Table 7"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(IT.standardDeduction.single === 5706 && IT.standardDeduction.marriedJoint === 11412 && IT.standardDeduction.headOfHousehold === 11412 && CREDIT === 168.3)) echec("deduction / credit != 5 706 / 11 412 / 168,30 $");
if (!(BS.length === 10 && BM.length === 10 && BH.length === 10 && BS[4].from === 57542 && BS[4].base === 2186.15 && BS[4].rate === 0.088)) echec("bareme != celui du livret");
if (!(SDI.rate === 0.013 && SDI.wageCap === undefined)) echec("SDI != 1,3 % sans plafond");
for (const k of COMPARE.slice(1)) if (!R.states[k]) echec("voisin absent du moteur : " + k);
if (a75.programmes.length !== 1 || a75.paidLeave !== 0 || a75.waCares !== 0) echec("la Californie doit avoir un seul programme salarie (SDI)");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 2500) echec(motsProse + " mots hors tableaux, sous le plancher de 2 500");
if ((html.match(/<h3/g) || []).length < 30) echec("moins de 30 H3");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
/* Les phrases de la page qui donnent une DIRECTION sont verifiees ici. */
if (!(lignesCompare[0].cle === "nevada" && lignesCompare[1].cle === "arizona" && lignesCompare[2].cle === CLE && lignesCompare[3].cle === "oregon")) echec("l'ordre des voisins n'a plus la forme attendue : " + lignesCompare.map(l => l.cle).join(","));
if (!(biImprime > biExact && V_T7 > 20 && V_T16 > 2)) echec("la trouvaille Table 7 / Table 16 n'a plus la forme ecrite");
console.log("recoupements du livret (methode B ecrite a la main, 75 000 $ celibataire, marie et chef de famille, 9 salaires) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
