import { practiceConfig } from "../config/constants.js";

export function clampValue(value) {
  return Math.max(practiceConfig.MIN_VALUE, Math.min(practiceConfig.MAX_VALUE, value));
}

export function nextValue(currentValue, { isCorrect, timedOut, timeTakenMs }) {
  if (timedOut) return clampValue(currentValue + practiceConfig.TIMEOUT_DELTA);
  if (!isCorrect) return clampValue(currentValue + practiceConfig.WRONG_DELTA);
  if (timeTakenMs <= practiceConfig.SLOW_THRESHOLD_MS) {
    return clampValue(currentValue + practiceConfig.CORRECT_FAST_DELTA);
  }
  return clampValue(currentValue + practiceConfig.CORRECT_SLOW_DELTA);
}

export function nextAverage(previousAverage, previousCount, latestMs) {
  if (latestMs == null) return previousAverage;
  if (!previousAverage || previousCount <= 0) return latestMs;
  return Math.round((previousAverage * previousCount + latestMs) / (previousCount + 1));
}
