/* Construit /paycheck-calculator/new-york/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * New York est le 49e Etat publie. Etat COMPLEXE : trois niveaux d'impot sur le revenu (Etat, Ville de New York, Yonkers), une retenue d'Etat
 * qui suit des TABLES IMPRIMEES (et non une formule en pourcentage), deux retenues salariales facultatives. Voie choisie (21/10/2026), dite sur la page :
 *
 *   1. LE CALCULATEUR MODELISE NEW YORK STATE SEUL. Aucun mecanisme nouveau : bracketTable (constantes imprimees du « Annual Tax Rate Schedule »),
 *      standardDeduction (Table A : 7 400 $ / 7 950 $), personalExemption (1 000 $ par allocation de l'IT-2104 ; chef de famille avec un emploi : 2).
 *   2. NEW YORK CITY ET YONKERS NE SONT PAS MODELISES et sont CHIFFRES sur la page (tableau par salaire), calcules ici par une formule ECRITE A PART
 *      a partir des tables imprimees (NYS-50-T-NYC : 2,05 a 4,25 % apres 5 000 $ ; NYS-50-T-Y : 16,75 % de la retenue d'Etat), recoupee par
 *      verif-retenue-ny.js sur 16 434 cellules des grilles imprimees de la Ville. Pourquoi pas un selecteur comme l'Indiana : la base de la Ville
 *      (deduction propre, bareme propre) et celle de Yonkers (pourcentage de l'impot d'Etat) ne rentrent pas dans le mecanisme « taux de comte
 *      applique au revenu imposable de l'Etat » ; l'etendre = nouveau mecanisme + interface + tests miroir, hors de proportion pour une seule page.
 *   3. PFL (0,432 %, plafond 411,91 $) ET SDI (0,5 %, plafond 0,60 $ par semaine) : retenues FACULTATIVES (« may be funded by employees », « allowed, but
 *      not required ») ; le calculateur applique le MAXIMUM, comme pour le Maine et le Connecticut, et la page le dit.
 *   4. MCTMT : impose a certains employeurs (tax.ny.gov) ; CHOMAGE : Labor Law § 570(6), aucune retenue salariale.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pourquoi les taux imprimes « de retenue » sont 7,03 %, 11,44 %... : le livret ne l'explique pas ; la page dit « the booklet does not explain »;
 *   - « employers must take PFL / SDI » : c'est un CHOIX de l'employeur ;
 *   - que le total NYC + Yonkers soit exact pour un salarie qui a des allocations : le tableau est a 0 allocation (celibataire, ligne 1 de l'IT-2104) ;
 *   - la retenue d'un non-resident : non lue.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js (et de la formule NYC ecrite ici), hors les attendus recalcules a la main
 * dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-new-york.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, impotTable } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "new-york";
const NOM = "New York";
const URL = "https://statelinecalc.com/paycheck-calculator/new-york/";
const AUJOURD_HUI = "2026-10-21";
const LISIBLE = "October 21, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const MED = R.states[CLE];
const IT = MED.incomeTax;
const PFL = MED.employeePrograms[0];
const SDI = MED.employeePrograms[1];
const BS = IT.bracketTable.single;
const BM = IT.bracketTable.marriedJoint;
const fedDed = R.federal.standardDeduction;
const DED_S = IT.standardDeduction.single;            // 7 400
const DED_M = IT.standardDeduction.marriedJoint;      // 7 950
const ALLOC = 1000;                                   // une allocation de l'IT-2104
const HOH_ALLOC = IT.personalExemption.headOfHousehold / ALLOC;   // 2
const imposable = (brut, st) => brut - (st === "marriedJoint" ? DED_M : DED_S) - (st === "headOfHousehold" ? 2 * ALLOC : 0);
/* L'impot du bareme imprime, sur un salaire net annualise, lu dans les donnees du moteur. */
const SCHED_S = n => impotTable(BS, n);
const SCHED_M = n => impotTable(BM, n);

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
const pl = (r, i) => r.programmes[i].montant;

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a30 = calcul(CLE, 30000);
const a50 = calcul(CLE, 50000);
const a100 = calcul(CLE, 100000);
const a150 = calcul(CLE, 150000);
const j150 = calcul(CLE, 150000, "marriedJoint");
const a230 = calcul(CLE, 230000);
const a240 = calcul(CLE, 240000);
const a250 = calcul(CLE, 250000);
const a500 = calcul(CLE, 500000);
const cliffHaut = calcul(CLE, 1084950);
const cliffBas = calcul(CLE, 1084949);
const a2m = calcul(CLE, 2000000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;
const pfl75 = pl(a75, 0), sdi75 = pl(a75, 1);
const pflMax = PFL.wageCap * PFL.rate;
const netSansProg = a75.net + pfl75 + sdi75;
const mensuel75 = a75.etat / 12;
const bimensuel75 = a75.etat / 26;

/* L'exemple pas a pas, a 75 000 $ celibataire (0 allocation). */
const imp75 = imposable(75000, "single");                                  // 67 600
const [L4_FROM, L4_BASE, L4_RATE] = [BS[3].from, BS[3].base, BS[3].rate];  // 13 900 ; 586 ; 5,4 %
const exces75 = imp75 - L4_FROM;                                           // 53 700
const hautDeLigne75 = exces75 * L4_RATE;                                   // 2 899,80
const jImp = imposable(75000, "marriedJoint");                             // 67 050
const jExces = jImp - L4_FROM;                                             // 53 150
const hImp = imposable(75000, "headOfHousehold");                          // 65 600
const hExces = hImp - L4_FROM;                                             // 51 700
/* Erreurs typiques et valeurs d'une allocation. */
const sansDeduc = SCHED_S(75000);                                          // aucune deduction : 3 885,40
const ecartSansDeduc = sansDeduc - a75.etat;                               // 399,60
const valeurAlloc = { bas: ALLOC * BS[0].rate, milieu: ALLOC * L4_RATE, haut: ALLOC * BS[9].rate, max: ALLOC * BS[12].rate };   // 39 ; 54 ; 73,50
const zero75 = a75.etat;                                                   // 0 allocation = le cas du site
const hohGain = a75.etat - h75.etat;                                       // 108,00
const marieCommeCelibataire150 = a150.etat - j150.etat;                    // un couple traite comme un celibataire a 150 000 $
const cliffSaut = cliffHaut.etat - cliffBas.etat;
/* Les plages ou le taux imprime monte : taux marginal imprime a deux points. */
const ecart230_240 = a240.etat - a230.etat;                                // 10 000 $ de plus entre 230 000 et 240 000 $

/* --- New York City et Yonkers : CHIFFRES, pas modelises -------------------------------------------------------------------------------------- */
/* Bareme annuel de la Ville (NYS-50-T-NYC, « Annual Tax Rate Schedule », celibataire et marie) : [seuil, constante, taux]. Verifie contre le texte lu par verif-retenue-ny.js. */
const NYC = [[0, 0, 0.0205], [8000, 164, 0.028], [8700, 184, 0.0325], [15000, 388, 0.0395], [25000, 783, 0.0415], [60000, 2236, 0.0425]];
const NYC_DED = { single: 5000, marriedJoint: 5500 };
const nycTax = (brut, st) => {
  const net = brut - NYC_DED[st || "single"];
  if (net <= 0) return 0;
  let ligne = NYC[0];
  for (const l of NYC) if (net >= l[0]) ligne = l;
  return ligne[1] + (net - ligne[0]) * ligne[2];
};
const YONKERS = 0.1675;
const yonkersTax = (brut, st) => calcul(CLE, brut, st || "single").etat * YONKERS;
const NYC_SUPP = 0.0425, YONKERS_SUPP = 0.0195975, NYS_SUPP = 0.117, YONKERS_NR = 0.005;
const nyc75 = nycTax(75000), yonk75 = yonkersTax(75000);
const nycNet75 = a75.net - nyc75, yonkNet75 = a75.net - yonk75;
const nycH25 = nycTax(h25.brut);
const nycNetH25 = h25.net - nycH25;
const nycTaux75 = nyc75 / 75000;
const yonkNR75 = YONKERS_NR * 75000;
const SAL_LOCAL = [30000, 50000, 75000, 100000, 150000];
const LIGNES_LOCAL = SAL_LOCAL.map(w => {
  const r = calcul(CLE, w);
  return "        <tr><th scope=\"row\">" + $(w) + "</th><td class=\"num\">" + $$(r.etat) + "</td><td class=\"num\">" + $$(nycTax(w)) + "</td><td class=\"num\">" + $$(r.net - nycTax(w)) +
    "</td><td class=\"num\">" + $$(yonkersTax(w)) + "</td><td class=\"num\">" + $$(r.net - yonkersTax(w)) + "</td></tr>";
}).join("\n");

/* Voisins : le New Jersey, la Pennsylvanie, le Connecticut, le Massachusetts et le Vermont bordent l'Etat. */
const REF = 75000;
const COMPARE = [CLE, "new-jersey", "pennsylvania", "connecticut", "massachusetts", "vermont"];
const NOMS = { [CLE]: "New York", "new-jersey": "New Jersey", pennsylvania: "Pennsylvania", connecticut: "Connecticut", massachusetts: "Massachusetts", vermont: "Vermont" };
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
const phraseVoisins = ["new-jersey", "pennsylvania", "connecticut", "massachusetts"].map(plusMoins).join(", ") + " and " + plusMoins("vermont");

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Les deux baremes imprimes, ligne par ligne : celibataire (10 lignes + methode III) puis marie (12 lignes + methode III). */
const ligneBareme = (tab, ded, i0) => tab.map((s, i) => {
  if (i < i0) {
    const haut = Math.round(s.upTo + 0.01);
    return "        <tr><th scope=\"row\">" + $(s.from) + " to " + $(haut) + "</th><td class=\"num\">" + $(s.from + ded) + "</td><td class=\"num\">" + pct2(s.rate) + "</td><td class=\"num\">" + $$(s.base) + "</td></tr>";
  }
  const debut = i === i0 ? Math.round(tab[i0 - 1].upTo + 0.01) : Math.round(tab[i - 1].upTo + 0.01);
  const fin = s.upTo === null ? null : Math.round(s.upTo + 0.01);
  return "        <tr><th scope=\"row\">" + (fin === null ? "Over " + $(debut) : $(debut) + " to " + $(fin)) + "</th><td class=\"num\">" + $(debut + ded) + "</td><td class=\"num\">" + pct2(s.rate) +
    " of all of it</td><td class=\"num\">&mdash;</td></tr>";
}).join("\n");
const LIGNES_S = ligneBareme(BS, DED_S, 10);
const LIGNES_M = ligneBareme(BM, DED_M, 12);

/* Le tableau des cases de l'IT-2104. */
const LIGNES_STATUT = [
  ["Single or Head of household box; one job, no dependents: enter 0", "Single", "0 allowances", $(0), "Single", $(DED_S), $(DED_S + 8500)],
  ["Married box; no dependents or credits claimed", "Married filing jointly", "0 allowances", $(0), "Married", $(DED_M), $(DED_M + 8500)],
  ["Single or Head of household box; head of household with one job, line 15 of the worksheet: enter 2", "Head of household", HOH_ALLOC + " allowances", $(HOH_ALLOC * ALLOC), "Single", $(DED_S + HOH_ALLOC * ALLOC), $(DED_S + HOH_ALLOC * ALLOC + 8500)]
].map(([lib, site, nb, a, bar, z, h]) => "        <tr><th scope=\"row\">" + lib + "</th><td>" + site + "</td><td>" + nb + "</td><td class=\"num\">" + a +
  "</td><td>" + bar + "</td><td class=\"num\">" + z + "</td><td class=\"num\">" + h + "</td></tr>").join("\n");

/* Le recoupement avec les tables imprimees : le script de verification est LANCE ici, ses chiffres sont repris tels quels. */
let verifSortie = "";
try {
  verifSortie = execFileSync(process.execPath, [path.join(RACINE, ".tooling", "test", "verif-retenue-ny.js")], { encoding: "utf8" });
} catch (e) { console.error(String(e.stdout || e)); console.error("ARRET : verif-retenue-ny.js echoue"); process.exit(2); }
const mv = verifSortie.match(/^(\d+) verifications : .*?, (\d+) lignes de grille NYS, (\d+) cellules NYS : (\d+) au dixieme de dollar pres, (\d+) a un bord d'arrondi, ecart maximal ([\d.]+) \$ ; (\d+) lignes de grille NYC, (\d+) cellules NYC : (\d+) au nickel pres, (\d+) a un bord d'arrondi, ecart maximal ([\d.]+) \$ ; (\d+) lignes ou le moteur reste a ([\d.]+) \$ de la cellule imprimee : OK/m);
if (!mv) { console.error(verifSortie); console.error("ARRET : sortie de verif-retenue-ny.js illisible"); process.exit(2); }
const [, V_TOTAL, V_LIGNES_S, V_CELL_S, V_EXACT_S, V_BORD_S, V_ECART_S, V_LIGNES_C, V_CELL_C, V_EXACT_C, V_BORD_C, V_ECART_C, V_MOTEUR, V_ECART_M] = mv;
const virgule = s => Number(s).toLocaleString("en-US");
/* Un ecart maximal affiche ne doit jamais etre PLUS PETIT que le vrai : arrondi vers le haut au cent. */
const cmax = x => "$" + (Math.ceil(Number(x) * 100 - 1e-9) / 100).toFixed(2);
const pourcent = (a, b) => Math.floor(100 * Number(a) / Number(b)) + "%";

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the New York State income tax withholding rate?",
   "New York does not withhold at one rate. The state&rsquo;s withholding schedule climbs in brackets: " + N(pct2(BS[0].rate)) + " on the first " + $(BS[1].from) + " of taxable pay after the deduction and allowances, then " + N(pct2(BS[1].rate)) + ", " + N(pct2(BS[2].rate)) + " and " + N(pct2(BS[3].rate)) +
   ", the bracket for most middle incomes (taxable pay from " + $(L4_FROM) + " to " + $(Math.round(BS[3].upTo + 0.01)) + ", which is " + $(L4_FROM + DED_S) + " to " + $(Math.round(BS[3].upTo + 0.01) + DED_S) + " of gross pay for a single filer with no allowances). Higher brackets start above that, one of them as high as " + N(pct2(BS[8].rate)) + " for taxable pay between " + $(BS[8].from) + " and " + $(BS[9].from) + ", before a top income tax rates method takes over above " + $(Math.round(BS[9].upTo + 0.01)) + ". " +
   "&ldquo;Taxable pay&rdquo; means your yearly pay minus " + $(DED_S) + " for a single filer or " + $(DED_M) + " for a married one, minus " + $(ALLOC) + " for each allowance on Form IT-2104. On " + $(75000) + ", a single filer has " + $$(a75.etat) + " withheld a year."],

  ["How much New York State tax is withheld on a $75,000 salary?",
   "For a single filer with no allowances, New York State withholds " + $$(a75.etat) + " a year, which is " + $$(mensuel75) + " a month or " + $$(bimensuel75) + " on a biweekly check. " +
   "Taxable pay after the " + $(DED_S) + " deduction is " + $(imp75) + ". The schedule&rsquo;s bracket for " + $(L4_FROM) + " and up starts at " + $$(L4_BASE) + " and adds " + N(pct2(L4_RATE)) + " of the " + $(exces75) + " above " + $(L4_FROM) + ", or " + $$(hautDeLigne75) + ". " +
   "A married filer has " + $$(j75.etat) + " withheld, and a head of household with two allowances has " + $$(h75.etat) + " withheld. None of these figures includes a New York City or Yonkers tax."],

  ["What is take-home pay on a $75,000 salary in New York?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution, outside New York City and Yonkers. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " + $$(a75.etat) +
   " of New York State income tax, " + $$(pfl75) + " for Paid Family Leave and " + $$(sdi75) + " for disability insurance, both at their maximum employee share, an effective rate of " + (a75.taux * 100).toFixed(1) + "%. " +
   "If your employer takes neither of the last two, take-home pay is about " + $(netSansProg) + ". For a New York City resident the city&rsquo;s withholding comes off too, which brings it to about " + $(nycNet75) + "."],

  ["How much is $20, $25 or $30 an hour after taxes in New York?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA, " +
   "New York State income tax withholding, and the Paid Family Leave and disability deductions at their maximums, with no retirement contribution and no New York City or Yonkers tax."],

  ["How much is $25 an hour after taxes in New York City?",
   "At 40 hours a week, $25 an hour is " + $(h25.brut) + " a year. New York State, federal tax and the payroll lines leave about " + $(h25.net) + ". New York City&rsquo;s resident withholding adds " + $$(nycH25) + " a year, so a single filer with no allowances keeps about " + $(nycNetH25) + ", or " + $$(nycNetH25 / HEURES) + " an hour. " +
   "The city&rsquo;s rate is not a flat percentage: it runs from " + N(pct2(NYC[0][2])) + " to " + N(pct2(NYC[5][2])) + " on pay after a " + $(NYC_DED.single) + " deduction."],

  ["How does New York City withholding work?",
   "A New York City resident has a second income tax withheld, under the state&rsquo;s New York City withholding tables. For a single filer with no allowances, the city subtracts " + $(NYC_DED.single) + " from yearly pay and applies rates of " + N(pct2(NYC[0][2])) + ", " + N(pct2(NYC[1][2])) + ", " + N(pct2(NYC[2][2])) + ", " + N(pct2(NYC[3][2])) + ", " + N(pct2(NYC[4][2])) + " and " + N(pct2(NYC[5][2])) +
   ", the last on pay above " + $(NYC[5][0]) + ". On " + $(75000) + ", that is " + $$(nyc75) + " a year, or " + $$(nyc75 / 12) + " a month. This calculator does not add it. The &ldquo;New York City and Yonkers&rdquo; section below prices it for five salaries."],

  ["Does Yonkers have its own income tax?",
   "Yes, in two forms. The Yonkers withholding tables apply a resident surcharge: the amount is the New York State withholding multiplied by " + N("16.75%") + ". On " + $(75000) + " that is " + $$(yonk75) + " a year on top of the state&rsquo;s " + $$(a75.etat) + ". " +
   "For employees who live outside Yonkers but earn wages there, the tables apply a nonresident earnings tax of " + N("0.50%") + " to wages after an exclusion that is zero once annualized pay reaches " + $(30000) + ", which is " + $$(yonkNR75) + " on " + $(75000) + ". This calculator adds neither."],

  ["Is New York Paid Family Leave taken out of my paycheck?",
   "It can be. For 2026 the program&rsquo;s contribution is " + N(pct(PFL.rate)) + " of gross wages, up to a maximum of " + N("$411.91") + " a year, according to the state. The state&rsquo;s page describes the program as one that employees can fund through payroll deductions. " +
   "We apply the maximum, " + $$(pfl75) + " on " + $(75000) + ", and the cap of " + $$(pflMax) + " is reached at " + $(PFL.wageCap) + " of pay. Whether your employer takes it out of your pay is the employer&rsquo;s choice, and your pay stub will show it."],

  ["Is New York disability insurance deducted from my pay?",
   "It may be, but the employer does not have to. The Workers&rsquo; Compensation Board says &ldquo;Your employer is allowed, but not required, to take a contribution from you,&rdquo; calculated at one half of one percent of your wages and no more than 60 cents a week. " +
   "We apply the maximum: 0.5% of your pay up to " + $(SDI.wageCap) + ", which is " + $$(sdi75) + " a year, or 60 cents a week. If your stub shows nothing for disability, your employer is not collecting it."],

  ["What is a withholding allowance on New York&rsquo;s Form IT-2104?",
   "It is the amount your employer subtracts from your pay before applying the tax schedule, " + $(ALLOC) + " a year for each allowance, on top of the standard deduction built into the tables. The form&rsquo;s note says single taxpayers with one job and zero dependents should enter 0, and the instructions say you may not claim an allowance for yourself or, if married, your spouse. " +
   "Dependents, certain credits and itemized deductions add allowances in the worksheet. Each one lowers yearly New York State withholding by " + $$(valeurAlloc.milieu) + " in the " + pct2(L4_RATE) + " bracket."],

  ["How many allowances do I claim on the IT-2104 if I am married?",
   "If you have no dependents and expect no credits, the worksheet gives zero, because the instructions say you may not claim an allowance for yourself or your spouse. This calculator uses that case for &ldquo;Married filing jointly&rdquo; and applies the married schedule and its " + $(DED_M) + " deduction. " +
   "The form also has a &ldquo;Married, but withhold at higher single rate&rdquo; box, and the instructions tell married couples who both work to use it or to ask for additional withholding. We do not model either. On " + $(150000) + " a couple treated as single would have " + $$(marieCommeCelibataire150) + " more withheld a year."],

  ["How does head of household work on the IT-2104?",
   "You mark the &ldquo;Single or Head of household&rdquo; box, which sends your employer to the single schedule. The instructions add that a head of household with only one job may also choose to claim two additional allowances on line 15 of the worksheet. " +
   "This calculator uses those two allowances, " + $(HOH_ALLOC * ALLOC) + " in all. On " + $(75000) + " that gives " + $$(h75.etat) + " of New York State withholding instead of " + $$(a75.etat) + ", which is " + $$(hohGain) + " less. Federal tax is lower for a head of household too, so take-home pay is " + $(h75.net) + "."],

  ["Does New York tax the paycheck of someone who works in New York but lives in another state?",
   "We did not read New York&rsquo;s rules for nonresidents for this page, and this calculator assumes you live and work in New York. The five states that border New York (New Jersey, Pennsylvania, Connecticut, Massachusetts and Vermont) each have their own calculator here, but those pages are not built for commuters. Check your pay stub and your IT-2104."],

  ["Is there a New York unemployment tax on employees?",
   "Not in the law we read. Section 570 of New York&rsquo;s Labor Law says each liable employer shall pay contributions on all wages, and its subdivision 6 says no agreement by an employee to pay any portion of that payment is valid and no employer shall make a deduction for that purpose from an employee&rsquo;s pay. That is why this calculator has no unemployment line."],

  ["What is the MCTMT, and does it come out of my pay?",
   "The Department of Taxation and Finance says the metropolitan commuter transportation mobility tax is imposed on certain employers and self-employed individuals engaging in business within the Metropolitan Commuter Transportation District. We found nothing in the withholding publications that makes it a deduction from an employee&rsquo;s pay, and this calculator has no line for it."],

  ["Does a 401(k) contribution lower my New York withholding?",
   "In this calculator, yes for the income tax, not for Paid Family Leave or disability insurance. The withholding tables start from wages and say nothing about 401(k) contributions, so we start from pay after a traditional 401(k) contribution, the same choice we make in most states here, and we apply the two payroll programs to the full wage. " +
   "On " + $(75000) + " with 6% going into a 401(k), New York State withholding falls by " + $$(gain401) + " a year. Enter 0 if your contribution is a Roth."],

  ["How does New York withhold tax on a bonus?",
   "The state&rsquo;s tables say that if supplemental wages such as bonuses and commissions are paid separately and the employer withholds from regular wages, it can withhold at the New York State supplemental rate of " + N("11.70%") + ", or add the bonus to the regular wages for the latest pay period and subtract what was already withheld. " +
   "New York City&rsquo;s supplemental rate is " + N("4.25%") + " and Yonkers&rsquo; resident rate is " + N("1.95975%") + ". This calculator does not model bonuses, so ask your employer which method it uses."],

  ["Why is my New York paycheck different from this calculator?",
   "Common reasons: you live in New York City or Yonkers; you claimed allowances for dependents or credits; you asked for extra withholding; " +
   "health insurance premiums, transit benefits and other pre-tax deductions come out before tax and are not modeled here; part of your pay is a bonus; your employer takes less, or none, of the Paid Family Leave and disability deductions; or your employer uses the printed wage-bracket tables instead of the exact calculation. " +
   "In the printed tables we tested, the cells and the formula differ by no more than " + cmax(V_ECART_S) + " per check. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."],

  ["How current is the New York formula on this page?",
   "It comes from the Department of Taxation and Finance&rsquo;s publication NYS-50-T-NYS, dated January 2026 and marked &ldquo;Effective January 1, 2026 &ndash; December 31, 2026,&rdquo; which says the 2026 rate schedules were revised for the income tax rate reductions in Chapter 59 of the Laws of 2025. " +
   "We read it, the New York City and Yonkers editions and the IT-2104 instructions on the agency&rsquo;s own site on " + LISIBLE + ". The Paid Family Leave figures come from the state&rsquo;s 2026 page and the Department of Financial Services decision dated August 29, 2025. If the agency posts new tables, we update this page from them."]
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
const reponse = "New York State withholding starts at " + pct(BS[0].rate) + " and is " + pct(L4_RATE) + " on pay from " + $(L4_FROM + DED_S) + " to " + $(Math.round(BS[3].upTo + 0.01) + DED_S) + " for a single filer, after a " + $(DED_S) + " deduction. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year after federal tax, FICA and the two payroll deductions. New York City and Yonkers taxes come on top, and we price them below.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/assets/analytics.js" defer></script>
<title>New York (NY) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free New York (NY) paycheck calculator, 2026. Hourly or salary take-home after federal tax, FICA and NY State withholding, plus NYC and Yonkers tax by salary.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="New York (NY) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="New York State withholding starts at ${pct(BS[0].rate)} after a ${$(DED_S)} deduction. On $75,000 a single filer keeps about ${$(a75.net)}. New York City and Yonkers taxes are priced on the page.">
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
      "name": "New York Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 New York take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, New York State income tax withheld under the Department of Taxation and Finance's exact calculation method (a deduction of $7,400 or $7,950 plus $1,000 for each IT-2104 allowance, then the published annual rate schedule) and the Paid Family Leave and disability insurance deductions at their maximums. New York City and Yonkers taxes are priced on the page but not added to the calculator, and optional employer deductions are not modeled."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "New York", "item": "${URL}" }
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
    <li aria-current="page">New York</li>
  </ol>
