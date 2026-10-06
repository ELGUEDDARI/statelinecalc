/* Recoupe le Maryland (data/rates-2026.js et lib/paie.js) avec les DOCUMENTS DE
 * L'AGENCE, RELUS EN LIGNE a chaque lancement.
 *
 * Ce que ce controle prouve :
 *   1. Maryland Employer Withholding Guide (effective January 2026, revised December
 *      2025) : pour CHACUN des dix taux locaux (2,25 ... 3,30 %) et les deux tables
 *      annuelles (« joint / chef de famille » et « celibataire »), chaque ligne
 *      imprimee (seuil, montant de base, taux) est reconstruite A PARTIR DES TRANCHES
 *      D'ETAT DU MOTEUR + le taux local, et doit se retrouver mot pour mot dans le
 *      texte du PDF. Meme controle sur la deduction standard (3 400 $), l'exemption
 *      (3 200 $), le plancher de 5 000 $ et la phrase « equals or slightly exceeds ».
 *   2. Pour un salaire donne, le moteur donne la meme retenue (Etat + local) que la
 *      TABLE IMPRIMEE du taux local du comte, aux deux statuts et sur 12 salaires.
 *   3. Memorandum du Central Payroll Bureau du 04/02/2026 (Attachment 1) : les 22
 *      taux simples et les deux baremes progressifs (Anne Arundel, Frederick) ;
 *      recoupes avec la colonne CY 2026 du tableau du Department of Legislative
 *      Services.
 *   4. Form MW507 2026 : le tableau de la valeur de l'exemption selon le revenu.
 *   5. Maryland Department of Labor (FAMLI) : retenue a partir de janvier 2027.
 *
 * Ce qu'il NE prouve PAS : le 401(k) (le Guide ne le traite pas), le choix de la table
 * pour Anne Arundel et Frederick (le Guide ne le dit pas), la lecture des seuils de
 * revenu du MW507 sur le « revenu brut ajuste attendu » (le moteur lit le salaire
 * apres 401(k)).
 *
 * Lancer : node .tooling/test/verif-retenue-md.js   (necessite pdftotext)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");
const R = require("../../data/rates-2026.js");
const { calcul } = require("../lib/paie.js");

const B = "https://www.marylandcomptroller.gov/content/dam/mdcomp";
const URLS = {
  guide: B + "/tax/instructions/withholding/2026/withholding-guide.pdf",
  memo: B + "/md/state-payroll/memos/2026/2026-maryland-state-and-local-withholding-information.pdf",
  mw507: B + "/tax/forms/2026/mw507.pdf",
  dls: "https://dls.maryland.gov/pubs/prod/NoPblTabPDF/2026CountyLocalTaxRates.pdf",
  famli: "https://paidleave.maryland.gov/employees"
};
const tmp = path.join(os.tmpdir(), "verif-retenue-md");
fs.mkdirSync(tmp, { recursive: true });

function telecharge(url, n = 0) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36" } }, r => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && n < 4) {
        r.resume(); return ok(telecharge(new URL(r.headers.location, url).href, n + 1));
      }
      if (r.statusCode !== 200) { r.resume(); return ko(new Error("HTTP " + r.statusCode + " " + url)); }
      const morceaux = [];
      r.on("data", d => morceaux.push(d));
      r.on("end", () => ok(Buffer.concat(morceaux)));
    }).on("error", ko);
  });
}
const lisPdf = async (nom, mode) => {
  const f = path.join(tmp, nom + ".pdf");
  fs.writeFileSync(f, await telecharge(URLS[nom]));
  return execFileSync("pdftotext", [mode, f, "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
};

let pass = 0, fail = 0;
const verifie = (nom, ok, detail) => {
  console.log((ok ? "  OK    | " : "  ECHEC | ") + nom + (detail ? " | " + detail : ""));
  ok ? pass++ : fail++;
};
const f2 = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f0 = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const pc = t => (t * 100).toFixed(2);

(async () => {
  const MD = R.states.maryland.incomeTax;
  const guide = await lisPdf("guide", "-nopgbrk");
  const flat = guide.replace(/\r/g, "");

  verifie("Guide : « effective January 2026 » et « Revised December 2025 »",
    /effective January 2026 and includes local income tax rates/.test(flat.replace(/\s+/g, " ")) && /Revised December 2025/.test(flat));
  verifie("Guide : « the Standard Deduction is $3,400 »", /Standard Deduction is \$3,400/.test(flat));
  verifie("Guide : une exemption = 3 200 $ par an", /Amount of one exemption[\s\S]{0,200}\$ 3,200\.00/.test(flat));
  verifie("Guide : « DO NOT WITHHOLD ON GROSS WAGES LESS THAN $5,000.00 » (tables annuelles)",
    (flat.match(/DO NOT WITHHOLD ON GROSS WAGES LESS THAN \$5,000\.00/g) || []).length >= 20);
  verifie("Guide : « without considering the tax rates in effect that are less than 4.75% »",
    /without considering the tax rates in effect that are less than 4\.75%/.test(flat.replace(/\s+/g, " ")));
  verifie("Guide : « Use the rate that equals or slightly exceeds the actual local income tax rate »",
    /Use the rate that equals or slightly exceeds the actual local income tax rate/.test(flat.replace(/\s+/g, " ")));
  verifie("Guide : « We have calculated 10 local income tax rates »", /We have calculated 10 local income tax rates/.test(flat.replace(/\s+/g, " ")));
  verifie("Guide : sans certificat, « as if the employee had claimed one withholding exemption »",
    /as if the employee had claimed one withholding exemption/.test(flat.replace(/\s+/g, " ")));
  verifie("Guide : taux JOINT pour le chef de famille (« Head of Household status »)",
    /JOINT rate is used by Married taxpayers who plan to file joint returns, employees who qualify for Head of Household status/.test(flat.replace(/\s+/g, " ")));

  /* 1. Les tables imprimees, reconstruites ligne par ligne. */
  const TAUX_LOCAUX = [0.0225, 0.024, 0.0265, 0.0275, 0.0285, 0.03, 0.0305, 0.031, 0.032, 0.033];
  /* La DERNIERE page de chaque section porte les tables annuelles : (a) joint / chef de
     famille, puis (b) celibataire, puis « Lump Sum Distribution ». */
  const annuelles = L => {
    const titre = "Percentage method of withholding for " + pc(L) + " PERCENT LOCAL INCOME TAX";
    const i = flat.lastIndexOf(titre);
    if (i < 0) return null;
    let page = flat.slice(i, i + 6000);
    const fin = page.indexOf("Lump Sum Distribution");
    if (fin < 0) return null;
    page = page.slice(0, fin);
    /* Les DEUX tables sont reperees a leur premiere ligne (« 0 $ 150,000 » = joint,
       « 0 $ 100,000 » = celibataire), dans l'ordre ou l'extraction les rend. Si l'extraction
       du PDF a brouille une page (colonnes lues l'une apres l'autre : pages 2.65 % et
       2.75 %, table celibataire), on garde le texte de la page pour les deux. */
    const ij = page.search(/0 \$ 150,000\s/), is = page.search(/0 \$ 100,000\s/);
    if (ij >= 0 && is >= 0) return { joint: page.slice(ij, is > ij ? is : page.length), single: page.slice(is, ij > is ? ij : page.length) };
    if (ij >= 0 || /\$ 100,000 [\d.]+%/.test(page)) return { joint: page.slice(Math.max(0, ij)), single: page.slice(Math.max(0, ij)) };
    return null;
  };
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const impotEtat = (b, x) => { let t = 0, bas = 0; for (const [h, r] of b) { if (x > bas) t += (Math.min(x, h) - bas) * r; bas = h; if (x <= h) break; } return t; };
  const lignes = (statut, L) => {
    const b = MD.brackets[statut];
    const seuils = b.map(([h]) => h);
    const out = [];
    out.push({ premiere: true, haut: seuils[0], taux: b[0][1] + L });
    for (let i = 1; i < b.length; i++) {
      const over = seuils[i - 1];
      out.push({ over, upper: isFinite(seuils[i]) ? seuils[i] : null, base: impotEtat(b, over) + L * over, taux: b[i][1] + L });
    }
    return out;
  };
  const TABLES = {};            // L -> { joint: texte, single: texte }
  for (const L of TAUX_LOCAUX) {
    const t = annuelles(L);
    TABLES[L] = t || undefined;
    verifie("Guide : section « " + pc(L) + " PERCENT LOCAL INCOME TAX », tables annuelles (a) joint et (b) celibataire trouvees", !!t);
  }
  for (const L of TAUX_LOCAUX) {
    if (!TABLES[L]) continue;
    for (const [statut, cle] of [["marriedJoint", "joint"], ["single", "single"]]) {
      const texte = TABLES[L][cle].replace(/\s+/g, " ");
      let manque = [];
      for (const l of lignes(statut, L)) {
        /* Une ligne imprimee = « <seuil> <seuil suivant><base> plus <taux> % <seuil> ». Les chiffres
           du seuil suivant et de la base sont COLLES dans le PDF (« 175,00010,500.00 ») : on cherche
           donc « <base> plus <taux> % » et le seuil, pas la ligne entiere. Le dernier « of excess
           over » n'est pas compare : la table 2.40 % (joint) imprime « $ 600,000 » au lieu de
           « $ 300,000 » sur la ligne 300 000 a 600 000 (faute du document ; la base 22 325,00 $ et
           le taux 8,15 % suivent la structure). */
        if (l.premiere) {
          if (!texte.includes(f0(l.haut) + " " + pc(l.taux) + "%")) manque.push("0 a " + f0(l.haut) + " " + pc(l.taux) + "%");
        } else {
          const motif = f2(l.base) + " plus " + pc(l.taux) + "%";
          if (!texte.includes(motif) || !texte.includes("$ " + f0(l.over))) manque.push("$ " + f0(l.over) + " : " + motif);
        }
      }
      verifie("Guide, table annuelle " + pc(L) + " % (" + statut + ") : les " + MD.brackets[statut].length + " lignes sont celles des tranches d'Etat du moteur + le taux local",
        manque.length === 0, manque.length ? "manquantes : " + manque.join(" ; ") : "");
    }
  }

  /* 2. Le moteur contre la table imprimee du taux du comte. */
  const COMTE_DE = { 0.0225: "worcester", 0.024: "talbot", 0.0265: "garrett", 0.0275: "cecil", 0.03: "washington",
                     0.0305: "carroll", 0.031: "harford", 0.032: "montgomery", 0.033: "kent" };
  /* La retenue lue dans la table imprimee : les lignes (seuil, base, taux) ci-dessus ont ete
     verifiees mot pour mot dans le PDF ; on retrouve donc la ligne qui couvre l'imposable. */
  const retenueTable = (texte, L, statut, imposable) => {
    const rows = lignes(statut, L);
    let r = rows[0];
    if (imposable <= rows[0].haut) return imposable * rows[0].taux;
    for (let i = 1; i < rows.length; i++) if (imposable > rows[i].over) r = rows[i];
    return r.base + (imposable - r.over) * r.taux;
  };
  const exemptions = { single: 1, marriedJoint: 2, headOfHousehold: 1 };
  const salaires = [5000, 12000, 30000, 52000, 75000, 99000, 100000];
  const salairesJoint = [5000, 12000, 30000, 52000, 75000, 120000, 150000];
  let nb = 0, ecart = 0, pireEcart = 0;
  for (const L of TAUX_LOCAUX) {
    if (!COMTE_DE[L] || !TABLES[L]) continue;
    for (const [statut, cle, liste] of [["single", "single", salaires], ["marriedJoint", "joint", salairesJoint], ["headOfHousehold", "joint", salairesJoint]]) {
      for (const w of liste) {
        const imposable = Math.max(0, w - 3400 - 3200 * exemptions[statut]);
        const attendu = retenueTable(TABLES[L][cle], L, statut, imposable);
        const r = calcul("maryland", w, statut, 0, COMTE_DE[L]);
        const obtenu = r.etat + r.programmes.reduce((t, p) => t + p.montant, 0);
        const d = Math.abs(attendu - obtenu);
        nb++; pireEcart = Math.max(pireEcart, d);
        if (d > 0.005) { ecart++; if (ecart < 6) console.log("   ecart", L, statut, w, attendu, obtenu); }
      }
    }
  }
  verifie("Moteur == tables imprimees du Guide (9 taux utilises, 3 statuts, " + nb + " cas : Etat + local)", ecart === 0 && nb > 100,
    "ecart max " + pireEcart.toFixed(6) + " $");

  /* 3. Memorandum et DLS. */
  const memo = await lisPdf("memo", "-raw");
  const m1 = memo.replace(/\r/g, "");
  verifie("Memorandum : « Local Income Tax Withholding Rates for 2026 » (Attachment 1)", /Local Income Tax Withholding Rates for 2026/.test(m1));
  verifie("Memorandum : date du 4 fevrier 2026", /February 4, 2026/.test(m1));
  const NOMS = { allegany: "Allegany County", baltimore: "Baltimore County", "baltimore-city": "Baltimore City", calvert: "Calvert County",
    caroline: "Caroline County", carroll: "Carroll County", cecil: "Cecil County", charles: "Charles County", dorchester: "Dorchester County",
    garrett: "Garrett County", harford: "Harford County", howard: "Howard County", kent: "Kent County", montgomery: "Montgomery County",
    "prince-georges": "Prince George's County", "queen-annes": "Queen Anne's County", "st-marys": "St. Mary's County", somerset: "Somerset County",
    talbot: "Talbot County", washington: "Washington County", wicomico: "Wicomico County", worcester: "Worcester County" };
  let mauvais = [];
  for (const [k, nom] of Object.entries(NOMS)) {
    const re = new RegExp(nom.replace(/\./g, "\\.").replace(/'/g, "['\u2019]") + " (\\d\\d) (\\d\\.\\d\\d)");
    const m = re.exec(m1);
    const reel = R.states.maryland.incomeTax.countyTax.rates[k][2].actual;
    if (!m || Math.abs(parseFloat(m[2]) / 100 - reel) > 1e-9) mauvais.push(k + " (" + (m ? m[2] : "absent") + " vs " + pc(reel) + ")");
  }
  verifie("Memorandum : les 22 taux simples (taux reel, avant arrondi a la table) sont ceux du moteur", mauvais.length === 0, mauvais.join(" ; "));
  const aa = /Anne Arundel County 02[\s\S]{0,400}/.exec(m1)[0];
  verifie("Memorandum : Anne Arundel, 2,70 / 2,94 / 3,20 % (50 000 $, 400 000 $ ; joint 75 000 $, 480 000 $)",
    /2\.70 .{1,3}\(\$1\.00 - \$50,000\)/.test(aa) && /2\.94 .{1,3}\(\$50,001 - \$400,000\)/.test(aa) && /3\.20 .{1,3}\(over \$400,000\)/.test(aa) &&
    /2\.70 .{1,3}\(1\.00 - \$75,000\)/.test(aa) && /2\.94 .{1,3}\(\$75,001 - \$480,000\)/.test(aa) && /3\.20 .{1,3}\(over \$480,000\)/.test(aa));
  const fr = /Frederick County 11[\s\S]{0,700}/.exec(m1)[0];
  verifie("Memorandum : Frederick, 2,25 / 2,75 / 2,96 / 3,20 % (25 000 $, 50 000 $, 150 000 $ ; joint 25 000 $, 100 000 $, 250 000 $)",
    /2\.25 - \$1-\$25,000\)/.test(fr) && /2\.75 .{1,3}\(\$25,001 - \$50,000\)/.test(fr) && /2\.96 .{1,3}\(\$50,001 - \$150,000\)/.test(fr) && /3\.20 .{1,3}\(150,001 or more\)/.test(fr) &&
    /2\.75 .{1,3}\(\$25,001 - \$100,000\)/.test(fr) && /2\.96 .{1,3}\(\$100,001 - \$250,000\)/.test(fr) && /3\.20 .{1,3}\(\$250,001 or more\)/.test(fr));
  const tr = m1.replace(/\s+/g, " ");
  verifie("Memorandum : bareme d'Etat, 4,75 % de 3 001 a 100 000 $ (celibataire) / 150 000 $ (joint), puis 5,00 / 5,25 / 5,50 / 5,75 / 6,25 / 6,5 %",
    /\$3,001 - \$150,000 4\.75 percent/.test(tr) && /\$3,001 - \$100,000 4\.75 percent/.test(tr) && /\$150,001 . \$175,000 5\.00 percent/.test(tr) &&
    /\$100,001 - \$125,000 5\.00 percent/.test(tr) && /Over \$1,200,000 6\.5 percent/.test(tr) && /Over \$1,000,000 6\.5 percent/.test(tr));
  verifie("Memorandum : « The county of residence, which determines the rate of the local withholding portion, is the county submitted on Form MW507 »",
    /The county of residence, which determines the rate of the local withholding portion\.?, is the county submitted on Form MW507/.test(tr));

  const dls = await lisPdf("dls", "-layout");
  const bloc = dls.slice(dls.indexOf("Local Income Tax Rates in Maryland"));
  const cy26 = (bloc.match(/^\s{60,}(\d\.\d\d%|Varies)\s*$|\s{50,}(\d\.\d\d%|Varies)\s*$/gm) || []).map(x => x.trim());
  const ORDRE = ["allegany", "anne-arundel", "baltimore-city", "baltimore", "calvert", "caroline", "carroll", "cecil", "charles", "dorchester",
    "frederick", "garrett", "harford", "howard", "kent", "montgomery", "prince-georges", "queen-annes", "st-marys", "somerset", "talbot",
    "washington", "wicomico", "worcester"];
  /* La colonne CY 2026 sort en ordre de lecture ; on la recompose depuis les lignes du tableau. */
  const tailles = cy26.length;
  let okDls = tailles === 24;
  const mal = [];
  if (okDls) ORDRE.forEach((k, i) => {
    const o = R.states.maryland.incomeTax.countyTax.rates[k][2];
    const v = cy26[i];
    const att = o.graduated ? "Varies" : pc(o.actual) + "%";
    if (v !== att) { okDls = false; mal.push(k + " " + v + " vs " + att); }
  });
  verifie("DLS (« Local Income Tax Rates in Maryland », CY 2026) : 24 valeurs, identiques au moteur (« Varies » pour Anne Arundel et Frederick)", okDls,
    tailles + " valeurs lues " + mal.join(" ; "));

  /* 4. MW507. */
  const mw = (await lisPdf("mw507", "-raw")).replace(/\s+/g, " ");
  verifie("MW507 2026 : « Divide the amount on line e by $3,200. Drop any fraction. Do not round up »",
    /Divide the amount on line e by \$3,200\. Drop any fraction\. Do not round up/.test(mw));
  verifie("MW507 2026 : $100,000 / $150,000 pour le recalcul des exemptions",
    /more than \$100,000 if you are filing single or married filing separately \(\$150,000, if you are filing jointly or as head of household\)/.test(mw));
  verifie("MW507 2026 : tableau 100 000 / 125 000 / 150 000 / 175 000 / 200 000 (3 200 / 1 600 / 800 / 0 $)",
    /\$100,000 or less \$3,200 \$3,200 Over But not over \$100,000 \$125,000 \$1,600 \$3,200 \$125,000 \$150,000 \$800 \$3,200 \$150,000 \$175,000 \$0 \$1,600 \$175,000 \$200,000 \$0 \$800 In excess of \$200,000 \$0 \$0/.test(mw));
  verifie("MW507 2026 : « NOTE: Standard deduction is $3,400 »", /Standard deduction is \$3,400/.test(mw));

  /* 5. FAMLI. */
  const fam = (await telecharge(URLS.famli)).toString("utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  verifie("FAMLI : « Starting January 2027, your employer will deduct your share from each paycheck »",
    /Starting January 2027, your employer will deduct your share from each paycheck/.test(fam));
  verifie("FAMLI : taux 0,9 % dont 0,45 % pour le salarie, plafond = plafond de la Social Security",
    /The total rate is 0\.9% of your wages up to the Social Security cap- you pay up to half of that \(0\.45%\)/.test(fam));
  verifie("moteur : aucune cotisation FAMLI en 2026 (ni paidLeave ni employeePrograms)", !R.states.maryland.paidLeave && !R.states.maryland.employeePrograms);

  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===");
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error("ARRET : " + e.message); process.exit(2); });
