import { computeClues } from './clues'
import { solveByPropagation } from './solver'
import type { Difficulty, Puzzle } from './types'

export const SIZES = [5, 10, 15] as const

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'expert', label: 'Expert' },
]

export function isKnownSize(size: number): boolean {
  return (SIZES as readonly number[]).includes(size)
}

export function isKnownDifficulty(id: string): id is Difficulty {
  return DIFFICULTIES.some((d) => d.id === id)
}

// Density closer to 50% fill produces denser clue lines with more ambiguity
// to untangle, so it's used as a difficulty proxy at a fixed size.
const DENSITY: Record<Difficulty, number> = {
  easy: 0.32,
  medium: 0.4,
  hard: 0.46,
  expert: 0.5,
}

const MAX_ATTEMPTS_BY_SIZE: Record<number, number> = {
  5: 500,
  10: 2500,
  15: 6000,
}

function randomSolution(size: number, density: number): boolean[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random() < density),
  )
}

/**
 * Generates a random square puzzle that is guaranteed solvable by pure
 * logical deduction (line propagation), so it never requires guessing.
 * Retries with fresh random grids until one qualifies or the attempt
 * budget runs out.
 */
export function generateRandomPuzzle(size: number, difficulty: Difficulty): Puzzle {
  const density = DENSITY[difficulty]
  const maxAttempts = MAX_ATTEMPTS_BY_SIZE[size] ?? 1000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = randomSolution(size, density)
    // Avoid trivially empty/full grids.
    const filledCount = solution.flat().filter(Boolean).length
    const total = size * size
    if (filledCount < total * 0.12 || filledCount > total * 0.88) continue

    const clues = computeClues(solution)
    const solved = solveByPropagation(size, size, clues.rows, clues.cols)
    if (!solved) continue

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

  throw new Error(`Could not generate a logically-solvable ${size}x${size} ${difficulty} puzzle in time`)
}
