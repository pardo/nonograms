import type { PuzzleProgress, RunRecord } from './types'

const KEY_PREFIX = 'nonogram-progress:'
const HISTORY_PREFIX = 'nonogram-history:'
const MAX_HISTORY = 20

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

/** Most recent run first. */
export function loadHistory(puzzleId: string): RunRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_PREFIX + puzzleId)
    return raw ? (JSON.parse(raw) as RunRecord[]) : []
  } catch {
    return []
  }
}

export function addRunRecord(puzzleId: string, record: RunRecord): RunRecord[] {
  const next = [record, ...loadHistory(puzzleId)].slice(0, MAX_HISTORY)
  try {
    localStorage.setItem(HISTORY_PREFIX + puzzleId, JSON.stringify(next))
  } catch {
    // Ignore quota/availability errors; history just won't persist.
  }
  return next
}

export function bestTime(history: RunRecord[]): number | undefined {
  return history.length ? Math.min(...history.map((r) => r.timeMs)) : undefined
}
