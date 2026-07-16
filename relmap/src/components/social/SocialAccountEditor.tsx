import { useState, useEffect, useRef } from 'react'
import type { SocialAccount } from '../../shared/types'

interface SocialAccountEditorProps {
  open: boolean
  personId: string
  social?: SocialAccount // 编辑时传入，新建时不传
  onClose: () => void
  onSaved: () => void
}

interface FormState {
  platform: string
  account_id: string
  account_name: string
  is_primary: boolean
}

// 平台选项（按类别分组）
const PLATFORM_OPTIONS = [
  // 即时通讯
  { category: '即时通讯', items: ['微信', 'QQ', 'Telegram', 'Discord', 'WhatsApp', 'LINE', 'Signal'] },
  // 短视频/直播
  { category: '短视频/直播', items: ['抖音', '快手', '哔哩哔哩', 'YouTube', 'TikTok'] },
  // 社交媒体
  { category: '社交媒体', items: ['微博', '小红书', 'Instagram', 'Twitter/X', '知乎', '豆瓣', 'Facebook'] },
  // 工作/专业
  { category: '工作/专业', items: ['企业微信', '钉钉', '飞书', 'LinkedIn', 'Slack'] },
  // 游戏
  { category: '游戏', items: ['Steam', 'PlayStation', 'Xbox', 'Nintendo'] },
  // 联系方式
  { category: '联系方式', items: ['手机', '邮箱', '电话'] },
  // 其他
  { category: '其他', items: ['其他'] },
]

const emptyForm: FormState = {
  platform: '微信',
  account_id: '',
  account_name: '',
  is_primary: false,
}

export default function SocialAccountEditor({
  open,
  personId,
  social,
  onClose,
  onSaved,
}: SocialAccountEditorProps) {
  const isEdit = !!social
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  // 组件卸载标记：防止卸载后异步操作更新 state
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (open) {
      if (social) {
        setForm({
          platform: social.platform || '微信',
          account_id: social.account_id || '',
          account_name: social.account_name || '',
          is_primary: social.is_primary === 1,
        })
      } else {
        setForm(emptyForm)
      }
      setError('')
    }
  }, [open, social])

  if (!open) return null

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.platform.trim()) {
      setError('请选择平台')
      return
    }
    if (!form.account_id.trim()) {
      setError('请输入账号/ID')
      return
    }

    setSubmitting(true)
    setError('')

    const api = window.electronAPI
    const payload = {
      platform: form.platform.trim(),
      account_id: form.account_id.trim(),
      account_name: form.account_name.trim() || undefined,
      is_primary: (form.is_primary ? 1 : 0) as 0 | 1,
    }

    try {
      const result = isEdit
        ? await api.social.update(social!.id, payload)
        : await api.social.create({ person_id: personId, ...payload })

      if (!isMountedRef.current) return  // 组件已卸载，不更新 state
      if (result.success) {
        onSaved()
        onClose()
      } else {
        setError(result.error || '保存失败')
      }
    } catch (err) {
      if (!isMountedRef.current) return  // 组件已卸载，不更新 state
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      if (isMountedRef.current) setSubmitting(false)
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
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? '编辑社交账号' : '添加社交账号'}
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
              平台 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.platform}
              onChange={(e) => handleChange('platform', e.target.value)}
              className={inputClass}
            >
              {PLATFORM_OPTIONS.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.items.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              账号/ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.account_id}
              onChange={(e) => handleChange('account_id', e.target.value)}
              className={inputClass}
              placeholder="请输入账号/ID"
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>显示名称</label>
            <input
              type="text"
              value={form.account_name}
              onChange={(e) => handleChange('account_name', e.target.value)}
              className={inputClass}
              placeholder="请输入显示名称（可选）"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={form.is_primary}
              onChange={(e) => handleChange('is_primary', e.target.checked)}
              className="w-4 h-4 accent-primary-500 cursor-pointer"
            />
            <label htmlFor="is_primary" className="text-sm text-gray-700 cursor-pointer">
              设为主账号
            </label>
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
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
