/**
 * 'maybe' is a tentative fill: a placeholder for "this cell is filled *if* my
 * assumption holds". Expert puzzles can't be finished by single-line logic
 * alone, so the player has to assume a cell and follow the consequences; a
 * maybe records that hypothesis without committing to it. It never counts
 * towards a clue and never scores a mistake - only committing it does.
 */
export type CellState = 'empty' | 'filled' | 'marked' | 'maybe'

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
