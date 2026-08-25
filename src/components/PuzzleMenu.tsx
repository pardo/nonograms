import { useMemo } from 'react'
import { BackgroundSettingsButton } from './BackgroundSettingsButton'
import { ThemeToggle } from './ThemeToggle'
import { DIFFICULTIES, SIZES } from '../nonogram/generator'
import { puzzleHash, randomHash } from '../nonogram/routing'
import { bestTime, loadHistory } from '../nonogram/storage'
import { formatDuration } from '../hooks/useTimer'
import type { BackgroundSettings } from '../hooks/useBackgroundSettings'
import type { Difficulty, Puzzle } from '../nonogram/types'
import { allPuzzles } from '../puzzles'

interface PuzzleMenuProps {
  onSelect: (puzzle: Puzzle) => void
  onGenerate: (size: number, difficulty: Difficulty) => void
  completedIds: Set<string>
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  bgSettings: BackgroundSettings
  onUpdateBgSettings: (patch: Partial<BackgroundSettings>) => void
}

export function PuzzleMenu({
  onSelect,
  onGenerate,
  completedIds,
  theme,
  onToggleTheme,
  bgSettings,
  onUpdateBgSettings,
}: PuzzleMenuProps) {
  const byCategory = useMemo(() => {
    const map = new Map<string, Puzzle[]>()
    for (const puzzle of allPuzzles) {
      const category = puzzle.category ?? 'Other'
      if (!map.has(category)) map.set(category, [])
      map.get(category)!.push(puzzle)
    }
    return map
  }, [])

  return (
    <div className="menu">
      <div className="menu-header">
        <div className="header-actions">
          <BackgroundSettingsButton settings={bgSettings} onUpdate={onUpdateBgSettings} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
        <h1>Nonograms</h1>
        <p>Pick a puzzle, or generate a fresh one</p>
      </div>

      <section className="generate">
        <h2>Random puzzle</h2>
        <div className="generate-table">
          {SIZES.map((size) => (
            <div className="generate-row" key={size}>
              <span className="generate-size">
                {size}x{size}
              </span>
              <div className="generate-row-buttons">
                {DIFFICULTIES.map((d) => (
                  <a
                    key={d.id}
                    className="difficulty-button"
                    href={randomHash(size, d.id)}
                    data-difficulty={d.id}
                    onClick={(e) => {
                      e.preventDefault()
                      onGenerate(size, d.id)
                    }}
                  >
                    {d.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {[...byCategory.entries()].map(([category, puzzles]) => (
        <section key={category} className="category">
          <h2>{category}</h2>
          <div className="puzzle-grid">
            {puzzles.map((puzzle) => {
              const best = bestTime(loadHistory(puzzle.id))
              return (
                <a
                  href={puzzleHash(puzzle.id)}
                  key={puzzle.id}
                  className={completedIds.has(puzzle.id) ? 'puzzle-card completed' : 'puzzle-card'}
                  onClick={(e) => {
                    e.preventDefault()
                    onSelect(puzzle)
                  }}
                >
                  <span className="puzzle-title">{puzzle.title}</span>
                  <span className="puzzle-size">
                    {puzzle.width}x{puzzle.height}
                    {best !== undefined && ` · ${formatDuration(best)}`}
                  </span>
                  {completedIds.has(puzzle.id) && <span className="check">✓</span>}
                </a>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
