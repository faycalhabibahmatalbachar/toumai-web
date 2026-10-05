import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/swr-cache.ts", import.meta.url), "utf8");

// Session identity must be part of rendered state, not only localStorage keys.
assert.match(source, /useSyncExternalStore\(subscribeOwner/);
assert.match(source, /identityFor\(scope, key\)/);
assert.match(source, /state\.identity === identity \? state : neutralState/);

// A request resolving after account switch must write to its captured scope
// and may only update state when that same identity is still active.
assert.match(source, /const requestedScope = scope/);
assert.match(source, /cacheWriteFor\(requestedScope, key, value\)/);
assert.match(source, /current\.identity === requestedIdentity/);

// Network revalidations share the browser singleflight by scoped identity.
assert.match(source, /coalesceRequest<T>\(requestedIdentity, runFetcher\)/);

// React 19 lint regression: refs must not be assigned directly during render.
assert.doesNotMatch(source, /fetcherRef\.current\s*=\s*fetcher;\s*\n\s*\n\s*\/\//);
assert.match(source, /useEffect\(\(\) => \{\s*fetcherRef\.current = fetcher;/s);

// Cache format was intentionally bumped for the hardened semantics.
assert.match(source, /const VERSION = 3;/);

console.log("CACHE_CLIENT_SESSION_ISOLATION=PASS");
console.log("CACHE_CLIENT_LATE_RESPONSE_GUARD=PASS");
console.log("CACHE_CLIENT_REACT19_REF_GUARD=PASS");
