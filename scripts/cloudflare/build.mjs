import { execFileSync } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  cwd: root,
  env: { ...process.env, VITE_GEMINI_BIOGRAPHY_ENABLED: 'false' },
  stdio: 'inherit',
});

async function checkFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkFiles(filename);
    else if (/^(?:\.env|server\.)/i.test(entry.name) || /\.(?:map|db|sqlite|zip|exe|ts|tsx)$/i.test(entry.name)) {
      throw new Error(`Unexpected deploy artifact: ${path.relative(root, filename)}`);
    }
  }
}
await checkFiles(path.join(root, 'dist'));
await writeFile(path.join(root, 'dist/build-info.json'), JSON.stringify({
  commit,
  appBaseline: '7b745ebe553e6db6813ae2095d6f3bd11bc0ed97',
  geminiEnabled: false,
  target: 'cloudflare-pages-demo',
}, null, 2) + '\n');
