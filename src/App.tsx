import { useEffect, useState } from 'react'
import { Background } from './components/Background'
import { PlayView } from './components/PlayView'
import { PuzzleMenu } from './components/PuzzleMenu'
import { useBackgroundSettings } from './hooks/useBackgroundSettings'
import { useTheme } from './hooks/useTheme'
import { encodeSolution } from './nonogram/encode'
import { generateRandomPuzzle, puzzleFromEncoded } from './nonogram/generator'
import { generatedHash, parseHash, puzzleHash } from './nonogram/routing'
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
  const { theme, toggle: toggleTheme } = useTheme()
  const { settings: bgSettings, update: updateBgSettings } = useBackgroundSettings()

  // Deep-linking: resolve the puzzle from the URL hash on load, and on
  // browser back/forward or a hash pasted while the app is open.
  useEffect(() => {
    const applyRoute = () => {
      const route = parseHash(window.location.hash)
      if (route.type === 'menu') {
        setActivePuzzle(null)
      } else if (route.type === 'puzzle') {
        setActivePuzzle(findPuzzle(route.id) ?? null)
      } else if (route.type === 'generated') {
        setActivePuzzle(puzzleFromEncoded(route.size, route.difficulty, route.solution))
      } else {
        // 'random': generate fresh, then normalize the URL to a stable,
        // reload-safe link pointing at this exact puzzle. Without this, a
        // simple reload (or iOS Safari silently reloading a backgrounded
        // tab) would land back on this branch and generate a *different*
        // puzzle, making any in-progress solve look like it never saved.
        try {
          const puzzle = generateRandomPuzzle(route.size, route.difficulty)
          setActivePuzzle(puzzle)
          history.replaceState(
            null,
            '',
            generatedHash(route.size, route.difficulty, encodeSolution(puzzle.solution)),
          )
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
      window.location.hash = generatedHash(size, difficulty, encodeSolution(puzzle.solution))
    } catch (err) {
      console.error(err)
    }
  }

  const handleBackToMenu = () => {
    setActivePuzzle(null)
    history.pushState('', document.title, window.location.pathname + window.location.search)
  }

  return (
    <>
      <Background settings={bgSettings} theme={theme} />
      {activePuzzle ? (
        <PlayView
          key={activePuzzle.id}
          puzzle={activePuzzle}
          onBackToMenu={handleBackToMenu}
          onCompleted={handleCompleted}
          onNewRandom={handleGenerate}
          theme={theme}
          onToggleTheme={toggleTheme}
          bgSettings={bgSettings}
          onUpdateBgSettings={updateBgSettings}
        />
      ) : (
        <PuzzleMenu
          onSelect={handleSelect}
          onGenerate={handleGenerate}
          completedIds={completedIds}
          theme={theme}
          onToggleTheme={toggleTheme}
          bgSettings={bgSettings}
          onUpdateBgSettings={updateBgSettings}
        />
      )}
    </>
  )
}
