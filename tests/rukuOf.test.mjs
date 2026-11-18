// tests/rukuOf.test.mjs — সূরার ভেতরের রুকু-নম্বর (বাস্তব meta.json দিয়ে)।
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rukuOf } from "../src/legacy/quranCore.js";

const meta = JSON.parse(readFileSync(new URL("../public/quran/v1/meta.json", import.meta.url), "utf8"));

test("রুকু-নম্বর: সূরার ভেতরে ১ থেকে, সীমানায় ঠিক", () => {
  assert.equal(rukuOf(meta, 1, 1), 1);
  assert.equal(rukuOf(meta, 2, 1), 1);
  assert.equal(rukuOf(meta, 2, 7), 1);
  assert.equal(rukuOf(meta, 2, 8), 2);
});

test("প্রতি সূরার শেষ আয়াতের রুকু-নম্বর যোগ করলে মোট রুকু মেলে", () => {
  const total = meta.surahs.reduce((n, sm) => n + rukuOf(meta, sm.n, sm.ayahs), 0);
  assert.equal(total, meta.rukus.length);
});

test("ডেটা না থাকলে ০, ভেঙে পড়ে না", () => {
  assert.equal(rukuOf({}, 2, 5), 0);
  assert.equal(rukuOf(null, 2, 5), 0);
});