</nav>

  <h1>New York Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your New York take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and your New York schedule and allowances.
          We assume no allowances for dependents or credits; a head of household gets the two allowances the form gives a head of household with one job.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your New York income tax withholding too, but not the paid leave and disability deductions.</span>
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
    <p>The New York State Department of Taxation and Finance publishes withholding tables and an exact calculation method, and this calculator follows the exact method. Your pay is converted to a yearly amount. A combined deduction of ${N($(DED_S))} comes off for the single schedule and ${N($(DED_M))} for the married schedule, and each withholding allowance on Form IT-2104 takes off ${N($(ALLOC))} more. What is left is run through the department&rsquo;s annual rate schedule, which starts at ${N(pct2(BS[0].rate))} and climbs in brackets. Above ${N($(Math.round(BS[9].upTo + 0.01)))} of taxable pay (${N($(Math.round(BM[11].upTo + 0.01)))} for the married schedule), a separate &ldquo;top income tax rates method&rdquo; applies a single rate to all of it.</p>
    <p><strong>This page covers New York State only, and prices New York City and Yonkers separately.</strong> The calculator&rsquo;s result is the state-level figure. A New York City resident has a second tax withheld, and so does a Yonkers resident. We left both out of the calculator because their tax bases differ from the state&rsquo;s: the city has its own deduction and its own rate schedule, and Yonkers charges a percentage of the state amount. The section &ldquo;New York City and Yonkers&rdquo; below shows both, by salary, from the state&rsquo;s own city and Yonkers tables.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>New York State income tax</strong>: your wages after any 401(k) contribution, minus the deduction and the allowances, run through the annual schedule.</li>
      <li><strong>New York Paid Family Leave</strong> at ${N(pct(PFL.rate))} of your wages up to ${N($(Math.round(PFL.wageCap)))} of pay, which makes ${N("$411.91")} the most it can take in a year. We explain below why we apply it.</li>
      <li><strong>New York disability insurance</strong> at 0.5% of your wages, capped at 60 cents a week. The employer is allowed, but not required, to collect it.</li>
    </ul>
    <p>We looked for any other New York payroll deduction that an employer must take from your check and found none beyond New York City and Yonkers income tax, which depend on where you live.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    New York, the <strong>Department of Taxation and Finance</strong>&rsquo;s withholding tables and Form IT-2104, the <strong>Department of Financial Services</strong> and the Paid Family Leave program for the family leave rate, the <strong>Workers&rsquo; Compensation Board</strong> for disability insurance and the New York Labor Law.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How current the source is.</strong> The state publication is NYS-50-T-NYS, dated January 2026 and marked &ldquo;Effective January 1, 2026 &ndash; December 31, 2026.&rdquo; It says the 2026 personal income tax rate schedules were revised for the rate reductions enacted under Chapter 59 of the Laws of 2025, and that employers must use its revised tables and methods for payrolls made on or after January 1, 2026. We read it, its New York City and Yonkers editions, and the IT-2104 instructions on the agency&rsquo;s own site on ${LISIBLE}, and the Sources section links to them. The Paid Family Leave figures come from the program&rsquo;s 2026 page and the Department of Financial Services decision dated August 29, 2025. The federal figures are the 2026 IRS amounts.</p>

    <p><strong>How we checked the formula.</strong> We read the department&rsquo;s annual rate schedule, its tables for each pay period, and twelve of its worked examples (the four single-filer examples for the state and all eight for the city) separately from the calculator&rsquo;s code. A period-by-period rebuild of the printed method reproduces those examples to within a cent, including ${N("$8.01")} for a single employee paid ${N("$400")} a week with three allowances and ${N("$3,576.63")} for one paid ${N("$50,000")} a month with three, and the calculator&rsquo;s yearly method lands within five cents of the four state examples. The calculator&rsquo;s own figures stay within ${N(cmax(V_ECART_M))} of the printed wage-bracket tables on ${N(virgule(V_MOTEUR))} pay ranges. We also rebuilt every cell of the printed tables, and the section on the printed tables below gives the result.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the agency&rsquo;s method, before the rounding in the tables. Your actual New York income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: New York City and Yonkers taxes, dependents and credits on Form IT-2104, a spouse who works, the &ldquo;higher single rate&rdquo; box, extra withholding, bonuses, rounding by your employer, work in another state, optional employer deductions, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>New York take-home pay by salary</h2>
  <p class="prose">Single filer with no allowances, no retirement contribution, 2026 federal and New York State rates, outside New York City and Yonkers. The
  NY tax column is New York State income tax withholding plus the Paid Family Leave and disability deductions at their maximums (on $75,000: ${$$(a75.etat)} + ${$$(pfl75)} + ${$$(sdi75)}).</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        New York take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">NY tax + paid leave and disability</th>
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

    <h2>New York State withholding rates and the pay they apply to</h2>
    <p>The department prints an annual rate schedule, and it applies to what is left of your pay after the deduction and the allowances, not to your pay itself. For a single filer on ${N($(75000))}, that is ${N($(75000))} &minus; ${N($(DED_S))} = ${N($(imp75))}.
    That falls in the bracket that starts at ${N($(L4_FROM))}, where the tax is ${N($$(L4_BASE))} plus ${N(pct2(L4_RATE))} of the amount above ${N($(L4_FROM))}: ${N($(exces75))} &times; ${N(pct2(L4_RATE))} = ${N($$(hautDeLigne75))}, for a total of ${N($$(a75.etat))}. The column on the left of each table shows taxable pay after the deduction and allowances; the second column shows the gross pay at which the bracket starts for a single filer with none.</p>

    <h3>The single schedule</h3>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        New York State annual withholding schedule, single filer and head of household (applied to pay after the deduction and allowances)
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable pay after the deduction and allowances</th>
          <th scope="col">Gross pay at which the bracket starts (no allowances)</th>
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
    <p>A married filer has a wider set of brackets between ${N($(Math.round(BM[5].from)))} and ${N($(Math.round(BM[11].upTo + 0.01)))} of taxable pay, and the top income tax rates method starts later.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        New York State annual withholding schedule, married filer (applied to pay after the deduction and allowances)
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable pay after the deduction and allowances</th>
          <th scope="col">Gross pay at which the bracket starts (no allowances)</th>
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
    <h3>Why some printed rates look odd</h3>
    <p>The rates in the schedule do not rise in a straight line. For a single filer the printed rate is ${N(pct2(BS[5].rate))} between ${N($(BS[5].from))} and ${N($(BS[6].from))} of taxable pay, ${N(pct2(BS[6].rate))} up to ${N($(BS[7].from))}, then ${N(pct2(BS[7].rate))}, then ${N(pct2(BS[8].rate))} between ${N($(BS[8].from))} and ${N($(BS[9].from))}, and ${N(pct2(BS[9].rate))} after that. The publication does not explain them, so we do not guess at the reason. We apply them as printed, together with the constant printed for each bracket, and the department&rsquo;s own worked examples and wage-bracket tables come out right with them.</p>
    <p>Because these are withholding rates, they are not the rates on the tax return, and your actual New York tax is figured there.</p>

    <h3>The top income tax rates method</h3>
    <p>The exact calculation method stops at ${N($(Math.round(BS[9].upTo + 0.01)))} of taxable pay for a single filer and ${N($(Math.round(BM[11].upTo + 0.01)))} for a married one. Above those amounts the publication says employers must use a different method: multiply all of the annualized taxable pay by ${N("10.45%")} up to ${N($(5000000))}, by ${N("11.10%")} from there to ${N($(25000000))}, and by ${N("11.70%")} above that. It is a rate on the whole amount, not on the part above the threshold.</p>
  </div>

  <div class="prose">

    <h2>The deduction and the allowance: what changes with your IT-2104</h2>
    <p>Form IT-2104 is how you tell your employer your filing status and how many allowances to apply, and each one is worth ${N($(ALLOC))} a year. The form&rsquo;s note says single taxpayers with one job and zero dependents should enter 0. The instructions add that if you submit a federal Form W-4 for tax year 2020 or later and do not file an IT-2104, your employer may use zero as your number of allowances. This is how the calculator maps its three choices.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        New York allowances and deduction by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Form IT-2104</th>
          <th scope="col">Used by this calculator for</th>
          <th scope="col">Allowances</th>
          <th scope="col">Yearly allowance</th>
          <th scope="col">Schedule</th>
          <th scope="col">Deduction plus allowance</th>
          <th scope="col">Pay at which the ${pct2(BS[1].rate)} bracket starts</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The deduction and allowances come off your pay before the schedule, so each extra ${N($(ALLOC))} of allowance is worth ${N($$(ALLOC * L4_RATE))} a year to anyone in the ${N(pct2(L4_RATE))} bracket. The worksheet adds allowances for each dependent you will claim, for certain credits, and for itemized deductions above the standard amount, and this calculator asks about none of them. The form&rsquo;s &ldquo;Single or Head of household&rdquo; box sends the employer to the single schedule, and the &ldquo;Married&rdquo; box sends it to the married one.</p>

    <h2>New York City and Yonkers</h2>
    <p>New York State&rsquo;s publications give employers separate withholding tables for New York City residents and for Yonkers, and Form IT-2104 asks whether you live in either one. The calculator above does not add them. This section prices both so that you can add them yourself, using the same single filer and zero allowances as the rest of the page.</p>

    <h3>New York City resident tax</h3>
    <p>The city&rsquo;s tables subtract ${N($(NYC_DED.single))} from yearly pay for a single filer, ${N($(NYC_DED.marriedJoint))} for a married one, and ${N($(ALLOC))} for each allowance claimed for the city on the IT-2104. The rest is taxed at ${N(pct2(NYC[0][2]))} up to ${N($(NYC[1][0]))}, ${N(pct2(NYC[1][2]))} up to ${N($(NYC[2][0]))}, ${N(pct2(NYC[2][2]))} up to ${N($(NYC[3][0]))}, ${N(pct2(NYC[3][2]))} up to ${N($(NYC[4][0]))}, ${N(pct2(NYC[4][2]))} up to ${N($(NYC[5][0]))} and ${N(pct2(NYC[5][2]))} above that, with a printed constant for each bracket, and the same schedule applies to single and married filers.</p>
    <p>On ${N($(75000))}, a single filer with no allowances has ${N($(75000))} &minus; ${N($(NYC_DED.single))} = ${N($(75000 - NYC_DED.single))} taxed: ${N($$(NYC[5][1]))} plus ${N(pct2(NYC[5][2]))} of the ${N($(75000 - NYC_DED.single - NYC[5][0]))} above ${N($(NYC[5][0]))}, which is ${N($$(nyc75))} a year, or ${N($$(nyc75 / 12))} a month. That is ${N((nycTaux75 * 100).toFixed(1) + "%")} of gross pay.</p>

    <h3>Yonkers resident surcharge and nonresident earnings tax</h3>
    <p>For a Yonkers resident the tables compute the New York State amount and multiply it by ${N("16.75%")}. On ${N($(75000))}, that is ${N($$(a75.etat))} &times; ${N("16.75%")} = ${N($$(yonk75))} a year. For someone who lives outside Yonkers but earns wages there, the tables apply ${N("0.50%")} to wages after an exclusion that shrinks to nothing as pay rises. The exclusion is zero from ${N($(30000))} of annualized pay (${N($(577))} a week), so on ${N($(75000))} the tax is ${N($$(yonkNR75))}.</p>

    <h3>What New York City and Yonkers add, by salary</h3>
    <p>Single filer, no allowances, no retirement contribution. The state column is New York State withholding alone, and each take-home column is the calculator&rsquo;s take-home pay minus the local amount.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        New York State withholding, New York City and Yonkers amounts, and take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Yearly pay</th>
          <th scope="col">NY State withholding</th>
          <th scope="col">NYC resident withholding</th>
          <th scope="col">Take-home in NYC</th>
          <th scope="col">Yonkers resident surcharge</th>
          <th scope="col">Take-home in Yonkers</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_LOCAL}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h3>Why the calculator does not add them</h3>
    <p>Indiana and Maryland have local lines in their calculators because their county taxes are one rate applied to the same taxable pay as the state. New York City has its own deduction, its own set of rates and its own allowance count, and Yonkers charges a share of the state amount, so adding them would need a new kind of local line, a new form field and a new round of tests. We chose to show the numbers on the page and keep the calculator&rsquo;s result the state-level figure, which is what the department&rsquo;s state tables produce.</p>

    <h3>Allowances in New York City</h3>
    <p>The IT-2104 worksheet counts allowances for the state and Yonkers on line 1 and for the city on line 2, and the worksheet adds ${N("2")} to the state count if you expect to be a New York City resident for any part of the year (line 13, the city school tax credit). The form&rsquo;s note tells a single taxpayer with one job and no dependents to enter 0 on both lines. If you follow the worksheet instead, the two extra state allowances lower the state withholding by ${N($$(hohGain))} a year at ${N(pct2(L4_RATE))}.</p>

    <h3>Bonuses in the city and in Yonkers</h3>
    <p>The tables&rsquo; flat supplemental rates are ${N("4.25%")} for New York City and ${N("1.95975%")} for Yonkers residents, and ${N("0.50%")} for Yonkers nonresidents, next to ${N("11.70%")} for the state.</p>

    <h2>The paid leave and disability deductions, and the other payroll lines</h2>

    <h3>New York Paid Family Leave: up to ${pct(PFL.rate)} of your pay</h3>
    <p>New York&rsquo;s Paid Family Leave program can be paid for in part by employee contributions. The state&rsquo;s 2026 page says employees will contribute ${N(pct(PFL.rate))} of their gross wages per pay period, with a maximum annual contribution of ${N("$411.91")}. The Department of Financial Services decision, dated August 29, 2025, sets the same rate and maximum. The state&rsquo;s page says the insurance &ldquo;may be funded by employees through payroll deductions.&rdquo; Nothing we read makes the employer take it from you, so we treat it as a choice for the employer.</p>

    <h3>What the maximum deduction costs you</h3>
    <p>At ${N(pct(PFL.rate))}, the deduction is ${N($$(pfl75))} a year on ${N($(75000))}, or ${N($$(pfl75 / 12))} a month. The maximum the state prints matches the arithmetic on the state average weekly wage, ${N("$1,833.63")} in 2026: ${N("$1,833.63")} &times; 52 = ${N($$(PFL.wageCap))}, and ${N(pct(PFL.rate))} of that is about ${N("$411.91")}. This calculator takes the maximum and shows it as its own line. It does not subtract the deduction before figuring income tax, because the withholding tables we read start from wages and mention no such subtraction.</p>

    <h3>New York disability insurance: up to 60 cents a week</h3>
    <p>The Workers&rsquo; Compensation Board says an employer is allowed, but not required, to take a contribution from you to offset the cost of providing disability benefits, calculated at one half of one percent of your wages and no more than 60 cents a week. Over a year that is ${N($$(SDI.rate * SDI.wageCap))}, which the calculator applies as ${N("0.5%")} of your pay up to ${N($(SDI.wageCap))}. On ${N($(75000))}, that is ${N($$(sdi75))}.</p>

    <h3>Why we apply both maximums</h3>
    <p>Because the words in the sources are &ldquo;may&rdquo; and &ldquo;allowed, but not required,&rdquo; your pay stub can show less, or nothing. We apply the maximums so the calculator does not overstate your take-home pay, and we say so wherever the number appears. Without them, take-home pay on ${N($(75000))} is about ${N($(netSansProg))} instead of ${N($(a75.net))}.</p>

    <h3>Unemployment insurance is not taken from your pay</h3>
    <p>Section 570 of the New York Labor Law says each liable employer shall pay contributions on all wages, and subdivision 6 says no agreement by an employee to pay any portion of that payment is valid and no employer shall make a deduction for that purpose from an employee&rsquo;s pay. This calculator has no unemployment line for that reason.</p>

    <h3>The MCTMT is an employer tax</h3>
    <p>The metropolitan commuter transportation mobility tax, according to the Department of Taxation and Finance, is imposed on certain employers and self-employed individuals engaging in business within the Metropolitan Commuter Transportation District. We found nothing in the withholding tables or on the department&rsquo;s page that makes it a deduction from an employee&rsquo;s pay, and this calculator has no line for it.</p>

    <h3>Local taxes: New York City and Yonkers exist, and we price them</h3>
    <p>The state&rsquo;s withholding publications name two local income taxes on wages, New York City&rsquo;s and Yonkers&rsquo;, and the section above prices both. We found no others in the publications we read, which is not proof that none exists, and this calculator adds none.</p>

    <h2>The printed wage-bracket tables match the formula to within ${cmax(V_ECART_S)}</h2>

    <h3>Two ways to find the tax</h3>
    <p>The publication gives employers two ways to find the tax: wage-bracket tables (method I) and the exact calculation method (method II). The tables list the tax for each pay range and for 0 to 10 allowances, for weekly, biweekly, twice-a-month, monthly and daily pay, one set for the single schedule and one for the married schedule. Above a pay level it prints for each period (${N("$650")} a week, for instance), it tells employers to use the exact calculation method.</p>

    <h3>What we found when we rebuilt them</h3>
    <p>We rebuilt all ${N(virgule(V_CELL_S))} cells of the state&rsquo;s printed tables from the annual schedule, using the middle of each pay range as the wage. ${N(virgule(V_EXACT_S))} of them, ${N(pourcent(V_EXACT_S, V_CELL_S))}, match to the nearest ten cents, and every one of them is within ${N(cmax(V_ECART_S))}. The remaining ${N(virgule(V_BORD_S))} sit at a rounding edge. The department does not say how it rounds its tables, so we report the spread and do not guess at the cause. We also rebuilt the city&rsquo;s ${N(virgule(V_CELL_C))} cells, and ${N(virgule(V_EXACT_C))} of them match to the nearest five cents, with every cell within ${N(cmax(V_ECART_C))}.</p>

    <h3>What it means for your check</h3>
    <p>Whether your employer uses the tables or the exact method, your New York State withholding should agree with this calculator to within ${N(cmax(V_ECART_S))} per pay period, for a single filer or a married one with no allowances. If your stub shows a larger gap, the cause is almost certainly an input the calculator does not have: allowances, a New York City or Yonkers tax, a pre-tax deduction or extra withholding.</p>

    <h2>New York hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In New York your hours also matter because of the deduction: a single filer earning ${N($(DED_S))} or less a year has no New York State income tax withheld.</p>

    <h3>What is $20 an hour after taxes in New York?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, New York State income tax withholding and the two payroll deductions, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. New York State&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year, plus ${N($$(pl(h20, 0)))} of Paid Family Leave and ${N($$(pl(h20, 1)))} of disability insurance at the maximums.</p>

    <h3>What are $25 and $30 an hour after taxes in New York?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. New York State income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30. In New York City, $25 an hour also has ${N($$(nycH25))} of city withholding, which leaves about ${N($(nycNetH25))}.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The tables say that when supplemental wages such as bonuses and commissions are paid separately, an employer that withholds from regular wages can use the supplemental rate of ${N("11.70%")} for the state. Ask your employer how it handles a bonus.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>New York take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year).</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        New York take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in New York</h2>

  <h3>Nothing is withheld on the first ${$(DED_S)} of a single filer&rsquo;s pay</h3>
  <p>With the ${N($(DED_S))} deduction and no allowances, a single filer&rsquo;s yearly pay has to pass ${N($(DED_S))} before New York State withholds anything. At ${N($(30000))}, it withholds ${N($$(a30.etat))}; at ${N($(50000))}, it withholds ${N($$(a50.etat))} a year. A married filer&rsquo;s threshold is ${N($(DED_M))}.</p>

  <h3>The ${pct2(L4_RATE)} bracket runs from ${$(L4_FROM + DED_S)} to ${$(Math.round(BS[3].upTo + 0.01) + DED_S)} of pay</h3>
  <p>For a single filer with no allowances, the ${N(pct2(L4_RATE))} bracket runs from ${N($(L4_FROM + DED_S))} to ${N($(Math.round(BS[3].upTo + 0.01) + DED_S))} of yearly pay. Across that range the tax is the ${N($$(L4_BASE))} printed for the bracket plus ${N(pct2(L4_RATE))} of the amount above ${N($(L4_FROM))} of taxable pay. On ${N($(100000))}, a single filer is already past it, with ${N($$(a100.etat))} withheld.</p>

  <h3>Between about ${$(Math.round(BS[8].from + DED_S))} and ${$(Math.round(BS[9].from + DED_S))} of pay the printed rate is ${pct2(BS[8].rate)}</h3>
  <p>For a single filer with no allowances, the schedule&rsquo;s ${N(pct2(BS[8].rate))} bracket applies to yearly pay from ${N($(BS[8].from + DED_S))} to ${N($(Math.round(BS[9].from + DED_S)))}. A single filer paid ${N($(230000))} has ${N($$(a230.etat))} withheld, and one paid ${N($(240000))} has ${N($$(a240.etat))}, which is ${N($$(ecart230_240))} more for ${N($(10000))} of pay. At ${N($(250000))}, New York State withholds ${N($$(a250.etat))}.</p>

  <h3>At about ${$(1084950)} of pay, one dollar can add about ${$(Math.round(cliffSaut / 100) * 100)} of withholding</h3>
  <p>The top income tax rates method applies one rate to all of the taxable pay, not just the part above a threshold. For a single filer with no allowances, ${N($(1084949))} of yearly pay is withheld at ${N($$(cliffBas.etat))}, and ${N($(1084950))} is withheld at ${N($$(cliffHaut.etat))}, which is ${N($$(cliffSaut))} more for one extra dollar. That is how the printed method works, and your actual tax is figured on your return, so it is a feature of withholding and not of what you will owe. On ${N($(2000000))}, New York State withholds ${N($$(a2m.etat))}.</p>

  <h3>The married schedule is wider, and the deduction is larger</h3>
  <p>A single filer&rsquo;s taxable pay is pay minus ${N($(DED_S))}. A married filer with no allowances gets ${N($(DED_M))} off and a schedule whose brackets differ above ${N($(Math.round(BM[5].from)))} of taxable pay. That is why New York State withholds ${N($$(j75.etat))} from that filer on ${N("$75,000")} and ${N($$(a75.etat))} from a single one. On ${N($(150000))} the gap is ${N($$(a150.etat - j150.etat))}: ${N($$(j150.etat))} for the married filer and ${N($$(a150.etat))} for the single one.</p>

  <h3>Head of household: two allowances on the single schedule</h3>
  <p>A head of household with one job may claim two allowances on line 15 of the IT-2104 worksheet, ${N($(HOH_ALLOC * ALLOC))} in all, and the form sends the employer to the single schedule. On ${N("$75,000")}, taxable pay is ${N($(hImp))} and New York State withholds ${N($$(h75.etat))}. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>Each allowance is worth between ${$$(valeurAlloc.bas)} and ${$$(valeurAlloc.max)} a year</h3>
  <p>The worksheet gives allowances for dependents, for certain credits and for itemized deductions. In the ${N(pct2(L4_RATE))} bracket an extra allowance lowers yearly withholding by ${N($$(valeurAlloc.milieu))}; in the ${N(pct2(BS[0].rate))} bracket it is ${N($$(valeurAlloc.bas))}, in the ${N(pct2(BS[9].rate))} bracket ${N($$(valeurAlloc.haut))}, and ${N($$(valeurAlloc.max))} under the top income tax rates method, which applies ${N("11.70%")} at the highest pay. This calculator does not ask for dependents or credits, so a worker who claims them on the IT-2104 will see less New York State tax withheld than the figure shown.</p>

  <h3>Extra withholding is on the form</h3>
  <p>Lines 3, 4 and 5 of the IT-2104 are for an additional amount you want withheld from each paycheck for the state, the city and Yonkers. The instructions say that if you calculate a negative number of allowances and your employer cannot accommodate that, you can ask for an additional ${N("$1.85")} of state tax a week for each negative allowance. This calculator models none of it.</p>

  <h3>Your 401(k) lowers your New York taxable wages in this calculator</h3>
  <p>The tables start from wages and give no separate rule for 401(k) contributions. This calculator therefore starts from pay after a traditional 401(k) contribution, as it does in most states on this site. On ${N("$75,000")} with 6% going in, New York State withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total, and the Paid Family Leave deduction stops at ${N($$(pflMax))}.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the deduction</h3>
  <p>Applying the schedule to all of ${N($(75000))} means treating ${N($(75000))} as taxable pay, which overstates New York State withholding by ${N($$(ecartSansDeduc))}: ${N($$(sansDeduc))} instead of ${N($$(a75.etat))}.</p>

  <h3>Treating a married couple as single</h3>
  <p>The married schedule differs from the single one above ${N($(Math.round(BM[5].from)))} of taxable pay. On ${N($(150000))}, an employer that treated a married filer as single would withhold ${N($$(a150.etat))} instead of ${N($$(j150.etat))}, which is ${N($$(marieCommeCelibataire150))} too much over a year.</p>

  <h3>Leaving out New York City or Yonkers</h3>
  <p>If you live in New York City, the calculator&rsquo;s result is not your take-home pay, because it leaves out the city&rsquo;s withholding. On ${N("$75,000")} that is ${N($$(nyc75))} a year, and take-home pay is about ${N($(nycNet75))} instead of ${N($(a75.net))}. For a Yonkers resident it is ${N($$(yonk75))}.</p>

  <h3>Assuming the schedule&rsquo;s rate is your rate</h3>
  <p>The schedule&rsquo;s printed rates, such as ${N(pct2(BS[5].rate))} or ${N(pct2(BS[8].rate))}, are the rates the department tells employers to withhold at, not the rates on your return. A tax return works from your actual income and deductions, so what you owe in April can be smaller or larger than what was withheld.</p>

  <h3>Leaving out the paid leave and disability deductions</h3>
  <p>They are taken from your pay in addition to income tax, and this calculator does not subtract them before figuring income tax. A take-home figure that leaves them out is too high by ${N($$(pfl75 + sdi75))} on ${N("$75,000")}, if your employer takes the full amounts.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances you claimed on your Form IT-2104 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in New York in 2026, outside New York City and Yonkers, with no allowances, no retirement
  contribution and the two payroll deductions at their maximums, under the exact calculation method:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>New York taxable pay: ${N($(a75.brut))} &minus; ${N($(DED_S))} deduction = ${N($(imp75))}</li>
    <li>Tax at the start of the bracket that begins at ${N($(L4_FROM))}: ${N($$(L4_BASE))}</li>
    <li>Tax on the ${N($(exces75))} above ${N($(L4_FROM))}: ${N($(exces75))} &times; ${N(pct2(L4_RATE))} = ${N($$(hautDeLigne75))}</li>
    <li>New York State income tax withholding: ${N($$(L4_BASE))} + ${N($$(hautDeLigne75))} = ${N($$(a75.etat))}
    a year, ${N($$(mensuel75))} on a monthly paycheck or ${N($$(bimensuel75))} on a biweekly one</li>
    <li>New York Paid Family Leave: ${N($(a75.brut))} &times; ${N(pct(PFL.rate))} = ${N($$(pfl75))}</li>
    <li>New York disability insurance: ${N($(a75.brut))} &times; ${N("0.5%")}, capped at ${N($$(SDI.rate * SDI.wageCap))} = ${N($$(sdi75))}</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
    <li>If you live in New York City, subtract ${N($$(nyc75))} of city withholding: ${N($$(nycNet75))} a year</li>
  </ul>

  <h2>Frequently asked questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Compare with other states</h2>
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. We list the five states that border New York: New Jersey, Pennsylvania, Connecticut, Massachusetts and Vermont.
  Each row leaves out its own local taxes and optional employer deductions, and the New York row includes the paid family leave and disability deductions at their maximums but no New York City or Yonkers tax.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a New York worker on the same salary, ${phraseVoisins}. A worker who lives in one of those states and commutes into New York, or the reverse, is a different case that this calculator does not model: it assumes a New York resident working in New York, outside New York City and Yonkers.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/new-jersey/">New Jersey paycheck calculator</a> &mdash; the neighbor to the south and west.</li>
    <li><a href="/paycheck-calculator/pennsylvania/">Pennsylvania paycheck calculator</a> &mdash; the neighbor to the southwest.</li>
    <li><a href="/paycheck-calculator/connecticut/">Connecticut paycheck calculator</a> &mdash; the neighbor to the east.</li>
    <li><a href="/paycheck-calculator/massachusetts/">Massachusetts paycheck calculator</a> &mdash; the neighbor to the east.</li>
    <li><a href="/paycheck-calculator/vermont/">Vermont paycheck calculator</a> &mdash; the neighbor to the northeast.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where New York ranks on one salary.</li>
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
    the New York State Department of Taxation and Finance&rsquo;s withholding method, and do not include New York City or Yonkers taxes, dependents claimed on Form IT-2104, or optional employer deductions.
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

