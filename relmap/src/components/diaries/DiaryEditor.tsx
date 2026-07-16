import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import type { Diary, Person } from '../../shared/types'
import AutoSuggestTags from '../ai/AutoSuggestTags'
import EmotionIndicator from '../ai/EmotionIndicator'
import RichTextEditor from '../common/RichTextEditor'

interface DiaryEditorProps {
  open: boolean
  diary?: Diary
  personId?: string
  onClose: () => void
  onSaved: () => void
}

const WEATHER_OPTIONS = ['晴', '阴', '雨', '雪', '雾']

export default function DiaryEditor({ open, diary, personId, onClose, onSaved }: DiaryEditorProps) {
  const [title, setTitle] = useState('')
  const [diaryDate, setDiaryDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [weather, setWeather] = useState('')
  const [mood, setMood] = useState(5)
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [personIds, setPersonIds] = useState<string[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  // 已选联系人信息，独立于搜索结果维护，确保搜索时已选项仍可见
  const [selectedPersons, setSelectedPersons] = useState<Person[]>([])
  const [personSearch, setPersonSearch] = useState('')
  const [saving, setSaving] = useState(false)
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
    try {
      const result = await window.electronAPI.person.list({ keyword: keyword || undefined, limit: 20 })
      if (!isMountedRef.current || currentId !== requestIdRef.current) return  // 组件卸载或丢弃过期响应
      if (result.success) setPersons(result.data)
    } catch {
      // 忽略搜索错误
    }
  }, [])

  // 搜索防抖 300ms
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => searchPersons(personSearch), 300)
    return () => clearTimeout(timer)
  }, [personSearch, open, searchPersons])

  // 打开或日记变化时重置表单
  useEffect(() => {
    if (!open) return
    // 打开时加载初始联系人列表（限制20条，避免全量加载）
    searchPersons('')

    if (diary) {
      setTitle(diary.title ?? '')
      setDiaryDate(diary.diary_date)
      setWeather(diary.weather ?? '')
      setMood(diary.mood ?? 5)
      setContent(diary.content)
      // 注意：编辑模式下无法回填日记原有的关联联系人（当前API未提供反查接口）
      // 仅预选从详情页传入的personId
      if (personId) {
        setPersonIds([personId])
        window.electronAPI.person.getById(personId).then((res) => {
          if (!isMountedRef.current) return  // 组件已卸载，不更新 state
          if (res.success) setSelectedPersons([res.data])
        })
      } else {
        setPersonIds([])
        setSelectedPersons([])
      }
    } else {
      setTitle('')
      setDiaryDate(format(new Date(), 'yyyy-MM-dd'))
      setWeather('')
      setMood(5)
      setContent('')
      if (personId) {
        setPersonIds([personId])
        window.electronAPI.person.getById(personId).then((res) => {
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
  }, [open, diary, personId, searchPersons])

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
  const hasChanges = diary
    ? title !== (diary.title ?? '') ||
      diaryDate !== diary.diary_date ||
      weather !== (diary.weather ?? '') ||
      mood !== (diary.mood ?? 5) ||
      content !== diary.content
    : title.trim() !== '' ||
      weather !== '' ||
      mood !== 5 ||
      content.trim() !== ''

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

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('请输入日记内容')
      return
    }
    if (!diaryDate) {
      setError('请选择日期')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: title.trim() || undefined,
        content,
        mood,
        weather: weather || undefined,
        diary_date: diaryDate,
        person_ids: personIds,
      }
      const api = window.electronAPI
      const result = diary
        ? await api.diary.update(diary.id, payload)
        : await api.diary.create(payload)
      if (!isMountedRef.current) return  // 组件已卸载，不更新 state
      if (result.success) {
        onSaved()
        onClose()
      } else {
        setError(result.error)
      }
    } catch (e) {
      if (!isMountedRef.current) return  // 组件已卸载，不更新 state
      setError(String(e))
    } finally {
      if (isMountedRef.current) setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {diary ? '编辑日记' : '写日记'}
        </h2>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="可选"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={diaryDate}
                onChange={(e) => setDiaryDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                天气
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">无</option>
                {WEATHER_OPTIONS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              心情：<span className="text-primary-600 font-bold">{mood}</span> / 10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="w-full accent-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              modelValue={content}
              onChange={setContent}
              placeholder="今天发生了什么？"
            />
            {/* AI情感分析指示器 */}
            {content.length > 0 && (
              <div className="mt-2">
                <EmotionIndicator text={content} />
              </div>
            )}
            {/* AI标签建议 */}
            <div className="mt-2">
              <AutoSuggestTags
                text={content}
                selectedTags={tags}
                onTagAdd={(tag) => setTags((prev) => [...prev, tag])}
              />
            </div>
            {/* 已选标签展示 */}
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
              {displayPersons.length === 0 ? (
                <p className="text-gray-400 text-sm">暂无联系人</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {displayPersons.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={personIds.includes(p.id)}
                        onChange={() => togglePerson(p.id)}
                        className="accent-primary-500"
                      />
                      <span className="truncate">{p.name}</span>
                      {p.nickname && (
                        <span className="text-gray-400 truncate">({p.nickname})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
