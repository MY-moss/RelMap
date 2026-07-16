import { useEffect } from 'react'
import type { NavigateFunction } from 'react-router-dom'

interface ShortcutMap {
  key: string
  ctrl?: boolean
  meta?: boolean
  handler: () => void
}

export function useKeyboardShortcuts(navigate: NavigateFunction, searchInputRef?: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const shortcuts: ShortcutMap[] = [
      {
        key: 'k',
        ctrl: true,
        handler: () => {
          if (searchInputRef?.current) {
            searchInputRef.current.focus()
          }
        },
      },
      {
        key: 'n',
        ctrl: true,
        handler: () => navigate('/persons'),
      },
      {
        key: 'e',
        ctrl: true,
        handler: () => navigate('/timeline'),
      },
      {
        key: 'd',
        ctrl: true,
        handler: () => navigate('/'),
      },
    ]

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const sc of shortcuts) {
        const modifier = sc.ctrl ? e.ctrlKey : sc.meta ? e.metaKey : false
        if (e.key.toLowerCase() === sc.key && modifier && !e.shiftKey && !e.altKey) {
          e.preventDefault()
          sc.handler()
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [navigate, searchInputRef])
}
