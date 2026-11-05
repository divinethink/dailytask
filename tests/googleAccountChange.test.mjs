// চালান: node --test tests/   (কোনো dependency লাগে না)
import test from "node:test";
import assert from "node:assert/strict";
import { RELINK_FLAG, MESSAGES, relinkErrorMessage, staleMappingKey, oldEmailFromFlag } from "../src/legacy/googleAccountChange.js";

test("relinkErrorMessage: পরিচিত কোড ⇒ প্রমিত বাংলা বার্তা; অজানা ⇒ সাধারণ বার্তা (কোড কখনো ফাঁস হয় না)", () => {
  assert.equal(relinkErrorMessage("auth/credential-already-in-use"), MESSAGES.alreadyUsed);
  assert.equal(relinkErrorMessage("auth/email-already-in-use"), MESSAGES.alreadyUsed);
  assert.equal(relinkErrorMessage("auth/popup-closed-by-user"), MESSAGES.incomplete);
  assert.equal(relinkErrorMessage("auth/cancelled-popup-request"), MESSAGES.incomplete);
  assert.equal(relinkErrorMessage("auth/popup-blocked"), MESSAGES.popupBlocked);
  assert.equal(relinkErrorMessage("auth/network-request-failed"), MESSAGES.network);
  assert.equal(relinkErrorMessage("auth/requires-recent-login"), MESSAGES.recentLogin);
  assert.equal(relinkErrorMessage("auth/something-new"), MESSAGES.generic);
  assert.equal(relinkErrorMessage(undefined), MESSAGES.generic);
  for (const m of Object.values(MESSAGES)) assert.ok(!/auth\//.test(m));
});
test("staleMappingKey: নতুন মেইল আলাদা হলেই পুরনোর key; একই মেইল/ফাঁকা হলে null", () => {
  assert.equal(staleMappingKey("Old@Gmail.com ", "new@gmail.com"), "old@gmail.com");
  assert.equal(staleMappingKey("a@gmail.com", " A@GMAIL.com"), null);   // পুরনো ফিরিয়ে আনা
  assert.equal(staleMappingKey(null, "n@gmail.com"), null);
  assert.equal(staleMappingKey("1", "n@gmail.com"), null);               // মেইল জানা না থাকলে (ফ্ল্যাগ "1")
  assert.equal(staleMappingKey("o@gmail.com", null), "o@gmail.com");
});
test("oldEmailFromFlag", () => {
  assert.equal(oldEmailFromFlag("a@b.com"), "a@b.com");
  assert.equal(oldEmailFromFlag("1"), null);
  assert.equal(oldEmailFromFlag(null), null);
  assert.ok(RELINK_FLAG);
});
