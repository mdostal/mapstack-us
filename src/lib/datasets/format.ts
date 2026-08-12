/**
 * Real ordinal-suffix formatting for a percentile value, e.g. 82.1 -> "82.1st".
 * Shared by every dataset that surfaces a percentile rank in its detail
 * string (crime.ts, income.ts, svi.ts) -- a real formatting bug found live
 * by this project's own QA sweep: those detail strings previously
 * hardcoded the literal suffix "th" onto every value (`${value}th
 * percentile`), producing wrong text like "82.1th percentile" for any
 * value ending in 1, 2, or 3.
 *
 * These percentile values are always rounded to one real decimal place
 * before display, so the suffix is chosen from whichever digit ends up
 * immediately before it as printed (the classic 11th/12th/13th English
 * exception only applies to a WHOLE number's own last two digits -- it
 * has no defined meaning for a fractional tail like ".11", so a value
 * with a decimal part always uses the plain last-digit rule).
 */
export function toOrdinal(value: number): string {
  const text = String(value);
  const lastDigit = Number(text[text.length - 1]);
  const isWholeNumber = !text.includes(".");

  let suffix: string;
  if (isWholeNumber) {
    const lastTwo = Math.abs(value) % 100;
    suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : ordinalSuffixForDigit(lastDigit);
  } else {
    suffix = ordinalSuffixForDigit(lastDigit);
  }
  return `${text}${suffix}`;
}

function ordinalSuffixForDigit(digit: number): string {
  if (digit === 1) return "st";
  if (digit === 2) return "nd";
  if (digit === 3) return "rd";
  return "th";
}
