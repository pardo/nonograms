import { useEffect, useState } from 'react'
import { BackgroundSettingsButton } from './BackgroundSettingsButton'
import { Grid } from './Grid'
import { StatsModal } from './StatsModal'
import { ThemeToggle } from './ThemeToggle'
import { WinModal } from './WinModal'
import { formatDuration, useTimer } from '../hooks/useTimer'
import { encodeSolution } from '../nonogram/encode'
import { isKnownSize } from '../nonogram/generator'
import {
  addModeRunRecord,
  addRunRecord,
  loadHistory,
  loadModeHistory,
  loadProgress,
  modeKey,
  saveProgress,
} from '../nonogram/storage'
import type { BackgroundSettings } from '../hooks/useBackgroundSettings'
import type { CellState, CoveredCells, Difficulty, Puzzle, RunRecord } from '../nonogram/types'

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
  const [covered, setCovered] = useState<CoveredCells>(saved?.covered ?? {})
  const [mistakes, setMistakes] = useState(saved?.mistakes ?? 0)
  const [won, setWon] = useState(saved?.completed ?? false)
  const [showStats, setShowStats] = useState(false)
  const timer = useTimer(saved?.elapsedMs ?? 0)

  const randomSize = isKnownSize(puzzle.width) ? puzzle.width : 10
  const randomDifficulty: Difficulty = puzzle.difficulty ?? 'medium'

  // Generated puzzles get a fresh one-off id every time (see routing.ts), so
  // per-instance history never builds up a track record - track by mode
  // (size + difficulty) instead, so scores are checkable across every
  // random puzzle of that kind you've played, not just this exact one.
  const isGenerated = puzzle.category === 'Generated'
  const mode = modeKey(randomSize, randomDifficulty)
  const [history, setHistory] = useState<RunRecord[]>(() =>
    isGenerated ? loadModeHistory(mode) : loadHistory(puzzle.id),
  )

  useEffect(() => {
    if (!won) timer.start()
    return () => timer.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id])

  useEffect(() => {
    saveProgress({
      puzzleId: puzzle.id,
      grid,
      covered,
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
    const puzzleSnapshot = isGenerated
      ? { width: puzzle.width, height: puzzle.height, solution: encodeSolution(puzzle.solution) }
      : undefined

    const record: RunRecord = {
      timeMs: timer.elapsedMs,
      mistakes,
      completedAt: new Date().toISOString(),
      puzzleSnapshot,
    }

    if (isGenerated) {
      addRunRecord(puzzle.id, record)
      setHistory(addModeRunRecord(mode, record))
    } else {
      setHistory(addRunRecord(puzzle.id, record))
    }
  }

  const handleRestart = () => {
    setGrid(emptyGrid(puzzle.width, puzzle.height))
    setCovered({})
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
        covered={covered}
        onChange={(nextGrid, nextCovered) => {
          setGrid(nextGrid)
          setCovered(nextCovered)
        }}
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
        <StatsModal
          title={
            isGenerated
              ? `${randomSize}x${randomSize} ${randomDifficulty.charAt(0).toUpperCase()}${randomDifficulty.slice(1)}`
              : puzzle.title
          }
          history={history}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  )
}
