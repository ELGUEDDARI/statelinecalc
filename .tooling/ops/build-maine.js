/* Construit /paycheck-calculator/maine/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Maine est le 48e Etat publie. Il avait ete « reporte, moteur non supporte » (17/09/2026). DIAGNOSTIC du 21/10/2026 : la degressivite dont
 * parlait la note est celle de la deduction standard de la DECLARATION ; la formule de RETENUE (Maine Revenue Services, livret « 2026
 * Withholding Tables for Individual Income Tax », revise en aout 2026) utilise une deduction standard degressive selon le SALAIRE ANNUALISE,
 * que le moteur sait deja exprimer (slidingDeduction, Wisconsin). AUCUN mecanisme nouveau : seulement des donnees. Ce que le Maine a de
 * propre, et que la page DIT :
 *
 *   1. UNE DEDUCTION STANDARD QUI FOND : 12 850 $ (celibataire) / 28 550 $ (marie) jusqu'a 102 250 $ / 204 550 $ de salaire annualise, nulle des
 *      177 250 $ / 354 550 $. Entre les deux, chaque dollar de salaire en plus augmente le revenu imposable de 1,17 $ (celibataire) : la
 *      retenue marginale monte a ~8,38 %.
 *   2. LES ALLOCATIONS DU W-4ME : 5 300 $ chacune, PAS celles du W-4 federal. Le site : 1 / 2 / 2 allocations. Le livret dit lui-meme que la
 *      case « Single or Head of Household » utilise le bareme celibataire : le chef de famille n'est donc PAS une lecture a nous.
 *   3. UN SURCHARGE DE 2 % au-dela de 1 000 000 $ / 1 500 000 $ de revenu annualise (Note 1 du livret) : une tranche de plus (9,15 %).
 *   4. LE CONGE FAMILIAL ET MEDICAL (PFML) : retenue salariale FACULTATIVE jusqu'a 0,5 % (FAQ du Department of Labor, juillet 2026) ; le moteur
 *      applique le MAXIMUM, comme pour le Connecticut, et la page dit que l'employeur decide.
 *   5. LES GRILLES IMPRIMEES NE SUIVENT PAS LA REVISION D'AOUT : reproduites a la cellule pres avec l'ancienne deduction (12 450 / 27 750 $) au haut
 *      de chaque tranche. La page chiffre la methode en pourcentage et le DIT, avec le cas pivot (75 000 $ par semaine).
 *   6. CHOMAGE : a la charge de l'employeur (26 M.R.S. § 1221). AUCUNE TAXE LOCALE TROUVEE.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - « Maine has no local income tax » : seulement « we found no » ;
 *   - « Maine employers must withhold paid leave premiums » : c'est un CHOIX de l'employeur, jusqu'a 0,5 % ;
 *   - « the grids are wrong » : on dit ce qu'on a mesure (reproduction par l'ancienne deduction) et que les deux methodes sont permises ;
 *   - le traitement du 401(k) par la PFML : non lu dans une source -> la page dit qu'on applique la prime au brut ;
 *   - ce qu'un employeur a fait AVANT la revision d'aout : non lu.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-maine.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "maine";
const NOM = "Maine";
const URL = "https://statelinecalc.com/paycheck-calculator/maine/";
const AUJOURD_HUI = "2026-10-21";
const LISIBLE = "October 21, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const MED = R.states[CLE];
const IT = MED.incomeTax;
const SL = IT.slidingDeduction;
const PE = IT.personalExemption;
const PL = MED.employeePrograms[0];                     // PFML : 0,5 % jusqu'a 184 500 $
const BS = IT.brackets.single;
const BM = IT.brackets.marriedJoint;
const fedDed = R.federal.standardDeduction;
const UNE = 5300;                                       // une allocation du W-4ME
const SD_S = SL.single[0].amount, SD_M = SL.marriedJoint[0].amount;          // 12 850 ; 28 550
const [PLEIN_S, NUL_S] = [SL.single[0].upTo, SL.single[1].upTo];             // 102 250 ; 177 250
const [PLEIN_M, NUL_M] = [SL.marriedJoint[0].upTo, SL.marriedJoint[1].upTo]; // 204 550 ; 354 550
const [S1, S2, S3] = [BS[0][0], BS[1][0], BS[2][0]];    // 27 400 ; 64 850 ; 1 000 000
const [M1, M2, M3] = [BM[0][0], BM[1][0], BM[2][0]];    // 54 850 ; 129 750 ; 1 500 000
const [T1, T2, T3, T4] = [BS[0][1], BS[1][1], BS[2][1], BS[3][1]];           // 5,8 ; 6,75 ; 7,15 ; 9,15 %
const BASE = k => progressiveTax(k, BS);
const BASM = k => progressiveTax(k, BM);
/* Deduction standard du livret a un salaire annualise (lue dans les donnees du moteur : meme formule que le livret). */
const sdAt = (segs, w) => {
  for (const s of segs) if (s.upTo === null || w <= s.upTo) return s.amount !== undefined ? s.amount : Math.max(0, s.base - s.rate * (w - s.from));
  return 0;
};
const sdS = w => sdAt(SL.single, w);
const sdM = w => sdAt(SL.marriedJoint, w);
const pente = SD_S / (NUL_S - PLEIN_S);                 // 0,17133 : dollars de deduction perdus par dollar de salaire
const penteM = SD_M / (NUL_M - PLEIN_M);                // 0,19033
const margeS = T3 * (1 + pente);                        // retenue marginale dans la pente, celibataire : 8,38 %
const margeM = T3 * (1 + penteM);                       // 8,51 %

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
const pl = r => r.programmes[0].montant;

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a30 = calcul(CLE, 30000);
const a20k = calcul(CLE, 20000);
const a250 = calcul(CLE, 250000);
const a120 = calcul(CLE, 120000);
const a130 = calcul(CLE, 130000);
const a150 = calcul(CLE, 150000);
const a200 = calcul(CLE, 200000);
const a15m = calcul(CLE, 1500000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const imp75 = 75000 - UNE - SD_S;                                         // 56 850
const dansT1 = S1;                                                        // 27 400 imposes a 5,8 %
const tranche1 = dansT1 * T1;                                             // 1 589,20
const auDessus = imp75 - S1;                                              // 29 450 imposes a 6,75 %
const haut75 = auDessus * T2;                                             // 1 987,875
const jImp = 75000 - 2 * UNE - SD_M;                                      // 35 850
const hImp = 75000 - 2 * UNE - SD_S;                                      // 51 550
const hAuDessus = hImp - S1;                                              // 24 150
/* Seuils de salaire annuel (paie = allocations + deduction standard + seuil de la table), tous sous 102 250 $ / 204 550 $ : deduction pleine. */
const PAIE = {
  s: [UNE + SD_S, UNE + SD_S + S1, UNE + SD_S + S2],
  h: [2 * UNE + SD_S, 2 * UNE + SD_S + S1, 2 * UNE + SD_S + S2],
  m: [2 * UNE + SD_M, 2 * UNE + SD_M + M1, 2 * UNE + SD_M + M2]
};
const surchargeS = S3 + UNE;                                              // 1 005 300 : paie a laquelle le surcharge commence (deduction nulle)
const surchargeM = M3 + 2 * UNE;                                          // 1 510 600
/* Conjoint qui travaille : la ligne B reste vide, UNE allocation, bareme marie. */
const jTravaille = progressiveTax(75000 - UNE - SD_M, BM);                // 2 386,70
const ecartConjoint = jTravaille - j75.etat;                              // 307,40
/* Une allocation en plus : ce qu'elle vaut selon la tranche. */
const valeurAlloc = { bas: UNE * T1, milieu: UNE * T2, haut: UNE * T3 };  // 307,40 ; 357,75 ; 378,95
/* Zero allocation, celibataire. */
const zero75 = progressiveTax(75000 - SD_S, BS);                          // 3 934,825
const ecartZero = zero75 - a75.etat;                                      // 357,75
/* Erreurs typiques. */
const sansDeduc = progressiveTax(75000 - UNE, BS);                        // allocation seule : 4 958,...
const ecartSansDeduc = sansDeduc - a75.etat;
const DEDUC_DECLARATION = 15700;                                          // deduction standard de la declaration (livret, page 1)
const avecDeducDecl = progressiveTax(75000 - UNE - DEDUC_DECLARATION, BS);
const ecartDeducDecl = a75.etat - avecDeducDecl;
const surcharge15 = a15m.etat - progressiveTax(1500000 - UNE, [BS[0], BS[1], [Infinity, T3]]);   // 9 894 : sans le surcharge, 7,15 % au-dela de 64 850 $
const sansPente150 = progressiveTax(150000 - UNE - SD_S, BS);             // en gardant la deduction pleine a 150 000 $
const ecartPente150 = a150.etat - sansPente150;
/* PFML. */
const pfml75 = pl(a75);                                                   // 375
const pflMax = PL.wageCap * PL.rate;                                      // 922,50
const netSansPfml = a75.net + pfml75;
/* Paies mensuelle et toutes les deux semaines. */
const mensuel75 = a75.etat / 12;
const bimensuel75 = a75.etat / 26;

/* Voisins : New Hampshire est le seul Etat voisin ; Massachusetts et Vermont completent la comparaison en Nouvelle-Angleterre. */
const REF = 75000;
const COMPARE = [CLE, "new-hampshire", "massachusetts", "vermont"];
const NOMS = { [CLE]: "Maine", "new-hampshire": "New Hampshire", massachusetts: "Massachusetts", vermont: "Vermont" };
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
const phraseVoisins = plusMoins("new-hampshire") + ", " + plusMoins("massachusetts") + " and " + plusMoins("vermont");

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des deux baremes, echelon par echelon. */
const ECHELONS = [
  [pct2(T1), "First " + $(S1), $$(BASE(S1)), "First " + $(M1), $$(BASM(M1))],
  [pct2(T2), $(S1) + " to " + $(S2), $$(BASE(S2)), $(M1) + " to " + $(M2), $$(BASM(M2))],
  [pct2(T3), $(S2) + " to " + $(S3), $$(BASE(S3)), $(M2) + " to " + $(M3), $$(BASM(M3))],
  [pct2(T4) + " (7.15% plus the 2% surcharge)", "Over " + $(S3), "&mdash;", "Over " + $(M3), "&mdash;"]
];
const LIGNES_BAREMES = ECHELONS.map(([taux, s, bs, m, bm]) => "        <tr><th scope=\"row\">" + taux + "</th><td>" + s + "</td><td class=\"num\">" + bs + "</td><td>" + m +
  "</td><td class=\"num\">" + bm + "</td></tr>").join("\n");

/* La deduction standard de la retenue selon le salaire : celibataire, puis marie. */
const retS = w => calcul(CLE, w, "single").etat;
const retM = w => calcul(CLE, w, "marriedJoint").etat;
const PAS_S = [90000, PLEIN_S, 120000, 140000, 160000, NUL_S, 200000];
const PAS_M = [180000, PLEIN_M, 250000, 300000, 340000, NUL_M, 400000];
const lignePas = (w, sd, ret, al) => "        <tr><th scope=\"row\">" + $(w) + "</th><td class=\"num\">" + $$(sd) + "</td><td class=\"num\">" + $$(w - al * UNE - sd) +
  "</td><td class=\"num\">" + $$(ret) + "</td></tr>";
const LIGNES_PENTE_S = PAS_S.map(w => lignePas(w, sdS(w), retS(w), 1)).join("\n");
const LIGNES_PENTE_M = PAS_M.map(w => lignePas(w, sdM(w), retM(w), 2)).join("\n");

/* Le tableau des cases du W-4ME. */
const LIGNES_STATUT = [
  ["Line A only: no one else can claim you as a dependent", "Single", "1 allowance", $(PE.single), "single", $(PAIE.s[0]), $(PAIE.s[2])],
  ["Lines A and B: you will file jointly (B may be 0 if your spouse works)", "Married filing jointly", "2 allowances", $(PE.marriedJoint), "married", $(PAIE.m[0]), $(PAIE.m[2])],
  ["Lines A and C: you will file as head of household", "Head of household", "2 allowances", $(PE.headOfHousehold), "single", $(PAIE.h[0]), $(PAIE.h[2])]
].map(([lib, site, nb, a, bar, z, h]) => "        <tr><th scope=\"row\">" + lib + "</th><td>" + site + "</td><td>" + nb + "</td><td class=\"num\">" + a +
  "</td><td>" + (bar === "single" ? "Single" : "Married") + "</td><td class=\"num\">" + z + "</td><td class=\"num\">" + h + "</td></tr>").join("\n");

/* Le recoupement avec les grilles imprimees : le script de verification est LANCE ici, ses chiffres sont repris tels quels. */
let verifSortie = "";
try {
  verifSortie = execFileSync(process.execPath, [path.join(RACINE, ".tooling", "test", "verif-retenue-me.js")], { encoding: "utf8" });
} catch (e) { console.error(String(e.stdout || e)); console.error("ARRET : verif-retenue-me.js echoue"); process.exit(2); }
const mv = verifSortie.match(/^(\d+) verifications : .* sur (\d+) cas, (\d+) lignes de grille, (\d+) cellules des grilles imprimees : (\d+) reproduites \((\d+) vides = 0 \$, (\d+) a un bord d'arrondi\), ecart maximal ([\d.]+) \$ : OK/m);
const mp = verifSortie.match(/^cas pivot : .* tranche \[(\d+), (\d+)\[ , 1 allocation, grille ([\d.]+) \$, methode en pourcentage ([\d.]+) \$/m);
if (!mv || !mp) { console.error(verifSortie); console.error("ARRET : sortie de verif-retenue-me.js illisible"); process.exit(2); }
const [, V_TOTAL, V_MOTEUR, V_LIGNES, V_CELLULES, V_EXACT, V_VIDES, V_BORD, V_ECART] = mv;
const [, P_LO, P_HI, P_GRILLE, P_METHODE] = mp.map((x, i) => i ? Number(x) : x);
const virgule = s => Number(s).toLocaleString("en-US");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Maine income tax withholding rate?",
   "Maine&rsquo;s withholding schedule has three rates, " + N(pct2(T1)) + ", " + N(pct2(T2)) + " and " + N(pct2(T3)) + ", plus a 2% surcharge on very high pay. For a single filer, " + N(pct2(T1)) + " is withheld on the first " + $(S1) +
   " of what is left after the allowances and the standard deduction, " + N(pct2(T2)) + " on the next " + $(S2 - S1) + ", and " + N(pct2(T3)) + " above " + $(S2) +
   ". A married filer gets wider steps. &ldquo;What is left&rdquo; means your yearly pay minus " + $(UNE) + " for each allowance on your Form W-4ME and a standard deduction of " + $(SD_S) + " (single) or " + $(SD_M) +
   " (married) that shrinks to zero at higher pay. On " + $(75000) + ", a single filer has " + $$(a75.etat) + " withheld a year."],

  ["How much Maine tax is withheld on a $75,000 salary?",
   "For a single filer with one allowance, Maine withholds " + $$(a75.etat) + " a year, which is " + $$(mensuel75) + " a month or " + $$(bimensuel75) + " on a biweekly check. " +
   "Taxable pay is " + $(75000) + " minus the " + $(UNE) + " allowance and the " + $(SD_S) + " standard deduction, or " + $(imp75) + ". The first " + $(S1) + " of it produces " + $$(tranche1) +
   ", and the remaining " + $(auDessus) + " is taxed at " + pct2(T2) + ". A married filer with two allowances and the married schedule has " + $$(j75.etat) +
   " withheld, and a head of household with two allowances has " + $$(h75.etat) + " withheld."],

  ["What is take-home pay on a $75,000 salary in Maine?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " + $$(a75.etat) +
   " of Maine income tax, and " + $$(pfml75) + " for Maine Paid Family and Medical Leave at its maximum employee share, an effective rate of " + (a75.taux * 100).toFixed(1) + "%. " +
   "If your employer does not take the paid leave deduction, take-home pay is about " + $(netSansPfml) + ". We found no Maine city or county income tax, so there is no local line."],

  ["How much is $20, $25 or $30 an hour after taxes in Maine?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA, " +
   "Maine income tax withholding and the paid leave deduction at its maximum, with no retirement contribution."],

  ["What is a Maine withholding allowance?",
   "It is the amount your employer subtracts from your pay before applying the Maine schedule. Maine Revenue Services&rsquo; booklet says to multiply the number of allowances you claim by " + $(UNE) + ", and the number comes from the Personal Allowances Worksheet on Form W-4ME: one for yourself if no one else can claim you as a dependent, one for your spouse if you will file jointly, one if you will file as head of household, and one for each child or dependent eligible for the federal child tax credit or the credit for other dependents. " +
   "Maine says its allowances are no longer based on the federal Form W-4, so your federal W-4 does not set them. Your actual Maine tax is figured on your return, where the deductions and credits you qualify for apply."],

  ["How many allowances do I claim on the Maine W-4ME if I am married?",
   "Line A gives you one and line B gives you one more for a spouse if you will file jointly, which makes two allowances, " + $(PE.marriedJoint) + " in all, and the married schedule applies. This calculator uses that case for &ldquo;Married filing jointly.&rdquo; " +
   "The form says you may enter 0 on line B if you are married and have a working spouse or more than one job, and that entering 0 may help avoid having too little tax withheld. With one allowance, " + $(75000) + " would have " + $$(ecartConjoint) + " more Maine tax withheld a year than this calculator shows. " +
   "The form also has a box for &ldquo;Married, but withholding at higher single rate,&rdquo; which uses the single schedule and which we do not model."],

  ["How does head of household work on the Maine W-4ME?",
   "The worksheet gives one allowance on line C if you will file as head of household. With the one for yourself on line A, that is two allowances, " + $(PE.headOfHousehold) + " in all. The filing-status box on the form reads &ldquo;Single or Head of Household,&rdquo; and the booklet says an employer uses the single schedule when that box is checked. " +
   "On " + $(75000) + " that gives " + $$(h75.etat) + " of Maine withholding, and take-home pay of " + $(h75.net) + " after the lower federal tax and the paid leave deduction."],

  ["Why does Maine withhold more on each extra dollar above $102,250?",
   "Because the standard deduction used in the withholding formula starts to shrink. It is " + $(SD_S) + " for a single filer up to " + $(PLEIN_S) + " of yearly pay, falls in a straight line, and is " + $(0) + " from " + $(NUL_S) +
   ". Each extra dollar of pay in that range loses about " + (pente * 100).toFixed(1) + " cents of deduction, so about " + $$(1 + pente) + " becomes taxable, and at " + pct2(T3) + " that is a withholding rate of about " + pct2(margeS) + " on the extra dollar. " +
   "For a married filer the same thing happens between " + $(PLEIN_M) + " and " + $(NUL_M) + ". Between " + $(120000) + " and " + $(130000) + " of pay, a single filer&rsquo;s yearly withholding rises by " + $$(a130.etat - a120.etat) + "."],

  ["Is there a Maine paid family and medical leave deduction?",
   "Yes, and it is the one deduction beyond income tax that this calculator includes. The Maine Department of Labor says the joint contribution for employers and employees is 0.5% or 1% of wages for 2025 to 2027, depending on employer size, and that no more than 0.5% can come from the employee. We use " + pct2(PL.rate) + " of your wages up to " + $(PL.wageCap) + ", the Social Security wage base. On " + $(75000) + " that comes to " + $$(pfml75) +
   ". It is withheld after income tax is figured and does not lower your taxable pay. Benefits were scheduled to begin on May 1, 2026."],

  ["Does my employer have to take the paid leave deduction out of my pay?",
   "Not according to the Department of Labor. It says an employer with 15 or more employees pays 1% of wages and may deduct up to half of that from employees, and an employer with fewer than 15 pays 0.5% and may deduct the entire amount. The word is &ldquo;may,&rdquo; and the limit for the employee is 0.5%. " +
   "This calculator assumes the maximum, " + $$(pfml75) + " on " + $(75000) + ", so your real pay could be up to that much higher. Check your pay stub."],

  ["Is there a Maine unemployment tax on employees?",
   "Not in the law we read. Title 26, section 1221 of the Maine Revised Statutes says unemployment contributions are paid by each employer and may not be deducted, in whole or in part, from the wages of the employees. That is why this calculator has no unemployment line."],

  ["Do Maine cities or towns tax my paycheck?",
   "The Maine withholding booklet and Form W-4ME describe state withholding only, and we found no Maine city, town or county income tax on wages in them. That is not proof that none exists. This calculator adds no local line for Maine."],

  ["Does Maine&rsquo;s new surcharge apply to me?",
   "Only at very high pay. The booklet says the tax is increased by a surcharge of 2% on the part of annualized income above " + $(S3) + " for single taxpayers and " + $(M3) + " for married taxpayers, for tax years beginning on or after January 1, 2026. " +
   "For a single filer with one allowance, that starts at about " + $(surchargeS) + " of yearly pay. On " + $(1500000) + ", the surcharge adds " + $$(surcharge15) + " to Maine withholding. Below those amounts it changes nothing."],

  ["I live in New Hampshire and work in Maine. Does Maine withhold?",
   "It depends on how many days you work in Maine. The booklet says Maine-source income of a nonresident may not be subject to withholding if the number of days worked in Maine falls below a threshold set in law, and that if a nonresident employee works in Maine for more than twelve days and earns more than $3,000 during the year, the employer must ordinarily withhold Maine income tax. " +
   "This calculator assumes you live and work in Maine and does not model nonresidents. New Hampshire has its own <a href=\"/paycheck-calculator/new-hampshire/\">calculator</a>."],

  ["Does a 401(k) contribution lower my Maine withholding?",
   "In this calculator, yes for the income tax, not for paid leave. The booklet says to start from total wages and gives no rule for 401(k) contributions, and it says Maine withholding is not reduced by the federal deduction amounts claimed in step 4(b) of the federal W-4. We start from pay after a traditional 401(k) contribution, the same choice we make in most states here, and we apply the paid leave deduction to gross pay because we did not find the Department&rsquo;s rule for deferrals. " +
   "On " + $(75000) + " with 6% going into a 401(k), Maine income tax withholding falls by " + $$(gain401) + " a year."],

  ["How does Maine withhold tax on a bonus?",
   "The booklet says that when supplemental wages such as bonuses, commissions and overtime pay are paid with regular wages, withholding is calculated as if the total were a single payment of wages for the regular payroll period. If they are paid separately, the payer may withhold a flat five percent. " +
   "This calculator does not model bonuses, so ask your employer which method it uses."],

  ["Why is my Maine paycheck different from this calculator?",
   "Common reasons: you claimed a different number of allowances on your W-4ME, such as one for each child; you asked for extra withholding; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; part of your pay is a bonus; your employer takes less, or none, of the paid leave deduction; or your employer uses the printed wage-bracket tables instead of the percentage method. " +
   "The booklet allows both, and its printed tables run a little higher: for " + $(75000) + " paid weekly, the table row for " + $(P_LO) + " to " + $(P_HI) + " shows " + $$(P_GRILLE) + " for one allowance, against " + $$(P_METHODE) + " by the percentage method. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."],

  ["How current is the Maine formula on this page?",
   "It comes from Maine Revenue Services&rsquo; 2026 Withholding Tables for Individual Income Tax, which carries the line &ldquo;Revised: August 2026&rdquo; and says it was revised to reflect the increased Maine standard deduction and the new income tax surcharge. " +
   "We read it on the agency&rsquo;s own site on " + LISIBLE + ". The paid leave rules come from the Department of Labor&rsquo;s frequently asked questions for employers, dated July 2026. If the agency posts new tables, we update this page from them."]
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
const reponse = "Maine withholds 5.8%, 6.75% or 7.15% after a $5,300 allowance and a $12,850 standard deduction that shrinks above $102,250, so between $102,250 and $177,250 of annualized pay the real marginal rate is about 8.38%. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year, after the paid leave deduction at its 0.5% maximum.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/assets/analytics.js" defer></script>
<title>Maine (ME) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Maine (ME) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA, Maine withholding and paid leave. Base rates 5.8% to 7.15%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Maine (ME) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Maine base rates of 5.8% to 7.15% apply after a $5,300 allowance and a $12,850 standard deduction. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Maine Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Maine take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Maine income tax withheld under the Maine Revenue Services percentage method (withholding allowances from Form W-4ME, a standard deduction that phases out as pay rises, then rates of 5.8%, 6.75% and 7.15% plus a 2% surcharge on very high pay) and the Maine Paid Family and Medical Leave deduction at its 0.5% maximum. Local taxes and optional employer deductions are not included."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Maine", "item": "${URL}" }
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
    <li aria-current="page">Maine</li>
  </ol>
</nav>

  <h1>Maine Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Maine take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and your Maine allowances and schedule.
          For a married filer we assume you claim the spouse allowance; if you and your spouse both work and you skip it, your employer will withhold more.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Maine income tax withholding too, but not the paid leave deduction.</span>
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
    <p>Maine Revenue Services publishes a percentage method for income tax withholding, and this calculator follows it. Your pay is converted to a yearly amount. Each withholding allowance takes ${N($(UNE))} off (one for a single filer, two for a married filer or a head of household). A standard deduction comes off too: ${N($(SD_S))} for the single schedule and ${N($(SD_M))} for the married schedule, with the deduction shrinking to zero as pay rises. The rest is taxed at ${N(pct2(T1))}, ${N(pct2(T2))} and ${N(pct2(T3))}, with a 2% surcharge on very high pay, and the yearly result is divided by the number of pay periods.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Maine income tax</strong>: your wages after any 401(k) contribution, minus the Maine allowances and the standard deduction, taxed through the schedule.</li>
      <li><strong>Maine Paid Family and Medical Leave</strong> at ${N(pct2(PL.rate))} of your wages up to ${N($(PL.wageCap))}, the most an employer may take from you. It is optional for the employer, and we explain it below.</li>
    </ul>
    <p>We looked for any other Maine payroll deduction that an employer must take from your check and found none.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Maine, <strong>Maine Revenue Services</strong>&rsquo; withholding tables booklet and Form W-4ME, the <strong>Maine Department of Labor</strong>&rsquo;s paid leave guidance for employers and the Maine Revised Statutes.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How current the source is.</strong> The booklet is titled 2026 Withholding Tables for Individual Income Tax and carries the line &ldquo;Revised: August 2026.&rdquo; Its cover says it was revised to reflect the increased Maine standard deduction amounts and the new income tax surcharge. We read it on the agency&rsquo;s own site on ${LISIBLE}, and the Sources section links to it. The paid leave figures come from the Department of Labor&rsquo;s employer FAQ, dated July 2026. The federal figures, Social Security wage base and Medicare thresholds are the 2026 ones.</p>

    <p><strong>How we checked the formula.</strong> We wrote the booklet&rsquo;s percentage method a second time from its text, separate from the calculator&rsquo;s code, and it reproduces the booklet&rsquo;s three worked examples: ${N("$0")} for a single employee paid ${N("$300")} a week, ${N("$32")} for one paid ${N("$1,000")} a week, and ${N("$256")} for a married employee paid ${N("$4,500")} a week. The calculator&rsquo;s own figures match that second version on ${N(virgule(V_MOTEUR))} pay levels and filing statuses, including both ends of the phase-out and the surcharge threshold. We also rebuilt ${N(virgule(V_CELLULES))} cells of the booklet&rsquo;s printed wage-bracket tables, from ${N("10")} charts with ${N(virgule(Math.round(V_LIGNES / 10)))} pay ranges each. They match, but only under a different standard deduction from the one the booklet gives for the percentage method, and we explain that below.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the agency&rsquo;s method, before the booklet&rsquo;s rounding of each check to the whole dollar. Your actual Maine income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: children and dependents on Form W-4ME, a spouse who works, the &ldquo;higher single rate&rdquo; box, extra withholding and the exemptions on line 6, bonuses, rounding by your employer, work in another state, optional employer deductions, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Maine take-home pay by salary</h2>
  <p class="prose">Single filer with one allowance, no retirement contribution, 2026 federal and Maine rates. The
  ME tax column is Maine income tax withholding plus the Paid Family and Medical Leave deduction at its ${pct2(PL.rate)} maximum (on $75,000: ${$$(a75.etat)} + ${$$(pfml75)}).</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Maine take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">ME tax + paid leave</th>
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

    <h2>Maine withholding rates and the pay they apply to</h2>
    <p>The yearly percentage schedule has three rates, and they apply to what is left of your pay after the allowances and the standard deduction, not to your pay itself. For a single filer on ${N($(75000))}, that is ${N($(75000))} &minus; ${N($(UNE))} &minus; ${N($(SD_S))} = ${N($(imp75))}.
    The first ${N($(S1))} of it is taxed at ${N(pct2(T1))}, and the rest, ${N($(auDessus))}, falls in the ${N(pct2(T2))} step, which runs up to ${N($(S2))} of taxable pay. The ${N(pct2(T3))} step starts above that, which for a single filer with one allowance is ${N($(PAIE.s[2]))} of yearly pay.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Maine withholding schedules, applied to pay after the allowances and the standard deduction
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Single (also used for head of household): taxable pay</th>
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

    <h2>The standard deduction that phases out</h2>
    <p>Maine&rsquo;s withholding formula gives ${N($(SD_S))} to a single filer and ${N($(SD_M))} to a married filer, then takes it back as pay rises. The booklet says a single employee whose annualized pay is ${N($(PLEIN_S))} or less gets the full amount, one at ${N($(NUL_S))} or more gets nothing, and in between the deduction is ${N($(SD_S))} times (${N($(NUL_S))} minus pay) divided by ${N($(NUL_S - PLEIN_S))}. For a married employee the numbers are ${N($(PLEIN_M))}, ${N($(NUL_M))} and ${N($(NUL_M - PLEIN_M))}.</p>
    <p>That makes the withholding on each extra dollar higher than the rate in the schedule. Every dollar of pay in the range costs a single filer about ${N((pente * 100).toFixed(1))} cents of deduction, so ${N($$(1 + pente))} becomes taxable, and at ${N(pct2(T3))} that is a rate of about ${N(pct2(margeS))}. For a married filer it is about ${N(pct2(margeM))}. The tables below show it at work.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Maine standard deduction and yearly withholding by pay, single filer with one allowance
      </caption>
      <thead>
        <tr>
          <th scope="col">Yearly pay</th>
          <th scope="col">Standard deduction</th>
          <th scope="col">Taxable pay</th>
          <th scope="col">Maine withholding a year</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_PENTE_S}
      </tbody>
    </table>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Maine standard deduction and yearly withholding by pay, married filer with two allowances
      </caption>
      <thead>
        <tr>
          <th scope="col">Yearly pay</th>
          <th scope="col">Standard deduction</th>
          <th scope="col">Taxable pay</th>
          <th scope="col">Maine withholding a year</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_PENTE_M}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>Two cautions. First, this is the deduction in the employer&rsquo;s withholding formula, not the one on your return. The booklet says the return&rsquo;s basic standard deduction is ${N($(DEDUC_DECLARATION))} for a single filer and ${N("$31,400")} for a married couple filing jointly, and that these differ slightly from the amounts the withholding formula uses. Second, the booklet says the return&rsquo;s deduction is phased out for single taxpayers with Maine income over ${N($(PLEIN_S))} and married taxpayers over ${N("$204,550")}, so the idea is the same, but we do not figure your return.</p>

    <h2>The withholding allowance: what changes with your Maine W-4ME</h2>
    <p>Form W-4ME is how you tell your employer how many allowances to apply, and each one is worth ${N($(UNE))} a year. It is a separate form from the federal W-4, and the booklet says Maine&rsquo;s allowances are no longer based on federal Form W-4 information. This is how the calculator maps its three choices.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Maine withholding allowances by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Form W-4ME worksheet</th>
          <th scope="col">Used by this calculator for</th>
          <th scope="col">Allowances</th>
          <th scope="col">Yearly allowance</th>
          <th scope="col">Schedule</th>
          <th scope="col">Pay at which tax starts</th>
          <th scope="col">Pay at which ${pct2(T3)} starts</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The allowances come off your pay before the schedule, so each extra ${N($(1000))} of allowance is worth ${N($$(1000 * T2))} a year to anyone in the ${N(pct2(T2))} step. Each child or dependent you list on line D of the worksheet adds another allowance, which this calculator does not ask about. The booklet says the &ldquo;Single or Head of Household&rdquo; box and the &ldquo;Married, but withholding at higher single rate&rdquo; box both send the employer to the single schedule, and the &ldquo;Married&rdquo; box sends it to the married one.</p>

    <h2>If you cross a state line: how Maine withholds</h2>
    <p>Maine&rsquo;s only neighbor state is New Hampshire, and some people live on one side of the line and work on the other. This calculator models none of those cases. It assumes you live and work in Maine.</p>

    <h3>If you live in New Hampshire and work in Maine</h3>
    <p>The booklet says Maine-source income of a nonresident includes income from work done in Maine, and that it may not be subject to withholding if the number of days worked in Maine falls below a threshold set in the law. If a nonresident employee works in Maine for more than twelve days and earns more than ${N("$3,000")} during the year, the employer must ordinarily withhold Maine income tax. Our <a href="/paycheck-calculator/new-hampshire/">New Hampshire calculator</a> covers the other side of the line.</p>

    <h3>If you live in Maine and work elsewhere</h3>
    <p>The booklet describes the rules for employers who withhold in Maine. It does not say what a Maine resident who works in another state should expect from that state&rsquo;s employer, and we did not read the other state&rsquo;s rules for this page. Check your pay stub and your W-4ME.</p>

    <h2>The paid leave deduction and the other payroll lines</h2>

    <h3>Maine Paid Family and Medical Leave: up to 0.5% of your pay</h3>
    <p>Maine&rsquo;s paid family and medical leave program is paid for by contributions from employers and employees. The Department of Labor says the combined rate is 0.5% or 1% of wages for 2025 to 2027, depending on employer size, and that no more than 0.5% can come from the employee. An employer with 15 or more employees pays 1% of wages and may deduct up to half of it from employees. An employer with fewer than 15 pays 0.5% and may deduct the whole amount. The Department&rsquo;s guide for employers says &ldquo;You may withhold up to 0.5% of your employees&rsquo; wages.&rdquo;</p>

    <h3>What the maximum deduction costs you</h3>
    <p>At ${N(pct2(PL.rate))}, the deduction is ${N($$(pfml75))} a year on ${N($(75000))}, or ${N($$(pfml75 / 12))} a month. It applies up to the Social Security wage base, so the most it can reach in 2026 is ${N($$(pflMax))}, at ${N($(PL.wageCap))} of pay. The Department says premiums are withheld from employee pay after federal and state taxes are deducted and do not reduce the wages used for other tax programs, so this deduction does not lower the income tax withheld from your pay. This calculator takes the maximum and shows it as its own line. Because the word in the guidance is &ldquo;may,&rdquo; your employer might deduct less, or nothing, and then your take-home pay is higher by up to ${N($$(pfml75))} on ${N($(75000))}.</p>

    <h3>Benefits and the start date</h3>
    <p>The Department&rsquo;s FAQ says payroll contributions started in 2025 and that benefits were scheduled to begin on May 1, 2026. This page is about the deduction from your paycheck, not about the benefits or who qualifies for them.</p>

    <h3>Unemployment insurance is not taken from your pay</h3>
    <p>Title 26, section 1221 of the Maine Revised Statutes says unemployment contributions become due and must be paid by each employer and may not be deducted, in whole or in part, from the wages of the employees. This calculator has no unemployment line for that reason.</p>

    <h3>Local taxes: we found none</h3>
    <p>Maine&rsquo;s withholding booklet and Form W-4ME describe state withholding only. We found no Maine city, town or county income tax on wages in them, and this calculator adds no local line. That is not proof that none exists.</p>

    <h2>The printed wage-bracket tables run a little higher</h2>

    <h3>Two methods, both allowed</h3>
    <p>The booklet lets an employer use the percentage method or the wage-bracket tables, and it also allows another method, as long as the result is the same or falls between the two. The tables list the tax for each pay range and for 0 to 10 allowances, for weekly, biweekly, twice-a-month, monthly and daily pay, one set for the single schedule and one for the married schedule. Above a pay level it prints for each period (${N("$1,820")} a week, for instance), it tells employers to use the percentage method.</p>

    <h3>What we found when we rebuilt them</h3>
    <p>We rebuilt all ${N(virgule(V_CELLULES))} printed cells, and every one of them matches within ${N("50 cents")}, but only if the formula uses a standard deduction of ${N("$12,450")} for the single schedule and ${N("$27,750")} for the married schedule, and the top of each pay range as the wage. Those are not the ${N($(SD_S))} and ${N($(SD_M))} that the percentage method states in the same booklet, which is dated August 2026. The booklet itself says that its percentage method and its tables &ldquo;have been adjusted to reflect the 2026 exemption and deduction amounts,&rdquo; so the agency presents both as current, and it does not explain the difference we found. One possible explanation is that the printed tables were not updated with the rest of the revision, but we do not know that. It is our reading of the numbers, not a statement from the agency, and it could be wrong. If your employer uses the tables, ask the employer or Maine Revenue Services which figures apply.</p>

    <h3>What it means for your check</h3>
    <p>If your employer uses the printed tables, your withholding can be a little higher than this calculator shows. Take ${N($(75000))} a year paid weekly, which is ${N($$(75000 / 52))} a week. The table row for ${N($(P_LO))} to ${N($(P_HI))} shows ${N($$(P_GRILLE))} for one allowance. The percentage method gives ${N($$(P_METHODE))} before the booklet&rsquo;s rounding to the whole dollar. Over a year that is about ${N($(52 * (P_GRILLE - P_METHODE)))}. This page uses the percentage method, because it is the one whose text carries the August figures. If your stub shows the higher number, one possible reason is that your employer uses the printed tables.</p>

    <h2>Maine hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Maine your hours also matter because of the allowance and the standard deduction: a single filer earning ${N($(PAIE.s[0]))} or less a year has no Maine income tax withheld.</p>

    <h3>What is $20 an hour after taxes in Maine?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Maine income tax withholding and the paid leave deduction, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Maine&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year, plus ${N($$(pl(h20)))} of paid leave at the maximum.</p>

    <h3>What are $25 and $30 an hour after taxes in Maine?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Maine income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The booklet says that when supplemental wages such as bonuses, commissions and overtime pay are paid with regular wages, withholding is calculated as if the total were one payment of wages for the pay period, and that when they are paid separately the payer may withhold a flat five percent. Ask your employer how it handles a bonus.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Maine take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year).</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Maine take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Maine</h2>

  <h3>Nothing is withheld on the first ${$(PAIE.s[0])} of a single filer&rsquo;s pay</h3>
  <p>With one ${N($(UNE))} allowance and the ${N($(SD_S))} standard deduction, a single filer&rsquo;s yearly pay has to pass ${N($(PAIE.s[0]))} before Maine withholds anything. At ${N($(20000))}, Maine withholds ${N($$(a20k.etat))}; at ${N($(30000))}, it withholds ${N($$(a30.etat))} a year.</p>

  <h3>The ${pct2(T2)} step starts at ${$(PAIE.s[1])} of pay</h3>
  <p>The ${N(pct2(T1))} step covers ${N($(S1))} of taxable pay and produces ${N($$(BASE(S1)))} of tax. The ${N(pct2(T2))} step covers the next ${N($(S2 - S1))} and adds ${N($$(BASE(S2) - BASE(S1)))}. For a single filer, ${N(pct2(T2))} starts at ${N($(PAIE.s[1]))} of yearly pay and ends at ${N($(PAIE.s[2]))}, where the ${N(pct2(T3))} step begins.</p>

  <h3>Above ${$(PLEIN_S)} the effective rate on each extra dollar jumps</h3>
  <p>Because the standard deduction shrinks, each extra dollar of pay between ${N($(PLEIN_S))} and ${N($(NUL_S))} is taxed at about ${N(pct2(margeS))}, not ${N(pct2(T3))}. A single filer paid ${N($(120000))} has ${N($$(a120.etat))} withheld, and one paid ${N($(130000))} has ${N($$(a130.etat))}, which is ${N($$(a130.etat - a120.etat))} more for ${N($(10000))} of pay. At ${N($(150000))}, the deduction is ${N($$(sdS(150000)))}, and Maine withholds ${N($$(a150.etat))}.</p>

  <h3>From ${$(NUL_S)} of pay there is no standard deduction</h3>
  <p>A single filer paid ${N($(200000))} gets no standard deduction in the formula, only the ${N($(UNE))} allowance, so ${N($(200000 - UNE))} is taxable and Maine withholds ${N($$(a200.etat))}. The ${N(pct2(T3))} rate then applies to every dollar above ${N($(S2))} of taxable pay until the surcharge starts.</p>

  <h3>The surcharge matters only at very high pay</h3>
  <p>The booklet says the tax is increased by a surcharge of ${N("2%")} on annualized income above ${N($(S3))} for single taxpayers and ${N($(M3))} for married taxpayers, for tax years beginning on or after January 1, 2026. For a single filer with one allowance, that begins at about ${N($(surchargeS))} of pay. On ${N($(1500000))}, the surcharge adds ${N($$(surcharge15))}, and Maine withholds ${N($$(a15m.etat))} in all.</p>

  <h3>The married schedule is wider, and the deduction is larger</h3>
  <p>A single filer&rsquo;s taxable pay is pay minus ${N($(UNE))} minus ${N($(SD_S))}. A married filer with two allowances gets ${N($(2 * UNE))} and ${N($(SD_M))} off and a schedule whose ${N(pct2(T1))} step runs to ${N($(M1))}. That is why Maine withholds ${N($$(j75.etat))} from that filer on ${N("$75,000")} and ${N($$(a75.etat))} from a single one. Taxable pay for the married filer is ${N($(jImp))}, all of it in the ${N(pct2(T1))} step.</p>

  <h3>Head of household: two allowances on the single schedule</h3>
  <p>With lines A and C of the W-4ME worksheet, a head of household has two allowances, ${N($(PE.headOfHousehold))}, and the booklet sends the employer to the single schedule. On ${N("$75,000")}, taxable pay is ${N($(hImp))} and Maine withholds ${N($$(h75.etat))}. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>Each allowance is worth up to ${$$(valeurAlloc.haut)} a year</h3>
  <p>Line D of the worksheet counts children and dependents eligible for the federal child tax credit or the credit for other dependents, and each one adds an allowance of ${N($(UNE))}. In the ${N(pct2(T2))} step that lowers yearly withholding by ${N($$(valeurAlloc.milieu))}; in the ${N(pct2(T1))} step it is ${N($$(valeurAlloc.bas))}, and in the ${N(pct2(T3))} step ${N($$(valeurAlloc.haut))}. This calculator does not ask for dependents, so a worker with children who claims them on the W-4ME will see less Maine tax withheld than the figure shown.</p>

  <h3>Extra withholding and exemptions are on the form</h3>
  <p>Line 5 of the W-4ME is for an additional amount you want withheld from each paycheck, and line 6 lists exemptions for people who qualify, such as a resident with no Maine tax liability in the prior and current years. This calculator models neither.</p>

  <h3>If your form is invalid, your employer treats you as single with no allowances</h3>
  <p>The booklet says that if an employee does not give a valid Form W-4ME when asked, the employer must withhold as if the employee were single and claiming no allowances. On ${N("$75,000")}, that would withhold ${N($$(zero75))} instead of ${N($$(a75.etat))}, which is ${N($$(ecartZero))} more a year.</p>

  <h3>Your 401(k) lowers your Maine taxable wages in this calculator</h3>
  <p>The booklet says to start from total wages and gives no separate rule for 401(k) contributions. This calculator therefore starts from pay after a traditional 401(k) contribution, as it does in most states on this site. The booklet adds that Maine withholding is not reduced by the federal deduction amounts claimed in step 4(b) of the federal W-4. On ${N("$75,000")} with 6% going in, Maine income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total, and the paid leave deduction stops at ${N($$(pflMax))}.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the standard deduction</h3>
  <p>Subtracting only the allowance from ${N($(75000))} leaves ${N($(75000 - UNE))} of taxable pay and overstates Maine withholding by ${N($$(ecartSansDeduc))}: ${N($$(sansDeduc))} instead of ${N($$(a75.etat))}.</p>

  <h3>Using the return&rsquo;s standard deduction in the withholding formula</h3>
  <p>The return&rsquo;s basic deduction for a single filer is ${N($(DEDUC_DECLARATION))}, but the withholding formula uses ${N($(SD_S))}. Using the larger one on ${N("$75,000")} gives ${N($$(avecDeducDecl))}, which understates Maine withholding by ${N($$(ecartDeducDecl))}.</p>

  <h3>Assuming the deduction stays full until ${$(NUL_S)}</h3>
  <p>It starts to shrink at ${N($(PLEIN_S))}. At ${N($(150000))}, keeping the full ${N($(SD_S))} would give ${N($$(sansPente150))} instead of ${N($$(a150.etat))}, which is ${N($$(ecartPente150))} too little.</p>

  <h3>Claiming the spouse allowance when both of you work</h3>
  <p>Line B of the W-4ME worksheet says you may enter 0 if you are married and have a working spouse or more than one job, and that entering 0 may help avoid having too little tax withheld. If each of you claims the spouse allowance anyway, the household has one allowance too many. On ${N("$75,000")} that lowers withholding from ${N($$(jTravaille))} to ${N($$(j75.etat))}, which is ${N($$(ecartConjoint))} too little withheld over a year. The shortfall can show up as a balance due when you file.</p>

  <h3>Counting the paid leave deduction as a tax break</h3>
  <p>It is withheld after income tax is figured and does not reduce your taxable wages, so it does not lower the income tax withheld from your pay. The Department adds that employees who itemize may be entitled to deduct the premiums on their federal return, which this calculator does not model. A take-home figure that leaves it out is too high by ${N($$(pfml75))} on ${N("$75,000")}, if your employer takes the full ${N(pct2(PL.rate))}.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances you claimed on your Form W-4ME may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Maine in 2026, with one allowance, no retirement
  contribution and the paid leave deduction at its maximum, under the percentage method:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Maine taxable pay: ${N($(a75.brut))} &minus; ${N($(UNE))} allowance &minus; ${N($(SD_S))} standard deduction = ${N($(imp75))}</li>
    <li>Tax on the first ${N($(S1))}: ${N($(S1))} &times; ${N(pct2(T1))} = ${N($$(tranche1))}</li>
    <li>Tax on the remaining ${N($(auDessus))}: ${N($(auDessus))} &times; ${N(pct2(T2))} = ${N($$(haut75))}</li>
    <li>Maine income tax withholding: ${N($$(tranche1))} + ${N($$(haut75))} = ${N($$(a75.etat))}
    a year, ${N($$(mensuel75))} on a monthly paycheck or ${N($$(bimensuel75))} on a biweekly one</li>
    <li>Maine Paid Family and Medical Leave: ${N($(a75.brut))} &times; ${N(pct2(PL.rate))} = ${N($$(pfml75))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Maine&rsquo;s only neighbor state is New Hampshire, and we add Massachusetts and Vermont for a New England comparison.
  Each row leaves out its own local taxes and optional employer deductions, and the Maine row includes the paid leave deduction at its maximum.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a Maine worker on the same salary, ${phraseVoisins}. A worker who lives in one of those states and commutes into Maine, or the reverse, is a different case that this calculator does not model: it assumes a Maine resident working in Maine.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/new-hampshire/">New Hampshire paycheck calculator</a> &mdash; the neighbor to the southwest, where this calculator shows no state tax on wages.</li>
    <li><a href="/paycheck-calculator/massachusetts/">Massachusetts paycheck calculator</a> &mdash; another New England state.</li>
    <li><a href="/paycheck-calculator/vermont/">Vermont paycheck calculator</a> &mdash; another New England state.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Maine ranks on one salary.</li>
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
    Maine Revenue Services&rsquo; withholding method, and do not include dependents claimed on Form W-4ME, local taxes or optional employer deductions.
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

/* 1. Recoupement independant : la methode du livret ecrite ici A PARTIR DU TEXTE (pages 6-7), pas du moteur. */
const livret = (annuel, marie, allocs) => {
  const sd = marie
    ? (annuel <= 204550 ? 28550 : annuel >= 354550 ? 0 : 28550 * (354550 - annuel) / 150000)
    : (annuel <= 102250 ? 12850 : annuel >= 177250 ? 0 : 12850 * (177250 - annuel) / 75000);
  const inc = annuel - allocs * 5300 - sd;
  if (inc <= 0) return 0;
  const [b1, b2, b3] = marie ? [54850, 129750, 1500000] : [27400, 64850, 1000000];
  let t = inc < b1 ? inc * 0.058
        : inc < b2 ? b1 * 0.058 + (inc - b1) * 0.0675
        : b1 * 0.058 + (b2 - b1) * 0.0675 + (inc - b2) * 0.0715;
  if (inc > b3) t += (inc - b3) * 0.02;
  return t;
};
const fed75 = 7670, fedJ = 4640, fedH = 5748;
for (const [lib, obtenu, attendu] of [
  ["75 000 $ celibataire", a75.etat, livret(75000, false, 1)], ["75 000 $ marie", j75.etat, livret(75000, true, 2)],
  ["75 000 $ chef de famille", h75.etat, livret(75000, false, 2)], ["150 000 $", a150.etat, livret(150000, false, 1)],
  ["200 000 $", a200.etat, livret(200000, false, 1)], ["250 000 $", a250.etat, livret(250000, false, 1)],
  ["1 500 000 $", a15m.etat, livret(1500000, false, 1)]
]) if (Math.abs(obtenu - attendu) > 0.001) echec("ME " + lib + " : livret " + attendu + ", moteur " + obtenu);
if (Math.abs(livret(1000 * 52, false, 2) / 52 - 32.06) > 0.01) echec("l'exemple 2 du livret ne se reproduit plus");
if (Math.abs(livret(4500 * 52, true, 2) / 52 - 255.62) > 0.01) echec("l'exemple 3 du livret ne se reproduit plus");
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (recalculee a la main le 21/10/2026). */
const attendusProse = [
  [a75.etat, 3577.075, "etat 75 000"], [imp75, 56850, "imposable 75 000"], [tranche1, 1589.2, "27 400 x 5,8 %"], [auDessus, 29450, "56 850 - 27 400"],
  [haut75, 1987.875, "29 450 x 6,75 %"], [a75.net, 57640.425, "net 75 000"], [a75.total, 17359.575, "total 75 000"], [pfml75, 375, "PFML 75 000"],
  [j75.etat, 2079.3, "etat marie"], [jImp, 35850, "imposable marie"], [j75.net, 62168.2, "net marie"],
  [h75.etat, 3219.325, "etat chef de famille"], [hImp, 51550, "imposable chef de famille"], [h75.net, 59920.175, "net chef de famille"],
  [a30.etat, 687.3, "etat 30 000"], [a20k.etat, 107.3, "etat 20 000"],
  [jTravaille, 2386.7, "marie, une allocation"], [ecartConjoint, 307.4, "ecart conjoint qui travaille"],
  [zero75, 3934.825, "zero allocation"], [ecartZero, 357.75, "ecart zero allocation"],
  [sansDeduc, 4463.85, "allocation seule : 1 589,20 + 2 527,875 + 4 850 x 7,15 %"], [ecartSansDeduc, 886.775, "ecart sans deduction standard"],
  [avecDeducDecl, 3384.7, "deduction de la declaration (15 700 $)"], [ecartDeducDecl, 192.375, "ecart deduction de la declaration"],
  [a150.etat, 9492.528416666666, "etat 150 000"], [sdS(150000), 4668.833333333333, "deduction a 150 000 $"],
  [a200.etat, 13401.35, "etat 200 000"], [a15m.etat, 116245.35, "etat 1 500 000"], [surcharge15, 9894, "surcharge a 1 500 000 $ : 494 700 x 2 %"],
  [valeurAlloc.bas, 307.4, "5 300 x 5,8 %"], [valeurAlloc.milieu, 357.75, "5 300 x 6,75 %"], [valeurAlloc.haut, 378.95, "5 300 x 7,15 %"],
  [BASE(S1), 1589.2, "base 27 400"], [BASE(S2), 4117.075, "base 64 850"], [BASM(M1), 3181.3, "base marie 54 850"], [BASM(M2), 8237.05, "base marie 129 750"],
  [BASE(S2) - BASE(S1), 2527.875, "37 450 x 6,75 %"],
  [gain401, 3577.075 - 3273.325, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"], [pflMax, 922.5, "PFML maximale"],
  [mensuel75, 298.08958, "mensuel"], [bimensuel75, 137.58, "bimensuel"],
  [PAIE.s[0], 18150, "paie au seuil (celibataire)"], [PAIE.s[1], 45550, "paie au 2e palier (celibataire)"], [PAIE.s[2], 83000, "paie au 3e palier (celibataire)"],
  [PAIE.h[0], 23450, "paie au seuil (chef de famille)"], [PAIE.h[2], 88300, "paie au 3e palier (chef de famille)"],
  [PAIE.m[0], 39150, "paie au seuil (marie)"], [PAIE.m[2], 168900, "paie au 3e palier (marie)"],
  [surchargeS, 1005300, "paie au surcharge (celibataire)"], [a130.etat - a120.etat, 837.50333, "10 000 $ de plus dans la pente : 10 000 x 7,15 % x (1 + 12 850 / 75 000)"],
  [1 + pente, 1.1713333, "1 + 12 850 / 75 000"], [margeS, 0.0715 * 1.1713333, "retenue marginale dans la pente"]
];
/* 20 $/h = 41 600 $ : 41 600 - 18 150 = 23 450 x 5,8 % = 1 360,10 ; 25 $/h = 52 000 $ : 33 850 -> 1 589,20 + 6 450 x 6,75 % = 2 024,575 ;
   30 $/h = 62 400 $ : 44 250 -> 1 589,20 + 16 850 x 6,75 % = 2 726,575. */
attendusProse.push([h20.etat, 1360.1, "etat 20 $/h"], [h25.etat, 2024.575, "etat 25 $/h"], [h30.etat, 2726.575, "etat 30 $/h"]);
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(PE.single === 5300 && PE.marriedJoint === 10600 && PE.headOfHousehold === 10600)) echec("allocations != 5 300 / 10 600 / 10 600");
if (!(BS.length === 4 && BS[0][0] === 27400 && BS[0][1] === 0.058 && BS[1][0] === 64850 && BS[1][1] === 0.0675 && BS[2][0] === 1000000 && BS[2][1] === 0.0715 && BS[3][1] === 0.0915 &&
      BM.length === 4 && BM[0][0] === 54850 && BM[1][0] === 129750 && BM[2][0] === 1500000)) echec("bareme != celui du livret");
if (!(SD_S === 12850 && SD_M === 28550 && PLEIN_S === 102250 && NUL_S === 177250 && PLEIN_M === 204550 && NUL_M === 354550)) echec("deduction standard != livret");
if (!(PL.rate === 0.005 && PL.wageCap === 184500)) echec("PFML != 0,5 % jusqu'a 184 500 $");
for (const k of COMPARE.slice(1)) if (!R.states[k]) echec("voisin absent du moteur : " + k);
if (a75.programmes.length !== 1 || a75.paidLeave !== 0 || a75.waCares !== 0) echec("le Maine doit avoir un seul programme salarie (PFML)");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 2500) echec(motsProse + " mots hors tableaux, sous le plancher de 2 500");
if ((html.match(/<h3/g) || []).length < 30) echec("moins de 30 H3");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements du livret (methode ecrite a la main, 75 000 $ celibataire, marie et chef de famille, pente, surcharge, exemples imprimes) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
