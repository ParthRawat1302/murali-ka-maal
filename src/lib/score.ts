import type { Difficulty } from "./types";

/** Leaderboard points per solved question. */
export const POINTS: Record<Difficulty, number> = { easy: 1, medium: 3, hard: 5 };

export function score(c: Record<Difficulty, number>) {
  return c.easy * POINTS.easy + c.medium * POINTS.medium + c.hard * POINTS.hard;
}
