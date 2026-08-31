import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { computeClues, isLineSatisfied, isPuzzleSolved } from '../nonogram/clues'
import type { CellState, Puzzle } from '../nonogram/types'

const MIN_CELL = 16
const MAX_CELL = 72

type Tool = 'fill' | 'mark'

/**
 * Pen or pencil. Both tools paint either way, so there are two tools and one
 * mode rather than four tools: in pencil the same Fill and Mark lay down
 * tentative cells, which is what a hypothesis is made of - the cells it
 * forces filled *and* the ones it forces empty.
 */
const TOOL_STATE: Record<'pen' | 'pencil', Record<Tool, CellState>> = {
  pen: { fill: 'filled', mark: 'marked' },
  pencil: { fill: 'maybe', mark: 'maybe-mark' },
}

/** What each tentative state becomes once the hypothesis is committed. */
const COMMITTED_STATE: Record<'maybe' | 'maybe-mark', CellState> = {
  maybe: 'filled',
  'maybe-mark': 'marked',
}

// Icon and word are separate so narrow screens can drop the word without
// changing the toolbar's height (see the phone media query in App.css).
const TOOLS: { id: Tool; icon: string; label: string; hint: string }[] = [
  { id: 'fill', icon: '■', label: 'Fill', hint: 'Fill a cell. A wrong fill counts as a mistake.' },
  { id: 'mark', icon: '✕', label: 'Mark', hint: 'Mark a cell as empty.' },
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
  const [pencil, setPencil] = useState(false)
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
  // in one go once the assumption pans out (or doesn't). Tentative fills and
  // tentative marks resolve together: they belong to the same hypothesis.
  const maybeCells = useMemo(() => {
    const found: { r: number; c: number; state: 'maybe' | 'maybe-mark' }[] = []
    grid.forEach((row, r) =>
      row.forEach((state, c) => {
        if (state === 'maybe' || state === 'maybe-mark') found.push({ r, c, state })
      }),
    )
    return found
  }, [grid])

  const painting: CellState = TOOL_STATE[pencil ? 'pencil' : 'pen'][tool]

  const applyToCell = (r: number, c: number, action: PaintAction, state: CellState = painting) => {
    const current = grid[r][c]
    const targetState: CellState = action === 'clear' ? 'empty' : state
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
   * Turns every tentative cell into the real thing it stands for - a fill for
   * 'maybe', an X for 'maybe-mark' - or wipes them all. Committing is the
   * moment a hypothesis becomes a claim, so this is where a wrong guess
   * finally scores its mistakes. Only fills can be wrong: a committed X costs
   * nothing, exactly as marking by hand does.
   */
  const resolveMaybes = (mode: 'commit' | 'discard') => {
    if (disabled || maybeCells.length === 0) return

    const next = cloneGrid(grid)
    let wrong = 0
    for (const { r, c, state } of maybeCells) {
      const target: CellState = mode === 'discard' ? 'empty' : COMMITTED_STATE[state]
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
    const action: PaintAction = grid[r][c] === painting ? 'clear' : 'set'
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
        <div className={pencil ? 'toolbar pencil' : 'toolbar'} role="group" aria-label="Drawing tool">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tool === t.id ? 'tool active' : 'tool'}
              data-tool={t.id}
              title={pencil ? `${t.hint.replace(/.$/, '')}, pencilled in until you commit it.` : t.hint}
              aria-pressed={tool === t.id}
              aria-label={t.label}
              onClick={() => setTool(t.id)}
            >
              <span className="tool-icon" aria-hidden="true">
                {t.icon}
              </span>
              <span className="tool-label">{t.label}</span>
            </button>
          ))}

          <button
            type="button"
            className={pencil ? 'tool pencil-toggle active' : 'tool pencil-toggle'}
            data-tool="pencil"
            title="Pencil: everything you draw stays tentative until you commit it. Costs nothing if the assumption is wrong."
            aria-pressed={pencil}
            aria-label="Pencil"
            onClick={() => setPencil((p) => !p)}
          >
            <span className="tool-icon" aria-hidden="true">
              {/* Text presentation, so the glyph takes the tentative colour
                  instead of rendering as a colour emoji. */}
              {'✎︎'}
            </span>
            <span className="tool-label">Pencil</span>
          </button>
        </div>

        {maybeCells.length > 0 && !disabled && (
          <div className="maybe-actions" role="group" aria-label="Resolve tentative cells">
            <span className="maybe-count">
              {maybeCells.length}
              <span className="maybe-count-word"> tentative</span>
            </span>
            <button
              type="button"
              className="maybe-action commit"
              title="Turn every tentative cell into a real fill or X"
              aria-label="Commit tentative cells"
              onClick={() => resolveMaybes('commit')}
            >
              <span className="action-icon" aria-hidden="true">
                ✓
              </span>
              <span className="action-label">Commit</span>
            </button>
            <button
              type="button"
              className="maybe-action discard"
              title="Clear every tentative cell"
              aria-label="Discard tentative cells"
              onClick={() => resolveMaybes('discard')}
            >
              <span className="action-icon" aria-hidden="true">
                ⌫
              </span>
              <span className="action-label">Discard</span>
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
                  // Right-click always marks, in whichever ink is loaded.
                  const applying = TOOL_STATE[pencil ? 'pencil' : 'pen'].mark
                  const action: PaintAction = grid[r][c] === applying ? 'clear' : 'set'
                  applyToCell(r, c, action, applying)
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
