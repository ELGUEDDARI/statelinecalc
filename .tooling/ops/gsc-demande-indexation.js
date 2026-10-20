// GSC - « Request indexing » (pas d'API) via le profil Chrome NERVOLAXE/gmail.
// Usage : node gsc-demande-indexation.js <chemin1> [<chemin2> ...]   ex : /paycheck-calculator/colorado/
// ⚠️ channel:'chrome' OBLIGATOIRE. Un chemin = une tentative, JAMAIS de reessai (doublons).
// Resultat par URL : OK (dialogue « Indexing requested ») / ECHEC (message d'erreur lu) / INDETERMINE.
const { chromium } = require('C:/Users/sland/Desktop/SHOPFY NERVOLAXE/node_modules/playwright');
const fs = require('fs'); const { execSync } = require('child_process');
const PROFIL = 'C:/Users/sland/Desktop/NERVOLAXE/gmail/profile';
const OUT = 'C:/Users/sland/Desktop/STATELINECALC/.tooling/ops';
const LOG = OUT + '/gsc-demande-indexation.log';
const log = s => { console.log(s); fs.appendFileSync(LOG, s + '\n', 'utf8'); };
const chemins = process.argv.slice(2);
if (!chemins.length) { console.log('aucun chemin'); process.exit(1); }
try { execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='chrome.exe'\\" | Where-Object { $_.CommandLine -like '*NERVOLAXE*gmail*profile*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' }); } catch (e) {}
(async () => {
  await new Promise(r => setTimeout(r, 3000));
  const ctx = await chromium.launchPersistentContext(PROFIL, {
    channel: 'chrome', headless: false, viewport: null, locale: 'en-US',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'] });
  const p = ctx.pages()[0] || await ctx.newPage();
  for (const ch of chemins) {
    const url = 'https://statelinecalc.com' + ch;
    const t = new Date().toISOString();
    let etat = 'INDETERMINE', detail = '';
    try {
      await p.goto('https://search.google.com/search-console/inspect?resource_id=sc-domain%3Astatelinecalc.com&id=' + encodeURIComponent(url),
        { waitUntil: 'domcontentloaded', timeout: 60000 });
      await p.waitForTimeout(15000);
      const corps = await p.evaluate(() => document.body.innerText || '');
      if (/Sign in|Choose an account/i.test(corps.slice(0, 400))) { detail = 'non connecte'; }
      else {
        const btn = p.getByText(/^Request indexing$/i).first();
        if (await btn.count() === 0) { detail = 'bouton absent : ' + corps.slice(0, 300).replace(/\s+/g, ' '); }
        else {
          await btn.click();
          await p.waitForTimeout(60000); // le test en direct peut durer 1 a 2 min
          const apres = await p.evaluate(() => document.body.innerText || '');
          if (/Indexing requested/i.test(apres)) etat = 'OK';
          else if (/quota|exceeded|Something went wrong|Indexing request rejected/i.test(apres)) { etat = 'ECHEC'; detail = (apres.match(/(quota[^\n]*|Something went wrong[^\n]*|Indexing request rejected[^\n]*)/i) || [''])[0]; }
          else detail = 'ni confirmation ni erreur lue';
        }
      }
    } catch (e) { detail = 'exception : ' + e.message; }
    await p.screenshot({ path: OUT + '/gsc-idx-' + ch.replace(/\W+/g, '_') + '.png' }).catch(() => {});
    log(`${t} | ${etat} | ${ch} | ${detail}`);
    if (etat === 'ECHEC' && /quota/i.test(detail)) { log('QUOTA atteint : arret.'); break; }
  }
  await ctx.close();
})().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
