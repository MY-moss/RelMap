import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import type { Reminder, FollowUpItem } from '../../shared/types'

interface ReminderListProps {
  personId?: string
  showUpcoming?: boolean
  showFollowUp?: boolean
}

const REPEAT_LABEL: Record<Reminder['repeat_type'], string> = {
  once: '一次性',
  yearly: '每年',
  monthly: '每月',
}

const REPEAT_TAG_CLASS: Record<Reminder['repeat_type'], string> = {
  once: 'bg-gray-100 text-gray-600',
  yearly: 'bg-primary-50 text-primary-600',
  monthly: 'bg-blue-50 text-blue-600',
}

export default function ReminderList({ personId, showUpcoming, showFollowUp }: ReminderListProps) {
  const api = window.electronAPI
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [followUpItems, setFollowUpItems] = useState<FollowUpItem[]>([])
  const [followUpLoading, setFollowUpLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [remindDate, setRemindDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [repeatType, setRepeatType] = useState<Reminder['repeat_type']>('once')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = showUpcoming
        ? await api.reminder.upcoming(7)
        : await api.reminder.list({ person_id: personId, is_active: true })
      if (res.success) {
        setReminders(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadFollowUp = async () => {
    setFollowUpLoading(true)
    try {
      const res = await api.reminder.listFollowUp()
      if (res.success) {
        setFollowUpItems(res.data)
      }
    } finally {
      setFollowUpLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, showUpcoming])

  useEffect(() => {
    if (showFollowUp) {
      loadFollowUp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFollowUp])

  const resetForm = () => {
    setTitle('')
    setRemindDate(format(new Date(), 'yyyy-MM-dd'))
    setRepeatType('once')
    setNote('')
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('请输入标题')
      return
    }
    if (!remindDate) {
      setError('请选择日期')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.reminder.create({
        person_id: personId,
        title: title.trim(),
        remind_date: remindDate,
        repeat_type: repeatType,
        note: note.trim() || undefined,
      })
      if (res.success) {
        resetForm()
        setShowForm(false)
        await load()
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条提醒吗？')) return
    const res = await api.reminder.delete(id)
    if (res.success) {
      await load()
    }
  }

  const handleFollowUpComplete = async (id: string) => {
    const res = await api.reminder.update(id, { is_active: 0 })
    if (res.success) {
      await loadFollowUp()
    }
  }

  const handleFollowUpDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条跟进提醒吗？')) return
    const res = await api.reminder.delete(id)
    if (res.success) {
      await loadFollowUp()
    }
  }

  return (
    <div className="space-y-3">
      {showFollowUp && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800">跟进队列</h3>
            <button
              type="button"
              onClick={loadFollowUp}
              className="text-xs text-primary-500 hover:text-primary-600 transition-colors"
              disabled={followUpLoading}
            >
              {followUpLoading ? '刷新中...' : '刷新'}
            </button>
          </div>
          {followUpLoading ? (
            <p className="text-sm text-gray-400 text-center py-4">加载中...</p>
          ) : followUpItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4 bg-white rounded-xl border border-gray-100">暂无待跟进事项</p>
          ) : (
            <ul className="space-y-2">
              {followUpItems.map((item) => (
                <li
                  key={item.reminder.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-3"
                >
                  <div className={`w-1 rounded-full flex-shrink-0 ${
                    item.days_overdue <= 7 ? 'bg-red-500' :
                    item.days_overdue <= 30 ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-primary-500 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      <span className="truncate">{item.reminder.title}</span>
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                      {item.person_name && <span className="text-primary-600 font-medium">{item.person_name}</span>}
                      <span>{format(new Date(item.reminder.remind_date + 'T00:00:00'), 'yyyy-MM-dd')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.days_overdue <= 7 ? 'bg-red-50 text-red-600' :
                        item.days_overdue <= 30 ? 'bg-yellow-50 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        逾期 {item.days_overdue} 天
                      </span>
                    </div>
                    {item.reminder.note && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.reminder.note}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleFollowUpComplete(item.reminder.id)}
                        className="text-xs px-2.5 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        完成
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFollowUpDelete(item.reminder.id)}
                        className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">提醒</h3>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm((v) => !v)
          }}
          className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition-colors"
        >
          {showForm ? '收起' : '+ 添加提醒'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-100 p-4 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入提醒标题"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={remindDate}
                onChange={(e) => setRemindDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">重复类型</label>
              <select
                value={repeatType}
                onChange={(e) => setRepeatType(e.target.value as Reminder['repeat_type'])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="once">一次性</option>
                <option value="yearly">每年</option>
                <option value="monthly">每月</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="选填"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-6">加载中...</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">暂无提醒</p>
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-3"
            >
              <div className="w-1 bg-primary-500 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-gray-800 truncate flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="w-4 h-4 text-primary-500 flex-shrink-0"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                    <span className="truncate">{r.title}</span>
                  </h4>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="删除"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>
                    {format(new Date(r.remind_date + 'T00:00:00'), 'yyyy-MM-dd')}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${REPEAT_TAG_CLASS[r.repeat_type]}`}
                  >
                    {REPEAT_LABEL[r.repeat_type]}
                  </span>
                </div>
                {r.note && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.note}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
