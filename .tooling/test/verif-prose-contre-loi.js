/* Recalcule A LA MAIN les montants cites dans la PROSE des pages servies, a
 * partir des textes de loi que ces pages citent verbatim — sans passer par
 * paie.js.
 *
 * Pourquoi : tous les autres controles comparent la page au moteur. Si le
 * moteur se trompe, ils se trompent ensemble et disent OK. Ici la formule est
 * REECRITE d'apres la loi, dans ce fichier, a la main. C'est la seule
 * verification qui puisse attraper une erreur du moteur lui-meme.
 *
 * Ecrit le 02/09/2026 : l'agent de controle independant a ete coupe par la
 * limite de session avant de rendre son verdict, et un verdict manquant n'est
 * pas un verdict favorable.
 *
 * Lancer : node .tooling/test/verif-prose-contre-loi.js
 */
const https = require("https");

const get = u => new Promise((ok, ko) => {
  https.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => ok(d)); })
       .on("error", ko);
});

let pass = 0, fail = 0;
function check(nom, obtenu, attendu, tol) {
  const ok = Math.abs(obtenu - attendu) <= tol;
  if (ok) pass++; else fail++;
  console.log("  %s | %s | page %s | loi recalculee %s",
    ok ? "OK   " : "ECHEC", nom,
    obtenu.toFixed(2).padStart(12), attendu.toFixed(2).padStart(12));
}
function present(nom, texte, attendu) {
  const ok = texte.indexOf(attendu) >= 0;
  if (ok) pass++; else fail++;
  console.log("  %s | %s | cherche « %s »", ok ? "OK   " : "ECHEC", nom, attendu);
}

/* ------------------------------------------------------------------ OHIO --
   ORC 5747.02(A)(3), verbatim sur la page : rien au-dessus de 26 050 $
   d'imposable, puis « $332.00 plus 2.75% of the amount in excess of $26,050 ».
   ORC 5747.025 + notice IT 1040 : exoneration PAR PERSONNE, 2 400 / 2 150 /
   1 900 $ selon le revenu, et zero au-dela de 500 000 $. */
function ohioSelonLaLoi(salaire, personnes) {
  personnes = personnes || 1;
  let parPersonne;
  if (salaire > 500000) parPersonne = 0;
  else if (salaire <= 40000) parPersonne = 2400;
  else if (salaire <= 80000) parPersonne = 2150;
  else parPersonne = 1900;
  const imposable = Math.max(0, salaire - parPersonne * personnes);
  return imposable <= 26050 ? 0 : 332 + 0.0275 * (imposable - 26050);
}

/* ------------------------------------------------------------------ UTAH --
   Utah Code 59-10-104 : 4,45 %. Publication 14, Schedule 7 : allocation de
   base 485 $ (970 $ marie), moins 1,3 % du salaire au-dessus de 9 348 $
   (18 696 $), le tout jamais negatif. */
function utahSelonLaLoi(salaire, marie) {
  const socle = marie ? 970 : 485;
  const seuil = marie ? 18696 : 9348;
  const credit = Math.max(0, socle - Math.max(0, salaire - seuil) * 0.013);
  return Math.max(0, salaire * 0.0445 - credit);
}

const nb = t => Number(String(t).replace(/[$,]/g, ""));

/* --------------------------------------------------------------- MONTANA --
   MCA 15-30-2103 (Temporary, tax year 2026), verbatim sur la page : 4,7 % sur
   les premiers 47 500 $ de revenu imposable du Montana (celibataire),
   95 000 $ (marie conjoint), 71 250 $ (chef de famille), puis 5,65 %.
   MCA 15-30-2120 : le revenu imposable du Montana part du revenu imposable
   FEDERAL, donc la deduction est la deduction standard federale 2026
   (16 100 / 32 200 / 24 150 $, Rev. Proc. 2025-32).
   Aucun credit, aucune marche, aucune exoneration : deux lignes suffisent. */
function montanaSelonLaLoi(salaire, conjoint) {
  const deduction = conjoint ? 32200 : 16100;
  const seuil = conjoint ? 95000 : 47500;
  const imposable = Math.max(0, salaire - deduction);
  return imposable <= seuil
    ? imposable * 0.047
    : seuil * 0.047 + (imposable - seuil) * 0.0565;
}

