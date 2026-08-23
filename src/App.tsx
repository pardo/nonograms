import { useState } from 'react'
import { PlayView } from './components/PlayView'
import { PuzzleMenu } from './components/PuzzleMenu'
import { generateRandomPuzzle } from './nonogram/generator'
import type { Difficulty, Puzzle } from './nonogram/types'
import './App.css'

function loadCompletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem('nonogram-completed')
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveCompletedIds(ids: Set<string>) {
  try {
    localStorage.setItem('nonogram-completed', JSON.stringify([...ids]))
  } catch {
    // Ignore.
  }
}

export default function App() {
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => loadCompletedIds())

  const handleCompleted = (puzzleId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev)
      next.add(puzzleId)
      saveCompletedIds(next)
      return next
    })
  }

  const handleGenerate = (difficulty: Difficulty) => {
    setActivePuzzle(generateRandomPuzzle(difficulty))
  }

  if (activePuzzle) {
    return (
      <PlayView
        puzzle={activePuzzle}
        onBackToMenu={() => setActivePuzzle(null)}
        onCompleted={handleCompleted}
      />
    )
  }

  return (
    <PuzzleMenu onSelect={setActivePuzzle} onGenerate={handleGenerate} completedIds={completedIds} />
  )
}
