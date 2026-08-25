import { useEffect, useState } from 'react'
import { Background } from './components/Background'
import { PlayView } from './components/PlayView'
import { PuzzleMenu } from './components/PuzzleMenu'
import { useBackgroundSettings } from './hooks/useBackgroundSettings'
import { useTheme } from './hooks/useTheme'
import { encodeSolution } from './nonogram/encode'
import { DIFFICULTIES, generateRandomPuzzle, puzzleFromEncoded } from './nonogram/generator'
import { generatedHash, parseHash, puzzleHash } from './nonogram/routing'
import type { Difficulty, Puzzle } from './nonogram/types'
import { findPuzzle } from './puzzles'
import './App.css'

function GeneratingOverlay({ pending }: { pending: PendingGeneration }) {
  const label = DIFFICULTIES.find((d) => d.id === pending.difficulty)?.label ?? pending.difficulty
  return (
    <div className="generating-overlay" role="status" aria-live="polite">
      <div className="generating-card">
        <div className="generating-spinner" aria-hidden="true" />
        <p className="generating-title">
          Building a {pending.size}x{pending.size} {label} puzzle
        </p>
        <p className="generating-note">Testing candidates until one rates as {label}...</p>
      </div>
    </div>
  )
}

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

/** A generation the UI has promised but not run yet, so a spinner can show. */
interface PendingGeneration {
  size: number
  difficulty: Difficulty
  /** 'replace' keeps a deep link tidy; 'push' adds a history entry. */
  history: 'replace' | 'push'
}

export default function App() {
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null)
  const [pending, setPending] = useState<PendingGeneration | null>(null)
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
        setPending({ size: route.size, difficulty: route.difficulty, history: 'replace' })
      }
    }

    applyRoute()
    window.addEventListener('hashchange', applyRoute)
    return () => window.removeEventListener('hashchange', applyRoute)
  }, [])

  // Rating candidate puzzles against the requested difficulty costs real work
  // (Expert has to prove that line logic alone stalls), so yield long enough to
  // paint the spinner before blocking the main thread. This deliberately uses a
  // timer rather than requestAnimationFrame: rAF never fires in a hidden tab,
  // which would leave a backgrounded deep link spinning forever.
  useEffect(() => {
    if (!pending) return
    let cancelled = false

    const timer = setTimeout(() => {
      if (!cancelled) {
        try {
          const puzzle = generateRandomPuzzle(pending.size, pending.difficulty)
          const hash = generatedHash(
            pending.size,
            pending.difficulty,
            encodeSolution(puzzle.solution),
          )
          setActivePuzzle(puzzle)
          if (pending.history === 'replace') history.replaceState(null, '', hash)
          else window.location.hash = hash
        } catch (err) {
          console.error(err)
          setActivePuzzle(null)
        }
      }
      setPending(null)
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pending])

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
    setPending({ size, difficulty, history: 'push' })
  }

  const handleBackToMenu = () => {
    setActivePuzzle(null)
    history.pushState('', document.title, window.location.pathname + window.location.search)
  }

  return (
    <>
      <Background settings={bgSettings} theme={theme} />
      {pending && <GeneratingOverlay pending={pending} />}
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
