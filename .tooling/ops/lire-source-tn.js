/* Lit les sources officielles du Tennessee dans un VRAI navigateur.
 * Pourquoi : tn.gov coupe la connexion (ECONNRESET) sur toute requete
 * automatique — WebFetch et curl echouent tous les deux, et la Wayback
 * Machine n'a aucun instantane de la page. Meme famille de probleme que
 * statutes.capitol.texas.gov (coquille JavaScript) et michigan.gov (403).
 * Profil jetable : aucune session, aucun cookie de compte.
 * ⛔ LECTURE SEULE. */
const { chromium } = require('C:/Users/sland/Desktop/SHOPFY NERVOLAXE/node_modules/playwright');
const fs = require('fs');
const OUT = 'C:/Users/sland/Desktop/STATELINECALC/.tooling/ops';
const PROFIL = 'C:/Users/sland/AppData/Local/Temp/claude/profil-lecture-gov';
const L = []; const log = s => { console.log(s); L.push(s); fs.writeFileSync(OUT + '/source-tn.log', L.join('\n'), 'utf8'); };
const PAGES = [
  ['HALL',   'https://www.tn.gov/revenue/taxes/hall-income-tax.html'],
  ['TAXES',  'https://www.tn.gov/revenue/taxes.html'],
  ['UI',     'https://www.tn.gov/workforce/employers/tax-and-insurance-redirect/unemployment-insurance-tax.html'],
];
(async () => {
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: { width: 1400, height: 950 }, locale: 'en-US',
    args: ['--disable-blink-features=AutomationControlled'] });
  const p = ctx.pages()[0] || await ctx.newPage();
  for (const [nom, url] of PAGES) {
    try {
      const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await p.waitForTimeout(9000);
      const d = await p.evaluate(() => ({ url: location.href, titre: document.title,
        txt: (document.body.innerText || '').replace(/\n{3,}/g, '\n\n').slice(0, 5000) }));
      log('\n\n########## ' + nom + ' ##########');
      log('HTTP  : ' + (r ? r.status() : '?'));
      log('url   : ' + d.url);
      log('titre : ' + d.titre);
      log('--- TEXTE ---\n' + d.txt);
    } catch (e) { log('\n########## ' + nom + ' : ECHEC ' + e.message.slice(0, 120)); }
  }
  await ctx.close();
})().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
