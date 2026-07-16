import { create } from 'zustand'

export type ColorTheme = 'orange' | 'emerald' | 'violet' | 'rose' | 'sky' | 'amber'

type GlassMode = 'none' | 'frosted' | 'translucent'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  globalSearchOpen: boolean
  setGlobalSearchOpen: (open: boolean) => void
  darkMode: boolean
  setDarkMode: (dark: boolean) => void
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
  glassMode: GlassMode
  setGlassMode: (mode: GlassMode) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  globalSearchOpen: false,
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),
  darkMode: false,
  setDarkMode: (dark) => set({ darkMode: dark }),
  colorTheme: 'orange',
  setColorTheme: (theme) => set({ colorTheme: theme }),
  glassMode: 'none',
  setGlassMode: (mode) => set({ glassMode: mode }),
}))

export type { GlassMode }

export const themeLabels: Record<ColorTheme, string> = {
  orange: '活力橙',
  emerald: '翡翠绿',
  violet: '紫罗兰',
  rose: '玫瑰红',
  sky: '天空蓝',
  amber: '琥珀金',
}
