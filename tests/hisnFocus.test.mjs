// tests/hisnFocus.test.mjs — দু'আর ট্যাপ-গণনা ও একটা-একটা-করে মোডের সূচক।
import test from "node:test";
import assert from "node:assert/strict";
import { bumpCount, clampIndex } from "../src/legacy/hisnCore.js";

test("bumpCount: ১ করে বাড়ে, লক্ষ্যে থামে, অবৈধ ইনপুটে নিরাপদ", () => {
  assert.equal(bumpCount(0, 33), 1);
  assert.equal(bumpCount(32, 33), 33);
  assert.equal(bumpCount(33, 33), 33);
  assert.equal(bumpCount(5, 3), 3);
  assert.equal(bumpCount(undefined, 10), 1);
  assert.equal(bumpCount(-4, 10), 1);
  assert.equal(bumpCount(0, 0), 1);
  assert.equal(bumpCount("x", "y"), 1);
});

test("clampIndex: সীমার ভেতরে; -১/অবৈধ/খালি তালিকায় ০", () => {
  assert.equal(clampIndex(2, 5), 2);
  assert.equal(clampIndex(9, 5), 4);
  assert.equal(clampIndex(-1, 5), 0);
  assert.equal(clampIndex(NaN, 5), 0);
  assert.equal(clampIndex(3, 0), 0);
});
