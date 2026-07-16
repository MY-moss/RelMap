import { useState, useEffect, useCallback } from 'react'
import type { PluginInfo } from '../../shared/types'

const STATUS_LABELS: Record<string, string> = {
  installed: '已安装',
  loading: '加载中...',
  loaded: '已加载',
  enabled: '启用中',
  running: '运行中',
  disabled: '已禁用',
  error: '异常',
}

const STATUS_COLORS: Record<string, string> = {
  installed: 'bg-blue-100 text-blue-700',
  loading: 'bg-yellow-100 text-yellow-700',
  loaded: 'bg-indigo-100 text-indigo-700',
  enabled: 'bg-teal-100 text-teal-700',
  running: 'bg-green-100 text-green-700',
  disabled: 'bg-gray-100 text-gray-500',
  error: 'bg-red-100 text-red-600',
}

const OAUTH_PROVIDERS: Record<string, string> = {
  'google-contacts': 'google-contacts',
  'calendar-sync': 'google-calendar',
  'social-import': 'linkedin',
}

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null)
  const [pluginLogs, setPluginLogs] = useState<string[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<Record<string, boolean>>({})
  const [authing, setAuthing] = useState<string | null>(null)

  const scan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.plugin.scan()
      if (result.success) {
        setPlugins(result.data)
      } else {
        setError(result.error)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    scan()
  }, [scan])

  useEffect(() => {
    const checkAuth = async () => {
      const status: Record<string, boolean> = {}
      for (const p of plugins) {
        const provider = OAUTH_PROVIDERS[p.name]
        if (provider) {
          const result = await window.electronAPI.oauth.hasCredentials(p.name, provider)
          if (result.success) status[p.name] = result.data
        }
      }
      setAuthStatus(status)
    }
    if (plugins.length > 0) checkAuth()
  }, [plugins])

  const handleImport = async (pluginName: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.vcf,.vcard,.html,.htm'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const isCsv = file.name.endsWith('.csv')
      const isVcf = file.name.endsWith('.vcf') || file.name.endsWith('.vcard')
      const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm')
      try {
        let result: { success: boolean; data?: unknown; error?: string }
        if (isCsv) {
          result = await window.electronAPI.plugin.callHandler(pluginName, 'importLinkedIn', text)
        } else if (isVcf) {
          result = await window.electronAPI.plugin.callHandler(pluginName, 'importWeChat', text)
        } else if (isHtml) {
          result = await window.electronAPI.plugin.callHandler(pluginName, 'importFacebook', text)
        } else {
          alert('不支持的文件格式，请使用 CSV / vCard / HTML')
          return
        }
        if (result.success) {
          alert('导入成功: ' + JSON.stringify(result.data))
        } else {
          alert('导入失败: ' + result.error)
        }
      } catch (err) {
        alert('导入出错: ' + (err as Error).message)
      }
    }
    input.click()
  }

  const handleAuthorize = async (pluginName: string) => {
    const provider = OAUTH_PROVIDERS[pluginName]
    if (!provider) return
    setAuthing(pluginName)
    const clientId = prompt(`请输入 ${provider} OAuth Client ID:`)
    if (!clientId) { setAuthing(null); return }
    const clientSecret = prompt(`请输入 ${provider} OAuth Client Secret:`)
    if (!clientSecret) { setAuthing(null); return }
    try {
      const result = await window.electronAPI.oauth.authorize(pluginName, provider, clientId, clientSecret)
      if (result.success) {
        setAuthStatus((prev) => ({ ...prev, [pluginName]: true }))
      } else {
        alert('授权失败: ' + result.error)
      }
    } catch (err) {
      alert('授权出错: ' + (err as Error).message)
    }
    setAuthing(null)
  }

  const togglePlugin = useCallback(async (name: string, currentEnabled: boolean) => {
    const result = await window.electronAPI.plugin.setEnabled(name, !currentEnabled)
    if (result.success) {
      setPlugins((prev) =>
        prev.map((p) => (p.name === name ? { ...p, enabled: !currentEnabled, status: !currentEnabled ? 'enabled' : 'disabled' } : p))
      )
    } else {
      setError(result.error)
    }
  }, [])

  const installPlugin = useCallback(async () => {
    const result = await window.electronAPI.plugin.install()
    if (result.success) {
      setPlugins((prev) => [...prev, result.data])
    } else {
      setError(result.error)
    }
  }, [])

  const uninstallPlugin = useCallback(async (name: string) => {
    const result = await window.electronAPI.plugin.uninstall(name)
    if (result.success) {
      setPlugins((prev) => prev.filter((p) => p.name !== name))
      if (selectedPlugin === name) setSelectedPlugin(null)
    } else {
      setError(result.error)
    }
  }, [selectedPlugin])

  const viewLogs = useCallback(async (name: string) => {
    setSelectedPlugin(name)
    setLogsLoading(true)
    try {
      const result = await window.electronAPI.plugin.getPluginLogs(name)
      if (result.success) {
        setPluginLogs(result.data)
      }
    } catch {
      setPluginLogs(['无法获取日志'])
    } finally {
      setLogsLoading(false)
    }
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">插件管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            管理和安装 RelMap 扩展插件 ({plugins.length} 个已安装)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={scan}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            扫描插件
          </button>
          <button
            onClick={installPlugin}
            className="px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            安装插件
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">扫描中...</div>
      )}

      {!loading && plugins.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          暂无已安装的插件，点击"安装插件"按钮添加
        </div>
      )}

      {!loading && plugins.length > 0 && (
        <div className="space-y-3">
          {plugins.map((plugin) => (
            <div key={plugin.name}>
              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-800 truncate">
                      {plugin.name}
                    </h3>
                    <span className="text-xs text-gray-400">v{plugin.version}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[plugin.status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[plugin.status] || plugin.status}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${plugin.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {plugin.enabled ? '已启用' : '已禁用'}
                    </span>
                    {plugin.error && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600" title={plugin.error}>
                        错误
                      </span>
                    )}
                  </div>

                  {plugin.description && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{plugin.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>作者: {plugin.author || '未知'}</span>

                    {plugin.permissions && plugin.permissions.length > 0 && (
                      <span className="flex items-center gap-1">
                        权限:
                        {plugin.permissions.map((perm) => (
                          <span key={perm} className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">
                            {perm}
                          </span>
                        ))}
                      </span>
                    )}

                    {plugin.actions && plugin.actions.length > 0 && (
                      <span>操作: {plugin.actions.join(', ')}</span>
                    )}

                    {plugin.hooks && plugin.hooks.length > 0 && (
                      <span>事件: {plugin.hooks.join(', ')}</span>
                    )}

                    {plugin.uiSlots && plugin.uiSlots.length > 0 && (
                      <span>插槽: {plugin.uiSlots.join(', ')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => viewLogs(plugin.name)}
                    className="px-2 py-1 text-xs border border-gray-200 text-gray-500 rounded hover:bg-gray-50 transition-colors"
                  >
                    日志
                  </button>

                  <button
                    onClick={() => togglePlugin(plugin.name, plugin.enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${plugin.enabled ? 'bg-primary-500' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${plugin.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>

                  {OAUTH_PROVIDERS[plugin.name] && (
                    <button
                      onClick={() => handleAuthorize(plugin.name)}
                      disabled={authing === plugin.name}
                      className={`px-2 py-1 text-xs border rounded transition-colors ${
                        authStatus[plugin.name]
                          ? 'border-green-200 text-green-600 bg-green-50'
                          : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                      } ${authing === plugin.name ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {authing === plugin.name ? '授权中...' : authStatus[plugin.name] ? '已授权 ✓' : '授权'}
                    </button>
                  )}

                  {plugin.name === 'social-import' && (
                    <button
                      onClick={() => handleImport(plugin.name)}
                      className="px-2 py-1 text-xs border border-primary-200 text-primary-600 rounded hover:bg-primary-50 transition-colors"
                    >
                      导入
                    </button>
                  )}

                  <button
                    onClick={() => { if (confirm(`确定要卸载插件 "${plugin.name}" 吗？`)) uninstallPlugin(plugin.name) }}
                    className="px-2 py-1 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                  >
                    卸载
                  </button>
                </div>
              </div>

              {selectedPlugin === plugin.name && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">{plugin.name} 日志</h4>
                    <button
                      onClick={() => setSelectedPlugin(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      关闭
                    </button>
                  </div>
                  {logsLoading ? (
                    <div className="text-xs text-gray-400 py-2">加载中...</div>
                  ) : pluginLogs.length === 0 ? (
                    <div className="text-xs text-gray-400 py-2">暂无日志</div>
                  ) : (
                    <pre className="text-xs text-gray-600 overflow-auto max-h-48 p-2 bg-white rounded border border-gray-200 font-mono leading-relaxed">
                      {pluginLogs.map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
