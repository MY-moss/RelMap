import { useState, useEffect, type FormEvent } from 'react'
import { format } from 'date-fns'
import type { FollowUpQueue, FollowUpFilter, CreateFollowUpDto, UpdateFollowUpDto } from '../../shared/types'
import { useFollowUpList, useCreateFollowUp, useUpdateFollowUp, useDeleteFollowUp, usePersonList } from '../../hooks'

const FOLLOW_UP_TYPE_LABEL: Record<FollowUpQueue['follow_up_type'], string> = {
  call: '电话',
  meet: '见面',
  message: '消息',
  social: '社交',
  gift: '送礼',
  other: '其他',
}

const FOLLOW_UP_TYPE_CLASS: Record<FollowUpQueue['follow_up_type'], string> = {
  call: 'bg-blue-50 text-blue-600',
  meet: 'bg-green-50 text-green-600',
  message: 'bg-purple-50 text-purple-600',
  social: 'bg-pink-50 text-pink-600',
  gift: 'bg-red-50 text-red-600',
  other: 'bg-gray-50 text-gray-600',
}

const PRIORITY_LABEL: Record<FollowUpQueue['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const PRIORITY_CLASS: Record<FollowUpQueue['priority'], string> = {
  high: 'bg-red-100 text-red-600 border-red-200',
  medium: 'bg-yellow-100 text-yellow-600 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PRIORITY_DOT_CLASS: Record<FollowUpQueue['priority'], string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
}

const STATUS_LABEL: Record<FollowUpQueue['status'], string> = {
  pending: '待跟进',
  in_progress: '跟进中',
  completed: '已完成',
}

const STATUS_CLASS: Record<FollowUpQueue['status'], string> = {
  pending: 'bg-orange-50 text-orange-600',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-green-50 text-green-600',
}

interface FollowUpQueueProps {
  personId?: string
}

