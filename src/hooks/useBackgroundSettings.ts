import { useEffect, useState } from 'react'
import type { PaletteKey } from '../backgroundPalettes'

export type BackgroundMode = 'off' | 'custom' | 'random'

export interface BackgroundSettings {
  mode: BackgroundMode
  count: number
  size: number
  speed: number
  gooiness: number
  palette: PaletteKey
}

const KEY = 'nonogram-bg-settings'

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  mode: 'custom',
  count: 4,
  size: 0.16,
  speed: 0.6,
  gooiness: 2.6,
  palette: 'cosmic',
}

function loadSettings(): BackgroundSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_BACKGROUND_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_BACKGROUND_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_BACKGROUND_SETTINGS
  }
}

export function useBackgroundSettings() {
  const [settings, setSettings] = useState<BackgroundSettings>(loadSettings)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // Ignore.
    }
  }, [settings])

  const update = (patch: Partial<BackgroundSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  return { settings, update }
}
