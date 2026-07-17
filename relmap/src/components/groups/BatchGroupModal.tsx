import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGroupList } from '../../hooks'
import { useQueryClient } from '@tanstack/react-query'
import { groupKeys } from '../../hooks/queryKeys'
import { personKeys } from '../../hooks/queryKeys'

interface BatchGroupModalProps {
  open: boolean
  personIds: string[]
  onClose: () => void
  onDone: () => void
}

export default function BatchGroupModal({ open, personIds, onClose, onDone }: BatchGroupModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: allGroups = [] } = useGroupList()
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleApply = async () => {
    if (!selectedGroupId) return
    setSubmitting(true)
    try {
      const r = await window.electronAPI.group.addMembers(selectedGroupId, personIds)
      if (!r.success) throw new Error(r.error)
      queryClient.invalidateQueries({ queryKey: groupKeys.all })
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
      onDone()
      onClose()
    } catch (e) {
      console.error('batch add to group failed:', e)
      alert('加入群组失败: ' + (e as Error).message)
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
          加入群组 — 已选 {personIds.length} 人
        </h3>
        <p className="text-sm text-gray-500 mb-4">选择一个群组</p>

        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {allGroups.map((group) => (
            <label
              key={group.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name="batch-group"
                checked={selectedGroupId === group.id}
                onChange={() => setSelectedGroupId(group.id)}
                className="w-4 h-4 border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{group.name}</span>
              {group.description && (
                <span className="text-xs text-gray-400 truncate">{group.description}</span>
              )}
            </label>
          ))}
          {allGroups.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">暂无群组</p>
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
            disabled={!selectedGroupId || submitting}
            className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            {submitting ? '加入中...' : '加入群组'}
          </button>
        </div>
      </div>
    </div>
  )
}
