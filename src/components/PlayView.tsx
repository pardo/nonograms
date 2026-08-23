import { useEffect, useState } from 'react'
import { Grid } from './Grid'
import { WinModal } from './WinModal'
import { formatDuration, useTimer } from '../hooks/useTimer'
import { loadProgress, saveProgress } from '../nonogram/storage'
import type { CellState, Puzzle } from '../nonogram/types'

interface PlayViewProps {
  puzzle: Puzzle
  onBackToMenu: () => void
  onCompleted: (puzzleId: string) => void
}

function emptyGrid(width: number, height: number): CellState[][] {
  return Array.from({ length: height }, () => new Array(width).fill('empty') as CellState[])
}

export function PlayView({ puzzle, onBackToMenu, onCompleted }: PlayViewProps) {
  const saved = loadProgress(puzzle.id)
  const [grid, setGrid] = useState<CellState[][]>(saved?.grid ?? emptyGrid(puzzle.width, puzzle.height))
  const [mistakes, setMistakes] = useState(saved?.mistakes ?? 0)
  const [won, setWon] = useState(saved?.completed ?? false)
  const timer = useTimer(saved?.elapsedMs ?? 0)

  useEffect(() => {
    if (!won) timer.start()
    return () => timer.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id])

  useEffect(() => {
    saveProgress({
      puzzleId: puzzle.id,
      grid,
      mistakes,
      elapsedMs: timer.elapsedMs,
      completed: won,
      bestTimeMs: won ? Math.min(timer.elapsedMs, saved?.bestTimeMs ?? Infinity) : saved?.bestTimeMs,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, mistakes, won])

  const handleWin = () => {
    timer.pause()
    setWon(true)
    onCompleted(puzzle.id)
  }

  const handleRestart = () => {
    setGrid(emptyGrid(puzzle.width, puzzle.height))
    setMistakes(0)
    setWon(false)
    timer.reset(0)
    timer.start()
  }

  return (
    <div className="play-view">
      <header className="play-header">
        <button type="button" className="back-button" onClick={onBackToMenu}>
          ← Menu
        </button>
        <h2>{puzzle.title}</h2>
        <div className="stats">
          <span>⏱ {formatDuration(timer.elapsedMs)}</span>
          <span>✗ {mistakes}</span>
        </div>
      </header>

      <Grid
        puzzle={puzzle}
        grid={grid}
        onChange={setGrid}
        onMistake={() => setMistakes((m) => m + 1)}
        onWin={handleWin}
        disabled={won}
      />

      {won && (
        <WinModal
          elapsedMs={timer.elapsedMs}
          mistakes={mistakes}
          bestTimeMs={saved?.bestTimeMs}
          onPlayAgain={handleRestart}
          onBackToMenu={onBackToMenu}
        />
      )}
    </div>
  )
}
