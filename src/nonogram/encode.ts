/**
 * Bit-packed base64 encoding for a puzzle solution grid, used to snapshot
 * generated (non-library) puzzles in run history compactly. A naive
 * JSON boolean array costs ~5-6 bytes per cell; this costs 1 bit per cell
 * (~8x smaller before base64, ~6x after) since a cell only has 2 states.
 */

export function encodeSolution(solution: boolean[][]): string {
  const height = solution.length
  const width = solution[0]?.length ?? 0
  const bytes = new Uint8Array(Math.ceil((width * height) / 8))

  let bitIndex = 0
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (solution[r][c]) {
        bytes[bitIndex >> 3] |= 1 << (bitIndex & 7)
      }
      bitIndex++
    }
  }

  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  // URL-safe (usable directly in a hash route, no percent-encoding needed)
  // and harmlessly compatible with the plain base64 already stored by
  // earlier versions, since '+'/'/' never appear in URL-safe output and
  // '-'/'_' never appear in plain base64.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSolution(base64: string, width: number, height: number): boolean[][] {
  let normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
  while (normalized.length % 4 !== 0) normalized += '='
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const solution: boolean[][] = []
  let bitIndex = 0
  for (let r = 0; r < height; r++) {
    const row: boolean[] = []
    for (let c = 0; c < width; c++) {
      row.push(((bytes[bitIndex >> 3] >> (bitIndex & 7)) & 1) === 1)
      bitIndex++
    }
    solution.push(row)
  }
  return solution
}
