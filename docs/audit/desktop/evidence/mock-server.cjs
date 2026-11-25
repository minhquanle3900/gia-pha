// M0 audit-only local API fixture. Serves the unchanged production build.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const dist = path.join(root, 'dist');
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.html': 'text/html', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/biography/generate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body);
      console.log(JSON.stringify({ request: 'mock-biography', fields: Object.keys(payload), synthetic: true }));
      res.setHeader('Content-Type', 'application/json');
      if (String(payload.fullName).includes('ERROR')) {
        res.statusCode = 503;
        res.end(JSON.stringify({ error: 'M0 MOCK: dịch vụ tạm thời không sẵn sàng' }));
      } else {
        res.end(JSON.stringify({ biography: 'M0 MOCK: Bản thảo tổng hợp để kiểm thử. Chưa có dữ kiện để viết tiểu sử hoàn chỉnh.' }));
      }
    });
    return;
  }
  let file = path.resolve(dist, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(dist + path.sep)) file = path.join(dist, 'index.html');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(4180, '127.0.0.1', () => console.log('M0 mock fixture http://127.0.0.1:4180'));
