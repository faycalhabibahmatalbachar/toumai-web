import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ORIGIN = "https://toumaiai.com";
const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const version = source.match(/const VERSION = ["']([^"']+)["']/)?.[1];
assert.ok(version, "service-worker VERSION must be explicit");

function keyOf(request) {
  const raw = typeof request === "string" ? request : request?.url;
  return new URL(raw, ORIGIN).href;
}

function makeHarness() {
  const listeners = new Map();
  const stores = new Map();
  const deletedCaches = [];
  const networkCalls = [];
  let network = async (request) => new Response(`network:${keyOf(request)}`, { status: 200 });

  function store(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  }

  const caches = {
    async open(name) {
      const entries = store(name);
      return {
        async put(request, response) {
          entries.set(keyOf(request), response.clone());
        },
      };
    },
    async match(request) {
      const key = keyOf(request);
      for (const entries of stores.values()) {
        if (entries.has(key)) return entries.get(key).clone();
      }
      return undefined;
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      deletedCaches.push(name);
      return stores.delete(name);
    },
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    async skipWaiting() {},
    clients: {
      async claim() {},
      async matchAll() { return []; },
      async openWindow() {},
    },
    registration: {
      async showNotification() {},
      async unregister() { return true; },
    },
  };

  const context = {
    self,
    caches,
    URL,
    Response,
    Promise,
    console,
    setTimeout,
    clearTimeout,
    fetch: async (request, options) => {
      networkCalls.push({ request, options, url: keyOf(request) });
      return network(request, options);
    },
  };
  vm.runInNewContext(source, context, { filename: "public/sw.js" });

  async function dispatchFetch(request) {
    let responsePromise = null;
    const event = {
      request,
      respondWith(value) {
        assert.equal(responsePromise, null, "respondWith must be called at most once");
        responsePromise = Promise.resolve(value);
      },
    };
    listeners.get("fetch")(event);
    return {
      intercepted: responsePromise !== null,
      response: responsePromise ? await responsePromise : null,
    };
  }

  async function dispatchLifecycle(type) {
    let wait = null;
    listeners.get(type)({
      waitUntil(value) { wait = Promise.resolve(value); },
    });
    if (wait) await wait;
  }

  return {
    stores,
    deletedCaches,
    networkCalls,
    dispatchFetch,
    dispatchLifecycle,
    setNetwork(fn) { network = fn; },
    seed(cacheName, url, body) {
      store(cacheName).set(keyOf(url), new Response(body, { status: 200 }));
    },
  };
}

// SW-01 — ressource statique disponible hors ligne.
{
  const h = makeHarness();
  h.seed(version, "/font-test.woff2", "font-cache");
  h.setNetwork(async () => { throw new Error("offline"); });
  const result = await h.dispatchFetch({ method: "GET", mode: "cors", url: `${ORIGIN}/font-test.woff2` });
  assert.equal(result.intercepted, true);
  assert.equal(await result.response.text(), "font-cache");
  assert.equal(h.networkCalls.length, 0, "cache-first static hit must not touch network");
}
console.log("SW-01_STATIC_OFFLINE=PASS");

// SW-02 — bundle Next fingerprinté : cache-first.
{
  const h = makeHarness();
  h.seed(version, "/_next/static/chunks/app-abc123.js", "next-cache");
  const result = await h.dispatchFetch({ method: "GET", mode: "cors", url: `${ORIGIN}/_next/static/chunks/app-abc123.js` });
  assert.equal(await result.response.text(), "next-cache");
  assert.equal(h.networkCalls.length, 0);
}
console.log("SW-02_NEXT_IMMUTABLE=PASS");

// SW-03 — /api et /api/* sont totalement hors CacheStorage.
for (const path of ["/api", "/api/user/profile", "/api/chat/history"]) {
  const h = makeHarness();
  const before = JSON.stringify([...h.stores.entries()].map(([k, v]) => [k, v.size]));
  const result = await h.dispatchFetch({ method: "GET", mode: "cors", url: `${ORIGIN}${path}` });
  assert.equal(result.intercepted, false, `${path} must be network-owned by the browser`);
  assert.equal(h.networkCalls.length, 0, "SW itself must not fetch private API");
  const after = JSON.stringify([...h.stores.entries()].map(([k, v]) => [k, v.size]));
  assert.equal(after, before);
}
console.log("SW-03_SAME_ORIGIN_API_EXCLUDED=PASS");

// SW-04 — api.* / wa.* et tout cross-origin sont non interceptés.
for (const url of [
  "https://api.toumaiai.com/chat/history",
  "https://wa.toumaiai.com/session",
  "https://example.org/public.json",
]) {
  const h = makeHarness();
  const result = await h.dispatchFetch({ method: "GET", mode: "cors", url });
  assert.equal(result.intercepted, false, `${url} must remain network-only`);
  assert.equal(h.networkCalls.length, 0);
}
console.log("SW-04_EXTERNAL_PRIVATE_EXCLUDED=PASS");

// SW-05 — POST /chat/stream ne peut jamais entrer dans CacheStorage.
{
  const h = makeHarness();
  const result = await h.dispatchFetch({
    method: "POST",
    mode: "cors",
    url: "https://api.toumaiai.com/chat/stream",
  });
  assert.equal(result.intercepted, false);
  assert.equal(h.networkCalls.length, 0);
  assert.equal([...h.stores.values()].reduce((n, entries) => n + entries.size, 0), 0);
}
console.log("SW-05_POST_CHAT_EXCLUDED=PASS");

// SW-06 — deux comptes successifs ne peuvent recevoir une ancienne réponse API
// du SW : celui-ci ne possède aucune réponse API, quel que soit l'en-tête auth.
{
  const h = makeHarness();
  for (const token of ["Bearer account-A", "Bearer account-B"]) {
    const result = await h.dispatchFetch({
      method: "GET",
      mode: "cors",
      url: "https://api.toumaiai.com/user/profile",
      headers: { authorization: token },
    });
    assert.equal(result.intercepted, false);
  }
  assert.equal([...h.stores.values()].reduce((n, entries) => n + entries.size, 0), 0);
}
console.log("SW-06_ACCOUNT_SWITCH_NO_API_REPLAY=PASS");

// SW-07 — activation purge uniquement les anciennes versions Toumai. Un cache
// futur d'une autre application sur le même origin ne doit pas être détruit.
{
  const h = makeHarness();
  h.seed("toumai-v5", "/old-a", "old");
  h.seed("toumai-v7", "/old-b", "old");
  h.seed(version, "/current", "current");
  h.seed("another-app-cache-v1", "/other", "other");
  await h.dispatchLifecycle("activate");
  assert.equal(h.stores.has(version), true);
  assert.equal(h.stores.has("toumai-v5"), false);
  assert.equal(h.stores.has("toumai-v7"), false);
  assert.equal(h.stores.has("another-app-cache-v1"), true, "activation must not erase unrelated caches");
}
console.log("SW-07_VERSION_PURGE_SCOPED=PASS");

console.log(`CACHE_009_SERVICE_WORKER=PASS version=${version}`);
