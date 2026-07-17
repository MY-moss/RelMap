import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTagList } from '../../hooks'
import { useQueryClient } from '@tanstack/react-query'
import { tagKeys } from '../../hooks/queryKeys'

interface BatchTagModalProps {
  open: boolean
  personIds: string[]
  onClose: () => void
  onDone: () => void
}

export default function BatchTagModal({ open, personIds, onClose, onDone }: BatchTagModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: allTags = [] } = useTagList()
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  const toggleTag = (id: string) => {
    const next = new Set(selectedTagIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedTagIds(next)
  }

  const handleApply = async () => {
    if (selectedTagIds.size === 0) return
    setSubmitting(true)
    try {
      const r = await window.electronAPI.person.batchTag(personIds, Array.from(selectedTagIds))
      if (!r.success) throw new Error(r.error)
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
      personIds.forEach((pid) => {
        queryClient.invalidateQueries({ queryKey: tagKeys.byTarget(pid, 'person') })
      })
      onDone()
      onClose()
    } catch (e) {
      console.error('batch tag failed:', e)
      alert('批量打标签失败: ' + (e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 max-h-[80vh] flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          批量打标签 — 已选 {personIds.length} 人
        </h3>
        <p className="text-sm text-gray-500 mb-4">选择要添加的标签（多选）</p>

        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {allTags.map((tag) => (
            <label
              key={tag.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedTagIds.has(tag.id)}
                onChange={() => toggleTag(tag.id)}
                className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color || '#6b7280' }}
              />
              <span className="text-sm text-gray-700">{tag.name}</span>
            </label>
          ))}
          {allTags.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">暂无标签</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleApply}
            disabled={selectedTagIds.size === 0 || submitting}
            className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            {submitting ? '应用中...' : `应用 (${selectedTagIds.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}
