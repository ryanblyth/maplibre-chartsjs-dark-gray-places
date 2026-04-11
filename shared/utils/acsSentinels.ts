/**
 * U.S. Census ACS (and related) products use special numeric codes for
 * missing, suppressed, or not-computable estimates. Treat them as absent for display.
 *
 * @see Census Bureau ACS documentation — "special values" in technical documentation.
 */
const ACS_MISSING_NUMERIC = new Set<number>([
  -222222222,
  -333333333,
  -444444444,
  -555555555,
  -666666666,
  -888888888,
  -999999999,
]);

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** True when `value` is a published ACS missing/suppression sentinel (number or numeric string). */
export function isAcsMissingNumericValue(value: unknown): boolean {
  const n = toFiniteNumber(value);
  if (n === null) return false;
  return ACS_MISSING_NUMERIC.has(n);
}

/** Returns `null` if missing/sentinel/non-numeric; otherwise the finite number. */
export function normalizeAcsNumeric(value: unknown): number | null {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  return ACS_MISSING_NUMERIC.has(n) ? null : n;
}
