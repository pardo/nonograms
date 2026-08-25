import { useMemo } from 'react'
import { formatDuration } from '../hooks/useTimer'
import { decodeSolution } from '../nonogram/encode'
import { bestTime } from '../nonogram/storage'
import type { RunRecord } from '../nonogram/types'

interface StatsModalProps {
  title: string
  history: RunRecord[]
  onClose: () => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function RunPreview({ snapshot }: { snapshot: NonNullable<RunRecord['puzzleSnapshot']> }) {
  const solution = useMemo(
    () => decodeSolution(snapshot.solution, snapshot.width, snapshot.height),
    [snapshot],
  )

  return (
    <div
      className="run-preview"
      style={{ '--pw': snapshot.width, '--ph': snapshot.height } as React.CSSProperties}
    >
      {solution.map((row, r) =>
        row.map((filled, c) => (
          <span key={`${r}-${c}`} className={filled ? 'run-preview-cell filled' : 'run-preview-cell'} />
        )),
      )}
    </div>
  )
}

export function StatsModal({ title, history, onClose }: StatsModalProps) {
  const best = bestTime(history)
  const average = history.length
    ? Math.round(history.reduce((sum, r) => sum + r.timeMs, 0) / history.length)
    : undefined

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal stats-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title} stats</h2>

        {history.length === 0 ? (
          <p className="win-stat">No runs yet — solve it once to start tracking.</p>
        ) : (
          <>
            <div className="stats-summary">
              <div>
                <span className="stats-summary-value">{history.length}</span>
                <span className="stats-summary-label">Runs</span>
              </div>
              <div>
                <span className="stats-summary-value">{formatDuration(best ?? 0)}</span>
                <span className="stats-summary-label">Best</span>
              </div>
              <div>
                <span className="stats-summary-value">{formatDuration(average ?? 0)}</span>
                <span className="stats-summary-label">Average</span>
              </div>
            </div>

            <ul className="stats-run-list">
              {history.map((run, i) => (
                <li key={i}>
                  {run.puzzleSnapshot && <RunPreview snapshot={run.puzzleSnapshot} />}
                  <div className="stats-run-info">
                    <span className="stats-run-time">
                      {formatDuration(run.timeMs)}
                      {best === run.timeMs && ' 🏆'}
                    </span>
                    <span className="stats-run-meta">
                      {run.mistakes} mistakes · {formatDate(run.completedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
