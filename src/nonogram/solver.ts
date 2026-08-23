/**
 * Logical line-propagation solver, used by the generator to verify that a
 * random solution grid is solvable by pure deduction (no guessing), which
 * keeps generated puzzles fair to play.
 */

type Cell = 'unknown' | 'filled' | 'empty'

/** All boolean line placements that satisfy `clue` for a line of length `len`. */
function allPlacements(len: number, clue: number[]): boolean[][] {
  if (clue.length === 1 && clue[0] === 0) return [new Array(len).fill(false)]

  const blockCount = clue.length
  const minLen = clue.reduce((a, b) => a + b, 0) + (blockCount - 1)
  if (minLen > len) return []

  const results: boolean[][] = []
  const slack = len - minLen

  function place(blockIndex: number, pos: number, extraBefore: number, line: boolean[]) {
    if (blockIndex === blockCount) {
      results.push(line.slice())
      return
    }
    for (let extra = 0; extra <= extraBefore; extra++) {
      const start = pos + extra
      const block = clue[blockIndex]
      const next = line.slice()
      for (let i = start; i < start + block; i++) next[i] = true
      const afterPos = start + block + 1
      place(blockIndex + 1, afterPos, extraBefore - extra, next)
    }
  }

  // Distribute slack across the gap before the first block only at top level;
  // recursive calls redistribute remaining slack across subsequent gaps.
  place(0, 0, slack, new Array(len).fill(false))
  return results
}

/**
 * Given known constraints for a line, return the forced cells (filled/empty)
 * that hold across every placement consistent with those constraints, or
 * null if no placement is consistent (contradiction).
 */
function solveLine(known: Cell[], clue: number[]): Cell[] | null {
  const len = known.length
  const candidates = allPlacements(len, clue).filter((placement) =>
    placement.every((v, i) => {
      if (known[i] === 'filled') return v
      if (known[i] === 'empty') return !v
      return true
    }),
  )
  if (candidates.length === 0) return null

  const result: Cell[] = new Array(len).fill('unknown')
  for (let i = 0; i < len; i++) {
    const allFilled = candidates.every((c) => c[i])
    const allEmpty = candidates.every((c) => !c[i])
    result[i] = allFilled ? 'filled' : allEmpty ? 'empty' : 'unknown'
  }
  return result
}

/**
 * Attempts to fully solve the puzzle using only row/column line-propagation
 * to a fixpoint (no backtracking). Returns the solved grid if every cell
 * became determined, otherwise null.
 */
export function solveByPropagation(
  height: number,
  width: number,
  rowClues: number[][],
  colClues: number[][],
): boolean[][] | null {
  const grid: Cell[][] = Array.from({ length: height }, () => new Array(width).fill('unknown'))

  let changed = true
  while (changed) {
    changed = false

    for (let r = 0; r < height; r++) {
      const line = grid[r]
      const solved = solveLine(line, rowClues[r])
      if (!solved) return null
      for (let c = 0; c < width; c++) {
        if (solved[c] !== 'unknown' && grid[r][c] === 'unknown') {
          grid[r][c] = solved[c]
          changed = true
        }
      }
    }

    for (let c = 0; c < width; c++) {
      const line = grid.map((row) => row[c])
      const solved = solveLine(line, colClues[c])
      if (!solved) return null
      for (let r = 0; r < height; r++) {
        if (solved[r] !== 'unknown' && grid[r][c] === 'unknown') {
          grid[r][c] = solved[r]
          changed = true
        }
      }
    }
  }

  if (grid.some((row) => row.some((cell) => cell === 'unknown'))) return null
  return grid.map((row) => row.map((cell) => cell === 'filled'))
}
