// Base44 sandbox dev server for the Togetherly static site.
//
// The project has no build step: index.html, styles.css, app.js and assets/ are
// served directly from the mounted repository. This server exists so the preview
// gets a real dev loop — it serves live source and live-reloads the page when a
// file changes. No dependencies: Node built-ins only.
import { createServer } from 'node:http';
import { createReadStream, statSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
export const ROOT = path.resolve(
  process.env.ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const RELOAD_SNIPPET =
  "<script>(function(){var source=new EventSource('/__live-reload');source.onmessage=function(){location.reload()};})();</script>";

const clients = new Set();

function broadcastReload() {
  for (const res of clients) res.write('data: reload\n\n');
}

// Only files the browser actually loads should trigger a reload — otherwise
// editing docs, compose files or .git internals would refresh the preview.
const RELOADABLE = /\.(html|css|js|mjs|json|svg|jpe?g|png|gif|webp|ico)$/i;

function watchSource() {
  let timer = null;
  try {
    watch(ROOT, { recursive: true }, (_event, file) => {
      const name = String(file || '');
      if (name.startsWith('.git/') || name.includes('/.git/')) return;
      if (!RELOADABLE.test(name)) return;
      clearTimeout(timer);
      timer = setTimeout(broadcastReload, 120);
    });
  } catch (err) {
    console.warn('live reload watcher unavailable:', err.message);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/__live-reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let filePath = path.join(ROOT, decodeURIComponent(url.pathname));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Forbidden');
    return;
  }

  try {
    if (statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');

  if (type.startsWith('text/html')) {
    try {
      const html = (await readFile(filePath, 'utf8')).replace('</body>', RELOAD_SNIPPET + '</body>');
      res.end(html);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
    return;
  }

  createReadStream(filePath)
    .on('error', () => {
      if (!res.headersSent) res.writeHead(404).end('Not found');
      else res.end();
    })
    .pipe(res);
});

watchSource();
server.listen(PORT, HOST, () => {
  console.log(`togetherly dev server listening on http://${HOST}:${PORT} (source: ${ROOT})`);
});