export default function FollowUpQueue({ personId }: FollowUpQueueProps) {
  const [filter, setFilter] = useState<FollowUpFilter>({
    status: personId ? undefined : 'pending',
    sort_by: 'next_follow_up_date',
    sort_order: 'asc',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<FollowUpQueue | null>(null)

  const [formData, setFormData] = useState<Omit<CreateFollowUpDto, 'person_id'> & { person_id?: string }>({
    follow_up_type: 'call',
    priority: 'medium',
    next_follow_up_date: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return format(d, 'yyyy-MM-dd') })(),
    note: '',
  })
  const [error, setError] = useState('')

  const { data: items = [], isLoading } = useFollowUpList(filter)
  const { data: persons = [] } = usePersonList()
  const createMutation = useCreateFollowUp()
  const updateMutation = useUpdateFollowUp()
  const deleteMutation = useDeleteFollowUp()

  useEffect(() => {
    if (personId) {
      setFilter((prev) => ({ ...prev, person_id: personId }))
    }
  }, [personId])

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.person_name?.toLowerCase().includes(query) ||
      item.note?.toLowerCase().includes(query)
    )
  })

  const resetForm = () => {
    setFormData({
      follow_up_type: 'call',
      priority: 'medium',
      next_follow_up_date: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return format(d, 'yyyy-MM-dd') })(),
      note: '',
    })
    setEditingItem(null)
    setError('')
  }

  const handleEdit = (item: FollowUpQueue) => {
    setEditingItem(item)
    setFormData({
      person_id: item.person_id,
      follow_up_type: item.follow_up_type,
      priority: item.priority,
      next_follow_up_date: item.next_follow_up_date,
      note: item.note || '',
    })
    setShowForm(true)
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.person_id) {
      setError('请选择联系人')
      return
    }
    if (!formData.next_follow_up_date) {
      setError('请选择跟进日期')
      return
    }

    setError('')
    try {
      if (editingItem) {
        const updateData: UpdateFollowUpDto = {
          follow_up_type: formData.follow_up_type,
          priority: formData.priority,
          next_follow_up_date: formData.next_follow_up_date,
          note: formData.note || undefined,
        }
        await updateMutation.mutateAsync({ id: editingItem.id, data: updateData })
      } else {
        const createData: CreateFollowUpDto = {
          person_id: formData.person_id,
          follow_up_type: formData.follow_up_type,
          priority: formData.priority,
          next_follow_up_date: formData.next_follow_up_date,
          note: formData.note || undefined,
        }
        await createMutation.mutateAsync(createData)
      }
      resetForm()
      setShowForm(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleStatusChange = async (id: string, status: FollowUpQueue['status']) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } })
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条跟进任务吗？')) return
    try {
      await deleteMutation.mutateAsync(id)
    } catch {
      // ignore
    }
  }

  const getDaysOverdue = (dateStr: string): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const followUpDate = new Date(dateStr + 'T00:00:00')
    return Math.floor((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDateLabel = (dateStr: string): string => {
    const daysOverdue = getDaysOverdue(dateStr)
    if (daysOverdue > 0) {
      return `逾期 ${daysOverdue} 天`
    }
    if (daysOverdue === 0) {
      return '今天'
    }
    if (daysOverdue === -1) {
      return '明天'
    }
    return format(new Date(dateStr + 'T00:00:00'), 'MM月dd日')
  }

  const getDateClass = (dateStr: string, status: FollowUpQueue['status']): string => {
    if (status === 'completed') return 'text-gray-400'
    const daysOverdue = getDaysOverdue(dateStr)
    if (daysOverdue > 7) return 'text-red-600 font-medium'
    if (daysOverdue > 0) return 'text-orange-600 font-medium'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">跟进队列</h3>
        <button
          type="button"
          onClick={() => {
            resetForm()
            if (personId) {
              setFormData((prev) => ({ ...prev, person_id: personId }))
            }
            setShowForm(true)
          }}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          添加跟进
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索联系人..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <select
          value={filter.status || ''}
          onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value as FollowUpFilter['status'] || undefined }))}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
        >
          <option value="">全部状态</option>
          <option value="pending">待跟进</option>
          <option value="in_progress">跟进中</option>
          <option value="completed">已完成</option>
        </select>

        <select
          value={filter.priority || ''}
          onChange={(e) => setFilter((prev) => ({ ...prev, priority: e.target.value as FollowUpFilter['priority'] || undefined }))}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
        >
          <option value="">全部优先级</option>
          <option value="high">高优先级</option>
          <option value="medium">中优先级</option>
          <option value="low">低优先级</option>
        </select>

        <select
          value={filter.sort_by}
          onChange={(e) => setFilter((prev) => ({ ...prev, sort_by: e.target.value as FollowUpFilter['sort_by'] }))}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
        >
          <option value="next_follow_up_date">按日期排序</option>
          <option value="priority">按优先级排序</option>
        </select>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">
              {editingItem ? '编辑跟进任务' : '添加跟进任务'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              联系人 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.person_id || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, person_id: e.target.value || undefined }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">请选择联系人</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname ? `${p.name} (${p.nickname})` : p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">跟进方式</label>
              <select
                value={formData.follow_up_type}
                onChange={(e) => setFormData((prev) => ({ ...prev, follow_up_type: e.target.value as FollowUpQueue['follow_up_type'] }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              >
                {Object.entries(FOLLOW_UP_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">优先级</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as FollowUpQueue['priority'] }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              >
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                下次跟进日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.next_follow_up_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, next_follow_up_date: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">备注</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="添加备注信息..."
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500 text-center py-8">加载中...</p>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">暂无跟进任务</p>
          <p className="text-sm text-gray-400 mt-1">点击上方按钮添加新的跟进任务</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border ${
                item.status === 'completed'
                  ? 'border-gray-100 dark:border-gray-700 opacity-60'
                  : 'border-gray-100 dark:border-gray-700 shadow-sm'
              } p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-full rounded-full flex-shrink-0 ${PRIORITY_DOT_CLASS[item.priority]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {item.person_name || '未知联系人'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${PRIORITY_CLASS[item.priority]}`}>
                        {PRIORITY_LABEL[item.priority]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${FOLLOW_UP_TYPE_CLASS[item.follow_up_type]}`}>
                        {FOLLOW_UP_TYPE_LABEL[item.follow_up_type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                    <span className={getDateClass(item.next_follow_up_date, item.status)}>
                      {getDateLabel(item.next_follow_up_date)}
                    </span>
                    <span className="text-gray-400">
                      ({format(new Date(item.next_follow_up_date + 'T00:00:00'), 'yyyy-MM-dd')})
                    </span>
                  </div>

                  {item.note && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{item.note}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {item.status !== 'completed' && (
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as FollowUpQueue['status'])}
                        className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                      >
                        <option value="pending">待跟进</option>
                        <option value="in_progress">跟进中</option>
                        <option value="completed">已完成</option>
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="text-xs px-2.5 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}