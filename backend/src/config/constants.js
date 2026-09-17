export const practiceConfig = Object.freeze({
  BASE_VALUE: 100,
  MIN_VALUE: 20,
  MAX_VALUE: 300,
  WRONG_DELTA: 40,
  TIMEOUT_DELTA: 50,
  CORRECT_FAST_DELTA: -30,
  CORRECT_SLOW_DELTA: -10,
  SLOW_THRESHOLD_MS: 20_000,
  QUESTION_TIME_LIMIT_MS: 30_000
});

export const supportedLanguages = new Set(["en", "hi"]);
