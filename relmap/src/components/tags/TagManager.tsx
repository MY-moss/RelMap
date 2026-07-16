import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Tag, TagTarget, TagTargetType } from '../../shared/types'
import { useToastContext } from '../common/ToastContext'

const PRESET_COLORS: { label: string; value: string }[] = [
  { label: '橙', value: '#FF9F43' },
  { label: '红', value: '#ef4444' },
  { label: '玫红', value: '#f43f5e' },
  { label: '粉', value: '#ec4899' },
  { label: '紫', value: '#a855f7' },
  { label: '靛蓝', value: '#6366f1' },
  { label: '蓝', value: '#3b82f6' },
  { label: '青', value: '#06b6d4' },
  { label: '绿', value: '#22c55e' },
  { label: '石灰', value: '#84cc16' },
  { label: '黄', value: '#eab308' },
  { label: '棕', value: '#78716c' },
]

const TARGET_TYPE_LABELS: Record<string, string> = {
  person: '联系人',
  event: '事件',
  diary: '日记',
}

const TARGET_TYPE_BADGE: Record<string, string> = {
  person: 'bg-blue-100 text-blue-700',
  event: 'bg-green-100 text-green-700',
  diary: 'bg-purple-100 text-purple-700',
}

export default function TagManager() {
  const api = window.electronAPI
  const toast = useToastContext()

  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [targetCounts, setTargetCounts] = useState<Record<string, number>>({})

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[0].value)
  const [formParentId, setFormParentId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [expandedTagId, setExpandedTagId] = useState<string | null>(null)
  const [targets, setTargets] = useState<TagTarget[]>([])
  const [targetsLoading, setTargetsLoading] = useState(false)
  const [removingTargetKey, setRemovingTargetKey] = useState<string | null>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const isPresetColor = (color: string) => PRESET_COLORS.some((c) => c.value === color)

  const handleCustomColor = () => {
    colorInputRef.current?.click()
  }

  const loadTargetCounts = useCallback(
    async (list: Tag[]) => {
      const counts: Record<string, number> = {}
      const results = await Promise.all(
        list.map(async (tag) => {
          const r = await api.tag.listTargets(tag.id)
          return { id: tag.id, count: r.success ? r.data.length : 0 }
        })
      )
      results.forEach((r) => {
        counts[r.id] = r.count
      })
      setTargetCounts(counts)
    },
    [api]
  )

  const loadTags = useCallback(async () => {
    setLoading(true)
    const result = await api.tag.list()
    if (result.success) {
      setTags(result.data)
      await loadTargetCounts(result.data)
    } else {
      console.error(result.error)
    }
    setLoading(false)
  }, [api, loadTargetCounts])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  const loadTargets = useCallback(
    async (tagId: string) => {
      setTargetsLoading(true)
      const result = await api.tag.listTargets(tagId)
      if (result.success) {
        setTargets(result.data)
      } else {
        console.error(result.error)
        setTargets([])
      }
      setTargetsLoading(false)
    },
    [api]
  )

  const handleToggleExpand = (tagId: string) => {
    if (expandedTagId === tagId) {
      setExpandedTagId(null)
      setTargets([])
    } else {
      setExpandedTagId(tagId)
      loadTargets(tagId)
    }
  }

  const parentOptions = useMemo(() => {
    const excludeId = editingTag?.id
    return tags.filter((t) => t.id !== excludeId && !t.parent_id)
  }, [tags, editingTag])

  const tagTree = useMemo(() => {
    const roots = tags.filter((t) => !t.parent_id)
    const childrenMap = new Map<string, Tag[]>()
    for (const tag of tags) {
      if (tag.parent_id) {
        const list = childrenMap.get(tag.parent_id) || []
        list.push(tag)
        childrenMap.set(tag.parent_id, list)
      }
    }
    return roots.map((root) => ({
      tag: root,
      children: childrenMap.get(root.id) || [],
      depth: 0,
    }))
  }, [tags])

  const openCreateModal = () => {
    setEditingTag(null)
    setFormName('')
    setFormColor(PRESET_COLORS[0].value)
    setFormParentId('')
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag)
    setFormName(tag.name)
    setFormColor(tag.color)
    setFormParentId(tag.parent_id || '')
    setFormError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = formName.trim()
    if (!trimmedName) {
      setFormError('请输入标签名称')
      return
    }

    const duplicate = tags.find(
      (t) => t.name === trimmedName && t.id !== editingTag?.id
    )
    if (duplicate) {
      setFormError('标签名称已存在，请使用其他名称')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const parentId = formParentId || undefined
      const result = editingTag
        ? await api.tag.update(editingTag.id, {
            name: trimmedName,
            color: formColor,
            parent_id: parentId || null,
          })
        : await api.tag.create({ name: trimmedName, color: formColor, parent_id: parentId })

      if (result.success) {
        setModalOpen(false)
        await loadTags()
      } else {
        setFormError(result.error || '保存失败')
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (tag: Tag) => {
    const childCount = tags.filter((t) => t.parent_id === tag.id).length
    const msg = childCount > 0
      ? `确定要删除标签"${tag.name}"吗？其 ${childCount} 个子标签将变为顶层标签。`
      : `确定要删除标签"${tag.name}"吗？`
    if (!window.confirm(msg)) {
      return
    }
    const result = await api.tag.delete(tag.id)
    if (result.success) {
      if (expandedTagId === tag.id) {
        setExpandedTagId(null)
        setTargets([])
      }
      await loadTags()
    } else {
      toast.showError(result.error || '删除失败')
    }
  }

  const handleRemoveTarget = async (tagId: string, target: TagTarget) => {
    const key = `${target.target_id}_${target.target_type}`
    setRemovingTargetKey(key)
    const result = await api.tag.remove(
      tagId,
      target.target_id,
      target.target_type as TagTargetType
    )
    if (result.success) {
      await loadTargets(tagId)
      await loadTargetCounts(tags)
    } else {
      toast.showError(result.error || '取消关联失败')
    }
    setRemovingTargetKey(null)
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">标签管理</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>创建标签</span>
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.25a46.22 46.22 0 003.154-2.352c.997-.916.997-2.395 0-3.311L12.09 3.66A2.25 2.25 0 0010.5 3H9.568z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <p className="text-gray-500">还没有标签，创建第一个吧</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tagTree.map(({ tag, children, depth }) => (
            <div key={tag.id}>
              <TagCard
                tag={tag}
                depth={depth}
                counts={targetCounts}
                isExpanded={expandedTagId === tag.id}
                targets={targets}
                targetsLoading={targetsLoading}
                removingTargetKey={removingTargetKey}
                hasChildren={children.length > 0}
                onToggleExpand={handleToggleExpand}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onRemoveTarget={handleRemoveTarget}
              />
              {children.length > 0 && (
                <div className="ml-6 pl-4 border-l-2 border-gray-100 mt-1 space-y-1">
                  {children.map((child) => (
                    <TagCard
                      key={child.id}
                      tag={child}
                      depth={depth + 1}
                      counts={targetCounts}
                      isExpanded={expandedTagId === child.id}
                      targets={targets}
                      targetsLoading={targetsLoading}
                      removingTargetKey={removingTargetKey}
                      onToggleExpand={handleToggleExpand}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                      onRemoveTarget={handleRemoveTarget}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingTag ? '编辑标签' : '创建标签'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="关闭"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={inputClass}
                  placeholder="请输入标签名称"
                  autoFocus
                />
              </div>

              <div>
                <label className={labelClass}>颜色</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => {
                    const isSelected = formColor === color.value
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormColor(color.value)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border-2 ${
                          isSelected ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      >
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={handleCustomColor}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border-2 ${
                      !isPresetColor(formColor) ? 'border-gray-800 scale-110' : 'border-dashed border-gray-300 hover:border-gray-400 hover:scale-105'
                    }`}
                    title="自定义颜色"
                    style={!isPresetColor(formColor) ? { backgroundColor: formColor } : {}}
                  >
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={isPresetColor(formColor) ? '#FF9F43' : formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="sr-only"
                    />
                    {isPresetColor(formColor) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>父标签</label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">无（顶层标签）</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '保存中...' : editingTag ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

interface TagCardProps {
  tag: Tag
  depth: number
  counts: Record<string, number>
  isExpanded: boolean
  targets: TagTarget[]
  targetsLoading: boolean
  removingTargetKey: string | null
  hasChildren?: boolean
  onToggleExpand: (id: string) => void
  onEdit: (tag: Tag) => void
  onDelete: (tag: Tag) => void
  onRemoveTarget: (tagId: string, target: TagTarget) => void
}

function TagCard({
  tag,
  depth,
  counts,
  isExpanded,
  targets,
  targetsLoading,
  removingTargetKey,
  hasChildren,
  onToggleExpand,
  onEdit,
  onDelete,
  onRemoveTarget,
}: TagCardProps) {
  const count = counts[tag.id] ?? 0
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-gray-400 text-xs w-4 text-right flex-shrink-0">{'--'.repeat(depth)}</span>
          <span
            className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
            style={{ backgroundColor: tag.color }}
          />
          <span className="font-semibold text-gray-800 truncate">{tag.name}</span>
          {hasChildren && (
            <span className="text-xs text-gray-400 flex-shrink-0">[父]</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(tag)}
            className="text-gray-400 hover:text-primary-500 transition-colors p-1"
            title="编辑"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(tag)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="删除"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
          <button
            onClick={() => onToggleExpand(tag.id)}
            className={`text-gray-400 hover:text-gray-600 transition-colors p-1 ${isExpanded ? 'rotate-180' : ''}`}
            title={isExpanded ? '收起关联列表' : '查看关联目标'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-400">{count} 个关联</span>
      </div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {targetsLoading ? (
            <p className="text-sm text-gray-400">加载关联中...</p>
          ) : targets.length === 0 ? (
            <p className="text-sm text-gray-400">暂无关联目标</p>
          ) : (
            <ul className="space-y-1">
              {targets.map((target) => {
                const key = `${target.target_id}_${target.target_type}`
                const label = TARGET_TYPE_LABELS[target.target_type] || target.target_type
                const badgeClass = TARGET_TYPE_BADGE[target.target_type] || 'bg-gray-100 text-gray-700'
                const isRemoving = removingTargetKey === key
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${badgeClass}`}>
                        {label}
                      </span>
                      <span className="text-xs text-gray-500 truncate">此关联</span>
                    </div>
                    <button
                      onClick={() => onRemoveTarget(tag.id, target)}
                      disabled={isRemoving}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="取消关联"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
