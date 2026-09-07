import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

const storage = new Map();
function moduleAt(path, dependencies = {}) {
  const context = createContext({exports: {}, URLSearchParams, sessionStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key,value) => storage.set(key,value),
    removeItem: key => storage.delete(key),
  }, require: name => { assert.ok(dependencies[name], name); return dependencies[name]; }});
  runInContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, context);
  return context.exports;
}
const catalog = moduleAt('../lib/plan-catalog.ts');
const navigation = moduleAt('../lib/payment-navigation.ts', {'./plan-catalog':catalog});
for (const [input, expected, amount] of [['essentiel','essentiel',3000],['pro','toumai_5',9000],['toumai_5','toumai_5',9000]]) {
  assert.equal(catalog.publicPlanId(input), expected);
  assert.equal(catalog.PLAN_CATALOG[expected].amount, amount);
  assert.equal(navigation.selectedPaymentPlan(new URLSearchParams({plan:input})),expected);
  assert.equal(navigation.selectedPaymentPlan(new URLSearchParams()),expected, 'Resume selection after email verification or login');
}
assert.equal(navigation.selectedPaymentPlan(new URLSearchParams({plan:'decouverte'})),null);
assert.equal(navigation.selectedPaymentPlan(new URLSearchParams()),null);
for (const target of ['https://evil.test','//evil.test','/\\evil.test','/chat?next=https://evil.test','/recu/../admin']) assert.equal(navigation.safeAccountReturn(target),null);
for (const target of ['/billing','/recu?ref=abc-123','/recu/abc-123/','/abonnement/retour?ref=abc-123','/checkout?plan=toumai_5']) assert.equal(navigation.safeAccountReturn(target),target);
navigation.selectedPaymentPlan(new URLSearchParams({plan:'essentiel'}));
assert.equal(navigation.selectedPaymentPlan(new URLSearchParams({next:'/billing'})),null, 'An explicit account destination wins over a saved checkout');
navigation.clearPaymentPlan();
assert.equal(navigation.selectedPaymentPlan(new URLSearchParams()),null);
console.log('Payment navigation, public tariffs and safe return checks passed.');
