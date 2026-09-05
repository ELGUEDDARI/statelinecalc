/* Fabrique le SVG de la carte des Etats-Unis a partir des frontieres OFFICIELLES.
 *
 * ── LA SOURCE ET SA LICENCE ─────────────────────────────────────────────────
 * US Census Bureau, Cartographic Boundary Files, edition 2023, resolution 1:20m
 * https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_state_20m.zip
 * Telecharge le 05/09/2026, HTTP 200, 186 432 octets.
 *
 * C'est une oeuvre du gouvernement federal americain : elle est dans le DOMAINE
 * PUBLIC en vertu du 17 U.S.C. § 105. Aucune attribution n'est due, aucune
 * licence ne s'applique, et rien n'est emprunte a un tiers.
 * ⛔ C'est la raison pour laquelle on convertit soi-meme plutot que de prendre un
 * SVG tout fait sur le web : la plupart des cartes qui circulent sont sous
 * CC BY-SA, qui obligerait a publier le site sous la meme licence.
 *
 * ── CE QUE FAIT CE SCRIPT ───────────────────────────────────────────────────
 * Lit le shapefile a la main (le format est documente et simple : en-tete de
 * 100 octets, puis des enregistrements de type 5 = polygone), projette en Albers
 * conique equivalente — la projection standard pour une carte des Etats-Unis,
 * celle qui ne deforme pas les surfaces — repositionne l'Alaska et Hawaii comme
 * le fait toute carte americaine, simplifie les contours par Douglas-Peucker,
 * puis ecrit un chemin SVG par Etat avec son code postal en attribut.
 *
 * Aucun outil externe : ni ogr2ogr, ni mapshaper, ni topojson. Aucun n'est
 * installe sur cette machine et aucun n'est necessaire.
 *
 * Lancer : node .tooling/ops/construit-carte-usa.js
 * Sortie : .tooling/lib/carte-usa.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const RACINE = path.join(__dirname, "..", "..");
const TRAVAIL = process.env.CARTE_SRC ||
  "C:/Users/sland/AppData/Local/Temp/claude/c--Users-sland-Desktop-STATELINECALC/" +
  "d26c8557-0d39-4cf4-a79f-3fca8fdb12c2/scratchpad/census";

const SHP = path.join(TRAVAIL, "cb_2023_us_state_20m.shp");
const DBF = path.join(TRAVAIL, "cb_2023_us_state_20m.dbf");

/* ---- 1. le .dbf : une table dBASE III, en-tete de 32 octets + 32 par champ --- */
function lireDbf(fichier) {
  const b = fs.readFileSync(fichier);
  const nbEnr = b.readUInt32LE(4);
  const debutDonnees = b.readUInt16LE(8);
  const tailleEnr = b.readUInt16LE(10);
  const champs = [];
  for (let o = 32; b[o] !== 0x0D; o += 32) {
    champs.push({ nom: b.toString("latin1", o, o + 11).replace(/\0.*$/, ""), taille: b[o + 16] });
  }
  const lignes = [];
  for (let i = 0; i < nbEnr; i++) {
    let o = debutDonnees + i * tailleEnr + 1;   /* +1 : octet de suppression */
    const l = {};
    for (const c of champs) { l[c.nom] = b.toString("latin1", o, o + c.taille).trim(); o += c.taille; }
    lignes.push(l);
  }
  return lignes;
}

/* ---- 2. le .shp : en-tete 100 octets, puis des enregistrements ------------- */
function lireShp(fichier) {
  const b = fs.readFileSync(fichier);
  const formes = [];
  let o = 100;
  while (o < b.length) {
    const longueurMots = b.readInt32BE(o + 4);          /* en mots de 16 bits */
    const debut = o + 8;
    const type = b.readInt32LE(debut);
    if (type === 5) {                                    /* Polygon */
      const nbParties = b.readInt32LE(debut + 36);
      const nbPoints  = b.readInt32LE(debut + 40);
      const parties = [];
      for (let i = 0; i < nbParties; i++) parties.push(b.readInt32LE(debut + 44 + i * 4));
      const oPoints = debut + 44 + nbParties * 4;
      const pts = [];
      for (let i = 0; i < nbPoints; i++) {
        pts.push([b.readDoubleLE(oPoints + i * 16), b.readDoubleLE(oPoints + i * 16 + 8)]);
      }
      const anneaux = [];
      for (let i = 0; i < nbParties; i++) {
        anneaux.push(pts.slice(parties[i], i + 1 < nbParties ? parties[i + 1] : nbPoints));
      }
      formes.push(anneaux);
    } else formes.push([]);
    o = debut + longueurMots * 2;
  }
  return formes;
}

