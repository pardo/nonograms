import { computeClues } from './clues'
import { solveByPropagation } from './solver'
import type { Difficulty, Puzzle } from './types'

function randomSolution(width: number, height: number, density: number): boolean[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Math.random() < density),
  )
}

const DIFFICULTY_SETTINGS: Record<Difficulty, { size: [number, number]; density: number }> = {
  easy: { size: [5, 5], density: 0.5 },
  medium: { size: [10, 10], density: 0.45 },
  hard: { size: [15, 15], density: 0.42 },
}

/**
 * Generates a random puzzle that is guaranteed solvable by pure logical
 * deduction (line propagation), so it never requires guessing. Retries with
 * fresh random grids until one qualifies or the attempt budget runs out.
 */
export function generateRandomPuzzle(difficulty: Difficulty, maxAttempts = 400): Puzzle {
  const { size, density } = DIFFICULTY_SETTINGS[difficulty]
  const [width, height] = size

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = randomSolution(width, height, density)
    // Avoid trivially empty/full grids.
    const filledCount = solution.flat().filter(Boolean).length
    const total = width * height
    if (filledCount < total * 0.15 || filledCount > total * 0.85) continue

    const clues = computeClues(solution)
    const solved = solveByPropagation(height, width, clues.rows, clues.cols)
    if (!solved) continue

    return {
      id: `generated-${difficulty}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      title: 'Random Puzzle',
      width,
      height,
      solution,
      difficulty,
      category: 'Generated',
    }
  }

  throw new Error(`Could not generate a logically-solvable ${difficulty} puzzle in time`)
}
