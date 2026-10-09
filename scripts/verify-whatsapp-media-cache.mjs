// Execute the actual TS cache implementation with a controlled authenticated
// gateway. No browser, network, or private media fixture is needed.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("lib/whatsapp-media-cache.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
} }).outputText;

let owner = "account-A";
let calls = 0;
let responseFn = () => Promise.resolve({
  ok: true,
  headers: new Headers({ "content-type": "audio/ogg" }),
  blob: () => Promise.resolve(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/ogg" })),
});
const fakeHttp = {
  authFetch: (...args) => {
    calls++;
    return responseFn(...args);
  },
};
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: (module) => {
    if (module === "./http") return fakeHttp;
    if (module === "./swr-cache") return { cacheSessionOwner: () => owner };
    throw new Error(`Unexpected module ${module}`);
  },
  Map, Set, Promise, Error, Date, AbortController, Blob, Headers, Uint8Array,
  setTimeout: (fn, ms) => setTimeout(fn, ms === 18_000 ? 15 : ms),
  clearTimeout, console,
}, { filename: "lib/whatsapp-media-cache.ts" });
const { getWhatsAppMediaBlob, whatsAppMediaCacheStats } = exports;

const [first, second] = await Promise.all([
  getWhatsAppMediaBlob("voice-01"),
  getWhatsAppMediaBlob("voice-01"),
]);
assert.equal(first.size, 3);
assert.equal(second.size, 3);
assert.equal(calls, 1, "same-key simultaneous reads must make ONE gateway request");
await getWhatsAppMediaBlob("voice-01");
assert.equal(calls, 1, "remount/polling must use the cached binary");

responseFn = () => Promise.resolve({
  ok: false, status: 404, headers: new Headers(), blob: () => Promise.resolve(new Blob()),
});
await assert.rejects(getWhatsAppMediaBlob("missing-media"), /plus disponible/);
await assert.rejects(getWhatsAppMediaBlob("missing-media"), /plus disponible/);
assert.equal(calls, 2, "404 must be cached; polling must not hammer gateway");

responseFn = () => Promise.resolve({
  ok: true, headers: new Headers({ "content-type": "audio/ogg" }),
  blob: () => Promise.resolve(new Blob([new Uint8Array([4, 5])], { type: "audio/ogg" })),
});
await getWhatsAppMediaBlob("missing-media", { force: true });
assert.equal(calls, 3, "only deliberate retry bypasses a negative cache entry");

let aborted = false;
responseFn = (_path, init) => {
  init.signal.addEventListener("abort", () => { aborted = true; });
  return new Promise(() => {});
};
await assert.rejects(getWhatsAppMediaBlob("hung-voice"), /trop de temps/);
assert.equal(aborted, true, "hung transport must be aborted");
await assert.rejects(getWhatsAppMediaBlob("hung-voice"), /trop de temps/);
assert.equal(calls, 4, "a timed-out resource must NOT restart on rerender");

owner = "account-B";
responseFn = () => Promise.resolve({
  ok: true, headers: new Headers({ "content-type": "image/jpeg" }),
  blob: () => Promise.resolve(new Blob([new Uint8Array([7, 8])], { type: "image/jpeg" })),
});
const b = await getWhatsAppMediaBlob("voice-01");
assert.equal(b.size, 2);
assert.equal(calls, 5, "account B cannot reuse account A media");
assert.equal(whatsAppMediaCacheStats().entries, 1, "session change drops previous media");
responseFn = () => Promise.resolve({
  ok: true,
  headers: new Headers({ "content-type": "text/html" }),
  blob: () => Promise.resolve(new Blob(["<html>login</html>"], { type: "text/html" })),
});
await assert.rejects(getWhatsAppMediaBlob("fake-media"), /n’a pas renvoyé un fichier/);

const component = fs.readFileSync("components/whatsapp/WhatsAppMessageMedia.tsx", "utf8");
assert.match(component, /data-testid="whatsapp-media-failed"/, "unavailable media needs a visible terminal state");
assert.match(component, /setRetryCount\(\(value\) => value \+ 1\)/, "manual recovery must be available");
assert.match(component, /\[binaryMedia, message\.id, retryCount\]/, "metadata updates must not repeatedly refetch bytes");
console.log("WhatsApp media bounded loading, single-flight, negative cache, retry and session isolation: PASS");
