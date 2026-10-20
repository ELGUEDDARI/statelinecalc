/* Construit /paycheck-calculator/kansas/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Kansas est le 44e Etat publie. Aucun mecanisme nouveau au moteur : un montant deduit par statut (ici
 * l'« allocation de retenue » du K-4, pas une deduction standard) + un bareme par statut dont la premiere tranche est a 0 %.
 * Ce que le Kansas a de propre, et que la page DIT :
 *
 *   1. DEUX BAREMES, PAS UN : celibataire (chef de famille inclus) 0 % jusqu'a 3 605 $, 5,2 % jusqu'a 26 605 $, 5,58 % au-dela ;
 *      marie 0 % jusqu'a 8 240 $, 5,2 % jusqu'a 54 240 $, 5,58 % au-dela. Le K-4 compte des ALLOCATIONS : la premiere vaut
 *      9 160 $ (deux pour « Joint »), les suivantes 2 320 $ chacune (verifie sur les 11 440 cellules imprimees).
 *   2. LA CASE « JOINT » : seulement si le conjoint n'a AUCUN revenu ; s'il travaille, « Single ». Le site modelise
 *      « marriedJoint » = conjoint sans revenu (meme choix que l'Iowa et le Missouri) ; la page chiffre l'ecart.
 *   3. LE CHEF DE FAMILLE : le guide et la Notice 25-07 disent UNE allocation supplementaire (11 480 $), le K-4 ligne D dit « 2 ». Le site suit le guide
 *      et la page chiffre l'autre lecture (13 800 $, 129,46 $ de moins de retenue a 75 000 $).
 *   4. LES PERSONNES A CHARGE : 2 320 $ chacune au K-4 ; le calculateur ne les demande pas. Dit, chiffre.
 *   5. L'ARRONDI AU DOLLAR PAR PAIE (« Round to the nearest whole dollar »), que le moteur n'applique pas : dit.
 *   6. AUCUN PROGRAMME SALARIE TROUVE ; chomage a la charge de l'employeur (K.S.A. 44-710).
 *   7. AUCUNE TAXE LOCALE TROUVEE dans le guide ; l'earnings tax de 1 % de Kansas City (Missouri) peut toucher un Kansan qui y
 *      travaille : non modelise, dit.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - « Kansas has no local income tax » : seulement « we found no » ;
 *   - « Kansas did not change its rates for 2026 » : seule la Notice 25-06 (« no rate reduction for tax year 2026 ») et le guide
 *     (« wages paid on or after July 1, 2024 ») sont lus ; on dit ce qu'ils disent ;
 *   - « the Department has published no 2026 table » : le site des notices de l'agence ne repond pas depuis cette machine ;
 *   - « Kansas has no paid family leave » : seulement « we found none » ;
 *   - « the Department says a head of household gets 11,480 » : c'est le K-4 (ligne D = 2) combine aux tables imprimees ; le texte du
 *     guide dit une allocation. Les deux sont cites.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-kansas.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "kansas";
const NOM = "Kansas";
const URL = "https://statelinecalc.com/paycheck-calculator/kansas/";
const AUJOURD_HUI = "2026-10-20";
const LISIBLE = "October 20, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const KSD = R.states[CLE];
const IT = KSD.incomeTax;
const AL = IT.standardDeduction;                       // 9 160 / 18 320 / 11 480 : allocation annuelle
const BS = IT.brackets.single;                         // 0 % / 5,2 % / 5,58 % (chef de famille inclus)
const BM = IT.brackets.marriedJoint;
const fedDed = R.federal.standardDeduction;
const ZS = BS[0][0], TS = BS[1][0];                    // 3 605 ; 26 605
const ZM = BM[0][0], TM = BM[1][0];                    // 8 240 ; 54 240
const TAUX1 = BS[1][1], TAUX2 = BS[2][1];              // 5,2 % ; 5,58 %
const BASE_S = progressiveTax(TS, BS);                 // 1 196
const BASE_M = progressiveTax(TM, BM);                 // 2 392
const PERS = 2320;                                     // allocation par personne a charge (guide, p. 6)
const HOH_GUIDE = AL.single + PERS;                    // 11 480 : le guide et la Notice 25-07 (une allocation de plus)
const HOH_K4 = AL.single + 2 * PERS;                   // 13 800 : le K-4, ligne D = « 2 »
const LOCAL = 0.01;                                    // Kansas City (Missouri) : 1 %

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const pctS = t => (t * 100).toFixed(1) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

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
const imp75 = 75000 - AL.single;                                          // 65 840
const auDessus = imp75 - TS;                                              // 39 235 au-dessus de 26 605
const tranche1 = (TS - ZS) * TAUX1;                                       // 23 000 x 5,2 % = 1 196
const haut75 = auDessus * TAUX2;                                          // 2 189,313
const jImp = 75000 - AL.marriedJoint;                                     // 56 680
const hImp = 75000 - AL.headOfHousehold;                                  // 63 520
const jAuDessus = jImp - TM;                                              // 2 440
/* Chef de famille, lecture du texte du guide : une seule allocation supplementaire. */
const hImpK4 = 75000 - HOH_K4;                                            // 61 200
const hK4 = progressiveTax(hImpK4, BS);
const ecartHoh = h75.etat - hK4;                                          // 129,456
/* Ce que vaut une allocation de 2 320 $ a 75 000 $ (taux superieur) et dans la tranche a 5,2 %. */
const valeurAlloc = PERS * TAUX2;                                         // 129,456
const valeurAllocBas = PERS * TAUX1;                                      // 120,64
/* Erreurs typiques. */
const sansAllocation = progressiveTax(75000, BS);                         // pas de K-4 : celibataire, zero allocation
const ecartSansAllocation = sansAllocation - a75.etat;                    // 9 160 x 5,58 %
const tauxUnique = imp75 * TAUX2;                                         // tout au taux superieur
const ecartTauxUnique = tauxUnique - a75.etat;
const ecartConjoint = a75.etat - j75.etat;                                // conjoint qui travaille : case « Single »
/* Taxe de Kansas City (Missouri). */
const loc75 = 75000 * LOCAL;
const netApresLocal = a75.net - loc75;
/* Arrondi au dollar par paie. */
const mensuel75 = a75.etat / 12;
const bimensuel75 = a75.etat / 26;
/* Seuils de salaire annuel. */
const PAIE_ZERO = { s: AL.single + ZS, h: AL.headOfHousehold + ZS, j: AL.marriedJoint + ZM };
const PAIE_HAUT = { s: AL.single + TS, h: AL.headOfHousehold + TS, j: AL.marriedJoint + TM };
/* Ce que la tranche a 5,2 % fait gagner par rapport a 5,58 % partout. */
const econ = TS * TAUX2 - BASE_S;

