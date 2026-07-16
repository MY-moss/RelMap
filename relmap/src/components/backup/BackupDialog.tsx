import { useState, useEffect } from 'react'
import type { BackupInfo, BackupResult, ImportResult } from '../../shared/types'

interface BackupDialogProps {
  open: boolean
  onClose: () => void
}

type TabKey = 'backup' | 'restore' | 'io'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'backup', label: '数据备份' },
  { key: 'restore', label: '数据恢复' },
  { key: 'io', label: '导入导出' },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return timestamp
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return timestamp
  }
}

export default function BackupDialog({ open, onClose }: BackupDialogProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('backup')

  // 数据备份状态
  const [backupPassword, setBackupPassword] = useState('')
  const [backupConfirmPassword, setBackupConfirmPassword] = useState('')
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupError, setBackupError] = useState('')
  const [backupSuccess, setBackupSuccess] = useState('')
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null)
  const [backupList, setBackupList] = useState<BackupInfo[]>([])
  const [backupListLoading, setBackupListLoading] = useState(false)
  const [backupListError, setBackupListError] = useState('')

  // 数据恢复状态
  const [restorePassword, setRestorePassword] = useState('')
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreError, setRestoreError] = useState('')
  const [restoreSuccess, setRestoreSuccess] = useState('')

  // 导入导出状态
  const [ioLoading, setIoLoading] = useState<string>('')
  const [ioError, setIoError] = useState('')
  const [ioSuccess, setIoSuccess] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    if (open) {
      // 重置状态
      setBackupPassword('')
      setBackupConfirmPassword('')
      setBackupError('')
      setBackupSuccess('')
      setBackupResult(null)
      setRestorePassword('')
      setRestoreError('')
      setRestoreSuccess('')
      setIoError('')
      setIoSuccess('')
      setImportResult(null)
      setActiveTab('backup')
      // 加载备份列表
      loadBackupList()
    }
  }, [open])

  const loadBackupList = async () => {
    setBackupListLoading(true)
    setBackupListError('')
    try {
      const result = await window.electronAPI.backup.list()
      if (result.success) {
        setBackupList(result.data)
      } else {
        setBackupListError(result.error || '加载备份列表失败')
      }
    } catch (err) {
      setBackupListError(err instanceof Error ? err.message : '加载备份列表失败')
    } finally {
      setBackupListLoading(false)
    }
  }

  if (!open) return null

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const btnPrimary =
    'px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const btnSecondary =
    'px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  // ==================== 数据备份操作 ====================
  const handleExportBackup = async () => {
    if (backupPassword && backupPassword !== backupConfirmPassword) {
      setBackupError('两次输入的密码不一致')
      return
    }
    setBackupLoading(true)
    setBackupError('')
    setBackupSuccess('')
    setBackupResult(null)
    try {
      const result = await window.electronAPI.backup.export(backupPassword || undefined)
      if (result.success) {
        setBackupResult(result.data)
        setBackupSuccess('备份导出成功')
        setBackupPassword('')
        setBackupConfirmPassword('')
        loadBackupList()
      } else {
        setBackupError(result.error || '导出备份失败')
      }
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : '导出备份失败')
    } finally {
      setBackupLoading(false)
    }
  }

  // ==================== 数据恢复操作 ====================
  const handleRestore = async () => {
    // 恢复操作会覆盖现有数据，需要用户二次确认
    if (!window.confirm('恢复数据将覆盖当前所有数据，此操作不可逆！确定继续吗？')) {
      return
    }
    setRestoreLoading(true)
    setRestoreError('')
    setRestoreSuccess('')
    try {
      const result = await window.electronAPI.backup.import(restorePassword || undefined)
      if (result.success) {
        setRestoreSuccess('数据恢复成功，建议重启应用以使所有更改生效')
        setRestorePassword('')
      } else {
        setRestoreError(result.error || '恢复失败')
      }
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : '恢复失败')
    } finally {
      setRestoreLoading(false)
    }
  }

  // ==================== 导入导出操作 ====================
  const handleImportVCard = async () => {
    setIoLoading('vcard')
    setIoError('')
    setIoSuccess('')
    setImportResult(null)
    try {
      const result = await window.electronAPI.io.importVCardFile()
      if (result.success) {
        setImportResult(result.data)
        setIoSuccess(`导入完成：成功 ${result.data.imported} 条，跳过 ${result.data.skipped} 条`)
      } else {
        setIoError(result.error || '导入失败')
      }
    } catch (err) {
      setIoError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setIoLoading('')
    }
  }

  const handleExportCSV = async () => {
    setIoLoading('csv')
    setIoError('')
    setIoSuccess('')
    try {
      const result = await window.electronAPI.io.exportCSV()
      if (result.success) {
        setIoSuccess(`CSV 导出成功：${result.data}`)
      } else {
        setIoError(result.error || '导出失败')
      }
    } catch (err) {
      setIoError(err instanceof Error ? err.message : '导出失败')
    } finally {
      setIoLoading('')
    }
  }

  const handleExportContactsJSON = async () => {
    setIoLoading('contacts-json')
    setIoError('')
    setIoSuccess('')
    try {
      const result = await window.electronAPI.io.exportJSON('contacts')
      if (result.success) {
        setIoSuccess(`联系人 JSON 导出成功：${result.data}`)
      } else {
        setIoError(result.error || '导出失败')
      }
    } catch (err) {
      setIoError(err instanceof Error ? err.message : '导出失败')
    } finally {
      setIoLoading('')
    }
  }

  const handleExportAllJSON = async () => {
    setIoLoading('all-json')
    setIoError('')
    setIoSuccess('')
    try {
      const result = await window.electronAPI.io.exportJSON('all')
      if (result.success) {
        setIoSuccess(`全部数据 JSON 导出成功：${result.data}`)
      } else {
        setIoError(result.error || '导出失败')
      }
    } catch (err) {
      setIoError(err instanceof Error ? err.message : '导出失败')
    } finally {
      setIoLoading('')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">备份与导入导出</h2>
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

        {/* Tab 导航 */}
        <div className="border-b border-gray-200 mb-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ==================== 数据备份 Tab ==================== */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                加密密码 <span className="text-gray-400 text-xs">（可选，留空则不加密）</span>
              </label>
              <input
                type="password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                className={inputClass}
                placeholder="留空则不加密"
                autoComplete="new-password"
              />
            </div>

            {backupPassword && (
              <div>
                <label className={labelClass}>
                  确认密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={backupConfirmPassword}
                  onChange={(e) => setBackupConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                />
              </div>
            )}

            {backupError && (
              <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {backupError}
              </div>
            )}

            {backupSuccess && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {backupSuccess}
              </div>
            )}

            {backupResult && (
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 space-y-1">
                <div>
                  <span className="font-medium">文件路径：</span>
                  <span className="break-all">{backupResult.path}</span>
                </div>
                <div>
                  <span className="font-medium">文件大小：</span>
                  <span>{formatSize(backupResult.size)}</span>
                </div>
                <div>
                  <span className="font-medium">备份时间：</span>
                  <span>{formatTime(backupResult.timestamp)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleExportBackup}
                disabled={backupLoading}
                className={btnPrimary}
              >
                {backupLoading ? '导出中...' : '导出备份'}
              </button>
            </div>

            {/* 历史备份列表 */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">历史备份</h3>
                <button
                  onClick={loadBackupList}
                  disabled={backupListLoading}
                  className="text-xs text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
                >
                  {backupListLoading ? '刷新中...' : '刷新'}
                </button>
              </div>

              {backupListError && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
                  {backupListError}
                </div>
              )}

              {backupListLoading ? (
                <div className="text-sm text-gray-500 text-center py-4">加载中...</div>
              ) : backupList.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">暂无历史备份</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {backupList.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatSize(item.size)} · {formatTime(item.timestamp)}
                          </div>
                        </div>
                        {item.encrypted && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            已加密
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 数据恢复 Tab ==================== */}
        {activeTab === 'restore' && (
          <div className="space-y-4">
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>恢复操作将覆盖当前所有数据，请谨慎操作</span>
            </div>

            <div>
              <label className={labelClass}>
                解密密码 <span className="text-gray-400 text-xs">（可选，用于解密加密备份）</span>
              </label>
              <input
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                className={inputClass}
                placeholder="若备份已加密请输入密码"
                autoComplete="current-password"
              />
            </div>

            {restoreError && (
              <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {restoreError}
              </div>
            )}

            {restoreSuccess && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {restoreSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleRestore}
                disabled={restoreLoading}
                className={btnPrimary}
              >
                {restoreLoading ? '恢复中...' : '选择备份文件恢复'}
              </button>
            </div>
          </div>
        )}

        {/* ==================== 导入导出 Tab ==================== */}
        {activeTab === 'io' && (
          <div className="space-y-4">
            {ioError && (
              <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {ioError}
              </div>
            )}

            {ioSuccess && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 break-all">
                {ioSuccess}
              </div>
            )}

            {importResult && (
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 space-y-1">
                <div>
                  <span className="font-medium">成功导入：</span>
                  <span className="text-green-600">{importResult.imported} 条</span>
                </div>
                <div>
                  <span className="font-medium">跳过：</span>
                  <span className="text-amber-600">{importResult.skipped} 条</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div>
                    <div className="font-medium text-red-600 mb-1">错误列表：</div>
                    <ul className="list-disc list-inside text-xs text-red-500 space-y-0.5 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleImportVCard}
                disabled={!!ioLoading}
                className={btnPrimary}
              >
                {ioLoading === 'vcard' ? '导入中...' : '导入 vCard 文件'}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={!!ioLoading}
                className={btnSecondary}
              >
                {ioLoading === 'csv' ? '导出中...' : '导出 CSV'}
              </button>
              <button
                onClick={handleExportContactsJSON}
                disabled={!!ioLoading}
                className={btnSecondary}
              >
                {ioLoading === 'contacts-json' ? '导出中...' : '导出联系人 JSON'}
              </button>
              <button
                onClick={handleExportAllJSON}
                disabled={!!ioLoading}
                className={btnSecondary}
              >
                {ioLoading === 'all-json' ? '导出中...' : '导出全部数据 JSON'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
