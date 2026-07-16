import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import type { InteractionLog } from '../../shared/types'

interface InteractionLoggerProps {
  personId: string
  onLogged?: () => void
}

type InteractType = InteractionLog['interact_type']

const TYPE_META: Record<InteractType, { icon: string; label: string }> = {
  call: { icon: '📞', label: '电话' },
  meet: { icon: '🤝', label: '见面' },
  message: { icon: '💬', label: '消息' },
  social: { icon: '🌐', label: '社交' },
  other: { icon: '📝', label: '其他' },
}

const NOW_VALUE = () => format(new Date(), "yyyy-MM-dd'T'HH:mm")

export default function InteractionLogger({ personId, onLogged }: InteractionLoggerProps) {
  const api = window.electronAPI
  const [logs, setLogs] = useState<InteractionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [interactType, setInteractType] = useState<InteractType>('meet')
  const [interactAt, setInteractAt] = useState(NOW_VALUE)
  const [duration, setDuration] = useState('')
  const [summary, setSummary] = useState('')
  const [purpose, setPurpose] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.interaction.listByPerson(personId, 10)
      if (res.success) {
        setLogs(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId])

  const resetForm = () => {
    setInteractType('meet')
    setInteractAt(NOW_VALUE())
    setDuration('')
    setSummary('')
    setPurpose('')
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!interactAt) {
      setError('请选择时间')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.interaction.create({
        person_id: personId,
        interact_at: interactAt,
        interact_type: interactType,
        summary: summary.trim() || undefined,
        duration: duration ? Number(duration) : undefined,
        purpose: purpose || undefined,
      })
      if (res.success) {
        resetForm()
        setShowForm(false)
        await load()
        onLogged?.()
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
    if (!window.confirm('确定要删除这条交互记录吗？')) return
    try {
      const res = await api.interaction.delete(id)
      if (res.success) {
        await load()
      } else {
        console.error('[InteractionLogger] 删除交互记录失败:', res.error)
        setError(res.error || '删除失败，请重试')
      }
    } catch (err) {
      console.error('[InteractionLogger] 删除交互记录异常:', err instanceof Error ? err.stack : err)
      setError(err instanceof Error ? err.message : '删除失败，请重试')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">交互记录</h3>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm((v) => !v)
          }}
          className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition-colors"
        >
          {showForm ? '收起' : '+ 记录交互'}
        </button>
      </div>

      {/* 错误提示（表单外的全局错误显示，便于删除等操作失败时可见） */}
      {error && !showForm && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-100 p-4 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">交互类型</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(TYPE_META) as InteractType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInteractType(t)}
                  className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${
                    interactType === t
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{TYPE_META[t].icon}</span>
                  <span className="text-xs mt-0.5">{TYPE_META[t].label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期时间</label>
              <input
                type="datetime-local"
                value={interactAt}
                onChange={(e) => setInteractAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                时长（分钟）
              </label>
              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="选填"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">互动目的</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="">请选择</option>
              <option value="问候">问候</option>
              <option value="聚会">聚会</option>
              <option value="工作">工作</option>
              <option value="帮助">帮助</option>
              <option value="学习">学习</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="选填，记录交互内容"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
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
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">暂无交互记录</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-3"
            >
              <span className="text-xl flex-shrink-0 mt-0.5">
                {TYPE_META[log.interact_type].icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {TYPE_META[log.interact_type].label}
                  </span>
                  <div className="flex items-center gap-2">
                    {log.duration != null && (
                      <span className="text-xs text-gray-400">{log.duration} 分钟</span>
                    )}
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
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
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {format(new Date(log.interact_at), 'yyyy-MM-dd HH:mm')}
                </p>
                {log.purpose && (
                  <span className="inline-block text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded mt-1">
                    {log.purpose}
                  </span>
                )}
                {log.summary && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{log.summary}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
