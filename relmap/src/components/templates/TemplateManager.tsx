import { useState, useEffect, useCallback } from 'react'
import type { MessageTemplate } from '../../shared/types'
import { useToastContext } from '../common/ToastContext'

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'general', label: '通用' },
  { key: 'birthday', label: '生日' },
  { key: 'holiday', label: '节日' },
  { key: 'greeting', label: '问候' },
  { key: 'follow_up', label: '跟进' },
  { key: 'other', label: '其他' },
]

const CATEGORY_BADGE: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  birthday: 'bg-pink-100 text-pink-700',
  holiday: 'bg-red-100 text-red-700',
  greeting: 'bg-blue-100 text-blue-700',
  follow_up: 'bg-green-100 text-green-700',
  other: 'bg-purple-100 text-purple-700',
}

const CATEGORY_LABEL: Record<string, string> = {
  general: '通用',
  birthday: '生日',
  holiday: '节日',
  greeting: '问候',
  follow_up: '跟进',
  other: '其他',
}

export default function TemplateManager() {
  const api = window.electronAPI
  const toast = useToastContext()

  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [formName, setFormName] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const result = await api.template.list(categoryFilter === 'all' ? undefined : categoryFilter)
    if (result.success) {
      setTemplates(result.data)
    } else {
      console.error(result.error)
    }
    setLoading(false)
  }, [api, categoryFilter])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const openCreateModal = () => {
    setEditingTemplate(null)
    setFormName('')
    setFormContent('')
    setFormCategory('general')
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template)
    setFormName(template.name)
    setFormContent(template.content)
    setFormCategory(template.category)
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
    const trimmedContent = formContent.trim()
    if (!trimmedName) {
      setFormError('请输入模板名称')
      return
    }
    if (!trimmedContent) {
      setFormError('请输入模板内容')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const result = editingTemplate
        ? await api.template.update(editingTemplate.id, {
            name: trimmedName,
            content: trimmedContent,
            category: formCategory,
          })
        : await api.template.create({ name: trimmedName, content: trimmedContent, category: formCategory })

      if (result.success) {
        setModalOpen(false)
        await loadTemplates()
      } else {
        setFormError(result.error || '保存失败')
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (template: MessageTemplate) => {
    if (!window.confirm(`确定要删除模板"${template.name}"吗？`)) {
      return
    }
    const result = await api.template.delete(template.id)
    if (result.success) {
      await loadTemplates()
    } else {
      toast.showError(result.error || '删除失败')
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">消息模板</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>创建模板</span>
        </button>
      </div>

      {/* 分类过滤器 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(cat.key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              categoryFilter === cat.key
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <p className="text-gray-500">还没有消息模板，创建第一个吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-800 truncate flex-1">{template.name}</h3>
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${CATEGORY_BADGE[template.category] || 'bg-gray-100 text-gray-700'}`}>
                  {CATEGORY_LABEL[template.category] || template.category}
                </span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-3 mb-3 whitespace-pre-wrap">
                {template.content}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {template.updated_at !== template.created_at ? `更新于 ${template.updated_at}` : `创建于 ${template.created_at}`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(template)}
                    className="text-gray-400 hover:text-primary-500 transition-colors p-1"
                    title="编辑"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="删除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
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
            className="bg-white rounded-xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingTemplate ? '编辑模板' : '创建模板'}
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
                  placeholder="请输入模板名称"
                  autoFocus
                />
              </div>

              <div>
                <label className={labelClass}>分类</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className={`${inputClass} min-h-[120px] resize-y`}
                  placeholder="请输入模板内容"
                  rows={5}
                />
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
                  {submitting ? '保存中...' : editingTemplate ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
