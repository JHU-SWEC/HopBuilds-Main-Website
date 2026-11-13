/** Input rules shared by the leaderboard endpoints. */

import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

export const NAME_MAX = 16;
export const EMAIL_MAX = 254; /* RFC 5321 upper bound on a full address */
export const SCORE_MAX = 150; /* a 30-second run realistically tops out near 100; this leaves headroom without accepting absurd values */
export const BOARD_LIMIT = 10; /* rows a bare GET returns when no limit is asked for */
export const BOARD_MAX = 500;  /* ceiling on ?limit=, so one request can pull the whole board */

/** Strip control characters and collapse whitespace, then cap the length. */
export const cleanName = (value) => {
  if (typeof value !== "string") return null;
  const stripped = value
    /* Control characters, plus Unicode format characters (\p{Cf}): bidi
       overrides like U+202E can flip how a name and the row around it render,
       and zero-width characters make two names look identical or slip a
       blocked word past the profanity check. */
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  return stripped.slice(0, NAME_MAX);
};

/*
 * Built once per container. The dataset covers slurs as well as profanity, and
 * the transformers catch the usual disguises: leetspeak ("sh1t"), symbol swaps
 * ("a$$"), and stretched letters ("fuuuck"). Its patterns are word-aware, so
 * names like "Scunthorpe", "Dickens", or "Hancock" are not caught.
 */
const profanity = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * Collapse runs of single characters split by separators ("f u c k",
 * "n-i-g-g-a") into one word. Only single-character runs are joined: removing
 * every space instead would read "Ana Lee" as one word and reject a real name.
 */
const joinSpelledOut = (value) =>
  value.replace(
    /(?<![\p{L}\p{N}])\S(?:[^\p{L}\p{N}]+\S(?![\p{L}\p{N}]))+/gu,
    (run) => run.replace(/[\s._\-~*+,:;'"/\\]/g, "")
  );

/** True when a (cleaned) name contains a slur or profanity. */
export const isOffensiveName = (name) =>
  profanity.hasMatch(name) || profanity.hasMatch(joinSpelledOut(name));

export const cleanScore = (value) => {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > SCORE_MAX) return null;
  return value;
};

/**
 * Returns the normalized address, null when absent, or the string "invalid" so
 * the caller can tell "not given" from "given badly". The leaderboard endpoint
 * requires an address — it is the identity a board entry is keyed on — but the
 * distinction still matters for the error message the player sees.
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
