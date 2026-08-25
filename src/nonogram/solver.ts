/**
 * Human-style nonogram solver used to *rate* puzzles, not just to check that
 * they are solvable.
 *
 * Difficulty research on nonograms (Batenburg & Kosters, "On the Difficulty of
 * Nonograms") splits puzzles into two classes and rates each differently:
 *
 *  - "simple" / line-solvable puzzles, which fall out of repeated single-line
 *    reasoning. Their difficulty is driven by the number of sweeps (full
 *    row+column passes) needed to reach the solution.
 *  - non-line-solvable puzzles, which stall: no single line can be advanced on
 *    its own and the solver has to assume a cell and derive a contradiction
 *    (the "(p,q)-difficulty" family of measures). Those are strictly harder for
 *    a human, because they require holding a hypothesis in your head.
 *
 * So this module reports *how* a puzzle was solved, and difficulty.ts turns
 * that report into a score.
 */

export type Cell = 'unknown' | 'filled' | 'empty'

const WAYS_CAP = 1e9

interface SuffixResult {
  ways: number
  /** canFill[i] / canEmpty[i]: some consistent placement has cell i filled/empty. */
  canFill: Uint8Array
  canEmpty: Uint8Array
}

export interface LineResult {
  /** Forced state of every cell, or null when the line has no valid placement. */
  cells: Cell[] | null
  /** Number of placements still consistent with what is known (capped). */
  ways: number
}

/**
 * Single-line solver. Instead of enumerating every placement it walks a
 * memoised suffix DP (position x block index), which keeps rating thousands of
 * candidate puzzles cheap enough to do in the browser.
 */
export function solveLine(known: Cell[], clue: number[]): LineResult {
  const len = known.length
  const blocks = clue.length === 1 && clue[0] === 0 ? [] : clue
  const nBlocks = blocks.length

  const memo = new Array<SuffixResult | undefined>((len + 2) * (nBlocks + 1))

  function go(i: number, b: number): SuffixResult {
    const key = i * (nBlocks + 1) + b
    const cached = memo[key]
    if (cached) return cached

    const result: SuffixResult = {
      ways: 0,
      canFill: new Uint8Array(len),
      canEmpty: new Uint8Array(len),
    }
    memo[key] = result

    if (b === nBlocks) {
      // No blocks left: the rest of the line must be empty.
      for (let j = i; j < len; j++) {
        if (known[j] === 'filled') return result
      }
      result.ways = 1
      for (let j = i; j < len; j++) result.canEmpty[j] = 1
      return result
    }

    if (i >= len) return result

    // Option A: leave cell i empty, place block b somewhere later.
    if (known[i] !== 'filled') {
      const rest = go(i + 1, b)
      if (rest.ways > 0) {
        result.ways = Math.min(WAYS_CAP, result.ways + rest.ways)
        result.canEmpty[i] = 1
        for (let j = i + 1; j < len; j++) {
          result.canFill[j] |= rest.canFill[j]
          result.canEmpty[j] |= rest.canEmpty[j]
        }
      }
    }

    // Option B: start block b at cell i.
    const size = blocks[b]
    const end = i + size
    if (end <= len) {
      let fits = true
      for (let j = i; j < end; j++) {
        if (known[j] === 'empty') {
          fits = false
          break
        }
      }
      // A block must be followed by a gap, or by the end of the line.
      if (fits && end < len && known[end] === 'filled') fits = false

      if (fits) {
        if (end === len) {
          if (b + 1 === nBlocks) {
            result.ways = Math.min(WAYS_CAP, result.ways + 1)
            for (let j = i; j < end; j++) result.canFill[j] = 1
          }
        } else {
          const rest = go(end + 1, b + 1)
          if (rest.ways > 0) {
            result.ways = Math.min(WAYS_CAP, result.ways + rest.ways)
            for (let j = i; j < end; j++) result.canFill[j] = 1
            result.canEmpty[end] = 1
            for (let j = end + 1; j < len; j++) {
              result.canFill[j] |= rest.canFill[j]
              result.canEmpty[j] |= rest.canEmpty[j]
            }
          }
        }
      }
    }

    return result
  }

  const root = go(0, 0)
  if (root.ways === 0) return { cells: null, ways: 0 }

  const cells: Cell[] = new Array(len)
  for (let i = 0; i < len; i++) {
    const f = root.canFill[i] === 1
    const e = root.canEmpty[i] === 1
    cells[i] = f && e ? 'unknown' : f ? 'filled' : 'empty'
  }
  return { cells, ways: root.ways }
}

