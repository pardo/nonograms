import { computeClues } from './clues'
import {
  DIFFICULTY_BLURB,
  distanceToBand,
  matchesDifficulty,
  priorFor,
  scoreReport,
} from './difficulty'
import { decodeSolution } from './encode'
import { analyze } from './solver'
import type { Difficulty, Puzzle } from './types'

export const SIZES = [5, 10, 15] as const

export const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: 'easy', label: 'Easy', blurb: DIFFICULTY_BLURB.easy },
  { id: 'medium', label: 'Medium', blurb: DIFFICULTY_BLURB.medium },
  { id: 'hard', label: 'Hard', blurb: DIFFICULTY_BLURB.hard },
  { id: 'expert', label: 'Expert', blurb: DIFFICULTY_BLURB.expert },
]

export function isKnownSize(size: number): boolean {
  return (SIZES as readonly number[]).includes(size)
}

export function isKnownDifficulty(id: string): id is Difficulty {
  return DIFFICULTIES.some((d) => d.id === id)
}

/**
 * Bounds on the Expert search. A puzzle needing a couple of contradiction
 * breakthroughs is a satisfying expert board; one needing twenty is just
 * tedious, and proving that a badly stalled board is merely ambiguous is the
 * expensive case, so both are cut off.
 */
const EXPERT_LIMITS = {
  maxContradictions: 6,
  maxStallFraction: 0.55,
  maxHypotheses: 60,
} as const

/**
 * Time budget per generation. The UI shows a spinner while this runs, so it can
 * afford to be picky rather than settle for a near-miss candidate.
 */
const TIME_BUDGET_MS = 4500
const MAX_ATTEMPTS = 20000

function randomGrid(size: number, density: number): boolean[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random() < density),
  )
}

/**
 * Majority smoothing: each cell takes the majority state of its 3x3
 * neighbourhood. Repeated rounds turn random speckle into solid shapes, which
 * is what separates an easy board from a hard one — see difficulty.ts.
 */
function smooth(grid: boolean[][], rounds: number): boolean[][] {
  const size = grid.length
  let current = grid

  for (let round = 0; round < rounds; round++) {
    const next = current.map((row) => row.slice())
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let filled = 0
        let total = 0
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr
            const cc = c + dc
            if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue
            total++
            if (current[rr][cc]) filled++
          }
        }
        next[r][c] = filled * 2 > total ? true : filled * 2 < total ? false : current[r][c]
      }
    }
    current = next
  }

  return current
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]
}

function sampleCandidate(size: number, difficulty: Difficulty): boolean[][] {
  const prior = priorFor(difficulty)
  const [lo, hi] = prior.density
  const density = lo + Math.random() * (hi - lo)
  return smooth(randomGrid(size, density), pick(prior.smoothing))
}

/**
 * Generates a random square puzzle that has been *measured* to sit in the
 * requested difficulty band, not just generated with a difficulty-flavoured
 * fill density.
 *
 * Easy/Medium/Hard are all solvable by pure line logic (no guessing ever
 * required) and differ in how much work that logic is; Expert deliberately
 * stalls line logic and requires hypothesis-and-contradiction reasoning, while
 * still having exactly one solution.
 *
 * Candidates are sampled with a difficulty-appropriate prior to keep the search
 * short, but acceptance is always decided by rating the candidate. If the
 * budget runs out, the closest-rated candidate seen is returned rather than
 * failing.
 */
export function generateRandomPuzzle(size: number, difficulty: Difficulty): Puzzle {
  const wantsDepth = difficulty === 'expert'
  const deadline = Date.now() + TIME_BUDGET_MS

  // Closest candidate to the requested band, and - for Expert, where anything
  // off-band is off-band by an unbounded amount - the hardest solvable board
  // seen, so a slow search degrades to "harder than Hard" instead of failing.
  let best: boolean[][] | null = null
  let bestDistance = Infinity
  let hardest: boolean[][] | null = null
  let hardestScore = -Infinity

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt % 16 === 0 && Date.now() > deadline) break

    const solution = sampleCandidate(size, difficulty)

    // Avoid trivially empty/full boards, which read as broken rather than easy.
    const filled = solution.flat().filter(Boolean).length
    const total = size * size
    if (filled < total * 0.2 || filled > total * 0.85) continue

    const clues = computeClues(solution)
    const report = analyze(size, size, clues.rows, clues.cols, {
      allowContradiction: wantsDepth,
      ...EXPERT_LIMITS,
    })
    if (!report.solved) continue

    if (matchesDifficulty(report, size, difficulty)) {
      return buildPuzzle(size, difficulty, solution)
    }

    const distance = distanceToBand(report, size, difficulty)
    if (distance < bestDistance) {
      bestDistance = distance
      best = solution
    }

    const score = scoreReport(report, size)
    if (score > hardestScore) {
      hardestScore = score
      hardest = solution
    }
  }

  const fallback = best ?? (wantsDepth ? hardest : null)
  if (fallback) return buildPuzzle(size, difficulty, fallback)
  throw new Error(`Could not generate a ${size}x${size} ${difficulty} puzzle in time`)
}

function buildPuzzle(size: number, difficulty: Difficulty, solution: boolean[][]): Puzzle {
  return {
    id: `generated-${difficulty}-${size}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    title: `Random ${size}x${size}`,
    width: size,
    height: size,
    solution,
    difficulty,
    category: 'Generated',
  }
}

/**
 * Reconstructs a generated puzzle from a stable, reload-safe URL (see
 * routing.ts). The id is derived from the encoded solution itself, so
 * progress/history saved under it correctly resumes on revisit.
 */
export function puzzleFromEncoded(size: number, difficulty: Difficulty, solutionB64: string): Puzzle {
  return {
    id: `generated-${size}-${difficulty}-${solutionB64}`,
    title: `Random ${size}x${size}`,
    width: size,
    height: size,
    solution: decodeSolution(solutionB64, size, size),
    difficulty,
    category: 'Generated',
  }
}