/* 1. Recoupement independant : la methode II ecrite ici A PARTIR DU TEXTE (pages 14, 17 et 19 de NYS-50-T-NYS), pas du moteur. */
const SS = [[8500, 0, 0, 0.039], [11700, 8500, 332, 0.044], [13900, 11700, 472, 0.0515], [80650, 13900, 586, 0.054], [96800, 80650, 4190, 0.059], [107650, 96800, 5143, 0.0703],
            [157650, 107650, 5906, 0.0753], [215400, 157650, 9673, 0.064], [265400, 215400, 13369, 0.1144], [1077550, 265400, 19091, 0.0735]];
const MM = [[8500, 0, 0, 0.039], [11700, 8500, 332, 0.044], [13900, 11700, 472, 0.0515], [80650, 13900, 586, 0.054], [96800, 80650, 4190, 0.059], [107650, 96800, 5143, 0.0657],
            [157650, 107650, 5855, 0.0707], [211550, 157650, 9388, 0.0801], [323200, 211550, 13708, 0.064], [373200, 323200, 20854, 0.1349], [1077550, 373200, 27600, 0.0735],
            [2155350, 1077550, 79369, 0.0765]];
const livret = (annuel, marie, allocs) => {
  const net = annuel - (marie ? 7950 : 7400) - allocs * 1000;
  if (net <= 0) return 0;
  const S = marie ? MM : SS;
  for (const [haut, bas, base, taux] of S) if (net < haut) return base + (net - bas) * taux;
  return net * (net < 5000000 ? 0.1045 : net < 25000000 ? 0.111 : 0.117);     // methode III
};
for (const [lib, obtenu, attendu] of [
  ["75 000 $ celibataire", a75.etat, livret(75000, false, 0)], ["75 000 $ marie", j75.etat, livret(75000, true, 0)],
  ["75 000 $ chef de famille", h75.etat, livret(75000, false, 2)], ["30 000 $", a30.etat, livret(30000, false, 0)],
  ["100 000 $", a100.etat, livret(100000, false, 0)], ["150 000 $", a150.etat, livret(150000, false, 0)], ["150 000 $ marie", j150.etat, livret(150000, true, 0)],
  ["250 000 $", a250.etat, livret(250000, false, 0)], ["500 000 $", a500.etat, livret(500000, false, 0)], ["2 000 000 $", a2m.etat, livret(2000000, false, 0)],
  ["1 084 949 $", cliffBas.etat, livret(1084949, false, 0)], ["1 084 950 $", cliffHaut.etat, livret(1084950, false, 0)]
]) if (Math.abs(obtenu - attendu) > 0.001) echec("NY " + lib + " : livret " + attendu + ", moteur " + obtenu);
const fed75 = 7670, fedJ = 4640, fedH = 5748;
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (recalculee a la main le 21/10/2026). */
const attendusProse = [
  [a75.etat, 3485.8, "etat 75 000"], [imp75, 67600, "imposable 75 000"], [exces75, 53700, "67 600 - 13 900"], [hautDeLigne75, 2899.8, "53 700 x 5,4 %"],
  [a75.net, 57751.5, "net 75 000"], [a75.total, 17248.5, "total 75 000"], [pfl75, 324, "PFL 75 000"], [sdi75, 31.2, "SDI 75 000"],
  [j75.etat, 3456.1, "etat marie"], [jImp, 67050, "imposable marie"], [jExces, 53150, "67 050 - 13 900"], [j75.net, 60811.2, "net marie"],
  [h75.etat, 3377.8, "etat chef de famille"], [hImp, 65600, "imposable chef de famille"], [hExces, 51700, "65 600 - 13 900"], [h75.net, 59781.5, "net chef de famille"],
  [hohGain, 108, "2 000 x 5,4 %"],
  [a30.etat, 1055.8, "etat 30 000 : 586 + 8 700 x 5,4 %"], [a50.etat, 2135.8, "etat 50 000 : 586 + 28 700 x 5,4 %"], [a100.etat, 4895.05, "etat 100 000"],
  [a150.etat, 8537.735, "etat 150 000"], [j150.etat, 8287.08, "etat marie 150 000"], [marieCommeCelibataire150, 250.655, "ecart marie traite en celibataire"],
  [a230.etat, 14192.68, "etat 230 000 : 13 369 + 7 200 x 11,44 %"], [a240.etat, 15336.68, "etat 240 000 : 13 369 + 17 200 x 11,44 %"], [ecart230_240, 1144, "10 000 x 11,44 %"],
  [a250.etat, 16480.68, "etat 250 000"], [a500.etat, 35790.2, "etat 500 000"], [a2m.etat, 208226.7, "etat 2 000 000"],
  [cliffBas.etat, 78783.9515, "etat 1 084 949 : 19 091 + 812 149 x 7,35 %"], [cliffHaut.etat, 112603.975, "etat 1 084 950 : 1 077 550 x 10,45 %"], [cliffSaut, 33820.0235, "saut de la methode III"],
  [sansDeduc, 3885.4, "sans deduction : 586 + 61 100 x 5,4 %"], [ecartSansDeduc, 399.6, "7 400 x 5,4 %"],
  [valeurAlloc.bas, 39, "1 000 x 3,9 %"], [valeurAlloc.milieu, 54, "1 000 x 5,4 %"], [valeurAlloc.haut, 73.5, "1 000 x 7,35 %"], [valeurAlloc.max, 117, "1 000 x 11,70 %"],
  [gain401, 243, "gain 401(k) : 4 500 x 5,4 %"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"], [pflMax, 411.9066432, "PFL maximale"],
  [mensuel75, 290.48333, "mensuel"], [bimensuel75, 134.06923, "bimensuel"],
  [nyc75, 2661, "NYC 75 000 : 2 236 + 10 000 x 4,25 %"], [nycTax(30000), 783, "NYC 30 000"], [nycTax(50000), 1613, "NYC 50 000 : 783 + 20 000 x 4,15 %"],
  [nycTax(100000), 3723.5, "NYC 100 000 : 2 236 + 35 000 x 4,25 %"], [nycTax(150000), 5848.5, "NYC 150 000 : 2 236 + 85 000 x 4,25 %"],
  [yonk75, 583.8715, "Yonkers 75 000 : 3 485,80 x 16,75 %"], [yonkersTax(30000), 176.8465, "Yonkers 30 000"], [yonkersTax(50000), 357.7465, "Yonkers 50 000"],
  [nycNet75, 55090.5, "net NYC 75 000"], [yonkNet75, 57167.6285, "net Yonkers 75 000"], [yonkNR75, 375, "Yonkers non-resident 75 000"],
  [nycH25, 1696, "NYC 25 $/h = 52 000 $ : 783 + 22 000 x 4,15 %"]
];
/* 20 $/h = 41 600 $ : 34 200 -> 586 + 20 300 x 5,4 % = 1 682,20 ; 25 $/h = 52 000 $ : 44 600 -> 586 + 30 700 x 5,4 % = 2 243,80 ; 30 $/h = 62 400 $ : 55 000 -> 586 + 41 100 x 5,4 % = 2 805,40. */
attendusProse.push([h20.etat, 1682.2, "etat 20 $/h"], [h25.etat, 2243.8, "etat 25 $/h"], [h30.etat, 2805.4, "etat 30 $/h"]);
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(IT.standardDeduction.single === 7400 && IT.standardDeduction.marriedJoint === 7950 && IT.personalExemption.headOfHousehold === 2000)) echec("deduction / allocations != 7 400 / 7 950 / 2 000");
if (!(BS.length === 13 && BM.length === 15 && BS[3].from === 13900 && BS[3].base === 586 && BS[3].rate === 0.054)) echec("bareme != celui du livret");
if (!(PFL.rate === 0.00432 && Math.abs(PFL.wageCap - 95348.76) < 1e-6 && SDI.rate === 0.005 && SDI.wageCap === 6240)) echec("PFL / SDI != 0,432 % jusqu'a 95 348,76 $ ; 0,5 % jusqu'a 6 240 $");
for (const k of COMPARE.slice(1)) if (!R.states[k]) echec("voisin absent du moteur : " + k);
if (a75.programmes.length !== 2 || a75.paidLeave !== 0 || a75.waCares !== 0) echec("New York doit avoir deux programmes salaries (PFL, SDI)");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 2500) echec(motsProse + " mots hors tableaux, sous le plancher de 2 500");
if ((html.match(/<h3/g) || []).length < 30) echec("moins de 30 H3");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
/* Le bareme NYC ecrit ici == celui que verif-retenue-ny.js a lu dans le livret de la Ville. */
const nycLu = JSON.parse(fs.readFileSync(path.join(RACINE, ".tooling", "sources", "new-york-method2-formulas.json"), "utf8"))["NYS-50-T-NYC pages 25 et 26"]["25/annual"]
  .filter(r => !(r[1] === "2" && r[2] === "OVER")).map(r => [Number(String(r[3]).replace(/[$,]/g, "")), Number(String(r[5]).replace(/[$,]/g, "")), Number(r[4])]);
if (JSON.stringify(nycLu) !== JSON.stringify(NYC)) echec("le bareme NYC de la page != celui du livret de la Ville : " + JSON.stringify(nycLu));
console.log("recoupements du livret (methode II ecrite a la main, 75 000 $ celibataire, marie et chef de famille, methode III, bareme NYC lu dans le livret de la Ville) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
