import { useEffect, useState } from 'react'
import { PlayView } from './components/PlayView'
import { PuzzleMenu } from './components/PuzzleMenu'
import { generateRandomPuzzle } from './nonogram/generator'
import { parseHash, puzzleHash, randomHash } from './nonogram/routing'
import type { Difficulty, Puzzle } from './nonogram/types'
import { findPuzzle } from './puzzles'
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

  // Deep-linking: resolve the puzzle from the URL hash on load, and on
  // browser back/forward or a hash pasted while the app is open.
  useEffect(() => {
    const applyRoute = () => {
      const route = parseHash(window.location.hash)
      if (route.type === 'menu') {
        setActivePuzzle(null)
      } else if (route.type === 'puzzle') {
        setActivePuzzle(findPuzzle(route.id) ?? null)
      } else {
        try {
          setActivePuzzle(generateRandomPuzzle(route.size, route.difficulty))
        } catch {
          setActivePuzzle(null)
        }
      }
    }

    applyRoute()
    window.addEventListener('hashchange', applyRoute)
    return () => window.removeEventListener('hashchange', applyRoute)
  }, [])

  const handleCompleted = (puzzleId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev)
      next.add(puzzleId)
      saveCompletedIds(next)
      return next
    })
  }

  const handleSelect = (puzzle: Puzzle) => {
    setActivePuzzle(puzzle)
    window.location.hash = puzzleHash(puzzle.id)
  }

  const handleGenerate = (size: number, difficulty: Difficulty) => {
    try {
      const puzzle = generateRandomPuzzle(size, difficulty)
      setActivePuzzle(puzzle)
      window.location.hash = randomHash(size, difficulty)
    } catch (err) {
      console.error(err)
    }
  }

  const handleBackToMenu = () => {
    setActivePuzzle(null)
    history.pushState('', document.title, window.location.pathname + window.location.search)
  }

  if (activePuzzle) {
    return (
      <PlayView
        key={activePuzzle.id}
        puzzle={activePuzzle}
        onBackToMenu={handleBackToMenu}
        onCompleted={handleCompleted}
        onNewRandom={handleGenerate}
      />
    )
  }

  return (
    <PuzzleMenu onSelect={handleSelect} onGenerate={handleGenerate} completedIds={completedIds} />
  )
}
