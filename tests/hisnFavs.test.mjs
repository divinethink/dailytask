// tests/hisnFavs.test.mjs — প্রিয় ⭐ ও সর্বশেষ পড়া (ডিভাইস-লোকাল)।
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeFavs, toggleFav, isFav, resolveFavs, sanitizeLast, resolveLast, readFavs, writeFavs, readLast, writeLast, MAX_FAVS } from "../src/legacy/hisnFavs.js";

const chapters = [
  { id: 1, title: "ঘুম", duas: [{ id: "a1", title: "এক" }, { id: "a2", title: "দুই" }] },
  { id: 2, title: "খাওয়া", duas: [{ id: "b1", title: "তিন" }] },
];

test("sanitizeFavs: অবৈধ/ডুপ্লিকেট বাদ", () => {
  assert.deepEqual(sanitizeFavs(null), []);
  assert.deepEqual(sanitizeFavs("x"), []);
  assert.deepEqual(sanitizeFavs(["a1", "a1", 5, "", null, "b1"]), ["a1", "b1"]);
  assert.equal(sanitizeFavs(Array.from({ length: MAX_FAVS + 20 }, (_, i) => "d" + i)).length, MAX_FAVS);
});

test("toggleFav: যোগ হলে সবার আগে, আবার চাপলে সরে; মূল তালিকা অপরিবর্তিত", () => {
  const a = ["a1"];
  const b = toggleFav(a, "b1");
  assert.deepEqual(b, ["b1", "a1"]);
  assert.deepEqual(a, ["a1"]);
  assert.deepEqual(toggleFav(b, "b1"), ["a1"]);
  assert.equal(isFav(b, "a1"), true);
  assert.equal(isFav(b, "zz"), false);
  assert.deepEqual(toggleFav(a, ""), a);
});

test("toggleFav: সীমা পার হলে পুরনোটা বাদ", () => {
  const full = Array.from({ length: MAX_FAVS }, (_, i) => "d" + i);
  const next = toggleFav(full, "new");
  assert.equal(next.length, MAX_FAVS);
  assert.equal(next[0], "new");
  assert.equal(next.includes("d" + (MAX_FAVS - 1)), false);
});

test("resolveFavs: ক্রম ঠিক, ডেটায় না থাকা id বাদ (তালিকা অক্ষত)", () => {
  const favs = ["b1", "gone", "a2"];
  assert.deepEqual(resolveFavs(chapters, favs), [
    { chapterId: 2, chapterTitle: "খাওয়া", duaId: "b1", title: "তিন" },
    { chapterId: 1, chapterTitle: "ঘুম", duaId: "a2", title: "দুই" },
  ]);
  assert.deepEqual(favs, ["b1", "gone", "a2"]);
  assert.deepEqual(resolveFavs(null, favs), []);
});

test("sanitizeLast / resolveLast", () => {
  assert.equal(sanitizeLast(null), null);
  assert.equal(sanitizeLast({ chapterId: "x" }), null);
  assert.equal(sanitizeLast({ chapterId: 0 }), null);
  assert.deepEqual(sanitizeLast({ chapterId: "2", duaId: "b1" }), { chapterId: 2, duaId: "b1" });
  assert.deepEqual(sanitizeLast({ chapterId: 2, duaId: 7 }), { chapterId: 2, duaId: null });
  assert.deepEqual(resolveLast(chapters, { chapterId: 2, duaId: "b1" }), { chapterId: 2, duaId: "b1", title: "খাওয়া" });
  assert.equal(resolveLast(chapters, { chapterId: 99 }), null);
  assert.equal(resolveLast(chapters, null), null);
});

test("localStorage: লেখা-পড়া ঠিক; খারাপ ডেটা ও অনুপলব্ধ হলে খালি, ক্র্যাশ নয়", () => {
  const store = new Map();
  globalThis.window = { localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) } };
  try {
    assert.deepEqual(readFavs(), []);
    assert.equal(readLast(), null);
    writeFavs(["a1", "b1"]);
    writeLast({ chapterId: 2, duaId: "b1" });
    assert.deepEqual(readFavs(), ["a1", "b1"]);
    assert.deepEqual(readLast(), { chapterId: 2, duaId: "b1" });
    store.set("dt_hisn_favs", "{ভাঙা");
    store.set("dt_hisn_last", "{ভাঙা");
    assert.deepEqual(readFavs(), []);
    assert.equal(readLast(), null);
    globalThis.window = { localStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } };
    assert.deepEqual(readFavs(), []);
    writeFavs(["x"]);
    writeLast({ chapterId: 1 });
  } finally {
    delete globalThis.window;
  }
});
