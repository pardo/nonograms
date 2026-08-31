/**
 * 'maybe' and 'maybe-mark' are tentative: placeholders for "this cell is
 * filled / empty *if* my assumption holds". Expert puzzles can't be finished
 * by single-line logic alone, so the player has to assume a cell and follow
 * the consequences; a tentative cell records that hypothesis without
 * committing to it. Neither counts towards a clue, and neither scores a
 * mistake - only committing a 'maybe' can do that.
 */
export type CellState = 'empty' | 'filled' | 'marked' | 'maybe' | 'maybe-mark'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface Puzzle {
  id: string
  title: string
  width: number
  height: number
  /** solution[row][col] = true if the cell is filled */
  solution: boolean[][]
  category?: string
  difficulty?: Difficulty
}

export interface Clue {
  values: number[]
}

export interface PuzzleClues {
  rows: number[][]
  cols: number[][]
}

export interface PuzzleProgress {
  puzzleId: string
  grid: CellState[][]
  mistakes: number
  elapsedMs: number
  completed: boolean
}

export interface RunRecord {
  timeMs: number
  mistakes: number
  completedAt: string
  /** Only set for generated puzzles, which aren't in the static library. */
  puzzleSnapshot?: {
    width: number
    height: number
    /** Bit-packed, base64-encoded solution grid. See nonogram/encode.ts. */
    solution: string
  }
}
