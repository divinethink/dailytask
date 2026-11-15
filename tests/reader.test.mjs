// চালান: node --test tests/   (কোনো dependency লাগে না)
import test from "node:test";
import assert from "node:assert/strict";
import {
  clampFont, readerKey, postText, flattenAccordion, flattenRichtext, flattenTable,
  analyzeText, buildSegments, sanitizeMarks, validMarks, makeMark, itemsHashKey,
  MAX_MARKS, MAX_MARK_TEXT, COLORS, FONT_MIN, FONT_MAX,
} from "../src/legacy/readerCore.js";

test("clampFont: সীমা ও অবৈধ মান", () => {
  assert.equal(clampFont(5), FONT_MIN);
  assert.equal(clampFont(99), FONT_MAX);
  assert.equal(clampFont("20"), 20);
  assert.equal(clampFont("abc"), 18);
  assert.equal(clampFont(undefined), 18);
});

test("readerKey: শুধু নিরাপদ অক্ষর, ≤১০০, খালি হলে ডিফল্ট", () => {
  assert.equal(readerKey("blog_ab/c d"), "blog_ab_c_d");
  assert.equal(readerKey("").length > 0, true);
  assert.equal(readerKey("x".repeat(300)).length, 100);
});

test("postText: [MORE] বাদ, দুই অংশ জোড়া", () => {
  assert.equal(postText({ body: "ক\n[MORE]\nখ" }), "ক\n\nখ");
  assert.equal(postText({ body: "শুধু" }), "শুধু");
  assert.equal(postText(null), "");
});

test("flatten: accordion/richtext/table", () => {
  assert.equal(flattenAccordion([{ title: "অযু", body: "নিয়ত" }, { title: "", body: "খ" }, { title: "", body: "" }]), "▌ অযু\nনিয়ত\n\nখ");
  assert.equal(flattenAccordion(null), "");
  assert.equal(flattenRichtext("ক\n\n\n\nখ"), "ক\n\nখ");
  assert.equal(flattenRichtext(5), "");
  assert.equal(flattenTable({ columns: ["ক", "খ"], rows: [["১", "২"], ["৩", null]] }), "▌ ক | খ\n১ | ২\n৩ | ");
  assert.equal(flattenTable(undefined), "");
});

test("analyzeText: হেডিং-লাইন চেনে", () => {
  const t = "▌ এক\nবডি\n▌ দুই\nবডি২";
  const hs = analyzeText(t);
  assert.equal(hs.length, 2);
  assert.equal(t.slice(hs[0].s, hs[0].e), "▌ এক");
});

test("buildSegments: কভারেজ সম্পূর্ণ, মার্কের সীমায় ভাগ", () => {
  const text = "abcdefghij";
  const marks = [{ id: "a", s: 2, e: 5 }, { id: "b", s: 4, e: 8 }];
  const segs = buildSegments(text, marks, []);
  assert.equal(segs.map((g) => text.slice(g.s, g.e)).join(""), text);
  const at = (i) => segs.find((g) => g.s <= i && i < g.e).covering.map((m) => m.id);
  assert.deepEqual(at(3), ["a"]);
  assert.deepEqual(at(4), ["a", "b"]);
  assert.deepEqual(at(9), []);
});

test("sanitizeMarks: অবৈধ বাদ, রঙ/ডুপ্লিকেট/দৈর্ঘ্য", () => {
  const ok = { id: "m1", s: 0, e: 3, t: "abc", k: "hl", c: COLORS[1] };
  const out = sanitizeMarks([
    ok,
    { ...ok, id: "m1" },                       // ডুপ্লিকেট id
    { ...ok, id: "m2", t: "ab" },              // দৈর্ঘ্য মেলে না
    { ...ok, id: "m3", k: "zz" },              // অচেনা ধরন
    { ...ok, id: "m4", s: -1 },
    { ...ok, id: "m5", e: 0 },
    { ...ok, id: "m6", c: "#123456" },         // অচেনা রঙ → null
    { ...ok, id: "m7", k: "ul", c: COLORS[0] },// ul-এ রঙ নেই
    null, 5, "x",
  ]);
  assert.deepEqual(out.map((m) => m.id), ["m1", "m6", "m7"]);
  assert.equal(out[1].c, null);
  assert.equal(out[2].c, null);
  assert.deepEqual(sanitizeMarks("x"), []);
  assert.deepEqual(sanitizeMarks(undefined), []);
});

test("sanitizeMarks: সর্বোচ্চ সংখ্যা ও টেক্সট-দৈর্ঘ্য", () => {
  const many = Array.from({ length: MAX_MARKS + 20 }, (_, i) => ({ id: "i" + i, s: 0, e: 1, t: "a", k: "ul", c: null }));
  assert.equal(sanitizeMarks(many).length, MAX_MARKS);
  const longT = "x".repeat(MAX_MARK_TEXT + 1);
  assert.deepEqual(sanitizeMarks([{ id: "l", s: 0, e: longT.length, t: longT, k: "ul", c: null }]), []);
});

test("validMarks: লেখা বদলালে অমিল মার্ক লুকায়, ডেটা অক্ষত", () => {
  const marks = [{ id: "a", s: 0, e: 3, t: "abc", k: "ul", c: null }, { id: "b", s: 4, e: 6, t: "ef", k: "ul", c: null }];
  assert.equal(validMarks(marks, "abcdef").length, 2);          // দুটোই মেলে
  assert.deepEqual(validMarks(marks, "abcdXX").map((m) => m.id), ["a"]); // "ef" আর মেলে না
  assert.equal(validMarks(marks, "XXXXXX").length, 0);
  assert.equal(validMarks(marks, "ab").length, 0);              // ছোট লেখা — crash নয়
  assert.equal(marks.length, 2);
});

test("makeMark: সীমা-যাচাই ও ডিফল্ট রঙ", () => {
  const text = "বিসমিল্লাহ পড়া";
  const m = makeMark(text, { s: 0, e: 5 }, "hl", "#bad", "id1");
  assert.equal(m.t, text.slice(0, 5));
  assert.equal(m.c, COLORS[0]);
  assert.equal(makeMark(text, { s: 3, e: 3 }, "hl", null, "x"), null);
  assert.equal(makeMark(text, { s: 0, e: 999 }, "hl", null, "x"), null);
  assert.equal(makeMark(text, null, "hl", null, "x"), null);
  assert.equal(makeMark(text, { s: 0, e: 2 }, "ul", COLORS[2], "u").c, null);
  const big = "a".repeat(MAX_MARK_TEXT + 5);
  assert.equal(makeMark(big, { s: 0, e: big.length }, "ul", null, "x"), null);
});

test("itemsHashKey: স্থির, ট্যাব-ভেদে আলাদা", () => {
  const a = [{ itemId: "x1" }, { itemId: "x2" }];
  const b = [{ itemId: "y1" }];
  assert.equal(itemsHashKey(a), itemsHashKey(a));
  assert.notEqual(itemsHashKey(a), itemsHashKey(b));
  assert.match(itemsHashKey(a), /^t[0-9a-z]+$/);
  assert.equal(typeof itemsHashKey(null), "string");
});
