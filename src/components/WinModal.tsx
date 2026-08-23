import { formatDuration } from '../hooks/useTimer'

interface WinModalProps {
  elapsedMs: number
  mistakes: number
  bestTimeMs?: number
  onPlayAgain: () => void
  onBackToMenu: () => void
}

export function WinModal({ elapsedMs, mistakes, bestTimeMs, onPlayAgain, onBackToMenu }: WinModalProps) {
  const isNewBest = bestTimeMs === undefined || elapsedMs <= bestTimeMs

  return (
    <div className="modal-backdrop">
      <div className="modal win-modal">
        <h2>🎉 Solved!</h2>
        <p className="win-stat">Time: {formatDuration(elapsedMs)}</p>
        <p className="win-stat">Mistakes: {mistakes}</p>
        {isNewBest && <p className="win-best">New best time!</p>}
        <div className="modal-actions">
          <button type="button" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" onClick={onBackToMenu}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  )
}
