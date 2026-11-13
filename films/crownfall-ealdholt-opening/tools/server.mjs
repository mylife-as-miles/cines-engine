// Static server for the film page. Serves film/ as the root, three.js from this film's node_modules, and the
// licensed village model straight from where it is installed (it is never copied into this repository).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../film');
const MODULES = path.resolve(HERE, '../node_modules');
export const VILLAGE_GLB = process.env.EALDHOLT_VILLAGE_GLB
  || 'C:/Users/MILES/Documents/Crownfall/private-assets/elderbloom/elderbloom-village-desktop-coastal-full-woodland-candidate-v5.glb';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file;
    if (url === '/village.glb') file = VILLAGE_GLB;
    else if (url.startsWith('/node_modules/')) { file = path.join(MODULES, url.slice('/node_modules/'.length)); if (!file.startsWith(MODULES)) file = null; }
    else { file = path.join(ROOT, url === '/' ? '/index.html' : url); if (!file.startsWith(ROOT)) file = null; }
    if (!file) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = +(process.argv[2] || 5177);
  startServer(port).then(() => console.log(`serving ${ROOT} on http://127.0.0.1:${port}`));
}
