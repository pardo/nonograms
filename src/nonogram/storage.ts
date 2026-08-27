import type { Difficulty, PuzzleProgress, RunRecord } from './types'

const KEY_PREFIX = 'nonogram-progress:'
const HISTORY_PREFIX = 'nonogram-history:'
const MODE_PREFIX = 'nonogram-mode:'
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

function loadRunList(key: string): RunRecord[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as RunRecord[]) : []
  } catch {
    return []
  }
}

function addToRunList(key: string, record: RunRecord): RunRecord[] {
  const next = [record, ...loadRunList(key)].slice(0, MAX_HISTORY)
  try {
    localStorage.setItem(key, JSON.stringify(next))
  } catch {
    // Ignore quota/availability errors; history just won't persist.
  }
  return next
}

/** Runs against one exact puzzle instance, most recent first. */
export function loadHistory(puzzleId: string): RunRecord[] {
  return loadRunList(HISTORY_PREFIX + puzzleId)
}

export function addRunRecord(puzzleId: string, record: RunRecord): RunRecord[] {
  return addToRunList(HISTORY_PREFIX + puzzleId, record)
}

/**
 * Generated puzzles get a fresh, one-off id every time (see routing.ts), so
 * per-instance history alone can never build up a track record - each
 * puzzle is only ever visited once. This aggregates runs by mode (size +
 * difficulty) instead, e.g. every "10x10 Hard" you've ever solved, so
 * scores are checkable across all your random-puzzle plays, not just one
 * specific generated grid.
 */
export function modeKey(size: number, difficulty: Difficulty): string {
  return `${size}-${difficulty}`
}

export function loadModeHistory(mode: string): RunRecord[] {
  return loadRunList(MODE_PREFIX + mode)
}

export function addModeRunRecord(mode: string, record: RunRecord): RunRecord[] {
  return addToRunList(MODE_PREFIX + mode, record)
}

export function bestTime(history: RunRecord[]): number | undefined {
  return history.length ? Math.min(...history.map((r) => r.timeMs)) : undefined
}