/* Voisins : les quatre sont publies. */
const REF = 75000;
const COMPARE = [CLE, "nebraska", "missouri", "oklahoma", "colorado"];
const NOMS = { [CLE]: "Kansas", nebraska: "Nebraska", missouri: "Missouri", oklahoma: "Oklahoma", colorado: "Colorado" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const art = nom => /^[AEIOU]/.test(nom) ? "an" : "a";
const plusMoins = k => {
  const r = calcul(k, REF), nom = NOMS[k];
  const lien = "<a href=\"/paycheck-calculator/" + k + "/\">" + nom + "</a>";
  return art(nom) + " " + lien + " worker keeps " + N($$(Math.abs(r.net - a75.net))) + (r.net > a75.net ? " more" : " less");
};
const phraseVoisins = (() => {
  const l = COMPARE.slice(1).map(plusMoins);
  return l.slice(0, -1).join(", ") + ", and " + l[l.length - 1];
})();

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des deux baremes. */
const LIGNES_BAREMES = [
  ["Single (also used for head of household)", $(ZS), $(ZS) + " to " + $(TS), "Over " + $(TS), $$(BASE_S)],
  ["Married (spouse has no income)", $(ZM), $(ZM) + " to " + $(TM), "Over " + $(TM), $$(BASE_M)]
].map(([lib, a, b, c, d]) => "        <tr><th scope=\"row\">" + lib + "</th><td>First " + a.replace(/^First /, "") + "</td><td>" + b +
  "</td><td>" + c + "</td><td class=\"num\">" + d + "</td></tr>").join("\n");

/* Le tableau des cases du K-4. */
const LIGNES_STATUT = [
  ["Single, or married and your spouse has income", "Single", "1 allowance", $(AL.single), $(PAIE_ZERO.s), $(PAIE_HAUT.s)],
  ["Married and your spouse has no income (&ldquo;Joint&rdquo;)", "Married filing jointly", "2 allowances", $(AL.marriedJoint), $(PAIE_ZERO.j), $(PAIE_HAUT.j)],
  ["Head of household (guide: one additional allowance)", "Head of household", "1 + 1 additional", $(AL.headOfHousehold), $(PAIE_ZERO.h), $(PAIE_HAUT.h)]
].map(([lib, site, nb, a, z, h]) => "        <tr><th scope=\"row\">" + lib + "</th><td>" + site + "</td><td>" + nb + "</td><td class=\"num\">" + a +
  "</td><td class=\"num\">" + z + "</td><td class=\"num\">" + h + "</td></tr>").join("\n");

/* Le tableau des periodes de paie : seuils imprimes par periode (annuel / N, arrondi comme l'agence). */
const arrondiAgence = x => Math.floor(x + 0.5 + 1e-9);
const PERIODES = [["Daily", 260], ["Weekly", 52], ["Every two weeks", 26], ["Twice a month", 24], ["Monthly", 12], ["Yearly", 1]];
const LIGNES_PERIODES = PERIODES.map(([lib, n]) =>
  "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + n + "</td><td class=\"num\">" + $(arrondiAgence(ZS / n)) +
  "</td><td class=\"num\">" + $(arrondiAgence(TS / n)) + "</td><td class=\"num\">" + $(arrondiAgence(ZM / n)) +
  "</td><td class=\"num\">" + $(arrondiAgence(TM / n)) + "</td></tr>").join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Kansas income tax withholding rate?",
   "Kansas&rsquo;s withholding table has two rates, " + N(pct(TAUX1)) + " and " + N(pct(TAUX2)) + ", and a first step at " + N("0%") + ". For a single filer, nothing is withheld on the first " + $(ZS) + " of what is left after the allowance, " + N(pct(TAUX1)) +
   " is withheld on the next " + $(TS - ZS) + ", and " + N(pct(TAUX2)) + " on everything above " + $(TS) + ". A married filer whose spouse has no income gets a wider " + N("0%") + " step, up to " + $(ZM) + ", and the " + N(pct(TAUX2)) +
   " rate starts above " + $(TM) + ". &ldquo;What is left&rdquo; means your yearly pay minus the withholding allowance from your Form K-4, which is " + $(AL.single) + " for a single filer. On " + $(75000) + ", Kansas withholds " + $$(a75.etat) + " a year."],

  ["How much Kansas tax is withheld on a $75,000 salary?",
   "For a single filer with one allowance, Kansas withholds " + $$(a75.etat) + " a year, which is " + $$(mensuel75) + " a month or " + $$(bimensuel75) + " on a biweekly check. " +
   "Taxable pay is " + $(75000) + " minus the " + $(AL.single) + " allowance, or " + $(imp75) + ". The first " + $(ZS) + " of it is not taxed, the next " + $(TS - ZS) + " produces " + $$(tranche1) +
   ", and the other " + $(auDessus) + " is taxed at " + pct(TAUX2) + ". A married filer whose spouse has no income, with an " + $(AL.marriedJoint) + " allowance and the married table, has " + $$(j75.etat) +
   " withheld, and a head of household has " + $$(h75.etat) + " withheld. Kansas lets employers round each check to the whole dollar, so a real paycheck can be off by up to 50 cents from these yearly figures divided by your number of pay periods."],

  ["What is take-home pay on a $75,000 salary in Kansas?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of Kansas income tax, an effective rate of " + (a75.taux * 100).toFixed(1) + "%. We found no Kansas city or county income tax in the withholding guide, so there is no local line."],

  ["How much is $20, $25 or $30 an hour after taxes in Kansas?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "Kansas income tax withholding, with no retirement contribution."],

  ["What is the Kansas withholding allowance?",
   "It is the amount your employer subtracts from your pay before applying the Kansas table. The Department of Revenue&rsquo;s guide says it is your personal exemption amount divided by the number of pay periods in the year: " +
   $(AL.single) + " for a single filer, a head of household or a married person filing separately, and " + $(AL.marriedJoint) + " for married filing jointly. A head of household may claim an additional " + $(PERS) +
   " allowance, and every dependent adds " + $(PERS) + ". Your actual Kansas tax is figured on your return, where the standard deduction and your real exemptions apply."],

  ["Which box do I check on the Kansas K-4 if I am married?",
   "It depends on your spouse&rsquo;s income. Line A of Form K-4 says to mark &ldquo;Single&rdquo; if you are married and your spouse has income, and &ldquo;Joint&rdquo; if you are married and your spouse does not have income. " +
   "&ldquo;Joint&rdquo; selects the wider married table, and lets you enter 1 on line B and 1 on line C: two allowances, " + $(AL.marriedJoint) + " in all. On " + $(75000) + " the difference is " + $$(ecartConjoint) + " of Kansas tax a year. " +
   "This calculator uses &ldquo;Joint&rdquo; for &ldquo;Married filing jointly,&rdquo; so it assumes a spouse with no income. If your spouse works, pick &ldquo;Single&rdquo; to see the single-filer result."],

  ["How does head of household work on the Kansas K-4?",
   "The Department&rsquo;s guide says a head of household may claim an additional withholding allowance of " + $(PERS) + ", and its Notice 25-07 says the same of the statute: one additional " + $(PERS) + " exemption. So this calculator takes " + $(HOH_GUIDE) + " off for a head of household (" + $(AL.single) + " plus " + $(PERS) + ") and uses the single filer&rsquo;s table, as the Department&rsquo;s tables do. " +
   "Line D of Form K-4, though, says to enter &ldquo;2&rdquo; if you will file as head of household. In the single filer&rsquo;s printed wage-bracket table the first allowance is worth " + $(AL.single) + " and each one after it " + $(PERS) + ", so a head of household who enters 1 on line B and 2 on line D would have " + $(HOH_K4) + " taken off. " +
   "The documents disagree. We followed the statute and the guide&rsquo;s text, which withhold more. On " + $(75000) + " the K-4 reading would withhold " + $$(ecartHoh) + " a year less, so a head of household who follows the K-4 may see more take-home pay than this page shows."],

  ["Is there a Kansas state disability or paid leave deduction?",
   "We found none. The Department of Revenue&rsquo;s guide and Form K-4 do not describe a state payroll program that an employee pays for. Kansas law (K.S.A. 44-710) also says an employer&rsquo;s unemployment contributions &ldquo;shall not be deducted, in whole or in part, from the wages of individuals in such employer&rsquo;s employ,&rdquo; so that cost falls on your employer. " +
   "That is what we read, not proof that nothing else exists, and your pay stub is the final word."],

  ["Do Kansas cities or counties tax my paycheck?",
   "The Kansas withholding guide describes state withholding only, and we found no Kansas city or county income tax on wages in it. That is not proof that none exists. " +
   "One city outside Kansas matters to Kansans who work there. Kansas City, Missouri charges a 1% earnings tax, and its guide for employers outside the city says that an employer registered with the city must withhold it on the part of a nonresident&rsquo;s pay earned within the city. If all of a " + $(75000) + " salary were earned there, that would be " + $$(loc75) +
   " a year. This calculator does not include it, because it cannot know where you work."],

  ["I live in Kansas and work in Missouri, or the reverse. Which state withholds?",
   "The Department&rsquo;s guide says that for a Kansas resident who works outside Kansas, the employer withholds the Kansas amount less what the other state requires. Its example is a Kansas resident working in Missouri: Kansas tax of $250 on the wages, Missouri withholding of $130, and the $120 difference withheld for Kansas. " +
   "If the other state&rsquo;s withholding is the larger, no Kansas tax is withheld. For a nonresident who works full time in Kansas, the employer withholds Kansas tax on all the wages as if the employee were a Kansas resident. This calculator assumes you live and work in Kansas and does not model either case."],

  ["Does a 401(k) contribution lower my Kansas withholding?",
   "In this calculator, yes. The guide says Kansas withholding on deferred compensation plans follows the federal rules and that contributions to such a plan are generally not subject to withholding, so we start from pay after a traditional 401(k) contribution, the same choice we make in every other state here. " +
   "On " + $(75000) + " with 6% going into a 401(k), Kansas income tax withholding falls by " + $$(gain401) + " a year."],

  ["How does Kansas withhold tax on a bonus?",
   "The Department&rsquo;s guide says Kansas withholding on a supplemental wage payment follows the method your employer uses for federal tax. If the bonus is added to your regular wages and the total is run through the tables, Kansas does the same. " +
   "If the bonus is stated separately and federal tax is figured as a flat percentage of it, Kansas withholds 5% of the gross payment: $50 on a $1,000 bonus, the guide&rsquo;s own example. This calculator does not model bonuses, so ask your employer which method it uses."],

  ["Why is my Kansas paycheck different from this calculator?",
   "Common reasons: you claimed a different number of allowances on your K-4, such as one for each dependent, or asked for extra withholding on line 5; your employer rounds each check to the whole dollar; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; or part of your pay is a bonus. If you never gave your employer a K-4, it must withhold at the single rate with no allowances, which on " + $(75000) +
   " is " + $$(sansAllocation) + " a year, " + $$(ecartSansAllocation) + " more than the figure above. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."],

  ["How current is the Kansas formula on this page?",
   "It comes from the Department of Revenue&rsquo;s Withholding Tax Guide, KW-100, whose cover reads &ldquo;Rev. 10-24&rdquo; and whose cover says the rates are for wages paid on or after July 1, 2024. " +
   "We read the copy that the Internet Archive saved on October 9, 2026, and link to it. The Department&rsquo;s Notice 25-06 says there will be no rate reduction for tax year 2026. " +
   "We did not find a 2026 withholding notice, but the Department&rsquo;s own site did not answer our requests, so we cannot rule one out."],

  ["Could Kansas cut its income tax rates?",
   "Kansas law provides for future cuts that depend on state revenue. According to the Department&rsquo;s Notice 25-06, a 2025 law (Senate Bill 269) lets the rates fall toward 4% in steps when general fund collections exceed an inflation-adjusted base and the rainy-day fund is large enough. " +
   "The notice reports that the 2025 test was not met, so no cut applies for 2026. If a cut ever applies, this page&rsquo;s rates would need to change, and we would update them from the Department&rsquo;s new tables."]
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
const reponse = "Kansas withholds at 5.2% and 5.58%, after a $9,160 allowance for a single filer, and nothing on the first $3,605 of what is left. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year, with no state payroll deduction we found. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Kansas (KS) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Kansas (KS) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Kansas tax. Rates 5.2% and 5.58%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Kansas (KS) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Kansas withholds 5.2% and 5.58% after a $9,160 allowance. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Kansas Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Kansas take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Kansas income tax withheld under the Kansas Department of Revenue formula (a withholding allowance from Form K-4, then rates of 5.2% and 5.58%). City income taxes in neighboring states are not included."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Kansas", "item": "${URL}" }
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
    <li aria-current="page">Kansas</li>
  </ol>
</nav>

  <h1>Kansas Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Kansas take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and your Kansas allowance and table.
          For a married filer we assume a spouse with no income; if yours has income, choose Single.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Kansas income tax withholding too.</span>
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
    <p>The Kansas Department of Revenue publishes a withholding formula, and this calculator follows it. Your pay is converted to a yearly amount. The withholding allowance comes off (${N($(AL.single))} for a single filer, ${N($(AL.marriedJoint))} for a married filer whose spouse has no income). The rest is taxed through a table with a ${N("0%")} step, a ${N(pct(TAUX1))} step and a ${N(pct(TAUX2))} step, and the yearly result is divided by the number of pay periods. Kansas prints two tables, one for single filers and one for married filers, and the married table has wider steps.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Kansas income tax</strong>: your wages after any 401(k) contribution, minus the Kansas withholding allowance for your status, taxed through the table.</li>
    </ul>
    <p>This calculator has no other Kansas line. We looked for a state payroll deduction on your check and found none.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Kansas, the <strong>Department of Revenue</strong>&rsquo;s Withholding Tax Guide, Form K-4 and tax notices, and the Kansas Office of the Revisor of Statutes.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How current the source is.</strong> The guide&rsquo;s cover says its rates apply to wages paid on or after July 1, 2024, and its cover reads &ldquo;Rev. 10-24.&rdquo; The Department&rsquo;s site did not answer our automated requests on ${LISIBLE}, so we read the copy the Internet Archive saved on October 9, 2026, and the Sources section links to it. That copy is the edition at the Department&rsquo;s own web address on that date.
    The Department&rsquo;s Notice 25-06 says there will be no rate reduction for tax year 2026. We did not find a newer withholding notice, but we could not browse the Department&rsquo;s notices page, so we cannot rule one out. The federal figures, Social Security wage base and Medicare thresholds are the 2026 ones.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The guide prints the withholding for 11,440 combinations of pay and allowances: ten grids, one for each pay period and filing table, each with 104 rows of pay and one column for each number of allowances from 0 to 10. We rebuilt every cell from the formula, using the middle of each pay row, and ${N("11,421")} matched to the dollar. Another ${N("19")} are off by a rounding edge or sit in a row that straddles the end of the ${N("0%")} step, where the guide prints ${N("$0")}. We also confirmed that every printed breakpoint for the weekly, biweekly, twice-a-month, monthly, quarterly, semiannual and daily tables equals the yearly breakpoint divided by the number of pay periods, rounded to the dollar. In the guide&rsquo;s own worked example, a married filer paid ${N("$2,000")} twice a month with three allowances has ${N("$41.44")} withheld, which rounds to ${N("$41")}, and we reproduce it.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department&rsquo;s formula. Your actual Kansas income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: dependents on Form K-4, a spouse who works, the extra withholding and exemption lines on the K-4, bonuses, rounding each check to the whole dollar, work in another state, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Kansas take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 federal and Kansas rates. The
  KS state tax column is Kansas income tax withholding; we found no Kansas payroll program to add.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Kansas take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">KS state tax</th>
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

    <h2>Kansas&rsquo;s three steps and the pay they apply to</h2>
    <p>The Department&rsquo;s yearly percentage table has three steps, and they apply to what is left of your pay after the allowance, not to your pay itself. For a single filer on ${N($(75000))}, that is ${N($(75000))} &minus; ${N($(AL.single))} = ${N($(imp75))}.
    The first ${N($(ZS))} of it is not taxed, the next ${N($(TS - ZS))} is taxed at ${N(pct(TAUX1))}, and every dollar above ${N($(TS))} is taxed at ${N(pct(TAUX2))}. For a single filer, that top step is reached at ${N($(PAIE_HAUT.s))} of yearly pay.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Kansas withholding tables, applied to pay after the allowance
      </caption>
      <thead>
        <tr>
          <th scope="col">Table</th>
          <th scope="col">0% step</th>
          <th scope="col">${pct(TAUX1)} step</th>
          <th scope="col">${pct(TAUX2)} step</th>
          <th scope="col">Tax at the top of the ${pct(TAUX1)} step</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_BAREMES}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The Department prints the same tables for each pay period, with the breakpoints scaled to the period. The employer applies them to the pay for that check after subtracting the allowance divided by the number of periods. The table below shows where the steps fall on each kind of paycheck, as the guide prints them.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Where the steps end, by pay period
      </caption>
      <thead>
        <tr>
          <th scope="col">Pay period</th>
          <th scope="col">Periods a year</th>
          <th scope="col">Single: 0% step ends at</th>
          <th scope="col">Single: top rate starts above</th>
          <th scope="col">Married: 0% step ends at</th>
          <th scope="col">Married: top rate starts above</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_PERIODES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>The withholding allowance: what changes with your Kansas K-4</h2>
    <p>Kansas does not use a standard deduction in its withholding formula. It uses an allowance, built from the personal exemption, and Form K-4 is how you tell your employer how many to apply. The first allowance, or the first two for a married person whose spouse has no income, is worth ${N($(AL.single))} each. Every allowance after that, such as one for a dependent, is worth ${N($(PERS))}. This is how the calculator maps its three choices.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Kansas withholding allowance by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Form K-4</th>
          <th scope="col">Used by this calculator for</th>
          <th scope="col">Allowances</th>
          <th scope="col">Yearly allowance</th>
          <th scope="col">Pay at which tax starts</th>
          <th scope="col">Pay at which ${pct(TAUX2)} starts</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The allowance comes off your pay before the table, so each extra ${N($(1000))} of allowance is worth ${N($$(1000 * TAUX2))} a year to anyone in the top step. A married couple where both spouses work should each mark &ldquo;Single&rdquo; on their own K-4, which takes ${N($(AL.single))} off each paycheck, the same as two single filers. If only one spouse has income and marks &ldquo;Joint,&rdquo; the ${N($(AL.marriedJoint))} allowance and the wider married table apply to that one paycheck.</p>

    <h2>If you commute to Kansas City, Missouri: how Kansas withholds</h2>
    <p>Kansas shares a long border with Missouri, and some people live on one side of the state line and work on the other. Two separate rules apply, one in each state, and this calculator models neither.</p>

    <h3>If you live in Kansas and work outside it</h3>
    <p>The Department&rsquo;s guide tells the employer of a Kansas resident working in another state to withhold the Kansas amount less the amount the other state requires. Its example is a Kansas resident working in Missouri: ${N("$250")} of Kansas tax on the wages, ${N("$130")} of Missouri withholding, and ${N("$120")} withheld for Kansas. If the other state&rsquo;s amount is larger, no Kansas tax is withheld.</p>

    <h3>If you live elsewhere and work in Kansas</h3>
    <p>For a nonresident who works full time in Kansas, the guide says the employer withholds Kansas tax on the total wages as if the employee were a Kansas resident. For someone who works both inside and outside Kansas, the employer figures the Kansas amount on all the wages and multiplies it by the share of the work done in Kansas.</p>

    <h3>Kansas City, Missouri has its own tax</h3>
    <p>Kansas City, Missouri charges a ${N("1%")} earnings tax. The city&rsquo;s guide for employers outside the city, who may withhold the tax voluntarily, says that once they register they must withhold it on the part of a nonresident&rsquo;s pay earned in the city. If all of a ${N($(75000))} salary were earned there, the tax would be ${N($$(loc75))} a year, or ${N($$(loc75 / 12))} a month, which would bring a single filer&rsquo;s take-home pay from ${N($(a75.net))} to about ${N($(netApresLocal))}. This calculator does not add it, because it cannot know where you work. The <a href="/paycheck-calculator/missouri/">Missouri calculator</a> explains the city taxes in detail.</p>

    <h2>Kansas hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Kansas your hours also matter because of the allowance: a single filer earning ${N($(PAIE_ZERO.s))} or less a year has nothing withheld.</p>

    <h3>What is $20 an hour after taxes in Kansas?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Kansas income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Kansas&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Kansas?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Kansas income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The Department&rsquo;s guide says Kansas withholding on supplemental pay, which includes bonuses, commissions and overtime pay, follows the method used for federal tax. When the pay is added to regular wages and the total is run through the tables, Kansas does the same. When it is stated separately and federal tax is a flat percentage of it, Kansas withholds ${N("5%")} of the gross payment.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Kansas take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year).</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Kansas take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Kansas</h2>

  <h3>The first ${$(ZS)} of what is left is not taxed</h3>
  <p>The table starts with a ${N("0%")} step. With the ${N($(AL.single))} allowance, a single filer&rsquo;s yearly pay has to pass ${N($(PAIE_ZERO.s))} before Kansas withholds anything. At ${N($(17000))}, Kansas withholds ${N($$(a17.etat))}; at ${N($(30000))}, it withholds ${N($$(a30.etat))} a year.</p>

  <h3>The ${pct(TAUX2)} step starts at ${$(PAIE_HAUT.s)} of pay</h3>
  <p>Kansas has only two rates, and they are close. The ${N(pct(TAUX1))} step covers ${N($(TS - ZS))} of taxable pay and produces ${N($$(BASE_S))} of tax. Compared with taxing all ${N($(TS))} at ${N(pct(TAUX2))}, it saves ${N($$(econ))} a year.
  Above ${N($(TS))}, each extra dollar is taxed at ${N(pct(TAUX2))}, whether your pay is ${N($(75000))} or ${N($(250000))}. For a single filer paid more than ${N($(PAIE_HAUT.s))}, Kansas withholding behaves like a flat ${N(pct(TAUX2))} on pay above the allowance, less a fixed ${N($$(econ))}.</p>

  <h3>The married table is wider, and the allowance doubles</h3>
  <p>A single filer&rsquo;s taxable pay is pay minus ${N($(AL.single))}. A married filer who marks &ldquo;Joint&rdquo; and enters 1 on lines B and C gets ${N($(AL.marriedJoint))} off and a table whose ${N("0%")} step runs to ${N($(ZM))} and whose ${N(pct(TAUX2))} step starts above ${N($(TM))}. That is why Kansas withholds ${N($$(j75.etat))} from that filer on ${N("$75,000")} and ${N($$(a75.etat))} from a single one. Taxable pay for the married filer is ${N($(jImp))}, of which ${N($(jAuDessus))} is above the ${N($(TM))} step.</p>

  <h3>Head of household has its own allowance</h3>
  <p>The guide says a head of household may claim one additional ${N($(PERS))} allowance, and the Department&rsquo;s Notice 25-07 says the same of the statute, so the calculator takes ${N($(AL.headOfHousehold))} off and uses the single filer&rsquo;s table, as the Department&rsquo;s tables do. On ${N("$75,000")}, taxable pay is ${N($(hImp))} and Kansas withholds ${N($$(h75.etat))}. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}. Line D of the K-4 says to enter ${N("2")}, which in the printed tables would take ${N($(HOH_K4))} off: taxable pay of ${N($(hImpK4))} and tax of ${N($$(hK4))}, which is ${N($$(ecartHoh))} less.</p>

  <h3>Each dependent is worth up to ${$$(valeurAlloc)} a year</h3>
  <p>Line E of the K-4 asks for the number of dependents you will claim, and each one is an allowance of ${N($(PERS))}. At the ${N(pct(TAUX2))} step that lowers yearly withholding by ${N($$(valeurAlloc))}; in the ${N(pct(TAUX1))} step it is ${N($$(valeurAllocBas))}. This calculator does not ask for dependents, so a worker with children who claims them on the K-4 will see less Kansas tax withheld than the figure shown.</p>

  <h3>No K-4 means no allowance</h3>
  <p>The guide says that if an employee does not complete a K-4, the employer must withhold at the single rate with no allowances. On ${N("$75,000")} that is ${N($$(sansAllocation))} a year instead of ${N($$(a75.etat))}, which is ${N($$(ecartSansAllocation))} more. A new hire who has not turned in the form can see a smaller paycheck than the figure on this page.</p>

  <h3>Your employer can round each check to the whole dollar</h3>
  <p>The guide says Kansas withholding computed with the percentage method may be rounded, dropping amounts under 50 cents and rounding 50 to 99 cents up. On ${N("$75,000")}, the yearly figure of ${N($$(a75.etat))} is ${N($$(mensuel75))} a month, which would be withheld as ${N($(Math.round(mensuel75)))}, and ${N($$(bimensuel75))} on a biweekly check, which would be withheld as ${N($(Math.round(bimensuel75)))}. This calculator does not round, so a real check can differ from its figure by up to 50 cents.</p>

  <h3>Unemployment insurance is your employer&rsquo;s cost</h3>
  <p>Kansas law (K.S.A. 44-710) says an employer&rsquo;s unemployment contributions &ldquo;shall not be deducted, in whole or in part, from the wages of individuals in such employer&rsquo;s employ.&rdquo; We did not find a state disability insurance or paid leave program run through payroll in the documents we read. That is a statement about what we read, not a guarantee that nothing else exists, and your pay stub is the final word.</p>

  <h3>Your 401(k) lowers your Kansas taxable wages in this calculator</h3>
  <p>The guide says Kansas withholding on deferred compensation plans follows the federal rules, and that contributions to such a plan are generally not subject to withholding. This calculator therefore starts from pay after a traditional 401(k) contribution, as it does for every state on this site. On ${N("$75,000")} with 6% going in, Kansas income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>The Department says there is no rate cut for 2026</h3>
  <p>The guide says its rates apply to wages paid on or after July 1, 2024, and the Department&rsquo;s Notice 25-06 says there will be no rate reduction for tax year 2026. A 2025 law provides for future cuts when state revenue passes a set test; the notice says the test was not met. We would update this page when the Department publishes new tables.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the allowance</h3>
  <p>Applying the table to the full ${N($(75000))} instead of ${N($(imp75))} overstates Kansas withholding by ${N($$(ecartSansAllocation))}: ${N($$(sansAllocation))} instead of ${N($$(a75.etat))}. That is also what an employer withholds if you never turn in a K-4.</p>

  <h3>Taxing everything at the top rate</h3>
  <p>The ${N(pct(TAUX2))} rate applies only above ${N($(TS))} of taxable pay for a single filer. Applying it to all of ${N($(imp75))} gives ${N($$(tauxUnique))}, which overstates withholding by ${N($$(ecartTauxUnique))}.</p>

  <h3>Checking &ldquo;Joint&rdquo; when your spouse has income</h3>
  <p>A married filer whose spouse also works should mark &ldquo;Single,&rdquo; not &ldquo;Joint.&rdquo; At ${N("$75,000")}, marking &ldquo;Joint&rdquo; anyway lowers withholding from ${N($$(a75.etat))} to ${N($$(j75.etat))}, which is ${N($$(ecartConjoint))} too little withheld over a year. The shortfall can show up as a balance due when you file.</p>

  <h3>Ignoring the Kansas City, Missouri tax</h3>
  <p>If you live in Kansas and work in Kansas City, Missouri, the city&rsquo;s earnings tax is ${N("1%")} of the pay you earn there, which would be ${N($$(loc75))} if all of a ${N("$75,000")} salary were earned in the city. This calculator&rsquo;s result does not include it.</p>

  <h3>Expecting round numbers on every check</h3>
  <p>Kansas employers may round each withholding to the whole dollar. A yearly figure divided by 12 or 26 will rarely come out to a whole dollar, so each stub can differ from this calculator by up to 50 cents.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances you claimed on your Form K-4 may differ from the
  one we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Kansas in 2026, with one allowance and no retirement
  contribution, under the Department&rsquo;s formula:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Kansas taxable pay: ${N($(a75.brut))} &minus; ${N($(AL.single))} allowance = ${N($(imp75))}</li>
    <li>Tax on the first ${N($(ZS))}: ${N($(ZS))} &times; ${N("0%")} = ${N("$0.00")}</li>
    <li>Tax on the next ${N($(TS - ZS))}: ${N($(TS - ZS))} &times; ${N(pct(TAUX1))} = ${N($$(tranche1))}</li>
    <li>Tax on the other ${N($(auDessus))}: ${N($(auDessus))} &times; ${N(pct(TAUX2))} = ${N($$(haut75))}</li>
    <li>Kansas income tax withholding: ${N($$(tranche1))} + ${N($$(haut75))} = ${N($$(a75.etat))}
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Kansas borders four states: Nebraska, Missouri, Oklahoma and Colorado. We have a calculator for all four.
  Missouri&rsquo;s row leaves out the Kansas City and St. Louis earnings taxes, as the other rows leave out their own local taxes.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a Kansas worker on the same salary, ${phraseVoisins}. A worker who lives in one of those states and commutes into Kansas, or the reverse, is a different case that this calculator does not model: it assumes a Kansas resident working in Kansas.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/nebraska/">Nebraska paycheck calculator</a> &mdash; the neighbor to the north.</li>
    <li><a href="/paycheck-calculator/missouri/">Missouri paycheck calculator</a> &mdash; the neighbor to the east, with rates from 0% to 4.7% and a 1% earnings tax in Kansas City and St. Louis.</li>
    <li><a href="/paycheck-calculator/oklahoma/">Oklahoma paycheck calculator</a> &mdash; the neighbor to the south.</li>
    <li><a href="/paycheck-calculator/colorado/">Colorado paycheck calculator</a> &mdash; the neighbor to the west.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Kansas ranks on one salary.</li>
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
    the Kansas Department of Revenue&rsquo;s withholding formula, and do not include dependents claimed on Form K-4 or any city income tax.
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

