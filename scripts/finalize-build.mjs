import { readFile, writeFile } from 'node:fs/promises';

const pages = ['index.html', 'demo/index.html', 'privacy/index.html', 'terms/index.html', 'offline.html', '404.html'];
const shell = new Set(['/', '/checks', '/overdue', '/history', '/settings', '/demo/', '/privacy/', '/terms/', '/offline.html', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/assets/proofbook-hero-420.avif', '/assets/proofbook-hero-420.webp', '/assets/proofbook-hero.avif', '/assets/proofbook-hero.webp']);

for (const page of pages) {
  const source = await readFile(new URL(`../dist/${page}`, import.meta.url), 'utf8');
  for (const match of source.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)[^\"]*"/g)) shell.add(match[1]);
}

const workerUrl = new URL('../dist/sw.js', import.meta.url);
const worker = await readFile(workerUrl, 'utf8');
const marker = '/*__PRECACHE_ASSETS__*/ []';
if (!worker.includes(marker)) throw new Error('Service worker precache marker is missing.');
await writeFile(workerUrl, worker.replace(marker, JSON.stringify([...shell].sort())));
