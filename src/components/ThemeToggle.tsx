import { Moon, Sun, Monitor } from 'lucide-react'
import { useThemeStore } from '../store/useThemeStore'

export function ThemeToggle() {
  const { mode, setMode } = useThemeStore()

  const cycles = {
    system: 'light',
    light: 'dark',
    dark: 'system',
  } as const

  const Icon = mode === 'system' ? Monitor : mode === 'dark' ? Moon : Sun

  return (
    <button
      onClick={() => setMode(cycles[mode])}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-muted bg-surface-muted text-text-muted transition hover:border-slate-400 hover:text-text-main"
      aria-label={`Current theme: ${mode}. Click to change.`}
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
