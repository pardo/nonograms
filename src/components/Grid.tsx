import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { computeClues, isLineSatisfied, isPuzzleSolved } from '../nonogram/clues'
import type { CellState, Puzzle } from '../nonogram/types'

const MIN_CELL = 16
const MAX_CELL = 72

type Tool = 'fill' | 'mark' | 'maybe'

/** State each tool paints when it sets (rather than clears) a cell. */
const TOOL_STATE: Record<Tool, CellState> = {
  fill: 'filled',
  mark: 'marked',
  maybe: 'maybe',
}

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'fill', label: '▉ Fill', hint: 'Fill a cell for real. A wrong fill counts as a mistake.' },
  { id: 'mark', label: '✕ Mark', hint: 'Mark a cell as definitely empty.' },
  {
    id: 'maybe',
    label: '? Maybe',
    hint: 'Pencil in a tentative fill while you test an assumption. Costs nothing if you are wrong.',
  },
]

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

const hoverCapable =
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

export function Grid({ puzzle, grid, onChange, onMistake, onWin, disabled }: GridProps) {
  const [tool, setTool] = useState<Tool>('fill')
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null)
  const paintRef = useRef<PaintAction | null>(null)
  const wonRef = useRef(false)
  const boardAreaRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(28)

  const clues = useMemo(() => computeClues(puzzle.solution), [puzzle.solution])
  const maxRowClueLen = Math.max(...clues.rows.map((r) => r.length))
  const maxColClueLen = Math.max(...clues.cols.map((c) => c.length))

  // Size cells to use all available width and height, not just width.
  useLayoutEffect(() => {
    const el = boardAreaRef.current
    if (!el) return

    const totalUnitsW = puzzle.width + maxRowClueLen
    const totalUnitsH = puzzle.height + maxColClueLen

    const recompute = (width: number, height: number) => {
      const size = Math.floor(Math.min(width / totalUnitsW, height / totalUnitsH))
      setCellSize(Math.max(MIN_CELL, Math.min(MAX_CELL, size)))
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      recompute(width, height)
    })
    observer.observe(el)

    const rect = el.getBoundingClientRect()
    recompute(rect.width, rect.height)

    return () => observer.disconnect()
  }, [puzzle.width, puzzle.height, maxRowClueLen, maxColClueLen])

  // Re-arm the win guard whenever the board is re-enabled (e.g. "Play again"
  // on the same puzzle instance, which doesn't remount this component).
  useEffect(() => {
    if (!disabled) wonRef.current = false
  }, [disabled])

  // Cells currently held as a hypothesis, so they can be committed or dropped
  // in one go once the assumption pans out (or doesn't).
  const maybeCells = useMemo(() => {
    const found: { r: number; c: number }[] = []
    grid.forEach((row, r) =>
      row.forEach((state, c) => {
        if (state === 'maybe') found.push({ r, c })
      }),
    )
    return found
  }, [grid])

  const applyToCell = (r: number, c: number, action: PaintAction) => {
    const current = grid[r][c]
    const targetState: CellState = action === 'clear' ? 'empty' : TOOL_STATE[tool]
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

  /**
   * Turns every tentative cell into a real fill, or wipes them. Committing is
   * the moment a hypothesis becomes a claim, so this is where a wrong guess
   * finally scores its mistakes.
   */
  const resolveMaybes = (target: 'filled' | 'empty') => {
    if (disabled || maybeCells.length === 0) return

    const next = cloneGrid(grid)
    let wrong = 0
    for (const { r, c } of maybeCells) {
      next[r][c] = target
      if (target === 'filled' && !puzzle.solution[r][c]) wrong++
    }
    onChange(next)

    for (let i = 0; i < wrong; i++) onMistake()

    if (!wonRef.current && isPuzzleSolved(next, puzzle.solution)) {
      wonRef.current = true
      onWin()
    }
  }

  const startPaint = (r: number, c: number) => {
    if (disabled) return
    const current = grid[r][c]
    const applying = TOOL_STATE[tool]
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
      <div className="toolbar-row">
        <div className="toolbar" role="group" aria-label="Drawing tool">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tool === t.id ? 'tool active' : 'tool'}
              data-tool={t.id}
              title={t.hint}
              aria-pressed={tool === t.id}
              onClick={() => setTool(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {maybeCells.length > 0 && !disabled && (
          <div className="maybe-actions" role="group" aria-label="Resolve tentative cells">
            <span className="maybe-count">{maybeCells.length} tentative</span>
            <button
              type="button"
              className="maybe-action commit"
              title="Turn every tentative cell into a real fill"
              onClick={() => resolveMaybes('filled')}
            >
              ✓ Commit
            </button>
            <button
              type="button"
              className="maybe-action discard"
              title="Clear every tentative cell"
              onClick={() => resolveMaybes('empty')}
            >
              ⌫ Discard
            </button>
          </div>
        )}
      </div>

      <div className="board-area" ref={boardAreaRef}>
      <div
        className="board"
        style={
          {
            '--cols': puzzle.width,
            '--rows': puzzle.height,
            '--col-clue-rows': maxColClueLen,
            '--row-clue-cols': maxRowClueLen,
            '--cell-size': `${cellSize}px`,
          } as React.CSSProperties
        }
        onPointerUp={endPaint}
        onPointerLeave={() => {
          endPaint()
          if (hoverCapable) setHovered(null)
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="corner" />

        <div className="col-clues">
          {clues.cols.map((col, c) => {
            const satisfied = isLineSatisfied(
              grid.map((row) => row[c]),
              col,
            )
            const isHovered = hovered?.c === c
            return (
              <div
                className={`clue-cell${satisfied ? ' satisfied' : ''}${isHovered ? ' hovered' : ''}`}
                key={c}
              >
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
            const isHovered = hovered?.r === r
            return (
              <div
                className={`clue-cell row${satisfied ? ' satisfied' : ''}${isHovered ? ' hovered' : ''}`}
                key={r}
              >
                {row.map((v, i) => (
                  <span key={i}>{v}</span>
                ))}
              </div>
            )
          })}
        </div>

        <div className="cells">
          {hoverCapable && hovered && (
            <>
              <div className="crosshair row-bar" style={{ top: `calc(${hovered.r} * var(--cell-size))` }} />
              <div className="crosshair col-bar" style={{ left: `calc(${hovered.c} * var(--cell-size))` }} />
            </>
          )}
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
                onPointerEnter={(e) => {
                  continuePaint(r, c)
                  if (hoverCapable && e.pointerType === 'mouse') setHovered({ r, c })
                }}
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
    </div>
  )
}
