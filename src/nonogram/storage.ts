import type { PuzzleProgress } from './types'

const KEY_PREFIX = 'nonogram-progress:'

export function loadProgress(puzzleId: string): PuzzleProgress | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + puzzleId)
    return raw ? (JSON.parse(raw) as PuzzleProgress) : null
  } catch {
    return null
  }
}

export function saveProgress(progress: PuzzleProgress): void {
  try {
    localStorage.setItem(KEY_PREFIX + progress.puzzleId, JSON.stringify(progress))
  } catch {
    // Ignore quota/availability errors; progress just won't persist.
  }
}

export function clearProgress(puzzleId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + puzzleId)
  } catch {
    // Ignore.
  }
}
