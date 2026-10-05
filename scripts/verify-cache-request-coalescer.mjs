import assert from "node:assert/strict";
import {
  coalesceRequest,
  inflightRequestCount,
  resetRequestCoalescerForTests,
} from "../lib/cache-request-coalescer.mjs";

async function main() {
  resetRequestCoalescerForTests();

  let calls = 0;
  const factory = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return { ok: true, value: 42 };
  };
  const identical = await Promise.all(
    Array.from({ length: 100 }, () => coalesceRequest("user-a:profile", factory)),
  );
  assert.equal(calls, 1, "100 identical in-flight reads must cause exactly one network factory call");
  assert.equal(identical.length, 100);
  assert.ok(identical.every((item) => item.ok && item.value === 42));
  assert.equal(inflightRequestCount(), 0, "completed requests must leave no in-flight entry");

  // Different users/keys never share work.
  calls = 0;
  const values = await Promise.all([
    coalesceRequest("user-a:profile", async () => { calls += 1; return "A"; }),
    coalesceRequest("user-b:profile", async () => { calls += 1; return "B"; }),
    coalesceRequest("user-a:usage", async () => { calls += 1; return "U"; }),
  ]);
  assert.deepEqual(values, ["A", "B", "U"]);
  assert.equal(calls, 3, "different identities must remain independent");

  // Failure is shared only while in flight, then the key is immediately retryable.
  calls = 0;
  const boom = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    throw new Error("offline");
  };
  const failed = await Promise.allSettled([
    coalesceRequest("user-a:today", boom),
    coalesceRequest("user-a:today", boom),
  ]);
  assert.equal(calls, 1);
  assert.ok(failed.every((item) => item.status === "rejected"));
  assert.equal(inflightRequestCount(), 0);

  const recovered = await coalesceRequest("user-a:today", async () => {
    calls += 1;
    return "recovered";
  });
  assert.equal(recovered, "recovered");
  assert.equal(calls, 2, "a rejected request must not poison future retries");

  console.log("CACHE_CLIENT_COALESCER=PASS");
  console.log("IDENTICAL_CONCURRENT=100");
  console.log("NETWORK_CALLS_FOR_IDENTICAL=1");
}

await main();
