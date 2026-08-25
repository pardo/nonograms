import type { SolveReport } from './solver'
import type { Difficulty } from './types'

/**
 * What actually makes a nonogram hard.
 *
 * Not fill density: a 50%-filled grid is no harder than a 65%-filled one, and
 * *sparser* grids are mostly just ambiguous (no unique solution) rather than
 * difficult. What separates an easy puzzle from a brutal one is the reasoning
 * the player has to do, which the literature measures along three axes:
 *
 *  1. Depth. Is the puzzle "simple" (line-solvable) — every step follows from a
 *     single row or column in isolation — or does it stall, forcing the player
 *     to assume a cell and chase a contradiction? That is a hard cliff in
 *     perceived difficulty, and it's the line between Hard and Expert here.
 *  2. Sweeps. How many full row+column passes it takes. A 2-sweep puzzle feels
 *     like filling in a form; an 8-sweep one keeps sending you back around.
 *  3. Grind. How much you get per deduction, and how much ambiguity you had to
 *     see through to get it. Clues that hand you a whole row are easy; clues
 *     where each pass yields one more cell out of hundreds of possible
 *     placements are what people mean by "hard".
 *
 * `score` blends those into one number, calibrated against sampled puzzles at
 * each board size (see BANDS).
 */

/** Weights chosen so each term contributes on a comparable scale at all sizes. */
export function scoreReport(report: SolveReport, size: number): number {
  if (!report.solved) return Infinity

  const cells = size * size
  // Cells won per productive line deduction, expressed as "how many deductions
  // it takes to fill one line" so it stays comparable across board sizes.
  const grind = size / (report.cellsFromLines / Math.max(1, report.productiveSolves))

  return (
    report.sweeps +
    6 * (report.ambiguity / cells) +
    1.2 * grind +
    0.4 * report.peakAmbiguity +
    // Needing a hypothesis at all is a step change, not a gradient.
    (report.depth > 0 ? 12 + 2 * report.contradictions : 0)
  )
}

interface Band {
  /** Inclusive score window a puzzle must land in to earn this label. */
  min: number
  max: number
  /** Expert additionally requires hypothesis reasoning; the rest must not need it. */
  requireDepth?: boolean
}

/**
 * Score windows per board size, read off the score distribution of thousands
 * of sampled solvable puzzles (roughly: easy <= p20, medium p35-p60,
 * hard >= p85, expert = not line-solvable at all).
 */
const BANDS: Record<number, Record<Difficulty, Band>> = {
  5: {
    easy: { min: 0, max: 4.2 },
    medium: { min: 5.4, max: 6.2 },
    hard: { min: 8.5, max: Infinity },
    expert: { min: 12, max: Infinity, requireDepth: true },
  },
  10: {
    easy: { min: 0, max: 6.0 },
    medium: { min: 8.0, max: 9.2 },
    hard: { min: 12.5, max: Infinity },
    expert: { min: 12, max: Infinity, requireDepth: true },
  },
  15: {
    easy: { min: 0, max: 7.5 },
    medium: { min: 10.0, max: 11.8 },
    hard: { min: 17.0, max: Infinity },
    expert: { min: 12, max: Infinity, requireDepth: true },
  },
}

export function bandFor(size: number, difficulty: Difficulty): Band {
  return (BANDS[size] ?? BANDS[10])[difficulty]
}

/** Does a rated puzzle qualify for the requested label? */
export function matchesDifficulty(
  report: SolveReport,
  size: number,
  difficulty: Difficulty,
): boolean {
  if (!report.solved) return false
  const band = bandFor(size, difficulty)
  if (band.requireDepth) return report.depth > 0
  // Easy/Medium/Hard promise "no guessing required", so hypothesis puzzles are
  // never labelled as one of them regardless of score.
  if (report.depth > 0) return false
  const score = scoreReport(report, size)
  return score >= band.min && score <= band.max
}

/** How far a candidate sits from the requested band; used to pick a fallback. */
export function distanceToBand(
  report: SolveReport,
  size: number,
  difficulty: Difficulty,
): number {
  if (!report.solved) return Infinity
  const band = bandFor(size, difficulty)
  if (band.requireDepth && report.depth === 0) return Infinity
  if (!band.requireDepth && report.depth > 0) return Infinity
  const score = scoreReport(report, size)
  if (score < band.min) return band.min - score
  if (score > band.max) return score - band.max
  return 0
}

export interface SamplingPrior {
  /** Fraction of cells filled before smoothing. */
  density: [number, number]
  /**
   * Rounds of majority smoothing. This is the real knob: smoothing merges
   * speckle into solid shapes, which produces long clue blocks that resolve
   * immediately. Zero smoothing leaves fragmented lines full of small blocks —
   * many placements per clue, few forced cells, i.e. a hard puzzle.
   */
  smoothing: number[]
}

const PRIORS: Record<Difficulty, SamplingPrior> = {
  easy: { density: [0.55, 0.7], smoothing: [2, 2, 3] },
  medium: { density: [0.5, 0.66], smoothing: [1, 1, 2] },
  hard: { density: [0.42, 0.58], smoothing: [0, 0, 1] },
  expert: { density: [0.42, 0.58], smoothing: [0, 0, 1] },
}

export function priorFor(difficulty: Difficulty): SamplingPrior {
  return PRIORS[difficulty]
}

/** One-line explanation of what each tier actually demands, for the UI. */
export const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  easy: 'Solid shapes. Most rows fall out on the first pass.',
  medium: 'Some back-and-forth between rows and columns.',
  hard: 'Fragmented clues. Many passes, a cell or two at a time.',
  expert: 'Stalls out. You must assume a cell and disprove it.',
}
