export type PaletteKey = 'cosmic' | 'lava' | 'neon' | 'pastel'

export type RGB = [number, number, number]

export const PALETTES: Record<PaletteKey, RGB[]> = {
  cosmic: [
    [0.54, 0.23, 0.96], // Violet
    [0.92, 0.28, 0.6], // Pink
    [0.18, 0.7, 0.96], // Cyan
    [0.65, 0.18, 0.88], // Purple
  ],
  lava: [
    [0.93, 0.16, 0.16], // Red
    [0.97, 0.45, 0.08], // Orange
    [0.91, 0.7, 0.03], // Yellow
    [0.88, 0.11, 0.32], // Crimson
  ],
  neon: [
    [0.0, 1.0, 0.8], // Turquoise
    [1.0, 0.0, 0.5], // Fuchsia
    [0.2, 0.4, 1.0], // Electric blue
    [0.6, 0.0, 1.0], // Neon violet
  ],
  pastel: [
    [0.95, 0.6, 0.8], // Pink
    [0.5, 0.8, 0.98], // Sky
    [0.7, 0.65, 0.98], // Lavender
    [0.98, 0.85, 0.55], // Cream
  ],
}

export const PALETTE_LABELS: Record<PaletteKey, string> = {
  cosmic: 'Cosmic',
  lava: 'Lava Lamp',
  neon: 'Cyber Neon',
  pastel: 'Soft Pastel',
}

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[]
