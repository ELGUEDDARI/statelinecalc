// Connexion au compte Zoho (organisation StateLineCalc), profil Chrome dedie,
// separe du profil Gmail. Mot de passe lu du coffre, jamais affiche.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');

function getSecret(name) {
  return execFileSync('powershell', [
    '-ExecutionPolicy', 'Bypass', '-File',
    'C:\\Users\\sland\\.config\\secrets\\secret-get.ps1',
    '-Name', name
  ], { encoding: 'utf8' });
}

(async () => {
  const email = 'colabecom86@gmail.com';
  const password = getSecret('zoho-statelinecalc');

  const userDataDir = 'C:\\Users\\sland\\.config\\browser-profiles\\zoho-statelinecalc';
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 900 }
  });
  const page = context.pages()[0] || await context.newPage();

  await page.goto('https://accounts.zoho.eu/signin?servicename=ZohoMail&serviceurl=https://mail.zoho.eu/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const emailInput = page.locator('input[type="email"]:visible, input[id="login_id"]:visible');
  if (await emailInput.count() > 0) {
    await emailInput.first().fill(email);
    await page.locator('button:has-text("Next"), button:has-text("Suivant"), #nextbtn').first().click().catch(() => {});
    await page.waitForTimeout(2000);
  }

  const passInput = page.locator('input[type="password"]:visible');
  await passInput.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if (await passInput.count() > 0) {
    try {
      await passInput.first().fill(password);
    } catch (e) {
      throw new Error('ECHEC_SAISIE_MOT_DE_PASSE');
    }
    await page.locator('button:has-text("Sign in"), button:has-text("Se connecter"), #nextbtn').first().click().catch(() => {});
    await page.waitForTimeout(3000);
  }

  const shot = 'C:\\Users\\sland\\AppData\\Local\\Temp\\claude\\c--Users-sland-Desktop-STATELINECALC\\8be0e7e5-4940-4fc4-8922-c7627e981b47\\scratchpad\\zoho-admin-login-result.png';
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.log('URL=' + page.url());
  console.log('TITRE=' + await page.title());
  await context.close();
})().catch((e) => {
  console.error('ERREUR: ' + e.message);
  process.exit(1);
});
