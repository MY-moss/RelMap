import { type FormEvent, useEffect, useState, useRef } from 'react'
import type { Person, Relationship } from '../../shared/types'
import IntimacySlider from './IntimacySlider'

interface RelationEditorProps {
  open: boolean
  personId: string // 当前联系人ID
  relation?: Relationship // 编辑模式
  onClose: () => void
  onSaved: () => void
}

export default function RelationEditor({
  open,
  personId,
  relation,
  onClose,
  onSaved,
}: RelationEditorProps) {
  const api = window.electronAPI
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)

  const [relatedPersonId, setRelatedPersonId] = useState('')
  const [intimacy, setIntimacy] = useState(50)
  const [relationLabel, setRelationLabel] = useState('')
  const [meetMethod, setMeetMethod] = useState('')
  const [meetDate, setMeetDate] = useState('')
  const [meetLocation, setMeetLocation] = useState('')
  const [notes, setNotes] = useState('')
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

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.person.list().then((res) => {
      if (!isMountedRef.current) return  // 组件已卸载，不更新 state
      if (res.success) {
        setPersons(res.data.filter((p) => p.id !== personId))
      }
      setLoading(false)
    })

    if (relation) {
      setRelatedPersonId(relation.related_person_id)
      setIntimacy(relation.intimacy)
      setRelationLabel(relation.relation_label ?? '')
      setMeetMethod(relation.meet_method ?? '')
      setMeetDate(relation.meet_date ?? '')
      setMeetLocation(relation.meet_location ?? '')
      setNotes(relation.notes ?? '')
    } else {
      setRelatedPersonId('')
      setIntimacy(50)
      setRelationLabel('')
      setMeetMethod('')
      setMeetDate('')
      setMeetLocation('')
      setNotes('')
    }
    setError('')
  }, [open, relation, personId, api])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!relatedPersonId) {
      setError('请选择关联联系人')
      return
    }
    setSubmitting(true)
    setError('')
    const payload = {
      person_id: personId,
      related_person_id: relatedPersonId,
      intimacy,
      relation_label: relationLabel || undefined,
      meet_method: meetMethod || undefined,
      meet_date: meetDate || undefined,
      meet_location: meetLocation || undefined,
      notes: notes || undefined,
    }
    try {
      const result = relation
        ? await api.relation.update(relation.id, payload)
        : await api.relation.create(payload)
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {relation ? '编辑关系' : '添加关系'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联联系人</label>
            <select
              value={relatedPersonId}
              onChange={(e) => setRelatedPersonId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              disabled={loading}
            >
              <option value="">{loading ? '加载中...' : '请选择联系人'}</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.nickname ? ` (${p.nickname})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">亲密度</label>
            <IntimacySlider value={intimacy} onChange={setIntimacy} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关系标签</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={relationLabel}
                onChange={(e) => setRelationLabel(e.target.value)}
                placeholder="如：同事、同学、朋友"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <select
                value=""
                onChange={(e) => { if (e.target.value) setRelationLabel(e.target.value) }}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-500 outline-none"
              >
                <option value="">常用</option>
                <optgroup label="家人">
                  <option value="配偶">配偶</option>
                  <option value="子女">子女</option>
                  <option value="父母">父母</option>
                  <option value="兄弟姐妹">兄弟姐妹</option>
                  <option value="亲戚">亲戚</option>
                </optgroup>
                <optgroup label="朋友">
                  <option value="好友">好友</option>
                  <option value="普通朋友">普通朋友</option>
                  <option value="同学">同学</option>
                  <option value="室友">室友</option>
                  <option value="邻居">邻居</option>
                </optgroup>
                <optgroup label="工作">
                  <option value="同事">同事</option>
                  <option value="上司">上司</option>
                  <option value="下属">下属</option>
                  <option value="合作伙伴">合作伙伴</option>
                  <option value="客户">客户</option>
                </optgroup>
                <optgroup label="其他">
                  <option value="网友">网友</option>
                  <option value="导师">导师</option>
                  <option value="其他">其他</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">认识方式</label>
            <input
              type="text"
              value={meetMethod}
              onChange={(e) => setMeetMethod(e.target.value)}
              placeholder="如：介绍、聚会、工作"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">认识日期</label>
            <input
              type="date"
              value={meetDate}
              onChange={(e) => setMeetDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">认识地点</label>
            <input
              type="text"
              value={meetLocation}
              onChange={(e) => setMeetLocation(e.target.value)}
              placeholder="如：北京、上海"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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