/* ---- 3. Albers conique equivalente ----------------------------------------
   Paralleles standard 29°30' et 45°30', origine 96°O / 23°N : les parametres
   employes par l'USGS pour les 48 Etats contigus. On garde les surfaces justes,
   ce qui compte quand la carte sert a comparer des Etats entre eux. */
function albers(lon, lat, lon0, lat0, p1, p2) {
  const r = Math.PI / 180;
  const [f1, f2, l0, o0] = [p1 * r, p2 * r, lon0 * r, lat0 * r];
  const n = (Math.sin(f1) + Math.sin(f2)) / 2;
  const C = Math.cos(f1) * Math.cos(f1) + 2 * n * Math.sin(f1);
  const p = Math.sqrt(C - 2 * n * Math.sin(lat * r)) / n;
  const p0 = Math.sqrt(C - 2 * n * Math.sin(o0)) / n;
  const t = n * (lon * r - l0);
  return [p * Math.sin(t), p0 - p * Math.cos(t)];
}

/* ---- 4. Douglas-Peucker ----------------------------------------------------
   Sans simplification le SVG pese plus de 500 Ko. La tolerance est reglee pour
   que la silhouette reste juste a l'oeil : la Floride garde sa pointe, le cap
   Cod reste visible, la baie de Chesapeake ne se referme pas. */
function simplifie(pts, tol) {
  if (pts.length < 3) return pts;
  const d2 = (p, a, b) => {
    const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 0) return (x - x1) ** 2 + (y - y1) ** 2;
    let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return (x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2;
  };
  const garde = new Array(pts.length).fill(false);
  garde[0] = garde[pts.length - 1] = true;
  const pile = [[0, pts.length - 1]];
  const tol2 = tol * tol;
  while (pile.length) {
    const [i, j] = pile.pop();
    let max = 0, idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = d2(pts[k], pts[i], pts[j]);
      if (d > max) { max = d; idx = k; }
    }
    if (max > tol2 && idx > 0) { garde[idx] = true; pile.push([i, idx], [idx, j]); }
  }
  return pts.filter((_, i) => garde[i]);
}

/* ---- 5. assemblage ---------------------------------------------------------- */
const meta = lireDbf(DBF);
const formes = lireShp(SHP);
if (meta.length !== formes.length) throw new Error("dbf et shp desynchronises");

/* Les cinq territoires n'ont pas de page et ne sont pas des Etats : Porto Rico,
   Guam, Samoa americaines, Iles Vierges, Mariannes du Nord. Le district de
   Columbia n'est pas un Etat non plus, mais il a une fiscalite propre et
   figurera sur la carte le jour ou il aura une page. */
const HORS = new Set(["PR", "GU", "AS", "VI", "MP"]);

/* Alaska et Hawaii : deplaces sous le sud-ouest, comme sur toute carte
   americaine. Sans ca l'Alaska occupe la moitie du cadre et Hawaii sort a
   3 000 km au large.
   ⛔ On donne une BOITE CIBLE, pas un facteur et deux decalages. Premiere
   version le 05/09/2026 : reglages a tatons, l'Alaska sortait a gauche en x
   negatif et Hawaii tombait 236 px sous le bas du cadre. Une boite cible se
   verifie toute seule — l'Etat y entre ou il n'y entre pas. */
const BOITES = {
  AK: { x: 18,  y: 372, w: 190, h: 150 },
  HI: { x: 232, y: 470, w: 100, h: 55  }
};

const etats = [];
for (let i = 0; i < meta.length; i++) {
  const ab = meta[i].STUSPS, nom = meta[i].NAME;
  if (!ab || HORS.has(ab) || !formes[i].length) continue;
  const p = ab === "AK" ? [-152, 60, -152, 55, 65]
          : ab === "HI" ? [-157, 20, -157, 18, 22]
          : [-96, 23, 29.5, 45.5];
  const anneaux = formes[i].map(anneau =>
    anneau.map(([lon, lat]) => ab === "AK" || ab === "HI"
      ? albers(lon, lat, p[0], p[1], p[3], p[4])
      : albers(lon, lat, -96, 23, 29.5, 45.5)));
  etats.push({ ab, nom, anneaux });
}

