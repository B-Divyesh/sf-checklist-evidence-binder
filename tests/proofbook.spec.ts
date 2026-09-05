import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const passphrase = 'correct horse battery staple';

async function createBinder(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Binder passphrase').fill(passphrase);
  await page.getByLabel('Repeat passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Create encrypted binder' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Open checks' })).toBeVisible();
}

async function unlockBinder(page: Page): Promise<void> {
  await page.getByLabel('Binder passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Unlock binder' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Open checks' })).toBeVisible();
}

async function addProcedure(page: Page, title: string, slots = 'Equipment photo\nCompleted form'): Promise<void> {
  await page.getByRole('button', { name: 'New procedure' }).click();
  await page.getByLabel('Procedure name').fill(title);
  await page.getByLabel('Required evidence files').fill(slots);
  await page.getByRole('button', { name: 'Add procedure' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

function binderTab(page: Page, name: 'Open checks' | 'Overdue' | 'History' | 'Binder setup') {
  return page.getByRole('navigation', { name: 'Binder sections' }).getByRole('link', { name: new RegExp(name) });
}

async function vaultSnapshot(page: Page): Promise<{ local: Record<string, string>; cipher: number[] }> {
  return page.evaluate(async () => {
    const local = Object.fromEntries(Object.entries(localStorage));
    const cipher = await new Promise<number[]>((resolve, reject) => {
      const request = indexedDB.open('proofbook-vault', 1);
      request.onsuccess = () => {
        const db = request.result;
        const get = db.transaction('encrypted', 'readonly').objectStore('encrypted').get('binder');
        get.onsuccess = () => { db.close(); resolve(Array.from(new Uint8Array(get.result.cipher))); };
        get.onerror = () => reject(get.error);
      };
      request.onerror = () => reject(request.error);
    });
    return { local, cipher };
  });
}

test('@claim:demo-isolation sample data resets and never changes a real binder', async ({ page }) => {
  await createBinder(page);
  await addProcedure(page, 'Real sanitiser check');
  const before = await vaultSnapshot(page);
  await page.goto('/demo/');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cold room opening check' })).toBeVisible();
  await expect(binderTab(page, 'History')).toContainText('1');
  await addProcedure(page, 'Temporary sample check', 'Sample photo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { name: 'Temporary sample check' })).toHaveCount(0);
  expect(await vaultSnapshot(page)).toEqual(before);
  await page.getByRole('link', { name: 'Start for real' }).click();
  await unlockBinder(page);
  await expect(page.getByRole('heading', { name: 'Real sanitiser check' })).toBeVisible();
});

test('@claim:demo-completed-check the sample opens on a signed completed check with two downloadable files', async ({ page }) => {
  await page.goto('/demo/');
  const completed = page.getByRole('region', { name: 'Completed check ready to review' });
  await expect(completed).toBeInViewport();
  await expect(completed.getByText('Cold room opening check', { exact: true })).toBeVisible();
  await expect(completed.getByText('Signed by Rae Morgan', { exact: true })).toBeVisible();
  await expect(completed.locator('.meta > span').first()).toHaveText(/^Completed /);
  const files = completed.getByRole('link', { name: /^Download cold-room-display\.txt$|^Download opening-log\.txt$/ });
  await expect(files).toHaveCount(2);
  const pending = page.waitForEvent('download');
  await files.first().click();
  expect((await pending).suggestedFilename()).toBe('cold-room-display.txt');
});

test('@claim:encrypted-local local payload is encrypted and the passphrase is not stored', async ({ page }) => {
  await createBinder(page);
  await addProcedure(page, 'Private compressor reading');
  const snapshot = await vaultSnapshot(page);
  const storedText = JSON.stringify(snapshot);
  expect(storedText).not.toContain(passphrase);
  expect(storedText).not.toContain('Private compressor reading');
  expect(Object.keys(snapshot.local)).toEqual(['proofbook:vault-meta']);
  const lock = page.getByRole('button', { name: 'Lock binder' });
  await expect(lock).toBeVisible();
  const lockBox = await lock.boundingBox();
  expect(lockBox!.width).toBeGreaterThanOrEqual(44);
  expect(lockBox!.height).toBeGreaterThanOrEqual(44);
  await page.reload();
  await unlockBinder(page);
  await expect(page.getByRole('heading', { name: 'Private compressor reading' })).toBeVisible();
});

test('@claim:private-network normal binder use sends requests only to Proofbook', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto('/demo/');
  expect(await page.getByRole('link', { name: /sign in|account/i }).count()).toBe(0);
  await binderTab(page, 'History').click();
  await page.getByRole('button', { name: 'Review record' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await binderTab(page, 'Binder setup').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evidence report' }).click();
  await download;
  expect([...origins]).toEqual(['http://127.0.0.1:4173']);
});

test('@claim:offline-reload the demo reloads offline after its first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/demo/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cold room opening check' })).toBeVisible();
  await context.close();
});

test('@claim:pwa-install the manifest and active worker provide an installable shell', async ({ page }) => {
  await page.goto('/demo/');
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/?source=installed&v=6' });
  expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({ sizes: '192x192' }), expect.objectContaining({ sizes: '512x512' })]));
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
});