export interface SolveReport {
  /** True when every cell was determined by sound deduction (hence unique). */
  solved: boolean
  /** Full row+column passes needed; the classic "sweep" difficulty measure. */
  sweeps: number
  /** Cells deduced by plain single-line reasoning. */
  cellsFromLines: number
  /** How many times the solver had to fall back on contradiction reasoning. */
  contradictions: number
  /** 0 = line-solvable ("simple"), 1 = needed a hypothesis + contradiction. */
  depth: 0 | 1
  /** Line solves that determined at least one new cell. */
  productiveSolves: number
  /**
   * Sum of log2(consistent placements) over productive line solves: how much
   * ambiguity the player had to see through, not just how many cells fell out.
   */
  ambiguity: number
  /** Widest single-line ambiguity resolved, in log2 placements. */
  peakAmbiguity: number
}

interface Grid {
  cells: Cell[][]
  unknown: number
}

function newGrid(height: number, width: number): Grid {
  return {
    cells: Array.from({ length: height }, () => new Array<Cell>(width).fill('unknown')),
    unknown: height * width,
  }
}

function cloneGrid(grid: Grid): Grid {
  return { cells: grid.cells.map((row) => row.slice()), unknown: grid.unknown }
}

interface PassStats {
  changed: number
  sweeps: number
  productiveSolves: number
  ambiguity: number
  peakAmbiguity: number
}

/** Runs row/column line solving to a fixpoint, recording how hard it was. */
function propagate(
  grid: Grid,
  rowClues: number[][],
  colClues: number[][],
  stats?: PassStats,
): boolean {
  const height = grid.cells.length
  const width = grid.cells[0].length
  let changed = true

  while (changed) {
    changed = false
    if (stats) stats.sweeps++

    for (let r = 0; r < height; r++) {
      const { cells, ways } = solveLine(grid.cells[r], rowClues[r])
      if (!cells) return false
      let gained = 0
      for (let c = 0; c < width; c++) {
        if (cells[c] !== 'unknown' && grid.cells[r][c] === 'unknown') {
          grid.cells[r][c] = cells[c]
          grid.unknown--
          gained++
        }
      }
      if (gained > 0) {
        changed = true
        if (stats) recordSolve(stats, gained, ways)
      }
    }

    for (let c = 0; c < width; c++) {
      const column: Cell[] = new Array(height)
      for (let r = 0; r < height; r++) column[r] = grid.cells[r][c]
      const { cells, ways } = solveLine(column, colClues[c])
      if (!cells) return false
      let gained = 0
      for (let r = 0; r < height; r++) {
        if (cells[r] !== 'unknown' && grid.cells[r][c] === 'unknown') {
          grid.cells[r][c] = cells[r]
          grid.unknown--
          gained++
        }
      }
      if (gained > 0) {
        changed = true
        if (stats) recordSolve(stats, gained, ways)
      }
    }
  }

  return true
}

function recordSolve(stats: PassStats, gained: number, ways: number): void {
  stats.changed += gained
  stats.productiveSolves++
  const a = Math.log2(Math.max(1, ways))
  stats.ambiguity += a
  stats.peakAmbiguity = Math.max(stats.peakAmbiguity, a)
}

export interface AnalyzeOptions {
  /**
   * Allow depth-1 hypothesis reasoning (assume a cell, propagate, keep the
   * negation when it contradicts). Off => only "simple" puzzles solve.
   */
  allowContradiction?: boolean
  /** Give up past this many contradiction deductions; keeps generation bounded. */
  maxContradictions?: number
  /**
   * Give up when line logic stalls with more than this fraction of the board
   * still unknown. Such a board is nearly always ambiguous rather than merely
   * hard, and proving that is the expensive case, so bailing keeps generation
   * responsive.
   */
  maxStallFraction?: number
  /** Cells to try per stall before giving up on finding a contradiction. */
  maxHypotheses?: number
}

