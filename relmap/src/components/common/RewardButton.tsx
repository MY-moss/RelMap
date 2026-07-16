import { useState, useRef, useEffect } from 'react'
import { Heart } from 'lucide-react'

export default function RewardButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative mt-auto mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="nav-item"
        title="支持项目"
      >
        <Heart size={16} strokeWidth={1.8} className="nav-icon" />
        <span className="nav-label">赞赏</span>
      </button>

      {open && (
        <div
          className="fixed left-[76px] bottom-4 z-50 card p-0 overflow-hidden animate-scale-in"
          style={{ animation: 'scaleIn 0.2s ease-out' }}
        >
          <div className="p-3 text-center space-y-2" style={{ minWidth: 180 }}>
            <p className="text-xs font-medium text-[var(--text-primary)]">
              如果这个项目对你有帮助
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              可以请作者喝杯咖啡 ☕
            </p>
            <img
              src="/assets/reward-qr.png"
              alt="赞赏码"
              className="w-36 h-36 mx-auto rounded-lg"
              style={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <p className="text-[10px] text-[var(--text-secondary)]">
              微信扫码赞赏
            </p>
          </div>
          {/* 三角指示 */}
          <div
            className="absolute left-[-6px] bottom-6 w-3 h-3 bg-[var(--surface)] border-l border-b border-[var(--surface-border)]"
            style={{ transform: 'rotate(45deg)' }}
          />
        </div>
      )}
    </div>
  )
}
