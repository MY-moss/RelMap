import { type FormEvent, useEffect, useState, useMemo, useRef, useCallback } from 'react'
import type { EventItem, Person } from '../../shared/types'
import RichTextEditor from '../common/RichTextEditor'

interface EventEditorProps {
  open: boolean
  event?: EventItem // 编辑模式
  personId?: string // 可选：从联系人详情页打开时预设关联联系人
  onClose: () => void
  onSaved: () => void
}

export default function EventEditor({
  open,
  event,
  personId,
  onClose,
  onSaved,
}: EventEditorProps) {
  const api = window.electronAPI
  const [persons, setPersons] = useState<Person[]>([])
  // 已选联系人信息，独立于搜索结果维护，确保搜索时已选项仍可见
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [personSearch, setPersonSearch] = useState('')

  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [mood, setMood] = useState(5)
  const [description, setDescription] = useState('')
  const [personIds, setPersonIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 组件卸载标记：防止卸载后异步操作更新 state
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 异步搜索联系人（带 requestId 取消标记，防止快速输入时旧请求覆盖新结果）
  const requestIdRef = useRef(0)
  const searchPersons = useCallback(async (keyword: string) => {
    const currentId = ++requestIdRef.current
    setLoading(true)
    try {
      const result = await api.person.list({ keyword: keyword || undefined, limit: 20 })
      if (!isMountedRef.current || currentId !== requestIdRef.current) return  // 组件卸载或丢弃过期响应
      if (result.success) {
        setPersons(result.data)
      }
    } catch {
      // 忽略搜索错误
    } finally {
      if (isMountedRef.current && currentId === requestIdRef.current) setLoading(false)
    }
  }, [api])

  // 搜索防抖 300ms
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => searchPersons(personSearch), 300)
    return () => clearTimeout(timer)
  }, [personSearch, open, searchPersons])

  useEffect(() => {
    if (!open) return
    // 打开时加载初始联系人列表（限制20条，避免全量加载）
    searchPersons('')

    if (event) {
      setTitle(event.title)
      setEventDate(event.event_date)
      setEventTime(event.event_time ?? '')
      setLocation(event.location ?? '')
      setMood(event.mood ?? 5)
      setDescription(event.description ?? '')
      // 当前 API 未提供按事件反查关联联系人的接口，编辑模式下默认不勾选
      setPersonIds([])
      setSelectedPersons([])
    } else {
      setTitle('')
      setEventDate('')
      setEventTime('')
      setLocation('')
      setMood(5)
      setDescription('')
      // 预选从详情页传入的personId，并获取其信息用于展示
      if (personId) {
        setPersonIds([personId])
        api.person.getById(personId).then((res) => {
          if (!isMountedRef.current) return  // 组件已卸载，不更新 state
          if (res.success) setSelectedPersons([res.data])
        })
      } else {
        setPersonIds([])
        setSelectedPersons([])
      }
    }
    setError('')
    setPersonSearch('')
  }, [open, event, personId, api, searchPersons])

  // 合并已选联系人和搜索结果：已选项始终置顶
  const displayPersons = useMemo(() => {
    const seen = new Set<string>()
    const selected = selectedPersons.filter(p => personIds.includes(p.id))
    selected.forEach(p => seen.add(p.id))
    const unselected = persons.filter(p => !seen.has(p.id))
    return [...selected, ...unselected]
  }, [persons, personIds, selectedPersons])

  if (!open) return null

  // 检查表单是否有未保存的更改
  const hasChanges = event
    ? title !== (event.title ?? '') ||
      eventDate !== (event.event_date ?? '') ||
      eventTime !== (event.event_time ?? '') ||
      location !== (event.location ?? '') ||
      mood !== (event.mood ?? 5) ||
      description !== (event.description ?? '')
    : title.trim() !== '' ||
      eventDate !== '' ||
      eventTime !== '' ||
      location.trim() !== '' ||
      mood !== 5 ||
      description.trim() !== ''

  // 关闭前检查未保存的更改
  const handleClose = () => {
    if (hasChanges && !window.confirm('有未保存的更改，确定关闭吗？')) return
    onClose()
  }

  const togglePerson = (id: string) => {
    setPersonIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id)
      } else {
        // 记录已选联系人信息，搜索时仍可展示
        const person = persons.find(p => p.id === id)
        if (person) {
          setSelectedPersons(prev => {
            if (prev.find(p => p.id === id)) return prev
            return [...prev, person]
          })
        }
        return [...prev, id]
      }
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('请输入标题')
      return
    }
    if (!eventDate) {
      setError('请选择日期')
      return
    }
    setSubmitting(true)
    setError('')
    const payload = {
      title: title.trim(),
      event_date: eventDate,
      event_time: eventTime || undefined,
      location: location || undefined,
      mood,
      description: description || undefined,
      person_ids: personIds.length > 0 ? personIds : undefined,
    }
    try {
      const result = event
        ? await api.event.update(event.id, payload)
        : await api.event.create(payload)
      if (!isMountedRef.current) return  // 组件已卸载，不更新 state
      if (result.success) {
        onSaved()
        onClose()
      } else {
        setError(result.error)
      }
    } catch (err) {
      if (!isMountedRef.current) return  // 组件已卸载，不更新 state
      setError((err as Error).message)
    } finally {
      if (isMountedRef.current) setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {event ? '编辑事件' : '添加事件'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入事件标题"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="请输入地点"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              心情 <span className="text-gray-400 text-xs">({mood}/10)</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="w-full h-2 cursor-pointer"
              style={{ accentColor: '#FF9F43' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <RichTextEditor
              modelValue={description}
              onChange={setDescription}
              placeholder="请输入事件描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              关联联系人
            </label>
            <input
              type="text"
              value={personSearch}
              onChange={(e) => setPersonSearch(e.target.value)}
              placeholder="搜索联系人..."
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 mb-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-2">加载中...</p>
              ) : displayPersons.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">暂无联系人</p>
              ) : (
                <div className="space-y-1">
                  {displayPersons.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={personIds.includes(p.id)}
                        onChange={() => togglePerson(p.id)}
                        className="rounded text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">
                        {p.name}
                        {p.nickname ? ` (${p.nickname})` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
