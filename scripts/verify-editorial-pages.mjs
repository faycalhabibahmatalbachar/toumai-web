import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
for (const route of ['assistant-ia','models','a-propos']) {
 const html=readFileSync('out/'+route+'/index.html','utf8');
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1,route);
 assert.ok(html.includes('Reproduction de l'),route+': proof disclosure');
 assert.ok(html.includes('BreadcrumbList'),route+': breadcrumbs');
 assert.ok(html.includes('rel="canonical" href="https://toumaiai.com/'+route+'/"'),route+': canonical');
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
}
const wa=readFileSync('out/whatsapp/index.html','utf8');
assert.ok(/name="robots" content="[^"]*noindex/.test(wa),'Private WhatsApp dashboard must not be indexed');
console.log('Editorial public HTML and private WhatsApp indexability passed.');