/* 1. Recoupement independant : la formule du guide ecrite ici A PARTIR DU TEXTE (p. 6 et 19-20), pas du moteur. */
const guide = (imposable, marie) => {
  const z = marie ? 8240 : 3605, t = marie ? 54240 : 26605;
  if (imposable <= z) return 0;
  if (imposable <= t) return (imposable - z) * 0.052;
  return (t - z) * 0.052 + (imposable - t) * 0.0558;
};
const fed75 = 7670, fedJ = 4640, fedH = 5748;
if (Math.abs(guide(75000 - 9160, false) - a75.etat) > 0.006) echec("KS 75 000 $ : guide " + guide(65840, false) + ", moteur " + a75.etat);
if (Math.abs(guide(75000 - 18320, true) - j75.etat) > 0.006) echec("KS marie 75 000 $ : guide " + guide(56680, true) + ", moteur " + j75.etat);
if (Math.abs(guide(75000 - 11480, false) - h75.etat) > 0.006) echec("KS chef de famille 75 000 $ : guide " + guide(63520, false) + ", moteur " + h75.etat);
if (Math.abs(guide(48000 - 18320, true) / 24 - 46.4533333) > 0.0006) echec("l'exemple du guide (2 allocations, 2 000 $ par quinzaine) ne se reproduit plus");
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (recalculee a la main le 20/10/2026). */
const attendusProse = [
  [a75.etat, 3385.313, "etat 75 000"], [imp75, 65840, "imposable 75 000"], [tranche1, 1196, "23 000 x 5,2 %"],
  [auDessus, 39235, "imposable au-dessus de 26 605 $"], [haut75, 2189.313, "39 235 x 5,58 %"],
  [a75.net, 58207.187, "net 75 000"], [a75.total, 16792.813, "total 75 000"],
  [j75.etat, 2528.152, "etat marie"], [jImp, 56680, "imposable marie"], [jAuDessus, 2440, "au-dessus de 54 240 $"], [j75.net, 62094.348, "net marie"],
  [h75.etat, 3255.857, "etat chef de famille"], [hImp, 63520, "imposable chef de famille"], [h75.net, 60258.643, "net chef de famille"],
  [hK4, 3126.401, "chef de famille, lecture du K-4"], [ecartHoh, 129.456, "ecart des deux lectures"],
  [a30.etat, 896.22, "etat 30 000"], [a17.etat, 220.22, "etat 17 000"],
  [sansAllocation, 3896.441, "sans allocation (aucun K-4)"], [ecartSansAllocation, 511.128, "ecart sans allocation"],
  [tauxUnique, 3673.872, "imposable x 5,58 %"], [ecartTauxUnique, 288.559, "ecart taux unique"],
  [econ, 288.559, "economie de la tranche a 5,2 %"], [ecartConjoint, 857.161, "ecart « Joint » alors que le conjoint travaille"],
  [valeurAlloc, 129.456, "2 320 x 5,58 %"], [valeurAllocBas, 120.64, "2 320 x 5,2 %"],
  [loc75, 750, "Kansas City 75 000"], [netApresLocal, 57457.187, "net apres l'impot de Kansas City"],
  [gain401, 251.1, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [mensuel75, 282.109, "mensuel"], [bimensuel75, 130.204346, "bimensuel"],
  [PAIE_ZERO.s, 12765, "paie au premier palier (celibataire)"], [PAIE_HAUT.s, 35765, "paie au second palier (celibataire)"],
  [PAIE_ZERO.h, 15085, "paie au premier palier (chef de famille)"], [PAIE_HAUT.h, 38085, "paie au second palier (chef de famille)"],
  [PAIE_ZERO.j, 26560, "paie au premier palier (marie)"], [PAIE_HAUT.j, 72560, "paie au second palier (marie)"]
];
/* 20 $/h = 41 600 $, imposable 32 440 : 1 196 + (32 440 - 26 605) x 5,58 % = 1 196 + 5 835 x 0,0558 = 1 196 + 325,593 = 1 521,593.
   25 $/h = 52 000 $, imposable 42 840 : 1 196 + 16 235 x 0,0558 = 1 196 + 905,913 = 2 101,913.
   30 $/h = 62 400 $, imposable 53 240 : 1 196 + 26 635 x 0,0558 = 1 196 + 1 486,233 = 2 682,233. */
attendusProse.push([h20.etat, 1521.593, "etat 20 $/h"], [h25.etat, 2101.913, "etat 25 $/h"], [h30.etat, 2682.233, "etat 30 $/h"]);
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(AL.single === 9160 && AL.marriedJoint === 18320 && AL.headOfHousehold === 11480 && HOH_K4 === 13800)) echec("allocations != 9 160 / 18 320 / 11 480 (13 800 au K-4)");
if (!(BS.length === 3 && BS[0][0] === 3605 && BS[0][1] === 0 && BS[1][0] === 26605 && BS[1][1] === 0.052 && BS[2][1] === 0.0558 && BM.length === 3 && BM[0][0] === 8240 && BM[1][0] === 54240)) echec("bareme != celui du guide");
for (const k of COMPARE.slice(1)) if (!R.states[k]) echec("voisin absent du moteur : " + k);
if (a75.programmes.length !== 0 || a75.paidLeave !== 0 || a75.waCares !== 0) echec("le Kansas ne doit avoir aucun programme salarie");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 2500) echec(motsProse + " mots hors tableaux, sous le plancher de 2 500");
if ((html.match(/<h3/g) || []).length < 30) echec("moins de 30 H3");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements du guide (formule imprimee ecrite a la main, 75 000 $ celibataire, marie et chef de famille, exemple imprime) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
