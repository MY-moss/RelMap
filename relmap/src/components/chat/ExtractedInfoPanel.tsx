import { useState } from 'react'
import type { ExtractedContactInfo } from '../../shared/types'

interface ExtractedInfoPanelProps {
  sessionId: string
  onClose: () => void
}

export default function ExtractedInfoPanel({ sessionId, onClose }: ExtractedInfoPanelProps) {
  const [info, setInfo] = useState<ExtractedContactInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  const handleExtract = async () => {
    setLoading(true)
    const res = await window.electronAPI.aiChat.extractInfo(sessionId)
    if (res.success && res.data) {
      setInfo(res.data)
    }
    setLoading(false)
  }

  const hasData = info && (info.name || info.company || info.title || info.email || info.phone || info.notes)

  const handleSaveToNotes = async () => {
    if (!info?.name) return
    setSaving('saving')

    try {
      const personRes = await window.electronAPI.person.list({ limit: 100 })
      if (!personRes.success) { setSaving(null); return }

      let notes = ''
      if (info.company) notes += `公司：${info.company}\n`
      if (info.title) notes += `职位：${info.title}\n`
      if (info.email) notes += `邮箱：${info.email}\n`
      if (info.phone) notes += `电话：${info.phone}\n`

      const existingPerson = (personRes.data as Array<{ id: string; name: string; notes?: string }>).find(
        (p: { name: string }) => p.name === info.name
      )

      if (existingPerson) {
        const updateData: Record<string, string> = {}
        if (info.company && !existingPerson.notes?.includes(info.company)) {
          updateData.notes = (existingPerson.notes || '') + '\n' + notes
        }
        if (Object.keys(updateData).length > 0) {
          await window.electronAPI.person.update(existingPerson.id, updateData)
        }
        setSaving('saved')
      } else {
        const createRes = await window.electronAPI.person.create({
          name: info.name, notes,
          company: info.company || '',
          title: info.title || '',
          gender: 2,
        } as never)
        if (createRes.success) setSaving('saved')
      }
    } catch { /* silent */ }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">提取联系人信息</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
        </button>
      </div>

      {!hasData && !loading && (
        <div>
          <p className="text-xs text-gray-500 mb-3">分析当前对话，自动提取联系人信息并保存到通讯录</p>
          <button onClick={handleExtract}
            className="w-full px-3 py-2 text-xs font-medium bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors">
            分析对话
          </button>
        </div>
      )}

      {loading && <p className="text-xs text-gray-400 text-center py-3">分析中...</p>}

      {hasData && (
        <div className="space-y-2">
          {info.name && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-12">姓名</span>
              <span className="text-gray-800 dark:text-gray-100 font-medium">{info.name}</span>
            </div>
          )}
          {info.company && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-12">公司</span>
              <span className="text-gray-800 dark:text-gray-100">{info.company}</span>
            </div>
          )}
          {info.title && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-12">职位</span>
              <span className="text-gray-800 dark:text-gray-100">{info.title}</span>
            </div>
          )}
          {info.email && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-12">邮箱</span>
              <span className="text-gray-800 dark:text-gray-100">{info.email}</span>
            </div>
          )}
          {info.phone && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-12">电话</span>
              <span className="text-gray-800 dark:text-gray-100">{info.phone}</span>
            </div>
          )}
          <div className="pt-2">
            {saving === 'saving' && <p className="text-xs text-gray-400 text-center">保存中...</p>}
            {saving === 'saved' && <p className="text-xs text-green-500 text-center">已保存到通讯录</p>}
            {!saving && (
              <button onClick={handleSaveToNotes}
                className="w-full px-3 py-2 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                保存到通讯录
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