test('@claim:recurring-required-evidence required files block completion and the next check is scheduled', async ({ page }) => {
  await page.goto('/demo/');
  await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Cold room opening check' }) }).getByRole('button', { name: 'Record evidence' }).click();
  await page.getByLabel('Sign-off name').fill('Ari Patel');
  await page.getByRole('button', { name: 'Complete check' }).click();
  await expect(page.getByText(/Attach required evidence:/)).toBeVisible();
  await page.getByLabel('Temperature display required').setInputFiles({ name: 'display.txt', mimeType: 'text/plain', buffer: Buffer.from('4 C') });
  await page.getByLabel('Opening log required').setInputFiles({ name: 'log.txt', mimeType: 'text/plain', buffer: Buffer.from('seal checked') });
  await page.getByLabel('Sign-off name').fill('Ari Patel');
  await page.getByRole('button', { name: 'Complete check' }).click();
  await expect(page.locator('.toast').filter({ hasText: /next check is scheduled/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cold room opening check' })).toBeVisible();
  await binderTab(page, 'History').click();
  await expect(page.getByText('Signed by Ari Patel')).toBeVisible();
});

test('@claim:signed-overdue-history demo shows an overdue check and a signed timestamped record', async ({ page }) => {
  await page.goto('/demo/');
  await expect(binderTab(page, 'Overdue')).toContainText('1');
  await binderTab(page, 'Overdue').click();
  await expect(page.getByRole('heading', { name: 'Weekly fire exit walk' })).toBeVisible();
  await expect(page.locator('article').filter({ has: page.getByRole('heading', { name: 'Weekly fire exit walk' }) }).getByText('! Overdue')).toBeVisible();
  await binderTab(page, 'History').click();
  await expect(page.getByText('Signed by Rae Morgan')).toBeVisible();
  await expect(page.getByText(/^Completed /)).toBeVisible();
});

test('@claim:retention-history retention removes file contents and keeps record history', async ({ page }) => {
  await createBinder(page);
  const old = '2020-01-01T09:00:00.000Z';
  const backup = {
    version: 1, createdAt: old, retentionDays: 30,
    procedures: [{ id: 'p1', title: 'Old pressure check', instructions: '', frequency: 'monthly', evidenceSlots: ['Gauge photo'], createdAt: old, active: true }],
    records: [{ id: 'r1', procedureId: 'p1', dueAt: old, status: 'complete', completedAt: old, signedBy: 'Sam Lee', notes: 'Pressure held.', evidence: { 'Gauge photo': { name: 'gauge.txt', type: 'text/plain', size: 3, data: 'data:text/plain;base64,MTIw', addedAt: old } } }],
    audit: [{ id: 'a1', at: old, action: 'check.completed', detail: 'Old pressure check' }]
  };
  page.on('dialog', dialog => dialog.accept());
  await binderTab(page, 'Binder setup').click();
  await page.getByLabel('Restore a Proofbook JSON backup').setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('button', { name: 'Lock binder' }).click();
  await unlockBinder(page);
  await binderTab(page, 'History').click();
  await expect(page.getByText('Signed by Sam Lee')).toBeVisible();
  await page.getByRole('button', { name: 'Review record' }).click();
  await expect(page.getByText(/gauge.txt was removed by the retention policy/)).toBeVisible();
});

test('@claim:backup-recovery invalid imports preserve data and a legacy damaged vault can be restored', async ({ page }) => {
  await createBinder(page);
  await addProcedure(page, 'Recovery source check');
  await binderTab(page, 'Binder setup').click();
  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON backup' }).click();
  const backup = await backupDownload;
  const backupPath = await backup.path();
  const backupText = await readFile(backupPath!, 'utf8');
  let confirmations = 0;
  page.on('dialog', dialog => { confirmations += 1; dialog.accept(); });
  await page.getByLabel('Restore a Proofbook JSON backup').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"procedures":[],"records":[null],"audit":[]}') });
  await expect(page.locator('.toast').filter({ hasText: 'This backup is invalid. Your current binder was not replaced.' })).toBeVisible();
  expect(confirmations).toBe(0);
  await binderTab(page, 'Open checks').click();
  await expect(page.getByRole('heading', { name: 'Recovery source check' })).toBeVisible();
  await page.evaluate(async password => {
    const meta = JSON.parse(localStorage.getItem('proofbook:vault-meta')!);
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(meta.salt), iterations: 250_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const corrupt = { version: 1, procedures: [], records: [null], audit: [] };
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(corrupt)));
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('proofbook-vault', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('encrypted', 'readwrite');
        transaction.objectStore('encrypted').put({ iv: [...iv], cipher }, 'binder');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, passphrase);
  await page.reload();
  await page.getByLabel('Binder passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Unlock binder' }).click();
  await expect(page.getByText(/binder is damaged/)).toBeVisible();
  await expect(page.getByText('Restore or erase this binder')).toBeVisible();
  await page.getByLabel('Valid Proofbook JSON backup').setInputFiles({ name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(backupText) });
  await expect(page.getByRole('heading', { name: 'Recovery source check' })).toBeVisible();
  expect(confirmations).toBe(1);
});

test('@claim:export-integrity exported manifest and file hashes can be recomputed', async ({ page, context }) => {
  await page.goto('/demo/');
  await binderTab(page, 'Binder setup').click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evidence report' }).click();
  const download = await pending;
  const report = await readFile((await download.path())!, 'utf8');
  const reportPage = await context.newPage();
  await reportPage.setContent(report);
  const manifestText = await reportPage.locator('#proofbook-manifest').textContent();
  const shownHash = await reportPage.locator('#manifest-sha256').textContent();
  expect(createHash('sha256').update(manifestText!).digest('hex')).toBe(shownHash);
  const manifest = JSON.parse(manifestText!);
  const firstFile = manifest.records[0].evidence[0];
  const href = await reportPage.getByRole('link', { name: `Download ${firstFile.name}` }).getAttribute('href');
  expect(createHash('sha256').update(href!).digest('hex')).toBe(firstFile.contentSha256);
  expect(createHash('sha256').update(`${manifestText}changed`).digest('hex')).not.toBe(shownHash);
});

test('@claim:file-control completed evidence can be downloaded and removed', async ({ page }) => {
  await page.goto('/demo/?view=history');
  await page.getByRole('button', { name: 'Review record' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download file' }).first().click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('cold-room-display.txt');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove file' }).first().click();
  await expect(page.getByText(/cold-room-display.txt was removed by the binder owner/)).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await binderTab(page, 'History').click();
  await page.getByRole('button', { name: 'Review record' }).click();
  await expect(page.getByRole('link', { name: 'Download file' })).toHaveCount(2);
});

test('@claim:audit-trail material changes appear in the local activity list', async ({ page }) => {
  await page.goto('/demo/');
  await addProcedure(page, 'Monthly eyewash check', 'Flow photo');
  await binderTab(page, 'Binder setup').click();
  await expect(page.getByRole('heading', { name: 'Recent binder activity' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent binder activity' }).locator('..').getByText('Monthly eyewash check', { exact: true })).toBeVisible();
});

test('@claim:free-features all features are available without checkout', async ({ page }) => {
  await page.goto('/demo/');
  await addProcedure(page, 'Third active procedure', 'Result photo');
  await expect(page.getByRole('heading', { name: 'Third active procedure' })).toBeVisible();
  await binderTab(page, 'Binder setup').click();
  await page.getByLabel('Keep evidence files').selectOption('custom');
  await expect(page.getByLabel('Custom days')).toBeVisible();
  expect(await page.getByRole('link', { name: /Buy|checkout/i }).count()).toBe(0);
});

test('@claim:erase-binder erase removes the local vault', async ({ page }) => {
  await createBinder(page);
  await binderTab(page, 'Binder setup').click();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Erase this binder' }).click();
  await expect(page.getByRole('button', { name: 'Create encrypted binder' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('proofbook:vault-meta'))).toBeNull();
});

test('invalid and boundary inputs give safe, specific results', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Binder passphrase').fill(passphrase);
  await page.getByLabel('Repeat passphrase').fill('different passphrase');
  await page.getByRole('button', { name: 'Create encrypted binder' }).click();
  await expect(page.getByText('The two passphrases do not match.')).toBeVisible();
  await page.getByLabel('Repeat passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Create encrypted binder' }).click();
  await addProcedure(page, 'Boundary file check', 'Only photo\nOnly photo');
  await expect(page.getByText('0/1 evidence files')).toBeVisible();
  await page.getByRole('button', { name: 'Record evidence' }).click();
  await page.getByLabel('Only photo required').setInputFiles({ name: 'too-large.txt', mimeType: 'text/plain', buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
  await expect(page.getByText('That file is over 8 MB. Choose a smaller file.')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Lock binder' }).click();
  await page.getByLabel('Binder passphrase').fill('wrong passphrase value');
  await page.getByRole('button', { name: 'Unlock binder' }).click();
  await expect(page.getByText('That passphrase did not unlock this binder. Try again.')).toBeVisible();
  await page.getByLabel('Binder passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Unlock binder' }).click();
  await expect(page.getByRole('heading', { name: 'Boundary file check' })).toBeVisible();
});

test('normal workflow, keyboard focus, responsive zoom, routes, and accessibility pass', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Proofbook — repeat checks and keep evidence');
  await expect(page.getByRole('heading', { level: 1, name: 'Repeat checks and keep the evidence' })).toBeVisible();
  await expect(page.getByText(/For small teams/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  const landingAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(landingAxe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  await page.goto('/demo/');
  await expect(page).toHaveTitle('Demo — Proofbook');
  await page.getByRole('button', { name: 'New procedure' }).click();
  await expect(page.getByLabel('Procedure name')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'New procedure' })).toBeFocused();
  await binderTab(page, 'History').click();
  await expect(page).toHaveURL(/view=history/);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Open checks' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const targets = await page.locator('a,button').evaluateAll(elements => elements.filter(element => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && (box.width < 44 || box.height < 44);
  }).map(element => (element.textContent || element.getAttribute('aria-label') || '').trim()));
  expect(targets).toEqual([]);
  expect(errors).toEqual([]);
});

test('legal pages, metadata, links, reduced motion, and designed 404 pass', async ({ page }) => {
  const hrefs = new Set<string>();
  for (const path of ['/privacy/', '/terms/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /proofbook-social\.png/);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
    for (const href of await page.locator('a[href]').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) hrefs.add(href);
  }
  await page.goto('/');
  for (const href of await page.locator('a[href]').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) hrefs.add(href);
  for (const href of hrefs) {
    if (href.startsWith('mailto:') || !href.startsWith('http://127.0.0.1:4173')) continue;
    expect((await page.request.get(href)).status(), href).toBe(200);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.locator('.hero-art img').evaluate(element => getComputedStyle(element).transitionDuration)).toMatch(/0\.00001s|1e-05s|0s/);
  const response = await page.goto('/missing-proofbook-page');
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found — Proofbook');
  await expect(page.getByRole('heading', { level: 1, name: 'This Proofbook page does not exist' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to Proofbook' })).toBeVisible();
});

test('an installed old worker receives a new build and shows the reload action', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await page.request.post(`/__test/sw-version?value=${Date.now()}`);
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration!.update(); });
  await expect(page.getByRole('button', { name: 'Reload update' })).toBeVisible({ timeout: 15_000 });
});
