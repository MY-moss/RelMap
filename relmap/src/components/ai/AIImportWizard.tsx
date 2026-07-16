import { useState, useEffect } from 'react'
import type { OcrResult } from '../../shared/types'

interface AIImportWizardProps {
  open: boolean
  onClose: () => void
  onImported?: () => void
}

interface FormState {
  name: string
  phone: string
  email: string
  company: string
  title: string
  address: string
}

const emptyForm: FormState = {
  name: '',
  phone: '',
  email: '',
  company: '',
  title: '',
  address: '',
}

const STEPS = ['选择图片', 'OCR识别', '保存确认'] as const

export default function AIImportWizard({
  open,
  onClose,
  onImported,
}: AIImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState('')
  const [showRawText, setShowRawText] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // 打开时重置全部状态
  useEffect(() => {
    if (open) {
      setStep(1)
      setFile(null)
      setPreviewUrl('')
      setOcrLoading(false)
      setOcrError('')
      setOcrResult(null)
      setForm(emptyForm)
      setFormError('')
      setShowRawText(false)
      setSaving(false)
      setSaveError('')
      setSaved(false)
    }
  }, [open])

  // 预览 URL 释放：当 previewUrl 变化或组件卸载时回收上一个 URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // ESC 键关闭（识别/保存过程中禁用）
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving && !ocrLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, saving, ocrLoading, onClose])

  if (!open) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    // 选择新文件时清空之前的 OCR 结果
    setOcrResult(null)
    setOcrError('')
  }

  const handleClearFile = () => {
    setFile(null)
    setPreviewUrl('')
    setOcrResult(null)
    setOcrError('')
  }

  const startOcr = async () => {
    if (!file) return
    const filePath = (file as File & { path: string }).path
    setStep(2)
    setOcrLoading(true)
    setOcrError('')
    setOcrResult(null)
    try {
      const result = await window.electronAPI.ai.ocrScan(filePath)
      if (result.success) {
        setOcrResult(result.data)
        setForm({
          name: result.data.name || '',
          phone: result.data.phone || '',
          email: result.data.email || '',
          company: result.data.company || '',
          title: result.data.title || '',
          address: result.data.address || '',
        })
      } else {
        setOcrError(result.error || '识别失败')
      }
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : '识别失败')
    } finally {
      setOcrLoading(false)
    }
  }

  const performSave = async () => {
    setStep(3)
    setSaving(true)
    setSaveError('')

    // 电话、邮箱、地址合并到 notes（格式：电话: xxx\n邮箱: xxx\n地址: xxx）
    const notesParts: string[] = []
    if (form.phone.trim()) notesParts.push(`电话: ${form.phone.trim()}`)
    if (form.email.trim()) notesParts.push(`邮箱: ${form.email.trim()}`)
    if (form.address.trim()) notesParts.push(`地址: ${form.address.trim()}`)
    const notes = notesParts.join('\n') || undefined

    try {
      const result = await window.electronAPI.person.create({
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        title: form.title.trim() || undefined,
        notes,
      })
      if (result.success) {
        setSaved(true)
        setTimeout(() => {
          onImported?.()
          onClose()
        }, 1000)
      } else {
        setSaveError(result.error || '保存失败')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('请输入姓名')
      return
    }
    setFormError('')
    await performSave()
  }

  const backToStep1 = () => {
    if (ocrLoading || saving) return
    setStep(1)
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const primaryBtn =
    'px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const secondaryBtn =
    'px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  const canClose = !saving && !ocrLoading

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => {
        if (canClose) onClose()
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-xl font-bold text-gray-800">AI 名片导入</h2>
          <button
            onClick={() => {
              if (canClose) onClose()
            }}
            disabled={!canClose}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="关闭"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="px-6 pb-4">
          <div className="flex items-center">
            {STEPS.map((label, idx) => {
              const stepNum = idx + 1
              const isCurrent = step === stepNum
              const isCompleted = step > stepNum
              const isLast = idx === STEPS.length - 1
              return (
                <div
                  key={label}
                  className={`flex items-center ${isLast ? '' : 'flex-1'}`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isCurrent || isCompleted
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className={`ml-2 text-sm whitespace-nowrap ${
                        isCurrent || isCompleted
                          ? 'text-primary-600 font-medium'
                          : 'text-gray-500'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`flex-1 h-0.5 mx-3 ${
                        step > stepNum ? 'bg-primary-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 内容区 */}
        <div className="px-6 pb-6">
          {/* Step 1: 选择图片 */}
          {step === 1 && (
            <div>
              {!previewUrl ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-16 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="w-12 h-12 text-gray-400 mb-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-gray-600">点击选择名片图片</span>
                  <span className="text-xs text-gray-400 mt-1">
                    支持 JPG、PNG 等图片格式
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              ) : (
                <div>
                  <div
                    className="relative rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center"
                    style={{ maxHeight: '400px' }}
                  >
                    <img
                      src={previewUrl}
                      alt="名片预览"
                      className="max-w-full max-h-[400px] object-contain"
                    />
                    <button
                      onClick={handleClearFile}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg px-2 py-1 text-xs transition-colors"
                    >
                      重新选择
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 truncate">
                    {file?.name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: OCR 识别与预览 */}
          {step === 2 && (
            <div>
              {ocrLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <svg
                    className="animate-spin w-12 h-12 text-primary-500 mb-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-gray-600">正在识别名片...</p>
                </div>
              ) : ocrError ? (
                <div className="text-center py-12">
                  <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block mb-4">
                    {ocrError}
                  </div>
                  <div>
                    <button onClick={backToStep1} className={secondaryBtn}>
                      重新选择
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {previewUrl && (
                    <div className="flex justify-center">
                      <img
                        src={previewUrl}
                        alt="名片"
                        className="max-h-32 rounded-lg object-contain"
                      />
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value })
                        setFormError('')
                      }}
                      className={inputClass}
                      placeholder="请输入姓名"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>电话</label>
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        className={inputClass}
                        placeholder="请输入电话"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>邮箱</label>
                      <input
                        type="text"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        className={inputClass}
                        placeholder="请输入邮箱"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>公司</label>
                      <input
                        type="text"
                        value={form.company}
                        onChange={(e) =>
                          setForm({ ...form, company: e.target.value })
                        }
                        className={inputClass}
                        placeholder="请输入公司"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>职位</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        className={inputClass}
                        placeholder="请输入职位"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>地址</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      className={inputClass}
                      placeholder="请输入地址"
                    />
                  </div>

                  {formError && (
                    <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {formError}
                    </div>
                  )}

                  {/* 原始 OCR 文本（可折叠） */}
                  {ocrResult && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowRawText(!showRawText)}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`w-4 h-4 mr-1 transition-transform ${
                            showRawText ? 'rotate-90' : ''
                          }`}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        原始 OCR 文本
                      </button>
                      {showRawText && (
                        <pre className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {ocrResult.raw_text}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: 保存确认 */}
          {step === 3 && (
            <div className="py-12">
              {saving ? (
                <div className="flex flex-col items-center justify-center">
                  <svg
                    className="animate-spin w-12 h-12 text-primary-500 mb-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-gray-600">正在保存联系人...</p>
                </div>
              ) : saveError ? (
                <div className="text-center">
                  <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block mb-4">
                    {saveError}
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className={secondaryBtn}
                    >
                      返回修改
                    </button>
                    <button onClick={performSave} className={primaryBtn}>
                      重新保存
                    </button>
                  </div>
                </div>
              ) : saved ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      className="w-8 h-8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-800">
                    联系人已保存
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <div>
            {step === 1 && (
              <button onClick={onClose} className={secondaryBtn}>
                取消
              </button>
            )}
            {step === 2 && !ocrLoading && !ocrError && (
              <button onClick={backToStep1} className={secondaryBtn}>
                上一步
              </button>
            )}
          </div>
          <div className="ml-auto">
            {step === 1 && previewUrl && (
              <button onClick={startOcr} className={primaryBtn}>
                开始识别
              </button>
            )}
            {step === 2 && !ocrLoading && !ocrError && (
              <button onClick={handleSave} className={primaryBtn}>
                保存联系人
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
