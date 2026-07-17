import { useState, useEffect, useCallback } from 'react'

const updateApi = window.electronAPI!.update

export default function UpdateNotifier() {
  const [state, setState] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const unsubs: (() => void)[] = []
    unsubs.push(updateApi.onChecking(() => setState('checking')))
    unsubs.push(updateApi.onAvailable((info: { version: string }) => { setVersion(info.version); setState('available') }))
    unsubs.push(updateApi.onNotAvailable(() => setState('idle')))
    unsubs.push(updateApi.onProgress((p: { percent: number }) => { setProgress(p.percent); setState('downloading') }))
    unsubs.push(updateApi.onDownloaded(() => setState('downloaded')))
    unsubs.push(updateApi.onError((msg: string) => { setErrorMsg(msg); setState('error') }))
    return () => unsubs.forEach(fn => fn())
  }, [])

  const handleDownload = useCallback(async () => { await updateApi.downloadUpdate() }, [])
  const handleInstall = useCallback(() => { updateApi.installUpdate() }, [])
  const handleDismiss = useCallback(() => { setState('idle') }, [])

  if (state === 'idle') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      {state === 'checking' && (
        <div className="card p-3 flex items-center gap-2 text-sm text-[var(--text-secondary)] shadow-lg">
          <svg className="animate-spin h-4 w-4 text-[var(--primary-500)]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <span>正在检查更新…</span>
        </div>
      )}

      {state === 'available' && (
        <div className="card p-4 space-y-3 shadow-lg" style={{ borderColor: 'var(--primary-300)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">发现新版本 v{version}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">新功能与改进已就绪</p>
            </div>
            <button onClick={handleDismiss} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownload} className="flex-1 px-3 py-1.5 text-xs font-medium bg-[var(--primary-500)] text-white rounded-lg hover:bg-[var(--primary-600)] transition-colors">下载更新</button>
            <button onClick={handleDismiss} className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border border-[var(--surface-border)] rounded-lg hover:bg-[var(--surface-muted)] transition-colors">稍后</button>
          </div>
        </div>
      )}

      {state === 'downloading' && (
        <div className="card p-4 space-y-2 shadow-lg">
          <p className="text-sm font-medium text-[var(--text-primary)]">正在下载更新…</p>
          <div className="w-full h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[var(--primary-500)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">{Math.round(progress)}%</p>
        </div>
      )}

      {state === 'downloaded' && (
        <div className="card p-4 space-y-3 shadow-lg" style={{ borderColor: '#34d399' }}>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#34d399" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
            <span className="text-sm font-medium text-[var(--text-primary)]">更新已就绪</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleInstall} className="flex-1 px-3 py-1.5 text-xs font-medium bg-[var(--primary-500)] text-white rounded-lg hover:bg-[var(--primary-600)] transition-colors">立即重启安装</button>
            <button onClick={handleDismiss} className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border border-[var(--surface-border)] rounded-lg hover:bg-[var(--surface-muted)] transition-colors">下次启动</button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="card p-3 shadow-lg" style={{ borderColor: '#f87171' }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">检查更新失败: {errorMsg}</p>
            <button onClick={handleDismiss} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
