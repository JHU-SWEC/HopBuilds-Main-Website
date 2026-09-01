/** Input rules shared by the leaderboard endpoints. */

export const NAME_MAX = 16;
export const EMAIL_MAX = 254; /* RFC 5321 upper bound on a full address */
export const SCORE_MAX = 500; /* a 30-second run realistically tops out near 100 */
export const BOARD_LIMIT = 10;

/** Strip control characters and collapse whitespace, then cap the length. */
export const cleanName = (value) => {
  if (typeof value !== "string") return null;
  const stripped = value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  return stripped.slice(0, NAME_MAX);
};

export const cleanScore = (value) => {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > SCORE_MAX) return null;
  return value;
};

/**
 * Email is optional. Returns the normalized address, null when absent, or the
 * string "invalid" so the caller can tell "not given" from "given badly".
 */
export const cleanEmail = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed.length > EMAIL_MAX) return "invalid";
  /* deliberately permissive: one @, no spaces, a dot in the domain */
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)) return "invalid";
  return trimmed;
};
