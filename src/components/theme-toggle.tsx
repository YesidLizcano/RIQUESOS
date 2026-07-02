'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

const themeIcons = {
  light: Moon,
  dark: Sun,
  system: Monitor,
} as const

const themeLabels: Record<string, string> = {
  light: 'Claro',
  dark: 'Oscuro',
  system: 'Sistema',
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const Icon = themeIcons[theme as keyof typeof themeIcons] ?? Monitor
  const label = themeLabels[theme ?? 'system'] ?? 'Sistema'

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          aria-label={`Tema actual: ${label}`}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}