/**
 * Server-side problem generation and grading for the speed-math drill.
 *
 * The score on the board is no longer something the browser reports. POST
 * /api/session generates the round's problems here and stores them with the
 * session; the browser plays exactly those problems and submits what it typed
 * for each one, with the time it was answered. POST /api/scores re-grades that
 * run against the stored problems, and the score is the number of answers that
 * survive grading. A forged `score` field is simply ignored.
 *
 * Limit of the guarantee: the browser must know each answer to advance
 * instantly (the drill moves on the moment the typed value matches), so a
 * script that solves arithmetic can still play a perfect round. The timing
 * checks bound how fast that script may go; they do not prove a human played.
 */

import crypto from "node:crypto";
import { SCORE_MAX } from "./validate.js";

export const DURATION_MS = 30000;

/* 10 min: covers a slow name-entry after the round ends. Shared with
   api/scores.js so a token past this age is refused even if Mongo's TTL
   monitor (which runs about once a minute) has not deleted it yet. */
export const SESSION_TTL_SECONDS = 600;

/* One problem per possible point, so a round can never run out of problems
   before it could reach the score ceiling. */
export const PROBLEM_COUNT = SCORE_MAX;

/* Slack on the 30s clock for the client's 100ms ticker and event-loop jitter. */
const DURATION_SLACK_MS = 1000;

/* Read, type, and match a new problem in under this and it is not a person.
   30000 / 150 = 200, so this floor alone already caps a round near SCORE_MAX. */
export const MIN_ANSWER_GAP_MS = 150;

const rand = (min, max) => crypto.randomInt(min, max + 1);

/* zetamac ranges: a+b and a-b over 2..100, a*b and a/b over 2..10 by 2..100.
   Subtraction and division are stored in reverse so answers stay whole. */
const makeProblem = () => {
  const mode = rand(1, 4);
  if (mode === 1) return { a: rand(2, 100), b: rand(2, 100), op: "+" };
  if (mode === 2) {
    const x = rand(2, 100);
    const y = rand(2, 100);
    return { a: x + y, b: x, op: "-" };
  }
  if (mode === 3) return { a: rand(2, 10), b: rand(2, 100), op: "*" };
  const x = rand(2, 10);
  const y = rand(2, 100);
  return { a: x * y, b: x, op: "/" };
};

export const generateProblems = () => Array.from({ length: PROBLEM_COUNT }, makeProblem);

export const answerOf = ({ a, b, op }) => {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  return a / b;
};

/**
 * Grade a submitted run. `answers` is [{ value, t }], one entry per problem
 * the player advanced past, in order; `t` is milliseconds since the round
 * started. `elapsedMs` is how long the server has seen this session exist,
 * which a client cannot fake.
 *
 * Returns { score } or { error }. Any invalid entry rejects the whole run:
 * an honest client never sends one, so partial credit would only help a
 * forged run.
 */
export const gradeRun = ({ problems, answers, elapsedMs }) => {
  if (!Array.isArray(problems)) return { error: "session has no problems" };
  if (!Array.isArray(answers)) return { error: "answers missing" };
  if (answers.length > problems.length) return { error: "too many answers" };

  let previous = 0;
  for (let i = 0; i < answers.length; i += 1) {
    const entry = answers[i];
    const value = entry?.value;
    const t = entry?.t;
    if (!Number.isInteger(value) || !Number.isFinite(t)) return { error: "malformed answer" };
    if (value !== answerOf(problems[i])) return { error: "wrong answer" };
    if (t < previous + MIN_ANSWER_GAP_MS) return { error: "answered too fast" };
    if (t > DURATION_MS + DURATION_SLACK_MS) return { error: "answered after time ran out" };
    if (t > elapsedMs + DURATION_SLACK_MS) return { error: "answered before the session existed" };
    previous = t;
  }

  return { score: answers.length };
};