/* Cadre commun, calcule sur les 48 contigus seulement : laisser l'Alaska brut
   entrer dans le calcul ecraserait tout le reste. */
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const e of etats) {
  if (e.ab === "AK" || e.ab === "HI") continue;
  for (const a of e.anneaux) for (const [x, y] of a) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
const LARGEUR = 960, HAUTEUR = 600, MARGE = 10;
const echelle = Math.min((LARGEUR - 2 * MARGE) / (maxX - minX), (HAUTEUR - 2 * MARGE) / (maxY - minY));
const decX = MARGE + ((LARGEUR - 2 * MARGE) - (maxX - minX) * echelle) / 2;
const decY = MARGE + ((HAUTEUR - 2 * MARGE) - (maxY - minY) * echelle) / 2;

/* ⛔ L'AXE Y S'INVERSE. En Albers, y croit vers le NORD ; dans un SVG, y croit
   vers le BAS. Premiere generation, le 05/09/2026 : les Etats-Unis a l'envers,
   le Maine en bas a droite et la Floride pointant vers le haut. Un chiffre de
   sortie correct — 51 Etats, 27 Ko — ne prouvait rien du tout ; il a fallu
   regarder l'image. On soustrait donc de maxY au lieu d'ajouter a minY. */
const versEcran = (x, y) => [ (x - minX) * echelle + decX, (maxY - y) * echelle + decY ];

const TOLERANCE = 1.1;   /* en pixels du cadre 960x600 */
let totalPts = 0, gardesPts = 0;
const chemins = [];
for (const e of etats) {
  const boite = BOITES[e.ab];
  /* Pour l'Alaska et Hawaii : on projette d'abord, on mesure l'encombrement
     obtenu, puis on le fait entrer dans sa boite en gardant les proportions. */
  let ajuste = null;
  if (boite) {
    let aX = Infinity, bX = -Infinity, aY = Infinity, bY = -Infinity;
    for (const a of e.anneaux) for (const [x, y] of a) {
      const [px, py] = versEcran(x, y);
      if (px < aX) aX = px; if (px > bX) bX = px;
      if (py < aY) aY = py; if (py > bY) bY = py;
    }
    const k = Math.min(boite.w / (bX - aX), boite.h / (bY - aY));
    ajuste = { k, aX, aY, bX, bY, boite };
  }
  let d = "";
  for (const anneau of e.anneaux) {
    let pts = anneau.map(([x, y]) => {
      let [px, py] = versEcran(x, y);
      if (ajuste) {
        const { k, aX, aY, bX, bY, boite } = ajuste;
        px = boite.x + (px - aX) * k + (boite.w - (bX - aX) * k) / 2;
        py = boite.y + (py - aY) * k + (boite.h - (bY - aY) * k) / 2;
      }
      return [px, py];
    });
    totalPts += pts.length;
    pts = simplifie(pts, TOLERANCE);
    gardesPts += pts.length;
    if (pts.length < 3) continue;
    d += "M" + pts.map(([x, y]) => x.toFixed(1) + "," + y.toFixed(1)).join("L") + "Z";
  }
  if (d) chemins.push({ ab: e.ab, nom: e.nom, d });
}
chemins.sort((a, b) => a.nom.localeCompare(b.nom));

const sortie =
`/* CARTE DES ETATS-UNIS — genere, ne pas modifier a la main.
 *
 * Produit par .tooling/ops/construit-carte-usa.js le ${new Date().toISOString().slice(0, 10)}.
 * Source : US Census Bureau, Cartographic Boundary Files 2023, resolution 1:20m.
 * Oeuvre du gouvernement federal americain, DOMAINE PUBLIC (17 U.S.C. § 105).
 * Projection Albers conique equivalente, paralleles 29.5 et 45.5, origine 96°O.
 * Alaska et Hawaii repositionnes selon l'usage cartographique americain.
 * Contours simplifies par Douglas-Peucker : ${totalPts} points ramenes a ${gardesPts}.
 *
 * Pour regenerer : relancer le script. Ne jamais editer les chemins a la main.
 */
const CADRE = { largeur: ${LARGEUR}, hauteur: ${HAUTEUR} };
const CHEMINS = ${JSON.stringify(chemins, null, 0)};
module.exports = { CADRE, CHEMINS };
`;

const dest = path.join(RACINE, ".tooling", "lib", "carte-usa.js");
fs.writeFileSync(dest, sortie);
console.log("ECRIT : .tooling/lib/carte-usa.js  (" + fs.statSync(dest).size + " octets)");
console.log("  " + chemins.length + " Etats");
console.log("  " + totalPts + " points -> " + gardesPts + " apres simplification (" +
            (100 - gardesPts / totalPts * 100).toFixed(1) + " % en moins)");
console.log("  cadre " + LARGEUR + "x" + HAUTEUR);
