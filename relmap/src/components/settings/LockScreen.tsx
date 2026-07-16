import { useState, useEffect, useRef, useCallback } from 'react'

interface LockScreenProps {
  onUnlocked: () => void
}

export default function LockScreen({ onUnlocked }: LockScreenProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const pinRef = useRef(pin)
  pinRef.current = pin

  const handleVerify = useCallback(async () => {
    setError('')
    const result = await window.electronAPI.app.verifyPin(pinRef.current)
    if (result.success && result.data) {
      onUnlocked()
    } else {
      setError('PIN码错误')
      setPin('')
      pinRef.current = ''
    }
  }, [onUnlocked])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && pinRef.current.length >= 4) {
        handleVerify()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleVerify])

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-3xl font-bold mb-6">
        R
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">RelMap 已锁定</h1>
      <p className="text-sm text-gray-500 mb-6">输入PIN码解锁</p>
      <input
        type="password"
        value={pin}
        onChange={(e) => { setPin(e.target.value); pinRef.current = e.target.value }}
        maxLength={6}
        className="w-48 text-center text-2xl tracking-widest border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        placeholder="••••"
        autoFocus
      />
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      <button
        onClick={handleVerify}
        disabled={pin.length < 4}
        className="mt-4 px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
      >
        解锁
      </button>
    </div>
  )
}
