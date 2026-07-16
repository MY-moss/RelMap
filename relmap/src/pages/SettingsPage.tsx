import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import GroupManager from '../components/groups/GroupManager'
import TagManager from '../components/tags/TagManager'
import TemplateManager from '../components/templates/TemplateManager'
import BackupDialog from '../components/backup/BackupDialog'
import SmartGroupingPanel from '../components/ai/SmartGroupingPanel'
import PinLockSettings from '../components/settings/PinLockSettings'
import DbEncryptionSettings from '../components/settings/DbEncryptionSettings'
import AiProviderSettings from '../components/settings/AiProviderSettings'
import LanguageSelector from '../components/settings/LanguageSelector'
import PluginManager from '../components/plugins/PluginManager'
import { useUIStore, themeLabels } from '../hooks/stores'
import type { ColorTheme } from '../hooks/stores/useUIStore'
import type { GroupSuggestion } from '../shared/types'

type SettingsTab = 'groups' | 'smart' | 'tags' | 'templates' | 'backup' | 'security' | 'ai' | 'theme' | 'language' | 'privacy' | 'plugins'

const tabKeys: { key: SettingsTab; tKey: string }[] = [
  { key: 'groups', tKey: 'groups' },
  { key: 'smart', tKey: 'smart_grouping' },
  { key: 'tags', tKey: 'tags' },
  { key: 'templates', tKey: 'templates' },
  { key: 'backup', tKey: 'backup' },
  { key: 'security', tKey: 'security' },
  { key: 'ai', tKey: 'ai_service' },
  { key: 'theme', tKey: 'theme' },
  { key: 'language', tKey: 'language' },
  { key: 'privacy', tKey: 'privacy' },
  { key: 'plugins', tKey: 'plugins' },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('groups')
  const [backupOpen, setBackupOpen] = useState(false)

  const handleApplySuggestion = useCallback(async (suggestion: GroupSuggestion) => {
    try {
      // 创建分组，将建议理由作为分组描述
      const result = await window.electronAPI.group.create({
        name: suggestion.group_name,
        color: suggestion.group_color,
        description: suggestion.reason,
      })
      // 创建成功后，将建议的联系人添加到分组
      if (result.success && suggestion.person_ids.length > 0) {
        await window.electronAPI.group.addMembers(result.data.id, suggestion.person_ids)
      }
    } catch (e) {
      console.error('应用分组失败:', e)
    }
  }, [])

  return (
    <div className="p-6 page-enter">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('settings.title')}</h1>

      {/* Tab 导航 */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {tabKeys.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`settings.${tab.tKey}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'groups' && <GroupManager />}
      {activeTab === 'smart' && <SmartGroupingPanel onApply={handleApplySuggestion} />}
      {activeTab === 'tags' && <TagManager />}
      {activeTab === 'templates' && <TemplateManager />}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{t('settings.backup_title')}</h2>
          <p className="text-gray-500 text-sm mb-4">{t('settings.backup_description')}</p>
          <button
            onClick={() => setBackupOpen(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            {t('settings.backup_open')}
          </button>
        </div>
      )}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <PinLockSettings />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <DbEncryptionSettings />
          </div>
        </div>
      )}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <AiProviderSettings />
        </div>
      )}
      {activeTab === 'theme' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <ThemeSettings />
        </div>
      )}
      {activeTab === 'language' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <LanguageSelector />
        </div>
      )}
      {activeTab === 'privacy' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <PrivacySettings />
        </div>
      )}
      {activeTab === 'plugins' && <PluginManager />}

      <BackupDialog open={backupOpen} onClose={() => setBackupOpen(false)} />
    </div>
  )
}

function ThemeSettings() {
  const { t } = useTranslation()
  const { darkMode, setDarkMode, colorTheme, setColorTheme, glassMode, setGlassMode } = useUIStore()
  const themes: { key: ColorTheme; label: string }[] = [
    { key: 'orange', label: '活力橙' },
    { key: 'emerald', label: '翡翠绿' },
    { key: 'violet', label: '紫罗兰' },
    { key: 'rose', label: '玫瑰红' },
    { key: 'sky', label: '天空蓝' },
    { key: 'amber', label: '琥珀金' },
  ]

  useEffect(() => {
    const saved = document.documentElement.classList.contains('dark')
    setDarkMode(saved)
    const savedTheme = document.documentElement.getAttribute('data-theme') as ColorTheme | null
    if (savedTheme) setColorTheme(savedTheme)
    const hasGlass = Array.from(document.documentElement.classList).find(c => c.startsWith('glass-'))
    if (hasGlass) setGlassMode(hasGlass.replace('glass-', '') as 'frosted' | 'translucent')
  }, [setDarkMode, setColorTheme, setGlassMode])

  const toggleDarkMode = async () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    await window.electronAPI.app.saveConfig({ darkMode: next })
  }

  const switchTheme = async (theme: ColorTheme) => {
    setColorTheme(theme)
    document.documentElement.setAttribute('data-theme', theme)
    await window.electronAPI.app.saveConfig({ colorTheme: theme })
  }

  const switchGlassMode = async (mode: 'none' | 'frosted' | 'translucent') => {
    document.documentElement.classList.remove('glass-frosted', 'glass-translucent')
    if (mode !== 'none') document.documentElement.classList.add(`glass-${mode}`)
    setGlassMode(mode)
    await window.electronAPI.app.saveConfig({ glassMode: mode })
  }

  const glassStyles: { key: 'none' | 'frosted' | 'translucent'; label: string; desc: string }[] = [
    { key: 'none', label: '关', desc: '标准不透明界面' },
    { key: 'frosted', label: '磨砂玻璃', desc: '半透明毛玻璃效果' },
    { key: 'translucent', label: '半透明', desc: '高透玻璃质感' },
  ]

  return (
    <div className="space-y-6">
      {/* 明暗切换 */}
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{t('settings.theme_appearance')}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-3">{t('settings.theme_toggle')}</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary-500)] rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-500)]"></div>
          </div>
          <span className="text-sm text-[var(--text-primary)]">
            {darkMode ? '🌙 ' + t('settings.dark_mode') : '☀️ ' + t('settings.light_mode')}
          </span>
        </label>
      </div>

      {/* 分隔线 */}
      <hr className="border-[var(--surface-border)]" />

      {/* 主题色选择 */}
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{t('settings.theme_color')}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{t('settings.theme_color_description')}</p>
        <div className="flex gap-3 flex-wrap">
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTheme(t.key)}
              className={`theme-swatch ${colorTheme === t.key ? 'active' : ''}`}
              data-theme={t.key}
              title={t.label}
            />
          ))}
        </div>
        <p className="text-sm text-[var(--primary-600)] font-medium mt-2">
          {t('settings.current_theme', { name: themeLabels[colorTheme] })}
        </p>
      </div>

      {/* 分隔线 */}
      <hr className="border-[var(--surface-border)]" />

      {/* 玻璃质感 */}
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">玻璃质感</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">为界面添加磨砂玻璃或半透明效果，卡片和面板将呈现通透质感</p>
        <div className="flex gap-3">
          {glassStyles.map((g) => (
            <button
              key={g.key}
              onClick={() => switchGlassMode(g.key)}
              className={`flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
                glassMode === g.key
                  ? 'border-[var(--primary-500)] bg-[var(--primary-50)]'
                  : 'border-[var(--surface-border)] hover:border-[var(--primary-300)]'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${
                glassMode === g.key ? 'text-[var(--primary-600)]' : 'text-[var(--text-secondary)]'
              }`}>
                {g.key === 'none' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                  </svg>
                ) : g.key === 'frosted' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
                    <rect x="3" y="3" width="18" height="18" rx="3" opacity="0.6" />
                    <rect x="3" y="3" width="18" height="18" rx="3" opacity="0.3" transform="translate(1,1)" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
                    <rect x="2" y="2" width="20" height="20" rx="3" opacity="0.3" />
                    <rect x="3" y="3" width="18" height="18" rx="3" opacity="0.5" />
                  </svg>
                )}
              </div>
              <span className={`text-sm font-medium ${glassMode === g.key ? 'text-[var(--primary-600)]' : 'text-[var(--text-primary)]'}`}>
                {g.label}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{g.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <hr className="border-[var(--surface-border)]" />

      {/* 版本与更新 */}
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">版本与更新</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">应用版本信息与自动更新</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">RelMap v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">自动检查更新在启动后 5 秒进行</p>
          </div>
          <button
            onClick={async () => {
              const r = await window.electronAPI.update.checkForUpdates()
              if (r.success) {
                // 结果通过 IPC 事件通知
              }
            }}
            className="px-4 py-2 text-sm font-medium bg-[var(--primary-500)] text-white rounded-lg hover:bg-[var(--primary-600)] transition-colors"
          >
            检查更新
          </button>
        </div>
      </div>
    </div>
  )
}

function PrivacySettings() {
  const { t } = useTranslation()
  const [telemetry, setTelemetry] = useState<boolean | null>(null)
  const [sentryEnabled, setSentryEnabled] = useState<boolean>(true)
  const [sentryDsnConfigured, setSentryDsnConfigured] = useState<boolean>(false)

  useEffect(() => {
    window.electronAPI.app.getConfig().then((r) => {
      if (r.success && r.data) {
        setTelemetry(r.data.telemetryConsentGiven === true)
        // sentryEnabled 默认为 true（未设置时为 true）
        setSentryEnabled(r.data.sentryEnabled !== false)
      }
    })
    // 检查 DSN 是否已配置
    setSentryDsnConfigured(!!import.meta.env.VITE_SENTRY_DSN)
    // 从 localStorage 读取当前状态
    setSentryEnabled(localStorage.getItem('sentryEnabled') !== 'false')
  }, [])

  const toggleTelemetry = async () => {
    const next = !telemetry
    setTelemetry(next)
    await window.electronAPI.app.saveConfig({ telemetryConsentGiven: next })
  }

  const toggleSentry = async () => {
    const next = !sentryEnabled
    setSentryEnabled(next)
    // 保存到 localStorage（渲染进程启动时同步读取）
    localStorage.setItem('sentryEnabled', String(next))
    // 保存到 app config（主进程启动时读取）
    await window.electronAPI.app.saveConfig({ sentryEnabled: next })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">{t('settings.privacy_title')}</h3>
      <p className="text-sm text-gray-500">{t('settings.privacy_description')}</p>

      {/* Sentry 错误监控 */}
      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-700">{t('settings.sentry_monitoring')}</p>
          <p className="text-xs text-gray-400">{t('settings.sentry_description')}{!sentryDsnConfigured && t('settings.sentry_not_configured')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={sentryEnabled}
            onChange={toggleSentry}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
        </label>
      </div>

      {/* Sentry 状态 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${sentryEnabled && sentryDsnConfigured ? 'bg-green-500' : 'bg-gray-300'}`}></span>
          <span className="text-xs font-medium text-gray-600">
            {t('settings.sentry_status_label', { status: sentryEnabled && sentryDsnConfigured ? t('settings.sentry_status_enabled') : sentryDsnConfigured ? t('settings.sentry_status_disabled') : t('settings.sentry_status_not_configured') })}
          </span>
        </div>
        <p className="text-xs text-gray-400">{t('settings.sentry_restart_note')}</p>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-700">{t('settings.anonymous_usage')}</p>
          <p className="text-xs text-gray-400">{t('settings.anonymous_usage_description')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={telemetry === true}
            onChange={toggleTelemetry}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
        </label>
      </div>
      <div className="pt-2">
        <p className="text-xs text-gray-400">{t('settings.local_logs_note')}</p>
      </div>
    </div>
  )
}
