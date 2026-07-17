import { useState, useEffect } from 'react'
import type { WidgetConfig } from '../../shared/types'
import DashboardEditor from './DashboardEditor'
import { WIDGET_REGISTRY } from './dashboardWidgets'

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { type: 'stats-overview', visible: true, order: 0 },
  { type: 'recent-activity', visible: true, order: 1 },
  { type: 'intimacy-distribution', visible: true, order: 2 },
  { type: 'lifecycle-distribution', visible: true, order: 3 },
  { type: 'monthly-trend', visible: true, order: 4 },
  { type: 'lost-contact', visible: true, order: 5 },
  { type: 'reminders', visible: true, order: 6 },
  { type: 'main-identity', visible: true, order: 7 },
]

export function useWidgetConfig() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.electronAPI.app.getConfig().then(result => {
      if (result.success) {
        const raw = (result.data as Record<string, unknown>).dashboard
        if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).widgets)) {
          setWidgets((raw as { widgets: WidgetConfig[] }).widgets)
        }
      }
    }).finally(() => setLoaded(true))
  }, [])

  const saveWidgets = async (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets)
    await window.electronAPI.app.saveConfig({ dashboard: { widgets: newWidgets } })
  }

  return { widgets: widgets.filter(w => w.visible).sort((a, b) => a.order - b.order), loaded, saveWidgets }
}

export default function DashboardGrid() {
  const { widgets, loaded, saveWidgets } = useWidgetConfig()
  const [editing, setEditing] = useState(false)
  const [allWidgets, setAllWidgets] = useState<WidgetConfig[]>([])

  const handleOpenEditor = async () => {
    const result = await window.electronAPI.app.getConfig()
    const raw = result.success ? (result.data as Record<string, unknown>).dashboard : null
    const current = raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).widgets)
      ? (raw as { widgets: WidgetConfig[] }).widgets
      : DEFAULT_WIDGETS
    setAllWidgets(current)
    setEditing(true)
  }

  if (!loaded) {
    return <div className="p-6 text-gray-500">加载中...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <button onClick={handleOpenEditor}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          自定义
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {widgets.map(w => {
          const entry = WIDGET_REGISTRY[w.type]
          if (!entry) return null
          const Widget = entry.component
          return (
            <div key={w.type} className={w.type === 'stats-overview' || w.type === 'recent-activity' ? 'lg:col-span-2 xl:col-span-2' : ''}>
              <Widget />
            </div>
          )
        })}
      </div>

      {editing && (
        <DashboardEditor
          widgets={allWidgets}
          onSave={(newWidgets) => {
            saveWidgets(newWidgets)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
