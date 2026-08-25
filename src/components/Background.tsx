import type { BackgroundSettings } from '../hooks/useBackgroundSettings'
import { MetaballBackground } from './MetaballBackground'

interface BackgroundProps {
  settings: BackgroundSettings
  theme: 'light' | 'dark'
}

export function Background({ settings, theme }: BackgroundProps) {
  return <MetaballBackground settings={settings} theme={theme} />
}
