/* Construit /paycheck-calculator/south-carolina/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * South Carolina est le 47e Etat publie. MECANISME NOUVEAU au moteur : `percentDeduction` (deduction standard = 10 % du salaire, plafonnee a
 * 7 500 $, en plus de l'allocation de 5 000 $ par allocation du SC W-4). Ce que la Caroline du Sud a de propre, et que la page DIT :
 *
 *   1. UNE FORMULE A DEUX DEDUCTIONS : l'allocation (5 000 $ chacune) ET une deduction standard de 10 % du salaire plafonnee a 7 500 $ ;
 *      les deux disparaissent si l'on declare ZERO allocation (WH-1603F 2026).
 *   2. UN SEUL BAREME POUR TOUS LES STATUTS : 0 % jusqu'a 3 640 $, 3 % jusqu'a 18 230 $, 6 % au-dela. Seul le nombre d'allocations change
 *      (SC W-4, feuille « Personal Allowances Worksheet » : 2 pour un celibataire, 3 pour un couple ou un chef de famille a un seul emploi).
 *   3. LE PLAFOND ATTEINT A 75 000 $ : 10 % de 75 000 $ = 7 500 $. Au-dela, la deduction standard ne grandit plus.
 *   4. L'ACT 110 DE 2026 : la declaration de l'annee 2026 est a 1,99 % / 5,21 % (Information Letter #26-20, 31/08/2026), mais le SCDOR n'a pas
 *      publie de formule de retenue revisee au 20/10/2026 (WH-1603F : Rev. 11/4/25 ; WH-1603 : Rev. 10/30/25). La page chiffre la formule
 *      PUBLIEE, DIT que l'impot de la declaration suit d'autres taux, et ne chiffre PAS la declaration.
 *   5. CHOMAGE : a la charge de l'employeur (S.C. Code § 41-31-310). AUCUNE TAXE LOCALE TROUVEE. Aucun programme salarie.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - « South Carolina has no local income tax » / « no state disability insurance » : seulement « we found no » ;
 *   - le montant de l'impot de la declaration 2026 : il depend de l'AGI, de la SCIAD et de credits que le calculateur ne connait pas ;
 *   - « withholding will fall » ou « you will get a refund » : le SCDOR dit seulement qu'il « will consult » pour ajuster les tables ;
 *   - « a head of household files the same way » : la formule est la meme pour tous les statuts, seul le nombre d'allocations change.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-south-carolina.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "south-carolina";
const NOM = "South Carolina";
const URL = "https://statelinecalc.com/paycheck-calculator/south-carolina/";
const AUJOURD_HUI = "2026-10-20";
const LISIBLE = "October 20, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const SCD = R.states[CLE];
const IT = SCD.incomeTax;
const AL = IT.standardDeduction;                       // 10 000 / 15 000 / 15 000 : allocations annuelles (2 / 3 / 3 x 5 000)
const PD = IT.percentDeduction;                        // 10 % du salaire, plafond 7 500 $
const BS = IT.brackets.single;                         // 0 / 3 / 6 % (meme bareme pour tous les statuts)
const fedDed = R.federal.standardDeduction;
const UNE = 5000;                                      // une allocation
const [S1, S2] = [BS[0][0], BS[1][0]];                 // 3 640 ; 18 230
const [T1, T2] = [BS[1][1], BS[2][1]];                 // 3 % ; 6 %
const BASE2 = progressiveTax(S2, BS);                  // 437,70 : impot en haut de la tranche a 3 %
const PLAFOND_AU = PD.cap / PD.rate;                   // 75 000 $ : salaire ou la deduction standard atteint son plafond

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

/* La formule du formulaire, ecrite ici une seconde fois pour les cas hors statut du site (zero allocation, une seule, etc.). */
const imposable = (g, nb) => Math.max(0, g - nb * UNE - (nb > 0 ? Math.min(PD.cap, PD.rate * g) : 0));
const retenue = (g, nb) => progressiveTax(imposable(g, nb), BS);

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a30 = calcul(CLE, 30000);
const a250 = calcul(CLE, 250000);
const a17 = calcul(CLE, 17000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const deducStd75 = Math.min(PD.cap, PD.rate * 75000);                     // 7 500
const imp75 = 75000 - AL.single - deducStd75;                             // 57 500
const dansT2 = S2 - S1;                                                   // 14 590 imposes a 3 %
const tranche1 = dansT2 * T1;                                             // 437,70
const auDessus = imp75 - S2;                                              // 39 270 imposes a 6 %
const haut75 = auDessus * T2;                                             // 2 356,20
const jImp = 75000 - AL.marriedJoint - deducStd75;                        // 52 500
const jAuDessus = jImp - S2;                                              // 34 270
/* Autres nombres d'allocations, a 75 000 $ : meme formule, meme bareme. */
const zero75 = retenue(75000, 0);                                         // aucune allocation, aucune deduction standard : 3 843,90
const une75 = retenue(75000, 1);                                          // 3 093,90
const deux75 = retenue(75000, 2);                                         // 2 793,90
const trois75 = retenue(75000, 3);                                        // 2 493,90
const ecartZero = zero75 - a75.etat;                                      // 1 050,00
const ecartUne = une75 - a75.etat;                                        // 300,00
const jTravaille = retenue(75000, 2);                                     // couple dont le conjoint travaille : A + B = 2 allocations
const ecartConjoint = jTravaille - j75.etat;                              // 300,00
/* Ce que vaut une allocation de 5 000 $ selon l'echelon. */
const valeurAlloc = { bas: UNE * T1, haut: UNE * T2 };                    // 150 ; 300
/* Erreurs typiques. */
const sansDeducStd = progressiveTax(75000 - AL.single, BS);              // allocations seules : 3 243,90
const ecartSansDeducStd = sansDeducStd - a75.etat;                        // 450,00
const tauxUnique = imp75 * T2;                                            // tout au taux de 6 %, sans soustraire 656,10 : 3 450
const ecartTauxUnique = tauxUnique - a75.etat;                            // 656,10
const plafond250 = Math.min(PD.cap, PD.rate * 250000);                    // 7 500, pas 25 000
const sansPlafond250 = 250000 - AL.single - PD.rate * 250000;
const ecartPlafond250 = a250.etat - progressiveTax(sansPlafond250, BS);   // 17 500 de deduction en trop x 6 % = 1 050
/* Paies mensuelle et toutes les deux semaines. */
const mensuel75 = a75.etat / 12;
const bimensuel75 = a75.etat / 26;
/* Seuils de salaire annuel (sous le plafond : paie - allocation - 10 % de la paie = seuil de la table). */
const seuilPaie = (alloc, s) => (alloc + s) / (1 - PD.rate);
const PAIE = {
  s: [seuilPaie(AL.single, S1), seuilPaie(AL.single, S2)],
  m: [seuilPaie(AL.marriedJoint, S1), seuilPaie(AL.marriedJoint, S2)]
};

/* Voisins : North Carolina et Georgia sont publies. */
const REF = 75000;
const COMPARE = [CLE, "georgia", "north-carolina"];
const NOMS = { [CLE]: "South Carolina", georgia: "Georgia", "north-carolina": "North Carolina" };
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
const phraseVoisins = plusMoins("georgia") + " and " + plusMoins("north-carolina");

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des echelons du bareme. */
const ECHELONS = [
  ["0%", "First " + $(S1), $(0)],
  [pct(T1), $(S1) + " to " + $(S2), $$(progressiveTax(S2, BS))],
  [pct(T2), "Over " + $(S2), "&mdash;"]
];
const LIGNES_BAREME = ECHELONS.map(([taux, tr, b]) => "        <tr><th scope=\"row\">" + taux + "</th><td>" + tr +
  "</td><td class=\"num\">" + b + "</td></tr>").join("\n");

/* Le tableau des cases du SC W-4. */
const LIGNES_STATUT = [
  ["Lines A and D: yourself, and you are single with only one job", "Single", "2 allowances", $(AL.single), $(PAIE.s[0]), $(PAIE.s[1])],
  ["Lines A, B and D: yourself, you file jointly, and you have only one job and your spouse does not work", "Married filing jointly", "3 allowances", $(AL.marriedJoint), $(PAIE.m[0]), $(PAIE.m[1])],
  ["Lines A, C and D: yourself, you file as head of household, and you have only one job (our reading: an unmarried head of household counts as &ldquo;single&rdquo; on line D)", "Head of household", "3 allowances", $(AL.headOfHousehold), $(PAIE.m[0]), $(PAIE.m[1])]
].map(([lib, site, nb, a, z, h]) => "        <tr><th scope=\"row\">" + lib + "</th><td>" + site + "</td><td>" + nb + "</td><td class=\"num\">" + a +
  "</td><td class=\"num\">" + z + "</td><td class=\"num\">" + h + "</td></tr>").join("\n");

/* Le tableau des constantes par periode : valeurs IMPRIMEES dans la formule (WH-1603F), controlees contre annuel / N. */
const IMPRIME = [
  ["Weekly", 52, 96.15, 144.23, 8.42],
  ["Every two weeks", 26, 192.31, 288.46, 16.83],
  ["Twice a month", 24, 208.33, 312.50, 18.24],
  ["Monthly", 12, 416.67, 625.00, 36.48],
  ["Yearly", 1, 5000.00, 7500.00, 437.70]
];
const LIGNES_PERIODES = IMPRIME.map(([lib, n, a, c, d]) =>
  "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + n + "</td><td class=\"num\">" + $$(a) +
  "</td><td class=\"num\">" + $$(c) + "</td><td class=\"num\">" + $$(d) + "</td></tr>").join("\n");

/* Le tableau de la deduction standard selon le salaire. */
const LIGNES_DEDUC = [20000, 40000, 60000, 75000, 100000, 250000].map(g => {
  const d = Math.min(PD.cap, PD.rate * g);
  return "        <tr><th scope=\"row\">" + $(g) + "</th><td class=\"num\">" + $(PD.rate * g) + "</td><td class=\"num\">" + $(d) + "</td><td>" +
    (PD.rate * g >= PD.cap ? "capped" : "10% of pay") + "</td></tr>";
}).join("\n");

/* Le recoupement avec les grilles imprimees : le script de verification est LANCE ici, ses chiffres sont repris tels quels. */
let verifSortie = "";
try {
  verifSortie = execFileSync(process.execPath, [path.join(RACINE, ".tooling", "test", "verif-retenue-sc.js")], { encoding: "utf8" });
} catch (e) { console.error(String(e.stdout || e)); console.error("ARRET : verif-retenue-sc.js echoue"); process.exit(2); }
const mv = verifSortie.match(/^(\d+) seuils et montants imprimes recoupes ; (\d+) cellules des grilles par tranches de salaire \((\d+) lignes, 5 tables\) : (\d+) reproduites exactement par la formule independante, (\d+) ecart\(s\).*: OK/m);
if (!mv) { console.error(verifSortie); console.error("ARRET : sortie de verif-retenue-sc.js illisible"); process.exit(2); }
const [, V_SEUILS, V_CELLULES, V_LIGNES, V_EXACT, V_ECART] = mv;
if (V_ECART !== "0" || V_EXACT !== V_CELLULES) { console.error("ARRET : la formule ne reproduit pas toute la grille imprimee"); process.exit(2); }
const virgule = s => Number(s).toLocaleString("en-US");

/* L'exemple imprime de la formule : 750 $ par semaine, 3 allocations -> 549,90 $ par an -> 10,58 $ ; la grille imprimee donne 11 $. */
const TAB = require("../sources/south-carolina-wh1603-tables.json");
const ligne750 = TAB.lignes.WEEKLY.find(l => l[0] <= 750 && 750 < l[1]);
const imprime750 = ligne750[2 + 3];
const ex = { brut: 750 * 52, alloc: 3 * UNE, std: Math.min(PD.cap, PD.rate * 750 * 52) };
ex.imp = ex.brut - ex.alloc - ex.std;
ex.annuel = progressiveTax(ex.imp, BS);
ex.hebdo = ex.annuel / 52;

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the South Carolina income tax withholding rate?",
   "South Carolina&rsquo;s withholding formula has a " + N("0%") + " step and then two rates, " + N(pct(T1)) + " and " + N(pct(T2)) + ". Nothing is withheld on the first " + $(S1) +
   " of what is left after the deductions, " + N(pct(T1)) + " is withheld on the next " + $(dansT2) + ", and " + N(pct(T2)) + " on everything above " + $(S2) +
   ". &ldquo;What is left&rdquo; means your yearly pay minus " + $(UNE) + " for each allowance on your SC W-4, minus a standard deduction of " + N("10%") + " of your pay, up to " + $(PD.cap) +
   ". On " + $(75000) + ", a single filer has " + $$(a75.etat) + " withheld a year."],

  ["How much South Carolina tax is withheld on a $75,000 salary?",
   "For a single filer with two allowances, South Carolina withholds " + $$(a75.etat) + " a year, which is " + $$(mensuel75) + " a month or " + $$(bimensuel75) + " on a biweekly check. " +
   "Taxable pay is " + $(75000) + " minus " + $(AL.single) + " of allowances and a " + $(deducStd75) + " standard deduction, or " + $(imp75) + ". The first " + $(S1) + " of it is not taxed, the next " + $(dansT2) + " produces " + $$(tranche1) +
   ", and the remaining " + $(auDessus) + " is taxed at " + pct(T2) + ". A married filer with three allowances has " + $$(j75.etat) + " withheld, and so does a head of household with three allowances."],

  ["What is take-home pay on a $75,000 salary in South Carolina?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of South Carolina income tax, an effective rate of " + (a75.taux * 100).toFixed(1) + "%. We found no South Carolina city or county income tax in the withholding materials, so there is no local line."],

  ["How much is $20, $25 or $30 an hour after taxes in South Carolina?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "South Carolina income tax withholding, with no retirement contribution."],

  ["What is the South Carolina standard deduction on withholding?",
   "The Department of Revenue&rsquo;s formula takes off " + N("10%") + " of gross wages, up to " + $(PD.cap) + " in total, if you claim one or more allowances. If you claim none, you get no standard deduction. " +
   "The cap is reached at " + $(PLAFOND_AU) + " of pay, so on " + $(75000) + " the deduction is " + $(deducStd75) + ", and on " + $(250000) + " it is still " + $(plafond250) + ". " +
   "This is a withholding rule, not the deduction on your tax return, which is a different amount (see the Act 110 questions below)."],

  ["What is a South Carolina withholding allowance?",
   "It is " + $(UNE) + " that your employer subtracts from your yearly pay before applying the table. The number you claim comes from the worksheet on Form SC W-4: one for yourself, one if you will file as married filing jointly, one if you will file as head of household, one if you are single (or married filing separately) with only one job, or married filing jointly with only one job and a spouse who does not work, and one for each dependent you will claim on your federal return, plus one for each dependent who is under six at the end of the year. " +
   "Your actual South Carolina tax is figured on your return, where the deductions and credits you actually qualify for apply."],

  ["How many allowances do I claim on the South Carolina W-4 if I am married?",
   "On the worksheet, if you are married and file jointly, you get one for yourself (line A), one for filing jointly (line B), and one more (line D) if you have only one job and your spouse does not work, or if your spouse&rsquo;s wages are $1,500 or less. That is three allowances, " + $(AL.marriedJoint) + " in all, and this calculator uses that case for &ldquo;Married filing jointly.&rdquo; " +
   "If both of you work, line D stays empty and you have two allowances. On " + $(75000) + ", that would withhold " + $$(ecartConjoint) + " more South Carolina tax a year than this calculator shows. The form also has a box for &ldquo;Married, but withhold at higher Single rate,&rdquo; which we do not model."],

  ["How does head of household work on the South Carolina W-4?",
   "The worksheet adds one allowance on line C if you will file as head of household. With the one for yourself on line A and the one on line D for a single job, that is three allowances, " + $(AL.headOfHousehold) + " in all. Line D does not mention head of household by name; we read it as covering an unmarried filer with one job, and that is our reading, not a statement from the Department. " +
   "The formula itself does not change with your status: there is one rate table for everyone, and only the number of allowances differs. On " + $(75000) + " that gives " + $$(h75.etat) + " of South Carolina withholding, and take-home pay of " + $(h75.net) + " after the lower federal tax."],

  ["What changed in South Carolina income tax for 2026 under Act 110?",
   "The Governor signed Act 110 of 2026 on March 30, 2026. According to the Department of Revenue&rsquo;s Information Letter #26-20, dated August 31, 2026, it replaces three brackets with two for tax years beginning after 2025: " + N("1.99%") + " of taxable income up to $29,999, and " + N("5.21%") + " times taxable income, then minus $966, from $30,000. " +
   "It also decouples South Carolina from certain federal deductions, including the standard and itemized deductions, so a South Carolina return now starts from federal adjusted gross income, and it creates a new South Carolina Income Adjusted Deduction that shrinks as income rises. These are rules for your return. They are not what your employer uses to withhold from each check."],

  ["Has South Carolina changed its withholding tables for Act 110?",
   "Not as of " + LISIBLE + ", as far as the Department&rsquo;s own pages show. The Information Letter lists &ldquo;Adjusts withholding tables to reflect tax changes&rdquo; among the changes, and says the Department &ldquo;will consult with the Revenue and Fiscal Affairs Office to adjust the income tax withholding tables to reflect the income tax changes.&rdquo; " +
   "The withholding formula and tables on the Department&rsquo;s site still read &ldquo;2026,&rdquo; with revision dates of November 2025 and October 2025, and the formula still prints a top rate of 6.0%. This calculator follows those published documents. If the Department posts an adjusted formula, we will update this page from it."],

  ["Will my South Carolina withholding match my final tax for 2026?",
   "Withholding is an estimate, and for 2026 the two follow different rules. The formula your employer applies uses allowances, a 10% standard deduction and a top rate of 6%. Your return uses the Act 110 rates and a deduction that depends on your income. " +
   "We do not calculate the return, and we cannot say which way the difference will go for you. If you want your withholding to be closer to what you expect to owe, the SC W-4 lets you change your allowances or add an extra amount to withhold from each paycheck on line 6."],

  ["Is there a South Carolina state disability or paid family leave deduction?",
   "We found none that is required. The South Carolina Department of Revenue&rsquo;s withholding formula, tables and Form SC W-4 describe income tax withholding only, and we found no state payroll deduction that an employer must take from your check. " +
   "That is what we read in those documents, not proof that nothing else exists, and your pay stub is the final word. If your employer offers insurance and deducts a premium, it will show on your stub, and this calculator does not include it."],

  ["Who pays South Carolina unemployment insurance?",
   "The employer. Section 41-31-310 of the South Carolina Code of Laws says contributions &ldquo;shall become due and be paid by each employer to the department for the fund&rdquo; and &ldquo;shall not be deducted, in whole or in part, from the wages of the employer&rsquo;s employees.&rdquo; " +
   "So there is no unemployment line to subtract from your pay, and this calculator has none."],

  ["Do South Carolina cities or counties tax my paycheck?",
   "The South Carolina withholding formula, tables and W-4 describe state withholding only, and we found no South Carolina city or county income tax on wages in them. That is not proof that none exists. This calculator adds no local line for South Carolina."],

  ["I live in South Carolina and work in North Carolina or Georgia, or the reverse. Which state withholds?",
   "This calculator assumes you live and work in South Carolina and does not model working across a state line. The formula we read is the one for South Carolina wages. We did not read the rules for people who live in one state and work in another, so we do not state them here. " +
   "North Carolina and Georgia, the two neighbors, have their own calculators: see the <a href=\"/paycheck-calculator/north-carolina/\">North Carolina</a> and <a href=\"/paycheck-calculator/georgia/\">Georgia</a> pages."],

  ["Can I claim exempt from South Carolina withholding?",
   "The Form SC W-4 allows it in two cases. One is that you had a right to a refund of all South Carolina income tax withheld for 2025 because you had no tax liability, and you expect the same for 2026. The other is for a military servicemember, or the spouse of one, who elects to use another state as the state of domicile. " +
   "You write &ldquo;Exempt&rdquo; on line 7, and the exemption expires on December 31, 2026 unless you give your employer a new form. This calculator does not model exemption."],

  ["Does a 401(k) contribution lower my South Carolina withholding?",
   "In this calculator, yes. The formula says &ldquo;gross wages&rdquo; and does not give a separate rule for 401(k) contributions, so we start from pay after a traditional 401(k) contribution, the same choice we make in most states here. That also lowers the 10% standard deduction a little, because it is a share of the lower pay. " +
   "On " + $(75000) + " with 6% going into a 401(k), South Carolina income tax withholding falls by " + $$(gain401) + " a year."],

  ["Why is my South Carolina paycheck different from this calculator?",
   "Common reasons: you claimed a different number of allowances on your SC W-4, such as one for each dependent, or none at all; you asked for extra withholding; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; part of your pay is a bonus; or your employer rounds each paycheck. " +
   "The printed tables show whole dollars, and we found they round up. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."],

  ["How current is the South Carolina formula on this page?",
   "It comes from the Department of Revenue&rsquo;s 2026 withholding formula, form WH-1603F, revision date November 4, 2025, and the 2026 Withholding Tax Tables, WH-1603, revision date October 30, 2025. " +
   "We read both on the Department&rsquo;s own site on " + LISIBLE + ". The SC W-4 we read is the 2026 form, revision date December 5, 2025. The Department&rsquo;s August 31, 2026 Information Letter on Act 110 says the withholding tables will be adjusted, and we found no adjusted version. If the Department posts new tables, we update this page from them."]
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
const reponse = "South Carolina taxes the pay left after $5,000 for each W-4 allowance and a standard deduction of 10% of pay, up to $7,500, in steps of 0%, 3% and 6%. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year. Act 110 changed the 2026 return rates, but the Department&rsquo;s withholding formula still uses these steps.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>South Carolina (SC) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free South Carolina (SC) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and SC withholding under the state formula.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="South Carolina (SC) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="South Carolina&rsquo;s published withholding formula uses 3% and 6% steps after allowances and a 10% standard deduction. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "South Carolina Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 South Carolina take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and South Carolina income tax withheld under the Department of Revenue formula (a 5,000 dollar allowance for each allowance on Form SC W-4, a standard deduction of 10% of pay up to 7,500 dollars, then 3% and 6%). Local taxes and optional employer deductions are not included."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "South Carolina", "item": "${URL}" }
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
    <li aria-current="page">South Carolina</li>
  </ol>
</nav>

  <h1>South Carolina Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your South Carolina take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and your number of South Carolina allowances.
          For a married filer we assume one job and a spouse who does not work; if yours works, this calculator will show less South Carolina tax than your employer withholds.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your South Carolina income tax withholding too.</span>
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
    <p>The South Carolina Department of Revenue publishes a withholding formula, and this calculator follows it. Your pay is converted to a yearly amount. Two deductions come off: ${N($(UNE))} for each withholding allowance you claim (${N($(AL.single))} for a single filer with two, ${N($(AL.marriedJoint))} for a married or head-of-household filer with three), and a standard deduction of ${N("10%")} of your pay, up to ${N($(PD.cap))}. The rest is taxed through one table with a ${N("0%")} step, then ${N(pct(T1))} and ${N(pct(T2))}, and the yearly result is divided by the number of pay periods. The table is the same for every filing status; only the number of allowances changes.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>South Carolina income tax</strong>: your wages after any 401(k) contribution, minus the allowances for your status and the standard deduction, taxed through the table.</li>
    </ul>
    <p>This calculator has no other South Carolina line. We looked for a state payroll deduction that an employer must take from your check and found none. Unemployment insurance is paid by the employer under the state code, as the Payroll programs section below explains.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    South Carolina, the <strong>Department of Revenue</strong>&rsquo;s withholding formula, withholding tables, Form SC W-4 and Information Letter on Act 110, plus the state&rsquo;s code of laws for the unemployment rule.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How current the source is, and what it does not yet include.</strong> The formula is form WH-1603F, headed &ldquo;2026 withholding tax,&rdquo; with the revision date &ldquo;Rev. 11/4/25.&rdquo; The tables are form WH-1603, &ldquo;Rev. 10/30/25.&rdquo; We read both on the Department&rsquo;s own site on ${LISIBLE}, and the Sources section links to them. In March 2026 the Governor signed Act 110, which lowers the rates on the tax return for 2026, and the Department&rsquo;s Information Letter of August 31, 2026 says it will adjust the withholding tables to match. We found no adjusted formula or tables, so this page uses the ones the Department currently publishes for 2026. The federal figures, Social Security wage base and Medicare thresholds are the 2026 ones.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The Department prints the withholding for hundreds of pay ranges and for 0 to 10 allowances, in wage-bracket tables for daily, weekly, biweekly, twice-a-month and monthly pay. We rebuilt ${N(virgule(V_CELLULES))} of those printed amounts from the formula, using the middle of each pay range, and rounding up to the next dollar as the tables do. ${N(virgule(V_EXACT))} matched exactly, with no exception. We also checked the printed constants for each pay period and the Department&rsquo;s own worked example, a ${N("$750")} weekly paycheck with 3 allowances, which the formula turns into ${N($$(ex.annuel))} a year, or ${N($$(ex.hebdo))} a week. The weekly table prints ${N($(imprime750))} for that paycheck, because it rounds up.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department&rsquo;s method. Your actual South Carolina income tax is figured
    on your return, so what you owe or get back when you file can differ, and for 2026 the return follows the Act 110 rules described below.</p>

    <p>What the calculator deliberately leaves out: dependents on Form SC W-4, a second job or a spouse who works, the &ldquo;higher Single rate&rdquo; box, extra withholding and the &ldquo;Exempt&rdquo; line, bonuses, rounding by your employer, work in another state, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>South Carolina take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 federal rates and the South Carolina withholding formula. The
  SC state tax column is South Carolina income tax withholding; we found no required South Carolina payroll deduction to add.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        South Carolina take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">SC state tax</th>
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

    <h2>South Carolina&rsquo;s two deductions and three steps</h2>
    <p>The Department&rsquo;s formula has three steps, and they apply to what is left of your pay after two deductions, not to your pay itself. For a single filer on ${N($(75000))}, that is ${N($(75000))} &minus; ${N($(AL.single))} of allowances &minus; ${N($(deducStd75))} of standard deduction = ${N($(imp75))}.
    The first ${N($(S1))} of it is not taxed, the next ${N($(dansT2))} is taxed at ${N(pct(T1))}, and the rest, ${N($(auDessus))}, is taxed at ${N(pct(T2))}. The ${N(pct(T2))} step starts above ${N($(S2))} of taxable pay, which for a single filer is about ${N($(PAIE.s[1]))} of yearly pay.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        South Carolina withholding table, applied to pay after the allowances and the standard deduction
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Taxable pay (every filing status)</th>
          <th scope="col">Tax at the top of the step</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_BAREME}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The Department prints this table two ways, and they give the same answer. The subtraction method says to tax the whole amount at ${N(pct(T1))} and subtract ${N("$109.20")} between ${N($(S1))} and ${N($(S2))}, and to tax it at ${N(pct(T2))} and subtract ${N("$656.10")} above ${N($(S2))}. The addition method says to subtract ${N($(S2))}, multiply by ${N(pct(T2))} and add ${N($$(BASE2))}. This page uses the second form because the ${N($$(BASE2))} is the tax on the whole ${N(pct(T1))} step: ${N($(dansT2))} &times; ${N(pct(T1))}.</p>

    <h3>How the standard deduction grows with pay, then stops</h3>
    <p>The standard deduction is ${N("10%")} of your pay until it reaches ${N($(PD.cap))}, which happens at ${N($(PLAFOND_AU))} of yearly pay. Beyond that it stays flat. Here is how it looks at a few salaries.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        South Carolina standard deduction on withholding, by yearly pay
      </caption>
      <thead>
        <tr>
          <th scope="col">Yearly pay</th>
          <th scope="col">10% of pay</th>
          <th scope="col">Deduction used</th>
          <th scope="col">Why</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_DEDUC}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <h3>The same formula for each pay period</h3>
    <p>The Department prints the same constants for each pay period: the allowance, the cap on the standard deduction and the tax on the whole ${N(pct(T1))} step, each divided by the number of pay periods. The employer applies them to the pay for that check. The table below shows them as the formula prints them. The Department also prints a daily table.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Constants by pay period, as printed in the formula
      </caption>
      <thead>
        <tr>
          <th scope="col">Pay period</th>
          <th scope="col">Periods a year</th>
          <th scope="col">One allowance</th>
          <th scope="col">Cap on the standard deduction</th>
          <th scope="col">Tax on the whole 3% step</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_PERIODES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>The withholding allowance: what changes with your South Carolina W-4</h2>
    <p>The Department&rsquo;s method uses allowances, and Form SC W-4 is how you tell your employer how many to apply. The form says that for regular wages, withholding must be based on the allowances you claimed and &ldquo;may not be a flat amount or percentage of wages.&rdquo; Each allowance is worth ${N($(UNE))} a year in the formula. This is how the calculator maps its three choices.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        South Carolina withholding allowances by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Form SC W-4 worksheet</th>
          <th scope="col">Used by this calculator for</th>
          <th scope="col">Allowances</th>
          <th scope="col">Yearly allowances</th>
          <th scope="col">Pay at which tax starts</th>
          <th scope="col">Pay at which ${pct(T2)} starts</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The allowances come off your pay before the table, so each extra ${N($(1000))} of allowance is worth ${N($$(1000 * T2))} a year to anyone in the ${N(pct(T2))} step. If both spouses work, line D of the worksheet stays empty for the one who would have used it, so each has fewer allowances and more tax is withheld. The two columns on the right assume the standard deduction is still below its cap, which is true under ${N($(PLAFOND_AU))} of pay.</p>

    <h2>Act 110 of 2026: new rates on the return, and where withholding stands</h2>
    <p>South Carolina changed its individual income tax in 2026, and the change has not reached the withholding formula. This part explains what changed, what the Department says about withholding, and what this calculator does with the gap.</p>

    <h3>What changed on the tax return</h3>
    <p>The Governor signed Act 110 of 2026 on March 30, 2026. According to the Department&rsquo;s Information Letter #26-20, dated August 31, 2026, the three brackets are replaced by two for tax years beginning after 2025: ${N("1.99%")} of taxable income from ${N("$0")} to ${N("$29,999")}, and ${N("5.21%")} times taxable income, then minus ${N("$966")}, from ${N("$30,000")} and up. The taxable-income amounts in the brackets are adjusted each year using the Chained Consumer Price Index. Beginning with the 2027 tax year, the top rate of ${N("5.21%")} can fall further if the Board of Economic Advisors projects enough revenue growth.</p>

    <h3>The new deduction on the return, and why it does not touch withholding</h3>
    <p>South Carolina no longer follows the federal standard or itemized deductions. A South Carolina return now starts from federal adjusted gross income, and a new South Carolina Income Adjusted Deduction applies instead: ${N("$15,000")} for single filers and married filers filing separately, ${N("$22,500")} for head of household and ${N("$30,000")} for married filing jointly, reduced as adjusted gross income rises and gone at high incomes. That deduction depends on your whole-year income, which an employer cannot know when it prepares one paycheck. The withholding formula does not use it. It uses allowances and a ${N("10%")} standard deduction instead.</p>

    <h3>What the Department says about withholding</h3>
    <p>The Information Letter lists &ldquo;Adjusts withholding tables to reflect tax changes&rdquo; among the changes, and its Withholding Tables section says: &ldquo;The SCDOR will consult with the Revenue and Fiscal Affairs Office to adjust the income tax withholding tables to reflect the income tax changes. Adjustments to withholding tables must be made in accordance with fiscal responsibility.&rdquo; It gives no date. The formula (WH-1603F) and the tables (WH-1603) the Department posts for 2026 carry revision dates of November 2025 and October 2025, and the formula still prints a ${N("6.0%")} top rate.</p>

    <h3>What this calculator does about it</h3>
    <p>It follows the published formula, because it is the formula the Department currently publishes for 2026, and it does not calculate your tax return. We do not guess what an adjusted formula would give: any figure we wrote would be ours, not the Department&rsquo;s. When the Department posts an adjusted formula or tables, we will update the page from them, and the take-home figures above will change.</p>

    <h3>What you can do if you want your withholding to change now</h3>
    <p>The Form SC W-4 lets you change the number of allowances you claim, and line 6 lets you ask your employer to withhold an additional amount from each paycheck. The form also says to consider filling out a new one each year and when your situation changes. Whether the final amount you owe will be higher or lower than what is withheld depends on your own return, which this calculator does not model.</p>

    <h2>If you cross a state line: South Carolina and its neighbors</h2>
    <p>South Carolina borders North Carolina and Georgia, and some people live on one side of a state line and work on the other. This calculator models none of that. It assumes you live and work in South Carolina, and the formula it uses is the one the Department publishes for South Carolina wages.</p>

    <h3>North Carolina and Georgia</h3>
    <p>We publish a calculator for <a href="/paycheck-calculator/north-carolina/">North Carolina</a> and one for <a href="/paycheck-calculator/georgia/">Georgia</a>. We did not read the rules that apply to workers who live in one of these states and work in another, so we do not describe them here. If you are in that position, your employer&rsquo;s payroll provider is the place to ask which state withholds from your check.</p>

    <h2>Payroll programs: what is, and is not, taken from your check</h2>

    <h3>Unemployment insurance is paid by the employer</h3>
    <p>Section 41-31-310 of the South Carolina Code of Laws says contributions &ldquo;shall become due and be paid by each employer to the department for the fund&rdquo; and &ldquo;shall not be deducted, in whole or in part, from the wages of the employer&rsquo;s employees.&rdquo; Nothing for unemployment insurance comes off your check, and this calculator has no such line.</p>

    <h3>We found no state disability or paid leave deduction</h3>
    <p>The Department&rsquo;s withholding formula, tables and Form SC W-4 describe income tax only. We found no South Carolina state disability or paid family leave deduction that every employee must pay, and this calculator includes none. If your employer offers insurance and deducts a premium, it will appear on your stub.</p>

    <h3>We found no local income tax on wages</h3>
    <p>The formula, the tables and the W-4 describe state withholding only. We found no South Carolina city or county income tax on wages in them, which is not proof that none exists. This calculator adds no local line for South Carolina.</p>

    <h2>South Carolina hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In South Carolina your hours also matter because of the deductions: a single filer earning about ${N($(PAIE.s[0]))} or less a year has no South Carolina tax withheld.</p>

    <h3>What is $20 an hour after taxes in South Carolina?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and South Carolina income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. South Carolina&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in South Carolina?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. South Carolina income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. We did not read a separate South Carolina rule for bonuses, so we do not describe one: ask your employer how it withholds on a bonus.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>South Carolina take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year).</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        South Carolina take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in South Carolina</h2>

  <h3>The first ${$(S1)} of what is left is not taxed</h3>
  <p>The table starts with a ${N("0%")} step. With ${N($(AL.single))} of allowances and the ${N("10%")} standard deduction, a single filer&rsquo;s yearly pay has to pass about ${N($(PAIE.s[0]))} before South Carolina withholds anything. At ${N($(17000))}, South Carolina withholds ${N($$(a17.etat))}; at ${N($(30000))}, it withholds ${N($$(a30.etat))} a year.</p>

  <h3>The 6% step starts at about ${$(PAIE.s[1])} of pay</h3>
  <p>The ${N(pct(T1))} step covers ${N($(dansT2))} of taxable pay and produces ${N($$(BASE2))} of tax. Above ${N($(S2))} of taxable pay, every dollar costs ${N(pct(T2))}. For a single filer, that starts at about ${N($(PAIE.s[1]))} of yearly pay; for a married or head-of-household filer with three allowances, at about ${N($(PAIE.m[1]))}.</p>

  <h3>The standard deduction stops growing at ${$(PLAFOND_AU)}</h3>
  <p>Up to ${N($(PLAFOND_AU))} of pay, the standard deduction is a tenth of it. After that it stays at ${N($(PD.cap))}. On ${N($(250000))} of pay, taxable pay is ${N($(250000))} &minus; ${N($(AL.single))} &minus; ${N($(plafond250))} = ${N($(250000 - AL.single - plafond250))}, and South Carolina withholds ${N($$(a250.etat))}. Everything above ${N($(PLAFOND_AU))} of pay is taxed at ${N(pct(T2))}, with no further deduction.</p>

  <h3>The married and head-of-household filer gets one more allowance</h3>
  <p>The table is the same for every filing status. A married filer with one job and a spouse who does not work, or a head of household with one job (our reading of line D, explained below), claims three allowances instead of two, so ${N($(AL.marriedJoint))} comes off instead of ${N($(AL.single))}. On ${N("$75,000")} that is why South Carolina withholds ${N($$(j75.etat))} from either of them and ${N($$(a75.etat))} from a single filer. Taxable pay for the married filer is ${N($(jImp))}, of which ${N($(jAuDessus))} is in the ${N(pct(T2))} step.</p>

  <h3>Head of household uses the same table as everyone else</h3>
  <p>The worksheet gives a head of household one allowance on line C, and the formula does not change. Line D, the allowance for having one job, does not name head of household; we count an unmarried head of household as &ldquo;single&rdquo; there, which is our reading of the form. On ${N("$75,000")}, taxable pay is ${N($(jImp))} and South Carolina withholds ${N($$(h75.etat))}. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>Each allowance is worth up to ${$$(valeurAlloc.haut)} a year</h3>
  <p>Each dependent you claim on the worksheet adds an allowance of ${N($(UNE))}, and each dependent under six adds one more. In the ${N(pct(T2))} step, one allowance lowers yearly withholding by ${N($$(valeurAlloc.haut))}; in the ${N(pct(T1))} step it is ${N($$(valeurAlloc.bas))}. This calculator does not ask for dependents, so a worker with children who claims them on the SC W-4 will see less South Carolina tax withheld than the figure shown. The form says that the number of dependents on your South Carolina return must equal the number on your federal return.</p>

  <h3>Claiming zero allowances removes both deductions</h3>
  <p>The formula says the allowance is ${N("$0")} if zero allowances are claimed, and so is the standard deduction. On ${N("$75,000")}, that means taxing the whole ${N($(75000))}, and South Carolina would withhold ${N($$(zero75))} instead of ${N($$(a75.etat))}, which is ${N($$(ecartZero))} more. With just one allowance, the formula gives ${N($$(une75))}.</p>

  <h3>With two jobs or a working spouse, the allowances go where you earn the most</h3>
  <p>The form says that if you have more than one job, or are married filing jointly and your spouse also works, you may want to claim allowances on the SC W-4 for the highest-paying job only, and add extra withholding on line 6. This calculator treats your pay as your only income, so it cannot show the effect. Line D of the worksheet, one allowance for having only one job, is what changes: it drops out if your spouse&rsquo;s wages, your second job&rsquo;s wages, or the total of both, are more than ${N("$1,500")}.</p>

  <h3>The printed tables round up to the next dollar</h3>
  <p>Every figure in the Department&rsquo;s wage-bracket tables is a whole dollar, and we found that each one is the formula&rsquo;s result for the middle of the pay range, rounded up. For ${N("$750")} a week and 3 allowances the formula gives ${N($$(ex.hebdo))}, and the table prints ${N($(imprime750))}. The calculator above does not round, so it can differ from a printed table by about a dollar a paycheck.</p>

  <h3>Your 401(k) lowers your South Carolina taxable wages in this calculator</h3>
  <p>The formula says &ldquo;gross wages&rdquo; and gives no separate rule for 401(k) contributions. This calculator therefore starts from pay after a traditional 401(k) contribution, as it does in most states on this site, and takes the ${N("10%")} standard deduction from that lower pay. On ${N("$75,000")} with 6% going in, South Carolina income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the standard deduction</h3>
  <p>Subtracting only the allowances and applying the table to ${N($(75000 - AL.single))} overstates South Carolina withholding by ${N($$(ecartSansDeducStd))}: ${N($$(sansDeducStd))} instead of ${N($$(a75.etat))}. The ${N("10%")} standard deduction is part of the formula for anyone who claims at least one allowance.</p>

  <h3>Taxing everything at 6%</h3>
  <p>The ${N(pct(T2))} rate applies in full only to the part of taxable pay above ${N($(S2))}, and the formula subtracts ${N("$656.10")} to account for the lower steps. Applying ${N(pct(T2))} to all of ${N($(imp75))} gives ${N($$(tauxUnique))}, which overstates withholding by ${N($$(ecartTauxUnique))}.</p>

  <h3>Letting the standard deduction keep growing</h3>
  <p>It stops at ${N($(PD.cap))}. On ${N($(250000))}, taking ${N("10%")} instead, ${N($(PD.rate * 250000))}, would remove ${N($(PD.rate * 250000 - PD.cap))} too much from taxable pay and understate withholding by ${N($$(ecartPlafond250))}.</p>

  <h3>Claiming the extra allowance when your spouse works</h3>
  <p>Line D of the SC W-4 worksheet is for a spouse who does not work, or whose wages are ${N("$1,500")} or less. If both of you work and one of you claims it anyway, one allowance too many comes off. On ${N("$75,000")} that lowers withholding from ${N($$(jTravaille))} to ${N($$(j75.etat))}, which is ${N($$(ecartConjoint))} too little withheld over a year. The shortfall can show up as a balance due when you file.</p>

  <h3>Applying the Act 110 rates to your paycheck</h3>
  <p>The ${N("1.99%")} and ${N("5.21%")} rates are for your tax return. We found no withholding tables published for them, and the Department&rsquo;s formula still has ${N("3%")} and ${N("6%")} steps. Using the new rates on a paycheck would give a figure the Department has not published for employers.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances you claimed on your Form SC W-4 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in South Carolina in 2026, with two allowances and no retirement
  contribution, under the Department&rsquo;s formula:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Allowances: 2 &times; ${N($(UNE))} = ${N($(AL.single))}</li>
    <li>Standard deduction: ${N("10%")} &times; ${N($(a75.brut))} = ${N($(PD.rate * 75000))}, capped at ${N($(PD.cap))}</li>
    <li>South Carolina taxable pay: ${N($(a75.brut))} &minus; ${N($(AL.single))} &minus; ${N($(deducStd75))} = ${N($(imp75))}</li>
    <li>Tax on the first ${N($(S1))}: ${N($(S1))} &times; ${N("0%")} = ${N("$0.00")}</li>
    <li>Tax on the next ${N($(dansT2))}: ${N($(dansT2))} &times; ${N(pct(T1))} = ${N($$(tranche1))}</li>
    <li>Tax on the remaining ${N($(auDessus))}: ${N($(auDessus))} &times; ${N(pct(T2))} = ${N($$(haut75))}</li>
    <li>South Carolina income tax withholding: ${N($$(tranche1))} + ${N($$(haut75))} = ${N($$(a75.etat))}
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. South Carolina borders two states, North Carolina and Georgia, and we have a calculator for both.
  Each row leaves out its own local taxes and optional employer deductions.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a South Carolina worker on the same salary, ${phraseVoisins}. A worker who lives in one of those states and commutes into South Carolina, or the reverse, is a different case that this calculator does not model: it assumes a South Carolina resident working in South Carolina.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/north-carolina/">North Carolina paycheck calculator</a> &mdash; the neighbor to the north.</li>
    <li><a href="/paycheck-calculator/georgia/">Georgia paycheck calculator</a> &mdash; the neighbor to the south and west.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where South Carolina ranks on one salary.</li>
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
    the South Carolina Department of Revenue&rsquo;s published withholding formula, and do not include dependents claimed on Form SC W-4, the Act 110 return rules, local taxes or optional employer deductions.
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

