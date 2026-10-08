import {
  NumbersValidationResult,
  NumbersValidationStatus,
} from "@/types/numbers";

const EXACT_THRESHOLD = 0;
const THRESHOLD_NARROW = 5;
const THRESHOLD_WIDE = 10;

const EXACT_POINTS = 10;
const CLOSE_1_TO_5_POINTS = 7;
const CLOSE_6_TO_10_POINTS = 5;
const DEFAULT_POINTS = 0;

export function evaluateAnswer(
  target: number,
  achievedValue: number,
): NumbersValidationResult {
  let status: NumbersValidationStatus;
  const difference = Math.abs(achievedValue - target);
  if (difference === EXACT_THRESHOLD) {
    status = "exact";
  } else if (difference <= THRESHOLD_NARROW) {
    status = "close-1-to-5";
  } else if (difference <= THRESHOLD_WIDE) {
    status = "close-6-to-10";
  } else {
    status = "valid-further-off";
  }
  return {
    status: status,
    achievedValue: achievedValue,
    difference: difference,
  };
}

export function scoreResult(validation: NumbersValidationResult): number {
  switch (validation.status) {
    case "exact":
      return EXACT_POINTS;

    case "close-1-to-5":
      return CLOSE_1_TO_5_POINTS;

    case "close-6-to-10":
      return CLOSE_6_TO_10_POINTS;

    case "valid-further-off":
      return DEFAULT_POINTS;

    default:
      return DEFAULT_POINTS;
  }
}