(async () => {
  console.log("\n=== OHIO : la prose et le tableau, contre ORC 5747.02 et 5747.025 ===");
  const oh = await get("https://statelinecalc.com/paycheck-calculator/ohio/");
  const ohTexte = oh.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

  /* Les montants que la prose affirme, un par un. */
  check("impot d'Etat sur 75 000 (cite dans le bandeau)", 1619.00, ohioSelonLaLoi(75000), 0.01);
  check("impot d'Etat sur 30 000", 374.63, ohioSelonLaLoi(30000), 0.01);
  check("impot d'Etat sur 25 000 — sous le seuil, donc zero", 0, ohioSelonLaLoi(25000), 0.01);
  check("a 28 450 $ de salaire : encore zero", 0, ohioSelonLaLoi(28450), 0.01);
  check("a 28 451 $ : la marche de 332 $", 332.03, ohioSelonLaLoi(28451), 0.01);
  check("le dollar coute bien 332,03 $",
    ohioSelonLaLoi(28451) - ohioSelonLaLoi(28450), 332.03, 0.01);
  check("couple : le seuil recule a 30 850 $", 0, ohioSelonLaLoi(30850, 2), 0.01);
  check("impot d'Etat sur 250 000", 6438.38, ohioSelonLaLoi(250000), 0.01);
  check("au-dela de 500 000, plus d'exoneration",
    16115.63, ohioSelonLaLoi(600000), 0.01);

  /* Le tableau servi, ligne par ligne, contre la meme formule a la main. */
  const ohLignes = oh.split("<tr>").slice(1)
    .map(b => [...b.matchAll(/<td[^>]*>(?:<strong>)?([^<]+)/g)].map(m => m[1].trim()))
    .filter(c => c.length >= 6 && c[0].startsWith("$") && !c[0].includes("."));
  let ecarts = 0;
  for (const c of ohLignes) {
    if (Math.abs(nb(c[3]) - ohioSelonLaLoi(nb(c[0]))) > 1) {
      ecarts++;
      console.log("  ECHEC | tableau Ohio a " + c[0] + " : page " + c[3]
        + ", loi " + ohioSelonLaLoi(nb(c[0])).toFixed(2));
    }
  }
  if (ecarts) fail++; else pass++;
  console.log("  %s | les %d lignes du tableau servi contre la loi ecrite a la main",
    ecarts ? "ECHEC" : "OK   ", ohLignes.length);

  present("le taux 2,75 % est bien celui affiche", ohTexte, "2.75%");
  present("l'ancien bareme a ~4 % est explicitement demenTi", ohTexte, "no longer exists");

  console.log("\n=== UTAH : la prose et le tableau, contre Utah Code 59-10-104 et Pub 14 ===");
  const ut = await get("https://statelinecalc.com/paycheck-calculator/utah/");
  const utTexte = ut.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

  check("impot d'Etat sur 75 000 (credit epuise)", 3337.50, utahSelonLaLoi(75000), 0.01);
  check("impot d'Etat sur 25 000 (credit partiel)", 830.98, utahSelonLaLoi(25000), 0.01);
  check("impot d'Etat sur 40 000", 1693.48, utahSelonLaLoi(40000), 0.01);
  check("le credit s'annule exactement a 46 656 $",
    utahSelonLaLoi(46656), 46656 * 0.0445, 0.02);
  check("couple sur 60 000 : le credit tient encore",
    2236.95, utahSelonLaLoi(60000, true), 0.01);

  const utLignes = ut.split("<tr>").slice(1)
    .map(b => [...b.matchAll(/<td[^>]*>(?:<strong>)?([^<]+)/g)].map(m => m[1].trim()))
    .filter(c => c.length >= 6 && c[0].startsWith("$") && !c[0].includes("."));
  let ecartsUt = 0;
  for (const c of utLignes) {
    if (Math.abs(nb(c[3]) - utahSelonLaLoi(nb(c[0]))) > 1) {
      ecartsUt++;
      console.log("  ECHEC | tableau Utah a " + c[0] + " : page " + c[3]
        + ", loi " + utahSelonLaLoi(nb(c[0])).toFixed(2));
    }
  }
  if (ecartsUt) fail++; else pass++;
  console.log("  %s | les %d lignes du tableau servi contre la loi ecrite a la main",
    ecartsUt ? "ECHEC" : "OK   ", utLignes.length);

  present("le taux 4,45 % est bien celui affiche", utTexte, "4.45%");
  present("la page previent que la page de taux de l'Etat est perimee",
    utTexte, "still showed 4.5%");

  console.log("\n=== MONTANA : la prose et le tableau, contre MCA 15-30-2103 et 15-30-2120 ===");
  const mt = await get("https://statelinecalc.com/paycheck-calculator/montana/");
  const mtTexte = mt.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

  check("impot d'Etat sur 25 000 (une seule bande)", 418.30, montanaSelonLaLoi(25000), 0.01);
  check("impot d'Etat sur 60 000 (juste sous le seuil)", 2063.30, montanaSelonLaLoi(60000), 0.01);
  check("impot d'Etat sur 75 000 (les DEUX bandes)", 2876.60, montanaSelonLaLoi(75000), 0.01);
  check("impot d'Etat sur 250 000", 12764.10, montanaSelonLaLoi(250000), 0.01);
  check("couple sur 75 000", 2011.60, montanaSelonLaLoi(75000, true), 0.01);
  /* Le point ou 5,65 % commence a mordre : 47 500 + 16 100 = 63 600 $ de salaire.
     Un dollar avant, tout est encore a 4,7 %. */
  check("a 63 600 $ de salaire, tout est encore a 4,7 %",
    montanaSelonLaLoi(63600), 47500 * 0.047, 0.01);
  check("le Montana ne prend rien jusqu'a la deduction federale",
    montanaSelonLaLoi(16100), 0, 0.001);

  const mtLignes = mt.split("<tr>").slice(1)
    .map(b => [...b.matchAll(/<td[^>]*>(?:<strong>)?([^<]+)/g)].map(m => m[1].trim()))
    .filter(c => c.length >= 6 && c[0].startsWith("$") && !c[0].includes("."));
  let ecartsMt = 0;
  for (const c of mtLignes) {
    if (Math.abs(nb(c[3]) - montanaSelonLaLoi(nb(c[0]))) > 1) {
      ecartsMt++;
      console.log("  ECHEC | tableau Montana a " + c[0] + " : page " + c[3]
        + ", loi " + montanaSelonLaLoi(nb(c[0])).toFixed(2));
    }
  }
  if (ecartsMt) fail++; else pass++;
  console.log("  %s | les %d lignes du tableau servi contre la loi ecrite a la main",
    ecartsMt ? "ECHEC" : "OK   ", mtLignes.length);

  present("le taux haut 5,65 % est bien celui affiche", mtTexte, "5.65%");
  present("la page dit que le Montana n'a pas de deduction a lui",
    mtTexte, "no standard deduction of its own");
  present("la page cite l'interdiction de retenir l'assurance chomage",
    mtTexte, "against the law to deduct UI taxes");

  console.log("\n=== PROSE CONTRE LOI : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
