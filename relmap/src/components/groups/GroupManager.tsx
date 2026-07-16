import { useState, useEffect, useCallback, useRef } from 'react'
import type { Group, Person } from '../../shared/types'
import { useToastContext } from '../common/ToastContext'

// 预设颜色板
const PRESET_COLORS = [
  { name: '温暖橙', value: '#FF9F43' },
  { name: '红色', value: '#ef4444' },
  { name: '玫红', value: '#f43f5e' },
  { name: '粉色', value: '#ec4899' },
  { name: '紫色', value: '#a855f7' },
  { name: '靛蓝', value: '#6366f1' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '青色', value: '#06b6d4' },
  { name: '绿色', value: '#22c55e' },
  { name: '石灰', value: '#84cc16' },
  { name: '黄色', value: '#eab308' },
  { name: '棕色', value: '#78716c' },
]

// ==================== 创建/编辑群组模态框 ====================
interface GroupFormModalProps {
  open: boolean
  group?: Group | null
  onClose: () => void
  onSaved: (group: Group) => void
}

function GroupFormModal({ open, group, onClose, onSaved }: GroupFormModalProps) {
  const isEdit = !!group
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0].value)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const colorInputRef = useRef<HTMLInputElement>(null)

  const isPresetColor = (c: string) => PRESET_COLORS.some((p) => p.value === c)

  const handleCustomColor = () => {
    colorInputRef.current?.click()
  }

  useEffect(() => {
    if (open) {
      if (group) {
        setName(group.name)
        setDescription(group.description || '')
        setColor(group.color || PRESET_COLORS[0].value)
      } else {
        setName('')
        setDescription('')
        setColor(PRESET_COLORS[0].value)
      }
      setError('')
    }
  }, [open, group])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入群组名称')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      }
      const result = isEdit
        ? await window.electronAPI.group.update(group!.id, payload)
        : await window.electronAPI.group.create(payload)
      if (result.success) {
        onSaved(result.data)
        onClose()
      } else {
        setError(result.error || '保存失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? '编辑群组' : '创建群组'}
          </h2>
          <button
            onClick={onClose}
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
              群组名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="请输入群组名称"
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>群组描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="可选，描述这个群组的用途"
            />
          </div>

          <div>
            <label className={labelClass}>群组颜色</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.name}
                  className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                >
                  {color === c.value && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={handleCustomColor}
                className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${
                  !isPresetColor(color) ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'border-2 border-dashed border-gray-300 hover:border-gray-400 hover:scale-110'
                }`}
                title="自定义颜色"
                style={!isPresetColor(color) ? { backgroundColor: color } : {}}
              >
                <input
                  ref={colorInputRef}
                  type="color"
                  value={isPresetColor(color) ? '#FF9F43' : color}
                  onChange={(e) => setColor(e.target.value)}
                  className="sr-only"
                />
                {isPresetColor(color) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '保存中...' : isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== 添加成员模态框 ====================
interface AddMemberModalProps {
  open: boolean
  groupId: string
  existingMemberIds: string[]
  onClose: () => void
  onAdded: () => void
}

function AddMemberModal({
  open,
  groupId,
  existingMemberIds,
  onClose,
  onAdded,
}: AddMemberModalProps) {
  const [persons, setPersons] = useState<Person[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setLoading(true)
      setSelected(new Set())
      setError('')
      window.electronAPI.person.list().then((result) => {
        if (result.success) {
          setPersons(result.data)
        } else {
          setError(result.error)
        }
        setLoading(false)
      })
    }
  }, [open])

  if (!open) return null

  const existingSet = new Set(existingMemberIds)
  const candidates = persons.filter((p) => !existingSet.has(p.id))

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAdd = async () => {
    if (selected.size === 0) {
      setError('请至少选择一个联系人')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await window.electronAPI.group.addMembers(
        groupId,
        Array.from(selected)
      )
      if (result.success) {
        onAdded()
        onClose()
      } else {
        setError(result.error || '添加失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">添加成员</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="关闭"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <p className="text-gray-500 text-center py-8">加载中...</p>
          ) : candidates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">没有可添加的联系人</p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((p) => {
                const isSelected = selected.has(p.id)
                const initial = p.name?.charAt(0)?.toUpperCase() || '?'
                const sub = [p.nickname, p.company].filter(Boolean).join(' · ')
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggleSelect(p.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-gray-800 truncate">{p.name}</p>
                        {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 pt-4 mt-2 border-t border-gray-100">
          <span className="text-sm text-gray-500">已选 {selected.size} 人</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={submitting || selected.size === 0}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '添加中...' : '添加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== 主组件 ====================
export default function GroupManager() {
  const api = window.electronAPI
  const toast = useToastContext()
  const [groups, setGroups] = useState<Group[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Person[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true)
    const result = await api.group.list()
    if (result.success) {
      setGroups(result.data)
      // 并行获取每个群组的成员数量
      const counts: Record<string, number> = {}
      await Promise.all(
        result.data.map(async (g) => {
          const r = await api.group.listMembers(g.id)
          if (r.success) {
            counts[g.id] = r.data.length
          }
        })
      )
      setMemberCounts(counts)
    } else {
      toast.showError(result.error)
    }
    setLoadingGroups(false)
  }, [api, toast])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const loadMembers = useCallback(
    async (groupId: string) => {
      setLoadingMembers(true)
      const result = await api.group.listMembers(groupId)
      if (result.success) {
        setMembers(result.data)
        setMemberCounts((prev) => ({ ...prev, [groupId]: result.data.length }))
      } else {
        toast.showError(result.error)
        setMembers([])
      }
      setLoadingMembers(false)
    },
    [api, toast]
  )

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group)
    loadMembers(group.id)
  }

  const handleOpenCreate = () => {
    setEditingGroup(null)
    setGroupModalOpen(true)
  }

  const handleOpenEdit = () => {
    if (selectedGroup) {
      setEditingGroup(selectedGroup)
      setGroupModalOpen(true)
    }
  }

  const handleGroupSaved = async (savedGroup: Group) => {
    await loadGroups()
    setSelectedGroup(savedGroup)
    loadMembers(savedGroup.id)
  }

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return
    if (
      !confirm(
        `确定要删除群组「${selectedGroup.name}」吗？此操作不可撤销，但不会删除群组中的联系人。`
      )
    ) {
      return
    }
    setDeletingGroup(true)
    const result = await api.group.delete(selectedGroup.id)
    if (result.success) {
      setSelectedGroup(null)
      setMembers([])
      await loadGroups()
    } else {
      toast.showError(result.error)
    }
    setDeletingGroup(false)
  }

  const handleRemoveMember = async (personId: string) => {
    if (!selectedGroup) return
    if (!confirm('确定要将该成员移出群组吗？')) {
      return
    }
    setRemovingMemberId(personId)
    const result = await api.group.removeMember(selectedGroup.id, personId)
    if (result.success) {
      await loadMembers(selectedGroup.id)
    } else {
      toast.showError(result.error)
    }
    setRemovingMemberId(null)
  }

  const handleMembersAdded = async () => {
    if (selectedGroup) {
      await loadMembers(selectedGroup.id)
    }
  }

  return (
    <div className="p-6">
      {/* 顶部标题 + 创建按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">群组管理</h1>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>创建群组</span>
        </button>
      </div>

      <div className="flex gap-6">
        {/* 群组列表 */}
        <div className="w-1/3">
          {loadingGroups ? (
            <p className="text-gray-500">加载中...</p>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">还没有群组，创建第一个吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const isSelected = selectedGroup?.id === group.id
                const count = memberCounts[group.id] ?? 0
                return (
                  <div
                    key={group.id}
                    onClick={() => handleSelectGroup(group)}
                    className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 ring-2 ring-primary-500'
                        : 'border-gray-100 hover:border-primary-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: group.color || '#FF9F43' }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            {group.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{count} 位成员</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 群组详情 */}
        <div className="flex-1">
          {!selectedGroup ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-400">请从左侧选择一个群组查看详情</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 群组信息卡片 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: selectedGroup.color || '#FF9F43' }}
                    />
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-gray-800 truncate">
                        {selectedGroup.name}
                      </h2>
                      {selectedGroup.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedGroup.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={handleOpenEdit}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                    >
                      编辑
                    </button>
                    <button
                      onClick={handleDeleteGroup}
                      disabled={deletingGroup}
                      className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingGroup ? '删除中...' : '删除群组'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 成员列表卡片 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">
                    成员
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      ({members.length})
                    </span>
                  </h3>
                  <button
                    onClick={() => setAddMemberOpen(true)}
                    className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>添加成员</span>
                  </button>
                </div>

                {loadingMembers ? (
                  <p className="text-gray-500">加载中...</p>
                ) : members.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    还没有成员，点击「添加成员」
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((member) => {
                      const initial = member.name?.charAt(0)?.toUpperCase() || '?'
                      const sub = [member.nickname, member.company]
                        .filter(Boolean)
                        .join(' · ')
                      return (
                        <li
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {member.name}
                            </p>
                            {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removingMemberId === member.id}
                            title="移出群组"
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <GroupFormModal
        open={groupModalOpen}
        group={editingGroup}
        onClose={() => setGroupModalOpen(false)}
        onSaved={handleGroupSaved}
      />

      {selectedGroup && (
        <AddMemberModal
          open={addMemberOpen}
          groupId={selectedGroup.id}
          existingMemberIds={members.map((m) => m.id)}
          onClose={() => setAddMemberOpen(false)}
          onAdded={handleMembersAdded}
        />
      )}
    </div>
  )
}
