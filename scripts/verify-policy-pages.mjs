import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
for (const path of ['privacy', 'terms']) {
  const html = readFileSync(`out/${path}/index.html`, 'utf8');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: H1`);
  assert.ok(html.includes(`rel="canonical" href="https://toumaiai.com/${path}/"`));
  assert.ok(html.includes('aria-label="Sommaire"'));
  assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(html));
  for (const [, id] of html.matchAll(/href="#(section-\d+)"/g)) assert.ok(html.includes(`id="${id}"`), `${path}: ${id}`);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(json);
  for (const [, href] of html.matchAll(/href="(\/(?!\/)[^"?#]*)"/g)) {
    if (href.startsWith('/_next/')) continue;
    const file = /\.[a-z0-9]+$/i.test(href) ? `out${href}` : `out${href.replace(/\/$/, '')}/index.html`;
    assert.ok(existsSync(file), `${path}: missing link ${href}`);
  }
}
console.log('Policy pages: canonical, headings, anchors, JSON-LD and local links passed.');
