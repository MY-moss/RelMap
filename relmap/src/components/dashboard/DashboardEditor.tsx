import { useState, useCallback } from 'react'
import type { WidgetType, WidgetConfig } from '../../shared/types'
import { WIDGET_REGISTRY } from './dashboardWidgets'

interface DashboardEditorProps {
  widgets: WidgetConfig[]
  onSave: (widgets: WidgetConfig[]) => void
  onClose: () => void
}

const ALL_WIDGET_TYPES: { type: WidgetType; description: string }[] = [
  { type: 'stats-overview', description: '联系人/事件/日记数量统计' },
  { type: 'recent-activity', description: '最近的事件与日记' },
  { type: 'intimacy-distribution', description: '联系人亲密度分布饼图' },
  { type: 'lifecycle-distribution', description: '联系人生命周期柱状图' },
  { type: 'monthly-trend', description: '月度交互趋势折线图' },
  { type: 'lost-contact', description: '超过3个月未联系的人' },
  { type: 'reminders', description: '即将到期的提醒事项' },
  { type: 'main-identity', description: '主身份及其关系概览' },
]

export default function DashboardEditor({ widgets, onSave, onClose }: DashboardEditorProps) {
  const [items, setItems] = useState<WidgetConfig[]>(() => [...widgets])
  const activeTypes = new Set(items.filter(w => w.visible).map(w => w.type))

  const toggleWidget = useCallback((type: WidgetType) => {
    setItems(prev => {
      const existing = prev.find(w => w.type === type)
      if (existing) {
        return prev.map(w => w.type === type ? { ...w, visible: !w.visible } : w)
      }
      const maxOrder = prev.reduce((max, w) => Math.max(max, w.order), -1)
      return [...prev, { type, visible: true, order: maxOrder + 1 }]
    })
  }, [])

  const moveUp = useCallback((index: number) => {
    setItems(prev => {
      const visible = prev.filter(w => w.visible)
      if (index <= 0) return prev
      const temp = visible[index]
      visible[index] = visible[index - 1]
      visible[index - 1] = temp
      const updated = visible.map((w, i) => ({ ...w, order: i }))
      const hidden = prev.filter(w => !w.visible)
      return [...updated, ...hidden]
    })
  }, [])

  const moveDown = useCallback((index: number) => {
    setItems(prev => {
      const visible = prev.filter(w => w.visible)
      if (index >= visible.length - 1) return prev
      const temp = visible[index]
      visible[index] = visible[index + 1]
      visible[index + 1] = temp
      const updated = visible.map((w, i) => ({ ...w, order: i }))
      const hidden = prev.filter(w => !w.visible)
      return [...updated, ...hidden]
    })
  }, [])

  const visibleItems = items.filter(w => w.visible).sort((a, b) => a.order - b.order)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">自定义仪表盘</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">已选组件</h3>
            {visibleItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">尚未添加任何组件，请从下方选择</p>
            ) : (
              <div className="space-y-2">
                {visibleItems.map((w, i) => (
                  <div key={w.type} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-xs text-gray-400 w-5 text-center">{i + 1}</span>
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{WIDGET_REGISTRY[w.type]?.title || w.type}</span>
                    <button onClick={() => moveUp(i)} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => moveDown(i)} disabled={i >= visibleItems.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" /></svg></button>
                    <button onClick={() => toggleWidget(w.type)} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">添加组件</h3>
            <div className="grid grid-cols-2 gap-2">
              {ALL_WIDGET_TYPES.map(({ type, description }) => {
                const active = activeTypes.has(type)
                return (
                  <button key={type} onClick={() => toggleWidget(type)}
                    className={`text-left p-2.5 rounded-lg border text-sm transition-colors ${active ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                    <div className="font-medium text-gray-800 dark:text-gray-100">{WIDGET_REGISTRY[type]?.title || type}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">取消</button>
          <button onClick={() => onSave(items)} className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600">保存</button>
        </div>
      </div>
    </div>
  )
}
