import { useEffect, useState } from 'react'
import { BackgroundSettingsButton } from './BackgroundSettingsButton'
import { Grid } from './Grid'
import { StatsModal } from './StatsModal'
import { ThemeToggle } from './ThemeToggle'
import { WinModal } from './WinModal'
import { formatDuration, useTimer } from '../hooks/useTimer'
import { encodeSolution } from '../nonogram/encode'
import { isKnownSize } from '../nonogram/generator'
import { addRunRecord, loadHistory, loadProgress, saveProgress } from '../nonogram/storage'
import type { BackgroundSettings } from '../hooks/useBackgroundSettings'
import type { CellState, Difficulty, Puzzle, RunRecord } from '../nonogram/types'

interface PlayViewProps {
  puzzle: Puzzle
  onBackToMenu: () => void
  onCompleted: (puzzleId: string) => void
  onNewRandom: (size: number, difficulty: Difficulty) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  bgSettings: BackgroundSettings
  onUpdateBgSettings: (patch: Partial<BackgroundSettings>) => void
}

function emptyGrid(width: number, height: number): CellState[][] {
  return Array.from({ length: height }, () => new Array(width).fill('empty') as CellState[])
}

export function PlayView({
  puzzle,
  onBackToMenu,
  onCompleted,
  onNewRandom,
  theme,
  onToggleTheme,
  bgSettings,
  onUpdateBgSettings,
}: PlayViewProps) {
  const saved = loadProgress(puzzle.id)
  const [grid, setGrid] = useState<CellState[][]>(saved?.grid ?? emptyGrid(puzzle.width, puzzle.height))
  const [mistakes, setMistakes] = useState(saved?.mistakes ?? 0)
  const [won, setWon] = useState(saved?.completed ?? false)
  const [history, setHistory] = useState<RunRecord[]>(() => loadHistory(puzzle.id))
  const [showStats, setShowStats] = useState(false)
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
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, mistakes, won])

  const handleWin = () => {
    timer.pause()
    setWon(true)
    onCompleted(puzzle.id)

    // Generated puzzles aren't in the static library, so snapshot the
    // solution (bit-packed base64, not raw JSON) to keep stats meaningful.
    const puzzleSnapshot =
      puzzle.category === 'Generated'
        ? { width: puzzle.width, height: puzzle.height, solution: encodeSolution(puzzle.solution) }
        : undefined

    setHistory(
      addRunRecord(puzzle.id, {
        timeMs: timer.elapsedMs,
        mistakes,
        completedAt: new Date().toISOString(),
        puzzleSnapshot,
      }),
    )
  }

  const handleRestart = () => {
    setGrid(emptyGrid(puzzle.width, puzzle.height))
    setMistakes(0)
    setWon(false)
    timer.reset(0)
    timer.start()
  }

  const randomSize = isKnownSize(puzzle.width) ? puzzle.width : 10
  const randomDifficulty: Difficulty = puzzle.difficulty ?? 'medium'

  return (
    <div className="play-view">
      <header className="play-header">
        <button type="button" className="back-button" onClick={onBackToMenu}>
          ← Menu
        </button>
        <h2>{puzzle.title}</h2>
        <div className="stats">
          <button type="button" className="stats-button" onClick={() => setShowStats(true)} title="Stats">
            📊
          </button>
          <span>⏱ {formatDuration(timer.elapsedMs)}</span>
          <span>✗ {mistakes}</span>
          <BackgroundSettingsButton settings={bgSettings} onUpdate={onUpdateBgSettings} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
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
          history={history}
          onPlayAgain={handleRestart}
          onBackToMenu={onBackToMenu}
          onNewRandom={() => onNewRandom(randomSize, randomDifficulty)}
          onViewStats={() => setShowStats(true)}
        />
      )}

      {showStats && (
        <StatsModal title={puzzle.title} history={history} onClose={() => setShowStats(false)} />
      )}
    </div>
  )
}
