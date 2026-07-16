import { useState, useEffect } from 'react'
import { useToastContext } from '../common/ToastContext'

interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  enabled?: boolean
  model?: string
}

interface CustomProvider {
  key: string
  label: string
  defaultBaseUrl: string
}

const DEFAULT_PROVIDERS: CustomProvider[] = [
  { key: 'ollama', label: 'Ollama（本地）', defaultBaseUrl: 'http://localhost:11434/v1' },
  { key: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1' },
  { key: 'deepseek', label: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com/v1' },
  { key: 'siliconflow', label: 'SiliconFlow（硅基流动）', defaultBaseUrl: 'https://api.siliconflow.cn/v1' },
]

const DEFAULT_MODELS: Record<string, string> = {
  ollama: 'llama3',
  openai: 'gpt-4o',
  deepseek: 'deepseek-chat',
  anthropic: 'claude-3-sonnet-20240229',
  google: 'gemini-2.0-flash',
  siliconflow: 'Qwen/Qwen2.5-72B-Instruct',
}

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  siliconflow: ['Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-32B-Instruct', 'deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1'],
}

const STORAGE_KEY = 'relmap_custom_providers'

export default function AiProviderSettings() {
  const toast = useToastContext()
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({})
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] } | null>(null)
  const [newCustomName, setNewCustomName] = useState('')
  const [newCustomUrl, setNewCustomUrl] = useState('')

  useEffect(() => {
    window.electronAPI.app.getConfig().then((r) => {
      if (r.success && r.data) {
        const aiProviders = (r.data as Record<string, unknown>).aiProviders as Record<string, ProviderConfig> | undefined
        if (aiProviders) setProviders(aiProviders)
      }
      setLoaded(true)
    })
    window.electronAPI.ollama.detect().then((r) => {
      if (r.success && r.data.available) {
        setOllamaStatus(r.data)
      } else {
        setOllamaStatus({ available: false, models: [] })
      }
    })
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customProviders))
  }, [customProviders])

  const allProviders: CustomProvider[] = [
    ...DEFAULT_PROVIDERS,
    ...customProviders,
  ]

  const updateProvider = (key: string, field: keyof ProviderConfig, value: string | boolean) => {
    setProviders((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.electronAPI.app.saveConfig({ aiProviders: providers })
      toast.showSuccess('配置已保存')
    } catch {
      toast.showError('保存失败')
    }
    setSaving(false)
  }

  const addCustomProvider = () => {
    const key = 'custom_' + Date.now().toString(36)
    const label = newCustomName.trim() || key
    const baseUrl = newCustomUrl.trim() || 'https://api.openai.com/v1'
    setCustomProviders((prev) => [...prev, { key, label, defaultBaseUrl: baseUrl }])
    setProviders((prev) => ({ ...prev, [key]: { baseUrl, enabled: true } }))
    setNewCustomName('')
    setNewCustomUrl('')
  }

  const removeCustomProvider = (key: string) => {
    setCustomProviders((prev) => prev.filter((p) => p.key !== key))
    setProviders((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  if (!loaded) return <p className="text-gray-500 text-sm py-4">加载中...</p>

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-800">AI 服务提供商</h3>
        <p className="text-sm text-gray-500 mt-1">
          配置你自己的 API Key，所有数据仅在本地存储
        </p>
        {ollamaStatus && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mt-3">
            <span className={`w-3 h-3 rounded-full ${ollamaStatus.available ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">
              {ollamaStatus.available
                ? `Ollama 已检测 (${ollamaStatus.models.length} 个模型)`
                : 'Ollama 未运行'}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {allProviders.map((provider) => {
          const config = providers[provider.key] || {}
          const isCustom = customProviders.some((p) => p.key === provider.key)
          return (
            <div key={provider.key} className="border border-gray-100 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">
                  {provider.label}
                  {isCustom && <span className="ml-2 text-xs text-gray-400">自定义</span>}
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">启用</span>
                    <input
                      type="checkbox"
                      checked={config.enabled ?? false}
                      onChange={(e) => updateProvider(provider.key, 'enabled', e.target.checked)}
                      className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                    />
                  </label>
                  {isCustom && (
                    <button
                      onClick={() => removeCustomProvider(provider.key)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
              {isCustom && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">名称</label>
                  <input
                    type="text"
                    value={provider.label}
                    onChange={(e) => {
                      setCustomProviders((prev) =>
                        prev.map((p) => (p.key === provider.key ? { ...p, label: e.target.value } : p))
                      )
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">模型</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.model ?? DEFAULT_MODELS[provider.key] ?? ''}
                    onChange={(e) => updateProvider(provider.key, 'model', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono"
                    placeholder={DEFAULT_MODELS[provider.key] ?? '输入模型名称'}
                  />
                  {MODEL_OPTIONS[provider.key] && (
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) updateProvider(provider.key, 'model', e.target.value) }}
                      className="border border-gray-300 rounded-lg px-2 text-sm text-gray-500 outline-none"
                    >
                      <option value="">推荐</option>
                      {MODEL_OPTIONS[provider.key].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">API Base URL</label>
                <input
                  type="text"
                  value={config.baseUrl ?? provider.defaultBaseUrl}
                  onChange={(e) => updateProvider(provider.key, 'baseUrl', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder={provider.defaultBaseUrl}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">API Key</label>
                <input
                  type="password"
                  value={config.apiKey ?? ''}
                  onChange={(e) => updateProvider(provider.key, 'apiKey', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono"
                  placeholder="sk-..."
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Add custom provider */}
      <div className="border border-dashed border-gray-300 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">添加自定义提供商</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newCustomName}
            onChange={(e) => setNewCustomName(e.target.value)}
            placeholder="名称（如：本地模型）"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none"
          />
          <input
            type="text"
            value={newCustomUrl}
            onChange={(e) => setNewCustomUrl(e.target.value)}
            placeholder="Base URL"
            className="flex-[2] border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none font-mono"
          />
          <button
            onClick={addCustomProvider}
            disabled={!newCustomName.trim() && !newCustomUrl.trim()}
            className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg text-sm transition-colors"
          >
            添加
          </button>
        </div>
        <p className="text-xs text-gray-400">支持任何 OpenAI 兼容 API</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
      >
        {saving ? '保存中...' : '保存配置'}
      </button>
    </div>
  )
}
