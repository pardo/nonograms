import { curatedPuzzles } from './library'
import { patternPuzzles } from './patterns'
import type { Puzzle } from '../nonogram/types'

export const allPuzzles: Puzzle[] = [...curatedPuzzles, ...patternPuzzles]

export function findPuzzle(id: string): Puzzle | undefined {
  return allPuzzles.find((p) => p.id === id)
}
