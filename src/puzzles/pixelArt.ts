import type { Puzzle } from '../nonogram/types'

/**
 * Converts ASCII art (rows of equal length using '#' for filled and any
 * other character for empty) into a Puzzle. Throws if rows are ragged, to
 * catch typos in hand-authored art immediately.
 */
export function fromAscii(
  id: string,
  title: string,
  category: string,
  rows: string[],
): Puzzle {
  const width = rows[0].length
  rows.forEach((row, i) => {
    if (row.length !== width) {
      throw new Error(`Puzzle "${id}" row ${i} has length ${row.length}, expected ${width}`)
    }
  })

  const solution = rows.map((row) => row.split('').map((ch) => ch === '#'))

  return {
    id,
    title,
    width,
    height: rows.length,
    solution,
    category,
  }
}
