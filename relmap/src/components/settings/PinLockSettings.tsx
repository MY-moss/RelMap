import { useState, useEffect } from 'react'

export default function PinLockSettings() {
  const [hasPin, setHasPin] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'check' | 'set' | 'remove'>('check')
  const [error, setError] = useState('')

  useEffect(() => {
    window.electronAPI.app.hasPin().then((r) => {
      if (r.success) setHasPin(r.data)
    })
  }, [])

  const handleSetPin = async () => {
    setError('')
    if (pin.length < 4) {
      setError('PIN码至少4位')
      return
    }
    if (pin !== confirmPin) {
      setError('两次输入的PIN码不一致')
      return
    }
    const result = await window.electronAPI.app.setPin(pin)
    if (result.success) {
      setHasPin(true)
      setStep('check')
      setPin('')
      setConfirmPin('')
    } else {
      setError(result.error)
    }
  }

  const handleRemovePin = async () => {
    setError('')
    const result = await window.electronAPI.app.setPin('')
    if (result.success) {
      setHasPin(false)
      setStep('check')
    } else {
      setError(result.error)
    }
  }

  if (step === 'set') {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">设置PIN锁</h3>
        <p className="text-sm text-gray-500">设置后每次启动应用时需要输入PIN码</p>
        <div>
          <label className="block text-sm text-gray-600 mb-1">PIN码</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={6}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="4-6位数字"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">确认PIN码</label>
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            maxLength={6}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="再次输入PIN码"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSetPin}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            确认
          </button>
          <button
            onClick={() => { setStep('check'); setError(''); setPin(''); setConfirmPin('') }}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  if (step === 'remove') {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">移除PIN锁</h3>
        <p className="text-sm text-gray-500">确定要移除PIN锁吗？之后启动应用不再需要密码。</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleRemovePin}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            确认移除
          </button>
          <button
            onClick={() => setStep('check')}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">应用锁</h3>
      <p className="text-sm text-gray-500">
        {hasPin ? '已启用PIN锁保护' : '未设置PIN锁'}
      </p>
      <button
        onClick={() => setStep(hasPin ? 'remove' : 'set')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          hasPin
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : 'bg-primary-500 hover:bg-primary-600 text-white'
        }`}
      >
        {hasPin ? '移除PIN锁' : '设置PIN锁'}
      </button>
    </div>
  )
}
