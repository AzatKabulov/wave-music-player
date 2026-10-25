import assert from "node:assert/strict";
import test from "node:test";
import { resolveLocale, translateMessage } from "./locale.ts";
test("supported device languages resolve by base code with English fallback", () => {
  assert.equal(resolveLocale("ru-RU"), "ru");
  assert.equal(resolveLocale("tk-TM"), "tk");
  assert.equal(resolveLocale("fr-FR"), "en");
  assert.equal(resolveLocale(null), "en");
});
test("translation preserves unknown content and safely substitutes text", () => {
  const dictionary = { "Hello {name}": "Привет, {name}" };
  assert.equal(
    translateMessage(dictionary, "Hello {name}", { name: "Ýol" }),
    "Привет, Ýol",
  );
  assert.equal(
    translateMessage(dictionary, "Custom playlist"),
    "Custom playlist",
  );
});
