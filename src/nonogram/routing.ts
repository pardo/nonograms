import { isKnownDifficulty, isKnownSize } from './generator'
import type { Difficulty } from './types'

export type Route =
  | { type: 'menu' }
  | { type: 'puzzle'; id: string }
  | { type: 'random'; size: number; difficulty: Difficulty }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)

  if (parts[0] === 'p' && parts[1]) {
    return { type: 'puzzle', id: decodeURIComponent(parts[1]) }
  }

  if (parts[0] === 'r' && parts[1] && parts[2]) {
    const size = Number(parts[1])
    if (isKnownSize(size) && isKnownDifficulty(parts[2])) {
      return { type: 'random', size, difficulty: parts[2] }
    }
  }

  return { type: 'menu' }
}

export function puzzleHash(id: string): string {
  return `#/p/${encodeURIComponent(id)}`
}

export function randomHash(size: number, difficulty: Difficulty): string {
  return `#/r/${size}/${difficulty}`
}
