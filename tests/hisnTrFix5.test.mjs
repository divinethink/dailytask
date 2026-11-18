// tests/hisnTrFix5.test.mjs — ধাপ ৫ (ব্যাচ ৫) উচ্চারণ কারেকশনের রক্ষাকবচ।
import test from "node:test";
import assert from "node:assert/strict";
import { HISN_BATCH5 as B } from "../src/legacy/hisnBatch5.js";

const all = B.flatMap((c) => c.duas);
const tr = (id) => all.find((d) => d.id === id).tr;

test("ব্যাচ ৫ উচ্চারণ: ‘ ছুটে যাওয়া, ض দ্বিত্ব, বাড়তি যুক্তাক্ষর, ওয়াকফ", () => {
  assert.ok(tr("hm48_146").startsWith("উ‘ঈযুকুমা"));
  assert.ok(tr("hm83_194").includes("ফাদ্বদ্বালানী") && tr("hm83_194").includes("তাফদ্বীলা"));
  assert.ok(tr("hm85_196").includes("আসতাগফিরুকা") && !tr("hm85_196").includes("আস্তা"));
  assert.ok(tr("hm89_200").includes("আহবাবতানী") && tr("hm89_200").endsWith("লাহ।"));
  assert.ok(tr("hm80_191").endsWith("‘আলাইহ।") && tr("hm80_191").includes("‘আলাইহি, ওয়া"));
  assert.ok(tr("hm91_202").endsWith("ওয়াল আদা-’।"));
});
