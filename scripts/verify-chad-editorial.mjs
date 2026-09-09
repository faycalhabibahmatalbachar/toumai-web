import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const html = readFileSync('out/intelligence-artificielle-tchad/index.html','utf8');
assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
assert.ok(html.includes('<title>Intelligence artificielle au Tchad — Toumaï AI</title>'));
assert.ok(html.includes('rel="canonical" href="https://toumaiai.com/intelligence-artificielle-tchad/"'));
assert.ok(!html.includes('rel="alternate"'));
const graphs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>{ const data=JSON.parse(m[1]); return data['@graph']||[data]; });
const faq=graphs.find(n=>n['@type']==='FAQPage');
assert.equal(faq.mainEntity.length,9);
assert.equal((html.match(/<details/g)||[]).length,9);
assert.ok(graphs.some(n=>n['@type']==='BreadcrumbList'));
assert.ok(html.includes('lang="ar" dir="rtl"'));
for(const path of ['chat','models','a-propos','security','privacy','terms','contact','ar','whatsapp']) {
 assert.ok(html.includes('href="/'+path+'/"'));
 assert.ok(existsSync('out/'+path+'/index.html'));
}
assert.ok(!html.includes('<video'));
console.log('Chad editorial: title, canonical, FAQ/schema, RTL, links and static rendering passed.');
