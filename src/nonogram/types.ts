export type CellState = 'empty' | 'filled' | 'marked'

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
}
