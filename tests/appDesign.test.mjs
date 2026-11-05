import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeDesign, isDesignKey, DESIGN_KEYS } from "../src/legacy/appDesignCore.js";

test("খালি/অবৈধ doc → null (ডিফল্ট)", () => {
  for (const v of [null, undefined, 5, "x", [], {}, { foo: 1 }]) assert.equal(sanitizeDesign(v), null);
});
test("বৈধ অংশ থাকে, অবৈধ অংশ বাদ", () => {
  const r = sanitizeDesign({
    fieldOverrides: { a: { label: "x" } }, tazkirah: "bad", homeLayout: { entry: [], below: [] },
    prayerLayout: ["1"], tabLayout: [1], extra: 1,
  });
  assert.deepEqual(Object.keys(r).sort(), ["fieldOverrides", "homeLayout", "prayerLayout"]);
});
test("homeLayout-এ entry/below তালিকা না থাকলে বাদ", () => {
  assert.equal(sanitizeDesign({ homeLayout: { entry: [] } }), null);
});
test("isDesignKey শুধু সংজ্ঞায়িত অংশ", () => {
  for (const k of DESIGN_KEYS) assert.ok(isDesignKey(k));
  assert.equal(isDesignKey("customFields"), false);
  assert.equal(isDesignKey("__proto__"), false);
});
