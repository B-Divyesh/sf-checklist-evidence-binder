import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('creates an encrypted binder and adds a recurring procedure', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await page.getByLabel('Binder passphrase').fill('correct horse battery staple');
  await page.getByLabel('Repeat passphrase').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Create encrypted binder' }).click();
  await expect(page.getByRole('heading', { name: 'Open checks' })).toBeVisible();
  await page.getByRole('button', { name: 'New procedure' }).click();
  await page.getByLabel('Procedure name').fill('Opening temperature check');
  await page.getByRole('button', { name: 'Add procedure' }).click();
  await expect(page.getByRole('heading', { name: 'Opening temperature check' })).toBeVisible();
  await page.getByRole('button', { name: 'Record evidence' }).click();
  await page.getByLabel('Equipment photo *').setInputFiles({ name: 'equipment.txt', mimeType: 'text/plain', buffer: Buffer.from('temperature display 4 C') });
  await page.getByLabel('Completed form *').setInputFiles({ name: 'opening-form.txt', mimeType: 'text/plain', buffer: Buffer.from('opening checks complete') });
  await page.getByLabel('Sign-off name').fill('Rae Operator');
  await page.getByRole('button', { name: 'Complete check' }).click();
  await page.getByRole('button', { name: /History/ }).click();
  await expect(page.getByText('Signed by Rae Operator')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('has no serious accessibility findings on first run', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
});

test('installed shell reloads while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Checks happen. Proof stays.' })).toBeVisible();
});
