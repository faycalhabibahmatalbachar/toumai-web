// Dynamic cache regression tests: execute the real TypeScript module with a mocked storage.
// Intentionally tests account changes and invalidation while requests are unresolved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/whatsapp-cache.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

let owner = "account-A";
const storage = new Map();
const scoped = (key) => owner + ":" + key;
const swrMock = {
  cacheSessionOwner: () => owner,
  cacheSeed: (key, maxAgeMs = Infinity) => {
    const value = storage.get(scoped(key));
    if (!value) return null;
    return Date.now() - value.at <= maxAgeMs ? value.data : null;
  },
  cacheWrite: (key, data) => {
    storage.set(scoped(key), { data, at: Date.now() });
  },
  cachePurge: (prefix) => {
    for (const key of storage.keys()) {
      if (key.startsWith(scoped(prefix))) storage.delete(key);
    }
  },
};
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: (id) => {
    assert.equal(id, "./swr-cache");
    return swrMock;
  },
  Map, Set, Date, Error, Promise, console,
}, { filename: "whatsapp-cache.ts" });
const { waCachedRead, waMutation, invalidateWhatsAppCache, readWhatsAppCache, writeWhatsAppCache } = exports;
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

writeWhatsAppCache("wa:conversations:list", { id: "baseline" });
const obsolete = deferred();
const obsoleteRead = waCachedRead("wa:conversations:list", () => obsolete.promise, {
  revalidate: true, staleIfError: false,
});
invalidateWhatsAppCache("wa:conversations");
obsolete.resolve({ id: "old-response" });
await assert.rejects(obsoleteRead, /changé pendant le chargement/);
assert.equal(readWhatsAppCache("wa:conversations:list"), null,
  "a late read must not resurrect a cache entry invalidated by a mutation");

const activity = deferred();
const activityRead = waCachedRead("wa:activity", () => activity.promise, {
  revalidate: true,
});
invalidateWhatsAppCache("wa:conversations");
activity.resolve({ events: 5 });
assert.equal((await activityRead).events, 5);
assert.equal(readWhatsAppCache("wa:activity").events, 5,
  "unrelated invalidation must not discard a valid read");

const accountChange = deferred();
const accountRead = waCachedRead("wa:contact-info:1", () => accountChange.promise, {
  revalidate: true,
});
owner = "account-B";
accountChange.resolve({ secret: "A" });
await assert.rejects(accountRead, /session WhatsApp a changé/);
assert.equal(readWhatsAppCache("wa:contact-info:1"), null,
  "an account-A response must never be cached for account B");

writeWhatsAppCache("wa:overview", { account: "B" });
owner = "account-A";
const mutation = deferred();
const completion = waMutation(mutation.promise, ["wa:overview"]);
owner = "account-B";
mutation.resolve({ applied: true });
await completion;
assert.equal(readWhatsAppCache("wa:overview").account, "B",
  "a late account-A mutation must not purge account-B data");

const older = deferred();
const newer = deferred();
const olderResult = waCachedRead("wa:conversations:race", () => older.promise, {
  revalidate: true, staleIfError: false,
});
const newerResult = waCachedRead("wa:conversations:race", () => newer.promise, {
  revalidate: true, staleIfError: false,
});
newer.resolve({ version: 2 });
assert.equal((await newerResult).version, 2);
older.resolve({ version: 1 });
await assert.rejects(olderResult, /plus récente est déjà disponible/);
assert.equal(readWhatsAppCache("wa:conversations:race").version, 2,
  "older concurrent response must not replace newer same-key data");

const fallback = deferred();
writeWhatsAppCache("wa:carnet", { contacts: ["safe"] });
const fallbackRead = waCachedRead("wa:carnet", () => fallback.promise, {
  revalidate: true, staleIfError: true,
});
fallback.reject(new Error("gateway timeout"));
assert.equal((await fallbackRead).contacts[0], "safe",
  "network failure must retain a same-account stale snapshot");

const ui = readFileSync("app/whatsapp/conversations/page.tsx", "utf8");
assert.match(ui, /requestId !== listRequestIdRef\.current/,
  "list must reject late filter/page responses");
assert.match(ui, /requestId !== threadRequestIdRef\.current \|\| activeChatIdRef\.current !== conversation\.id/,
  "thread must reject responses from non-active chats");
assert.match(ui, /\+\+threadRequestIdRef\.current;/,
  "chat selection must invalidate outstanding requests");
console.log("WhatsApp cache/account/race regression: PASS");
