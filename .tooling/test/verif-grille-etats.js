/* Verifie que la grille des 50 Etats est REELLEMENT rendue en grille.
 *
 * Pourquoi ce fichier existe : du 28/08 au 02/09/2026, quatre pages generees
 * (Michigan, Pennsylvanie, Utah, Ohio) posaient <ul class="state-grid">, une
 * classe qui n'existe nulle part dans assets/style.css. Les six autres pages
 * utilisaient .linkgrid, la vraie. Un nom de classe inconnu ne provoque aucune
 * erreur : la CSS l'ignore, le HTML reste valide, les tests passent — et la
 * grille tombe en simple liste a puces sur une colonne. Mesure sur le site
 * servi le 02/09 : Ohio 1402 px de haut en display:block, Florida 352 px en
 * grille 5 colonnes. Quatre fois plus long, et personne ne le signale.
 *
 * On ne verifie donc pas le nom de la classe, qui peut changer : on verifie ce
 * que le navigateur FAIT de la liste.
 *
 * Lancer : node .tooling/test/verif-grille-etats.js [--servi]
 */
const http = require("http"); const fs = require("fs"); const path = require("path");
const { chromium } = require("playwright");
const RACINE = "c:/Users/sland/Desktop/STATELINECALC"; const PORT = 8795;
const T = { ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript",
            ".svg":"image/svg+xml", ".png":"image/png", ".ico":"image/x-icon" };
const srv = http.createServer((q,r)=>{ let p=decodeURIComponent(q.url.split("?")[0]);
  if(p.endsWith("/"))p+="index.html"; const f=path.join(RACINE,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
  r.writeHead(200,{"Content-Type":T[path.extname(f)]||"text/plain"}); r.end(fs.readFileSync(f)); });
(async()=>{
  await new Promise(r=>srv.listen(PORT,r));
  const nav = await chromium.launch({headless:true});
  const page = await nav.newPage({viewport:{width:1280,height:900}});
  const SERVI = process.argv.includes("--servi");
  const BASE = SERVI ? "https://statelinecalc.com" : "http://localhost:" + PORT;
  let fail = 0;
  /* La liste vient de .tooling/lib/etats-publies.js, source unique. Elle etait
     codee en dur ici : le 05/09/2026 Hawaii a ete publie et le test ne l'a pas
     vu passer, exactement comme le titre "$52,000" code en dur dans
     test-rate-page-local.js. Un test qui ignore les pages neuves ne protege
     que les anciennes. */
  const { PUBLIES } = require("../lib/etats-publies.js");
  const ETATS_TESTES = Object.values(PUBLIES);
  for (const e of ETATS_TESTES) {
    await page.goto(BASE+"/paycheck-calculator/"+e+"/", {waitUntil:"networkidle"});
    const d = await page.evaluate(()=>{
      const ul=[...document.querySelectorAll("ul")].find(u=>u.textContent.includes("Wyoming"));
      if(!ul) return {trouve:false};
      const cs=getComputedStyle(ul);
      return {trouve:true, classe:ul.className, display:cs.display,
              colonnes:(cs.gridTemplateColumns||"none").split(" ").length,
              gabarit:(cs.gridTemplateColumns||"none").slice(0,60), hauteur:Math.round(ul.getBoundingClientRect().height)};
    });
    const ok = d.trouve && d.display === "grid" && d.colonnes === 5;
    if (!ok) fail++;
    console.log("  %s | %s | %s | %s colonnes | %s px de haut",
      ok ? "OK   " : "ECHEC", e.padEnd(14), d.display, d.colonnes, d.hauteur);
  }
  await nav.close(); srv.close();
  console.log("\n=== GRILLE DES 50 ETATS" + (SERVI ? " (SERVI)" : " (LOCAL)")
    + " : " + (ETATS_TESTES.length - fail) + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
