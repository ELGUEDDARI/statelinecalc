// ADSENSE — sonde LECTURE SEULE. Le PDG dit avoir deja un compte.
// On verifie sur la source reelle : quel compte, et statelinecalc y est-il ajoute ?
// ⚠️ channel:'chrome' obligatoire. On ne touche PAS au profil Chrome principal
//    du PDG (il est ouvert) : on n'utilise que le profil automatise.
// ⛔ Ne cree rien, ne modifie aucun reglage, ne saisit aucun identifiant.
const { chromium } = require('C:/Users/sland/Desktop/SHOPFY NERVOLAXE/node_modules/playwright');
const fs = require('fs'); const { execSync } = require('child_process');
const OUT = 'C:/Users/sland/Desktop/STATELINECALC/.tooling/ops';
const L = []; const log = s => { console.log(s); L.push(s); fs.writeFileSync(OUT + '/adsense-sonde.log', L.join('\n'), 'utf8'); };
try { execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='chrome.exe'\\" | Where-Object { $_.CommandLine -like '*NERVOLAXE*gmail*profile*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' }); } catch (e) {}
(async () => {
  await new Promise(r => setTimeout(r, 3000));
  const ctx = await chromium.launchPersistentContext('C:/Users/sland/Desktop/NERVOLAXE/gmail/profile', {
    channel: 'chrome', headless: false, viewport: null, locale: 'fr-FR',
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'] });
  const p = ctx.pages()[0] || await ctx.newPage();
  for (const url of ['https://www.google.com/adsense/new/u/0/home', 'https://www.google.com/adsense/new/u/0/sites']) {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(18000);
    const d = await p.evaluate(() => ({
      url: location.href, titre: document.title,
      pub: (document.body.innerHTML.match(/ca-pub-\d+|pub-\d{10,}/g) || []).filter((v,i,a)=>a.indexOf(v)===i).slice(0,5),
      statelinecalc: /statelinecalc/i.test(document.body.innerText || ''),
      txt: (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1600),
    }));
    log('\n### ' + url);
    log('  url reelle      : ' + d.url);
    log('  titre           : ' + d.titre);
    log('  identifiant pub : ' + JSON.stringify(d.pub));
    log('  statelinecalc   : ' + d.statelinecalc);
    log('  --- texte ---\n' + d.txt);
    await p.screenshot({ path: OUT + '/adsense-' + (url.includes('sites') ? 'sites' : 'home') + '.png', fullPage: true });
  }
  log('\nLECTURE SEULE.');
  await ctx.close();
})().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
