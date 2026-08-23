import type { Puzzle } from '../nonogram/types'

type ShapeFn = (r: number, c: number, size: number) => boolean

const center = (size: number) => (size - 1) / 2

const shapes: Record<string, ShapeFn> = {
  Diamond: (r, c, size) => {
    const m = center(size)
    return Math.abs(r - m) + Math.abs(c - m) <= m
  },
  Ring: (r, c, size) => {
    const m = center(size)
    const d = Math.sqrt((r - m) ** 2 + (c - m) ** 2)
    return d <= m && d >= m - Math.max(1, size * 0.18)
  },
  Circle: (r, c, size) => {
    const m = center(size)
    return Math.sqrt((r - m) ** 2 + (c - m) ** 2) <= m
  },
  Hourglass: (r, c, size) => {
    const m = center(size)
    const distFromEdge = r < m ? r : size - 1 - r
    const half = size / 2
    const allowed = half - (distFromEdge / m) * half
    return Math.abs(c - m) <= allowed
  },
  Checkerboard: (r, c) => (r + c) % 2 === 0,
  Stripes: (_r, c) => c % 2 === 0,
  Plus: (r, c, size) => {
    const m = center(size)
    const band = Math.max(1, Math.round(size * 0.18))
    return Math.abs(r - m) <= band || Math.abs(c - m) <= band
  },
  Frame: (r, c, size) => {
    const band = Math.max(1, Math.round(size * 0.12))
    return r < band || c < band || r >= size - band || c >= size - band
  },
}

export function generatePatternPuzzle(shapeName: keyof typeof shapes, size: number): Puzzle {
  const fn = shapes[shapeName]
  const solution: boolean[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => fn(r, c, size)),
  )

  return {
    id: `pattern-${shapeName.toLowerCase()}-${size}`,
    title: `${shapeName} ${size}x${size}`,
    width: size,
    height: size,
    solution,
    category: 'Patterns',
  }
}

const PATTERN_SIZES = [10, 15, 20]

export const patternPuzzles: Puzzle[] = (Object.keys(shapes) as (keyof typeof shapes)[]).flatMap(
  (shape) => PATTERN_SIZES.map((size) => generatePatternPuzzle(shape, size)),
)
