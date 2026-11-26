import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] ?? 'http://localhost:4173').origin;

async function get(path, ...expectedTypes) {
  const url = new URL(path, origin);
  assert.equal(url.origin, origin, `${path} must use the app origin`);
  const response = await fetch(url, { redirect: 'error' });
  assert.equal(response.status, 200, `${path} HTTP status`);
  const type = response.headers.get('content-type')?.split(';')[0];
  assert.ok(expectedTypes.includes(type), `${path} Content-Type ${type}, expected ${expectedTypes.join(' or ')}`);
  console.log(`200 ${type} ${path}`);
  return response;
}

async function checkPng(path, width, height) {
  const response = await get(path, 'image/png');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length >= 24, `${path} PNG header`);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${path} PNG signature`);
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR', `${path} IHDR`);
  assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [width, height], `${path} dimensions`);
}

const manifestPath = '/manifest.webmanifest';
const manifest = await (await get(manifestPath, 'application/manifest+json')).json();
for (const field of ['id', 'scope', 'start_url']) {
  assert.equal(new URL(manifest[field], origin).href, `${origin}/`, `manifest ${field}`);
}
assert.equal(manifest.display, 'standalone');
for (const [size, purpose] of [[192, 'any'], [512, 'any'], [512, 'maskable']]) {
  assert.ok(
    manifest.icons.some(icon => icon.sizes === `${size}x${size}` && icon.purpose === purpose),
    `manifest icon ${size}x${size} (${purpose})`,
  );
}
for (const icon of manifest.icons) {
  assert.equal(icon.type, 'image/png', `${icon.src} manifest type`);
  await checkPng(icon.src, ...icon.sizes.split('x').map(Number));
}

const html = await (await get('/', 'text/html')).text();
assert.match(html, /<link[^>]+rel="manifest"[^>]+href="\/manifest\.webmanifest"/);
const appleIcon = html.match(/<link[^>]+rel="apple-touch-icon"[^>]*>/)?.[0] ?? '';
assert.match(appleIcon, /\bsizes="180x180"/);
const applePath = appleIcon.match(/\bhref="([^"]+)"/)?.[1];
assert.ok(applePath, 'Apple touch icon path');
await checkPng(applePath, 180, 180);
await get('/icon.svg', 'image/svg+xml');
await get('/sw.js', 'text/javascript', 'application/javascript');
console.log('PASS manifest, PNG sizes, Apple touch icon and worker');
