import { useEffect, useRef, useState } from 'react'
import type { BackgroundMode, BackgroundSettings } from '../hooks/useBackgroundSettings'

interface BackgroundSettingsButtonProps {
  settings: BackgroundSettings
  onUpdate: (patch: Partial<BackgroundSettings>) => void
}

const MODES: { value: BackgroundMode; label: string }[] = [
  { value: 'custom', label: 'On' },
  { value: 'random', label: 'Random each visit' },
  { value: 'off', label: 'Off' },
]

export function BackgroundSettingsButton({ settings, onUpdate }: BackgroundSettingsButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="bg-settings" ref={rootRef}>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Background settings"
        title="Background settings"
      >
        🎨
      </button>

      {open && (
        <div className="bg-settings-panel">
          <div className="bg-settings-group" role="radiogroup" aria-label="Background mode">
            {MODES.map((m) => (
              <label key={m.value} className="bg-settings-radio">
                <input
                  type="radio"
                  name="bg-mode"
                  checked={settings.mode === m.value}
                  onChange={() => onUpdate({ mode: m.value })}
                />
                {m.label}
              </label>
            ))}
          </div>

          {settings.mode === 'custom' && (
            <div className="bg-settings-sliders">
              <label>
                <span>Blobs</span>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={1}
                  value={settings.count}
                  onChange={(e) => onUpdate({ count: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Size</span>
                <input
                  type="range"
                  min={0.08}
                  max={0.26}
                  step={0.01}
                  value={settings.size}
                  onChange={(e) => onUpdate({ size: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Speed</span>
                <input
                  type="range"
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={settings.speed}
                  onChange={(e) => onUpdate({ speed: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Blend</span>
                <input
                  type="range"
                  min={1.6}
                  max={4}
                  step={0.1}
                  value={settings.gooiness}
                  onChange={(e) => onUpdate({ gooiness: Number(e.target.value) })}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
