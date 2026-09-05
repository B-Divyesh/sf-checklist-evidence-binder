import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
let workerVersion = 6;
const routeFiles = new Map([
  ['/', 'index.html'], ['/checks', 'index.html'], ['/overdue', 'index.html'], ['/history', 'index.html'], ['/settings', 'index.html'],
  ['/demo', 'demo/index.html'], ['/demo/', 'demo/index.html'], ['/privacy', 'privacy/index.html'], ['/privacy/', 'privacy/index.html'], ['/terms', 'terms/index.html'], ['/terms/', 'terms/index.html']
]);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.webmanifest', 'application/manifest+json'], ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.xml', 'application/xml; charset=utf-8'], ['.txt', 'text/plain; charset=utf-8']
]);
const security = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(self), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  if (request.method === 'POST' && url.pathname === '/__test/sw-version') {
    workerVersion = Number(url.searchParams.get('value')) || workerVersion + 1;
    response.writeHead(204).end();
    return;
  }
  let relative = routeFiles.get(url.pathname) || url.pathname.replace(/^\/+/, '');
  if (!relative || relative.includes('..') || normalize(relative).startsWith('..')) relative = '404.html';
  try {
    let body = await readFile(join(root, relative));
    if (relative === 'sw.js') body = Buffer.from(body.toString().replace('proofbook-v6', `proofbook-v${workerVersion}`));
    response.writeHead(200, {
      ...security,
      'Content-Type': types.get(extname(relative)) || 'application/octet-stream',
      'Cache-Control': relative === 'sw.js' ? 'no-cache, no-store, must-revalidate' : relative.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=60, must-revalidate'
    });
    response.end(body);
  } catch {
    const body = await readFile(join(root, '404.html'));
    response.writeHead(404, { ...security, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(body);
  }
}).listen(port, '127.0.0.1', () => process.stdout.write(`Proofbook preview on ${port}\n`));
