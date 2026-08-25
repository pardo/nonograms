import { formatDuration } from '../hooks/useTimer'
import { bestTime } from '../nonogram/storage'
import type { RunRecord } from '../nonogram/types'

interface WinModalProps {
  elapsedMs: number
  mistakes: number
  history: RunRecord[]
  onPlayAgain: () => void
  onBackToMenu: () => void
  onNewRandom: () => void
  onViewStats: () => void
}

export function WinModal({
  elapsedMs,
  mistakes,
  history,
  onPlayAgain,
  onBackToMenu,
  onNewRandom,
  onViewStats,
}: WinModalProps) {
  const best = bestTime(history)
  const isNewBest = best === undefined || elapsedMs <= best
  const previousRuns = history.slice(1, 6)

  return (
    <div className="modal-backdrop">
      <div className="modal win-modal">
        <h2>🎉 Solved!</h2>
        <p className="win-stat">Time: {formatDuration(elapsedMs)}</p>
        <p className="win-stat">Mistakes: {mistakes}</p>
        {isNewBest && <p className="win-best">New best time!</p>}

        {previousRuns.length > 0 && (
          <div className="run-history">
            <h3>Previous runs</h3>
            <ul>
              {previousRuns.map((run, i) => (
                <li key={i}>
                  <span>{formatDuration(run.timeMs)}</span>
                  <span className="run-history-mistakes">{run.mistakes} mistakes</span>
                </li>
              ))}
            </ul>
            {history.length > 1 && (
              <button type="button" className="view-stats-link" onClick={onViewStats}>
                View all {history.length} runs →
              </button>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" onClick={onBackToMenu}>
            Menu
          </button>
        </div>
        <button type="button" className="new-random-button" onClick={onNewRandom}>
          🎲 New random puzzle
        </button>
      </div>
    </div>
  )
}
