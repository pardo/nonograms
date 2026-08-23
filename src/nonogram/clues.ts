import type { CellState, PuzzleClues } from './types'

function lineToBlocks(line: boolean[]): number[] {
  const blocks: number[] = []
  let run = 0
  for (const cell of line) {
    if (cell) {
      run++
    } else if (run > 0) {
      blocks.push(run)
      run = 0
    }
  }
  if (run > 0) blocks.push(run)
  return blocks.length > 0 ? blocks : [0]
}

export function computeClues(solution: boolean[][]): PuzzleClues {
  const height = solution.length
  const width = solution[0]?.length ?? 0

  const rows = solution.map((row) => lineToBlocks(row))

  const cols: number[][] = []
  for (let c = 0; c < width; c++) {
    const col: boolean[] = []
    for (let r = 0; r < height; r++) col.push(solution[r][c])
    cols.push(lineToBlocks(col))
  }

  return { rows, cols }
}

/** A clue line is "satisfied" when the filled runs in `line` exactly match `clue`. */
export function isLineSatisfied(line: CellState[], clue: number[]): boolean {
  const filled = line.map((s) => s === 'filled')
  const blocks = lineToBlocks(filled)
  if (clue.length === 1 && clue[0] === 0) return blocks.length === 1 && blocks[0] === 0
  if (blocks.length !== clue.length) return false
  return blocks.every((b, i) => b === clue[i])
}

export function isPuzzleSolved(grid: CellState[][], solution: boolean[][]): boolean {
  for (let r = 0; r < solution.length; r++) {
    for (let c = 0; c < solution[0].length; c++) {
      const shouldBeFilled = solution[r][c]
      const isFilled = grid[r][c] === 'filled'
      if (shouldBeFilled !== isFilled) return false
    }
  }
  return true
}
