'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

const themeLabels: Record<string, string> = {
  light: 'Claro',
  dark: 'Oscuro',
  system: 'Sistema',
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const label = themeLabels[theme ?? 'system'] ?? 'Sistema'

  // Avoid hydration mismatch: render a neutral placeholder until mounted.
  // On server resolvedTheme is undefined; on client it's 'light' or 'dark'.
  const Icon = !mounted
    ? Monitor
    : resolvedTheme === 'dark'
      ? Sun
      : Moon

  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          aria-label={`Tema actual: ${mounted ? label : ''}`}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{mounted ? label : ''}</TooltipContent>
    </Tooltip>
  )
}