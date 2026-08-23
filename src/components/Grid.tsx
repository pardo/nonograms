import { useMemo, useRef, useState } from 'react'
import { computeClues, isLineSatisfied, isPuzzleSolved } from '../nonogram/clues'
import type { CellState, Puzzle } from '../nonogram/types'

type Tool = 'fill' | 'mark'

interface GridProps {
  puzzle: Puzzle
  grid: CellState[][]
  onChange: (grid: CellState[][]) => void
  onMistake: () => void
  onWin: () => void
  disabled?: boolean
}

/** What a drag paints, decided by the state of the first cell touched. */
type PaintAction = 'set' | 'clear'

function cloneGrid(grid: CellState[][]): CellState[][] {
  return grid.map((row) => row.slice())
}

export function Grid({ puzzle, grid, onChange, onMistake, onWin, disabled }: GridProps) {
  const [tool, setTool] = useState<Tool>('fill')
  const paintRef = useRef<PaintAction | null>(null)
  const wonRef = useRef(false)

  const clues = useMemo(() => computeClues(puzzle.solution), [puzzle.solution])
  const maxRowClueLen = Math.max(...clues.rows.map((r) => r.length))
  const maxColClueLen = Math.max(...clues.cols.map((c) => c.length))

  const applyToCell = (r: number, c: number, action: PaintAction) => {
    const current = grid[r][c]
    const targetState: CellState = action === 'clear' ? 'empty' : tool === 'fill' ? 'filled' : 'marked'
    if (current === targetState) return

    const next = cloneGrid(grid)
    next[r][c] = targetState
    onChange(next)

    if (targetState === 'filled' && !puzzle.solution[r][c]) {
      onMistake()
    }

    if (!wonRef.current && isPuzzleSolved(next, puzzle.solution)) {
      wonRef.current = true
      onWin()
    }
  }

  const startPaint = (r: number, c: number) => {
    if (disabled) return
    const current = grid[r][c]
    const applying: CellState = tool === 'fill' ? 'filled' : 'marked'
    const action: PaintAction = current === applying ? 'clear' : 'set'
    paintRef.current = action
    applyToCell(r, c, action)
  }

  const continuePaint = (r: number, c: number) => {
    if (disabled || paintRef.current === null) return
    applyToCell(r, c, paintRef.current)
  }

  const endPaint = () => {
    paintRef.current = null
  }

  return (
    <div className="nonogram">
      <div className="toolbar" role="group" aria-label="Drawing tool">
        <button
          type="button"
          className={tool === 'fill' ? 'tool active' : 'tool'}
          onClick={() => setTool('fill')}
        >
          ▉ Fill
        </button>
        <button
          type="button"
          className={tool === 'mark' ? 'tool active' : 'tool'}
          onClick={() => setTool('mark')}
        >
          ✕ Mark
        </button>
      </div>

      <div
        className="board"
        style={
          {
            '--cols': puzzle.width,
            '--rows': puzzle.height,
            '--col-clue-rows': maxColClueLen,
            '--row-clue-cols': maxRowClueLen,
          } as React.CSSProperties
        }
        onPointerUp={endPaint}
        onPointerLeave={endPaint}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="corner" />

        <div className="col-clues">
          {clues.cols.map((col, c) => {
            const satisfied = isLineSatisfied(
              grid.map((row) => row[c]),
              col,
            )
            return (
              <div className={satisfied ? 'clue-cell satisfied' : 'clue-cell'} key={c}>
                {col.map((v, i) => (
                  <span key={i}>{v}</span>
                ))}
              </div>
            )
          })}
        </div>

        <div className="row-clues">
          {clues.rows.map((row, r) => {
            const satisfied = isLineSatisfied(grid[r], row)
            return (
              <div className={satisfied ? 'clue-cell row satisfied' : 'clue-cell row'} key={r}>
                {row.map((v, i) => (
                  <span key={i}>{v}</span>
                ))}
              </div>
            )
          })}
        </div>

        <div className="cells">
          {grid.map((row, r) =>
            row.map((state, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                className={`cell ${state}${(r + 1) % 5 === 0 ? ' border-b' : ''}${(c + 1) % 5 === 0 ? ' border-r' : ''}`}
                aria-label={`Row ${r + 1}, column ${c + 1}`}
                onPointerDown={(e) => {
                  e.preventDefault()
                  startPaint(r, c)
                }}
                onPointerEnter={() => continuePaint(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  const applying: CellState = 'marked'
                  const action: PaintAction = grid[r][c] === applying ? 'clear' : 'set'
                  const savedTool = tool
                  setTool('mark')
                  applyToCell(r, c, action)
                  setTool(savedTool)
                }}
              />
            )),
          )}
        </div>
      </div>
    </div>
  )
}