/**
 * Solves the puzzle with sound deduction only and reports how much work each
 * technique had to do. A full solve implies the puzzle has a unique solution,
 * because every step was forced.
 */
export function analyze(
  height: number,
  width: number,
  rowClues: number[][],
  colClues: number[][],
  options: AnalyzeOptions = {},
): SolveReport {
  const {
    allowContradiction = false,
    maxContradictions = 24,
    maxStallFraction = 1,
    maxHypotheses = Infinity,
  } = options
  const cellCount = height * width

  const grid = newGrid(height, width)
  const stats: PassStats = {
    changed: 0,
    sweeps: 0,
    productiveSolves: 0,
    ambiguity: 0,
    peakAmbiguity: 0,
  }

  const report: SolveReport = {
    solved: false,
    sweeps: 0,
    cellsFromLines: 0,
    contradictions: 0,
    depth: 0,
    productiveSolves: 0,
    ambiguity: 0,
    peakAmbiguity: 0,
  }

  const finish = (): SolveReport => {
    report.solved = grid.unknown === 0
    report.sweeps = stats.sweeps
    report.cellsFromLines = stats.changed
    report.productiveSolves = stats.productiveSolves
    report.ambiguity = stats.ambiguity
    report.peakAmbiguity = stats.peakAmbiguity
    return report
  }

  if (!propagate(grid, rowClues, colClues, stats)) return finish()

  while (grid.unknown > 0) {
    if (!allowContradiction || report.contradictions >= maxContradictions) return finish()
    if (grid.unknown > cellCount * maxStallFraction) return finish()

    const found = findContradiction(grid, rowClues, colClues, maxHypotheses)
    if (!found) return finish()

    grid.cells[found.row][found.col] = found.state
    grid.unknown--
    report.contradictions++
    report.depth = 1

    if (!propagate(grid, rowClues, colClues, stats)) return finish()
  }

  return finish()
}

interface Deduction {
  row: number
  col: number
  state: Cell
}

/**
 * Depth-1 hypothesis search: assume an unknown cell is filled (then empty) and
 * see whether line propagation breaks. Cells next to something already known
 * are tried first, which is both what a human does and much faster.
 */
function findContradiction(
  grid: Grid,
  rowClues: number[][],
  colClues: number[][],
  maxHypotheses: number,
): Deduction | null {
  const height = grid.cells.length
  const width = grid.cells[0].length

  const candidates: { row: number; col: number; score: number }[] = []
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid.cells[r][c] !== 'unknown') continue
      let score = 0
      if (r > 0 && grid.cells[r - 1][c] !== 'unknown') score++
      if (r + 1 < height && grid.cells[r + 1][c] !== 'unknown') score++
      if (c > 0 && grid.cells[r][c - 1] !== 'unknown') score++
      if (c + 1 < width && grid.cells[r][c + 1] !== 'unknown') score++
      candidates.push({ row: r, col: c, score })
    }
  }
  candidates.sort((a, b) => b.score - a.score)

  for (const { row, col } of candidates.slice(0, maxHypotheses)) {
    for (const guess of ['filled', 'empty'] as const) {
      const trial = cloneGrid(grid)
      trial.cells[row][col] = guess
      trial.unknown--
      if (!propagate(trial, rowClues, colClues)) {
        return { row, col, state: guess === 'filled' ? 'empty' : 'filled' }
      }
    }
  }
  return null
}

/**
 * Returns the solved grid when the puzzle falls to plain line propagation,
 * otherwise null.
 */
export function solveByPropagation(
  height: number,
  width: number,
  rowClues: number[][],
  colClues: number[][],
): boolean[][] | null {
  const grid = newGrid(height, width)
  if (!propagate(grid, rowClues, colClues)) return null
  if (grid.unknown > 0) return null
  return grid.cells.map((row) => row.map((cell) => cell === 'filled'))
}
