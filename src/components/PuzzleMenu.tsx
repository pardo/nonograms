import { useMemo } from 'react'
import type { Difficulty, Puzzle } from '../nonogram/types'
import { allPuzzles } from '../puzzles'

interface PuzzleMenuProps {
  onSelect: (puzzle: Puzzle) => void
  onGenerate: (difficulty: Difficulty) => void
  completedIds: Set<string>
}

export function PuzzleMenu({ onSelect, onGenerate, completedIds }: PuzzleMenuProps) {
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
      <h1>Nonograms</h1>

      <section className="generate">
        <h2>Random puzzle</h2>
        <div className="generate-buttons">
          <button type="button" onClick={() => onGenerate('easy')}>
            Easy (5x5)
          </button>
          <button type="button" onClick={() => onGenerate('medium')}>
            Medium (10x10)
          </button>
          <button type="button" onClick={() => onGenerate('hard')}>
            Hard (15x15)
          </button>
        </div>
      </section>

      {[...byCategory.entries()].map(([category, puzzles]) => (
        <section key={category} className="category">
          <h2>{category}</h2>
          <div className="puzzle-grid">
            {puzzles.map((puzzle) => (
              <button
                type="button"
                key={puzzle.id}
                className={completedIds.has(puzzle.id) ? 'puzzle-card completed' : 'puzzle-card'}
                onClick={() => onSelect(puzzle)}
              >
                <span className="puzzle-title">{puzzle.title}</span>
                <span className="puzzle-size">
                  {puzzle.width}x{puzzle.height}
                </span>
                {completedIds.has(puzzle.id) && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
