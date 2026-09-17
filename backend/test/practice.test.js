import test from "node:test";
import assert from "node:assert/strict";
import { practiceConfig } from "../src/config/constants.js";
import { nextValue } from "../src/utils/practice.js";

test("wrong answer increases value", () => {
  assert.equal(nextValue(100, { isCorrect: false, timedOut: false, timeTakenMs: 10_000 }), 140);
});

test("timeout increases value more", () => {
  assert.equal(nextValue(100, { isCorrect: false, timedOut: true, timeTakenMs: 30_000 }), 150);
});

test("fast correct answer decreases value", () => {
  assert.equal(nextValue(100, { isCorrect: true, timedOut: false, timeTakenMs: 5_000 }), 70);
});

test("slow correct answer decreases value slightly", () => {
  assert.equal(nextValue(100, { isCorrect: true, timedOut: false, timeTakenMs: 25_000 }), 90);
});

test("value is clamped", () => {
  assert.equal(nextValue(practiceConfig.MIN_VALUE, { isCorrect: true, timedOut: false, timeTakenMs: 1_000 }), 20);
  assert.equal(nextValue(practiceConfig.MAX_VALUE, { isCorrect: false, timedOut: true, timeTakenMs: 30_000 }), 300);
});
