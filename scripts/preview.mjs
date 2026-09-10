/**
 * Minimal static preview server for dist/.
 *
 * Why this exists: you cannot open the built site by double-clicking an HTML
 * file. Not because of the build tool — because `/hu/ingatlanok/` is a
 * directory URL, and mapping that to `index.html` is something only a server
 * does. Under file:// every internal link 404s and every absolute asset path
 * (`/_astro/…`) resolves to your filesystem root instead of dist/.
 *
 * The single-file prototype avoided this by having no URLs at all, which was
 * the defect the rebuild set out to fix.
 *
 * Zero dependencies — node:http only. `astro preview` refuses to run while the
 * Vercel adapter is configured, so this stands in for it.
 *
 * Since Stage 1, this only serves the pages that are still static: about,
 * sellers, legal, blog, and so on. Home, the property list, property detail
 * pages and the sold archive now read from Supabase and render on request —
 * they are Vercel functions in the real build, not files in dist/, so this
 * server can't show them. Use `npm run dev` to see those.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const dist = path.join(root, 'dist');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4321);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

async function resolve(urlPath) {
  // Refuse to escape dist/.
  const safe = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  let target = path.join(dist, safe);
  if (!target.startsWith(dist)) return null;

  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) target = path.join(target, 'index.html');
  } catch {
    // Extensionless URL — try the directory index, then the .html file.
    if (!path.extname(target)) {
      for (const candidate of [path.join(target, 'index.html'), `${target}.html`]) {
        try {
          await fs.access(candidate);
          return candidate;
        } catch {
          /* keep looking */
        }
      }
    }
    return null;
  }

  try {
    await fs.access(target);
    return target;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;

  if (urlPath.startsWith('/api/')) {
    res.writeHead(501, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Form endpoints need the dev server: npm run dev\n');
    return;
  }

  const file = await resolve(urlPath);

  if (!file) {
    // These routes are real in the actual build (Vercel functions reading
    // from Supabase) but don't exist as files here, so a plain 404 would be
    // misleading — tell the developer why and what to do instead.
    if (/^\/(hu|nl)\/(ingatlanok|woningen|eladva|verkocht)?\/?$|-(elado|te-koop)-\d+\/?$/.test(urlPath)) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        `<p>This page reads from Supabase and only renders on request — it isn't a file in dist/.</p>` +
          `<p>Run <code>npm run dev</code> instead to see it.</p>`
      );
      return;
    }
    const notFound = path.join(dist, '404.html');
    const body = await fs.readFile(notFound).catch(() => Buffer.from('404'));
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
    return;
  }

  const body = await fs.readFile(file);
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  res.end(body);
});

server.listen(port, () => {
  console.log(`\n  FODEL — static preview of dist/\n`);
  console.log(`  http://localhost:${port}/hu/   Hungarian`);
  console.log(`  http://localhost:${port}/nl/   Dutch\n`);
  console.log(`  Forms are inert here; use "npm run dev" to exercise them.`);
  console.log(`  Ctrl-C to stop.\n`);
});
