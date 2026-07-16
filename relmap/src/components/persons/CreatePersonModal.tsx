import { useState, useEffect } from 'react'
import type { Person } from '../../shared/types'
import DuplicateDetector from '../ai/DuplicateDetector'

interface CreatePersonModalProps {
  open: boolean
  person?: Person
  onClose: () => void
  onSaved: () => void
}

interface FormState {
  name: string
  nickname: string
  birthday: string
  gender: 0 | 1 | 2
  company: string
  title: string
  department: string
  home_address: string
  notes: string
}

const emptyForm: FormState = {
  name: '',
  nickname: '',
  birthday: '',
  gender: 0,
  company: '',
  title: '',
  department: '',
  home_address: '',
  notes: '',
}

export default function CreatePersonModal({ open, person, onClose, onSaved }: CreatePersonModalProps) {
  const isEdit = !!person
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (open) {
      if (person) {
        setForm({
          name: person.name || '',
          nickname: person.nickname || '',
          birthday: person.birthday || '',
          gender: person.gender ?? 0,
          company: person.company || '',
          title: person.title || '',
          department: person.department || '',
          home_address: person.home_address || '',
          notes: person.notes || '',
        })
      } else {
        setForm(emptyForm)
      }
      setError('')
    }
  }, [open, person])

  if (!open) return null

  const handleChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('请输入姓名')
      return
    }

    setSubmitting(true)
    setError('')

    const api = window.electronAPI
    const payload = {
      name: form.name.trim(),
      nickname: form.nickname.trim() || undefined,
      birthday: form.birthday || undefined,
      gender: form.gender,
      company: form.company.trim() || undefined,
      title: form.title.trim() || undefined,
      department: form.department.trim() || undefined,
      home_address: form.home_address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    try {
      const result = isEdit
        ? await api.person.update(person!.id, payload)
        : await api.person.create(payload)

      if (result.success) {
        onSaved()
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
        className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">
              {isEdit ? '编辑联系人' : '新建联系人'}
            </h2>
            {isEdit && person?.lifecycle_stage && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                person.lifecycle_stage === 'new' ? 'bg-blue-50 text-blue-600' :
                person.lifecycle_stage === 'active' ? 'bg-green-50 text-green-600' :
                person.lifecycle_stage === 'maintain' ? 'bg-yellow-50 text-yellow-600' :
                person.lifecycle_stage === 'dormant' ? 'bg-orange-50 text-orange-600' :
                person.lifecycle_stage === 'lost' ? 'bg-red-50 text-red-600' :
                person.lifecycle_stage === 'archived' ? 'bg-gray-100 text-gray-600' :
                'bg-gray-50 text-gray-500'
              }`}>
                {person.lifecycle_stage === 'new' ? '新人' :
                 person.lifecycle_stage === 'active' ? '活跃' :
                 person.lifecycle_stage === 'maintain' ? '维系' :
                 person.lifecycle_stage === 'dormant' ? '休眠' :
                 person.lifecycle_stage === 'lost' ? '失联' :
                 person.lifecycle_stage === 'archived' ? '已归档' :
                 person.lifecycle_stage}
              </span>
            )}
          </div>
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
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass}
              placeholder="请输入姓名"
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>昵称</label>
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => handleChange('nickname', e.target.value)}
              className={inputClass}
              placeholder="请输入昵称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>生日</label>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => handleChange('birthday', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>性别</label>
              <select
                value={form.gender}
                onChange={(e) => handleChange('gender', Number(e.target.value))}
                className={inputClass}
              >
                <option value={0}>未知</option>
                <option value={1}>男</option>
                <option value={2}>女</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>公司</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className={inputClass}
                placeholder="请输入公司名称"
              />
            </div>
            <div>
              <label className={labelClass}>职位</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={inputClass}
                placeholder="请输入职位"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>部门</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className={inputClass}
              placeholder="请输入部门"
            />
          </div>

          <div>
            <label className={labelClass}>家庭住址</label>
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <input
                type="text"
                value={form.home_address}
                onChange={(e) => handleChange('home_address', e.target.value)}
                className={inputClass + ' pl-10'}
                placeholder="请输入家庭住址"
              />
            </div>
          </div>

          {/* AI重复联系人检测（仅新建模式） */}
          {!isEdit && form.name.length >= 2 && (
            <DuplicateDetector
              name={form.name}
              company={form.company || undefined}
              onDuplicateFound={() => {}}
            />
          )}

          <div>
            <label className={labelClass}>备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="请输入备注信息"
            />
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