/* 1. Recoupement independant : la formule imprimee (methode par SOUSTRACTION, WH-1603F) ecrite ici A PARTIR DU TEXTE, pas du moteur. */
const guide = (brut, nbAllocations) => {
  const imp = Math.max(0, brut - nbAllocations * 5000 - (nbAllocations > 0 ? Math.min(7500, 0.10 * brut) : 0));
  return imp < 3640 ? 0 : imp < 18230 ? imp * 0.03 - 109.20 : imp * 0.06 - 656.10;
};
const fed75 = 7670, fedJ = 4640, fedH = 5748;
if (Math.abs(guide(75000, 2) - a75.etat) > 0.006) echec("SC 75 000 $ : guide " + guide(75000, 2) + ", moteur " + a75.etat);
if (Math.abs(guide(75000, 3) - j75.etat) > 0.006) echec("SC marie 75 000 $ : guide " + guide(75000, 3) + ", moteur " + j75.etat);
if (Math.abs(guide(75000, 3) - h75.etat) > 0.006) echec("SC chef de famille 75 000 $ : guide " + guide(75000, 3) + ", moteur " + h75.etat);
if (Math.abs(guide(250000, 2) - a250.etat) > 0.006) echec("SC 250 000 $ : guide " + guide(250000, 2) + ", moteur " + a250.etat);
if (Math.abs(guide(750 * 52, 3) - 549.90) > 0.006) echec("l'exemple imprime de la formule (750 $ par semaine, 3 allocations -> 549,90 $) ne se reproduit plus");
if (Math.abs(ex.annuel - 549.90) > 0.006 || Math.abs(ex.hebdo - 10.575) > 0.0001 || imprime750 !== 11) echec("exemple imprime : annuel " + ex.annuel + ", hebdo " + ex.hebdo + ", grille " + imprime750);
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (recalculee a la main le 20/10/2026). */
const attendusProse = [
  [a75.etat, 2793.90, "etat 75 000"], [imp75, 57500, "imposable 75 000"], [dansT2, 14590, "18 230 - 3 640"], [tranche1, 437.70, "14 590 x 3 %"],
  [auDessus, 39270, "imposable au-dessus de 18 230 $"], [haut75, 2356.20, "39 270 x 6 %"],
  [a75.net, 58798.60, "net 75 000"], [a75.total, 16201.40, "total 75 000"],
  [j75.etat, 2493.90, "etat marie"], [jImp, 52500, "imposable marie"], [jAuDessus, 34270, "marie : 52 500 - 18 230"], [j75.net, 62128.60, "net marie"],
  [h75.etat, 2493.90, "etat chef de famille"], [h75.net, 61020.60, "net chef de famille"],
  [a30.etat, 400.80, "etat 30 000"], [a17.etat, 49.80, "etat 17 000"], [a250.etat, 13293.90, "etat 250 000"],
  [zero75, 3843.90, "zero allocation, 75 000"], [ecartZero, 1050, "ecart zero allocation"], [une75, 3093.90, "une allocation, 75 000"], [ecartUne, 300, "ecart une allocation"],
  [deux75, 2793.90, "deux allocations"], [trois75, 2493.90, "trois allocations"], [jTravaille, 2793.90, "marie, conjoint qui travaille (2 allocations)"], [ecartConjoint, 300, "ecart conjoint qui travaille"],
  [sansDeducStd, 3243.90, "allocations seules, sans deduction standard"], [ecartSansDeducStd, 450, "ecart sans deduction standard"],
  [tauxUnique, 3450, "57 500 x 6 %"], [ecartTauxUnique, 656.10, "ecart taux unique"],
  [valeurAlloc.bas, 150, "5 000 x 3 %"], [valeurAlloc.haut, 300, "5 000 x 6 %"],
  [BASE2, 437.70, "base 18 230"], [PLAFOND_AU, 75000, "plafond atteint a 75 000"], [plafond250, 7500, "plafond a 250 000"],
  [gain401, 243.00, "gain 401(k) : 70 500 - 10 000 - 7 050 = 53 450"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [mensuel75, 232.825, "mensuel"], [bimensuel75, 107.45769, "bimensuel"],
  [PAIE.s[0], 13640 / 0.9, "paie au premier palier (celibataire)"], [PAIE.s[1], 28230 / 0.9, "paie au 2e palier (celibataire)"],
  [PAIE.m[0], 18640 / 0.9, "paie au premier palier (3 allocations)"], [PAIE.m[1], 33230 / 0.9, "paie au 2e palier (3 allocations)"]
];
/* 20 $/h = 41 600 $ : 41 600 - 10 000 - 4 160 = 27 440 ; 27 440 x 6 % - 656,10 = 990,30.
   25 $/h = 52 000 $ : 52 000 - 10 000 - 5 200 = 36 800 ; 36 800 x 6 % - 656,10 = 1 551,90.
   30 $/h = 62 400 $ : 62 400 - 10 000 - 6 240 = 46 160 ; 46 160 x 6 % - 656,10 = 2 113,50. */
attendusProse.push([h20.etat, 990.30, "etat 20 $/h"], [h25.etat, 1551.90, "etat 25 $/h"], [h30.etat, 2113.50, "etat 30 $/h"]);
/* Ecart du plafond a 250 000 $ : 10 % x 250 000 = 25 000 au lieu de 7 500 : 17 500 de trop retires, x 6 % = 1 050. */
attendusProse.push([ecartPlafond250, 1050, "ecart sans plafond a 250 000 $"]);
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(AL.single === 10000 && AL.marriedJoint === 15000 && AL.headOfHousehold === 15000)) echec("allocations != 10 000 / 15 000 / 15 000");
if (!(BS.length === 3 && BS[0][0] === 3640 && BS[0][1] === 0 && BS[1][0] === 18230 && BS[1][1] === 0.03 && BS[2][1] === 0.06)) echec("bareme != celui de la formule");
if (!(PD.rate === 0.10 && PD.cap === 7500)) echec("deduction standard != 10 % plafonnee a 7 500 $");
for (const [lib, n, a, c, d] of IMPRIME) {
  if (Math.abs(5000 / n - a) > 0.01) echec("allocation imprimee " + lib + " : " + a + " != 5 000 / " + n);
  if (Math.abs(7500 / n - c) > 0.01) echec("plafond imprime " + lib + " : " + c + " != 7 500 / " + n);
  if (Math.abs(437.70 / n - d) > 0.01) echec("impot de la 1re tranche imprime " + lib + " : " + d + " != 437,70 / " + n);
}
if (calcul(CLE, 15155).etat !== 0 || !(calcul(CLE, 15160).etat > 0)) echec("le seuil d'imposition du celibataire n'est pas a 15 156 $");
for (const k of COMPARE.slice(1)) if (!R.states[k]) echec("voisin absent du moteur : " + k);
if (a75.programmes.length !== 0 || a75.paidLeave !== 0 || a75.waCares !== 0) echec("la Caroline du Sud ne doit avoir aucun programme salarie");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 2500) echec(motsProse + " mots hors tableaux, sous le plancher de 2 500");
if ((html.match(/<h3/g) || []).length < 30) echec("moins de 30 H3");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements de la formule (soustraction imprimee ecrite a la main, 75 000 $ celibataire, marie et chef de famille, exemple imprime) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
