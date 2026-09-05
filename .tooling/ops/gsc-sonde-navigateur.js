// ============================================================================
//  GSC — SONDE, LECTURE SEULE. Le profil Chrome « NERVOLAXE/gmail » a-t-il
//  acces a la propriete statelinecalc.com, et le bouton « Demander une
//  indexation » est-il atteignable ?
//  Pourquoi un navigateur : « Request Indexing » N'A PAS D'API. C'est le seul
//  levier dont l'effet a ete MESURE (28/08 : indexation 2 -> 9 en une heure).
//  ⚠️ channel:'chrome' OBLIGATOIRE (sinon retrogradation -> profile.CHROME_DELETE).
//  ⛔ Cette sonde ne clique AUCUN bouton d'action.
// ============================================================================
const { chromium } = require('C:/Users/sland/Desktop/SHOPFY NERVOLAXE/node_modules/playwright');
const fs = require('fs'); const { execSync } = require('child_process');
const PROFIL = 'C:/Users/sland/Desktop/NERVOLAXE/gmail/profile';
const OUT = 'C:/Users/sland/Desktop/STATELINECALC/.tooling/ops';
const L = []; const log = s => { console.log(s); L.push(s); fs.writeFileSync(OUT + '/gsc-sonde.log', L.join('\n'), 'utf8'); };
try { execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='chrome.exe'\\" | Where-Object { $_.CommandLine -like '*NERVOLAXE*gmail*profile*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' }); } catch (e) {}
(async () => {
  await new Promise(r => setTimeout(r, 3000));
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: null, locale: 'en-US',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'] });
  const p = ctx.pages()[0] || await ctx.newPage();
  await p.goto('https://search.google.com/search-console?resource_id=sc-domain%3Astatelinecalc.com',
    { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(18000);
  const d = await p.evaluate(() => {
    const b = document.body.innerText || '';
    return { url: location.href, titre: document.title, debut: b.slice(0, 1200),
      connecte: !/Sign in|Connexion|Se connecter/i.test(b.slice(0, 300)),
      proprietePresente: /statelinecalc/i.test(b) };
  });
  log('url      : ' + d.url);
  log('titre    : ' + d.titre);
  log('connecte : ' + d.connecte + '   propriete visible : ' + d.proprietePresente);
  log('--- debut de page ---\n' + d.debut);
  await p.screenshot({ path: OUT + '/gsc-sonde.png', fullPage: false });
  log('\nLECTURE SEULE. Aucun bouton clique.');
  await ctx.close();
})().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
