import { useState, useEffect } from 'react'

export default function DbEncryptionSettings() {
  const [status, setStatus] = useState<{ encrypted: boolean; keyAvailable: boolean } | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [step, setStep] = useState<'status' | 'encrypt' | 'decrypt' | 'changePassword'>('status')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    const result = await window.electronAPI.db.checkEncryptionStatus()
    if (result.success) {
      setStatus(result.data)
    }
  }

  const checkPasswordStrength = (pwd: string): { score: number; label: string; feedback: string; color: string } => {
    let score = 0

    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^a-zA-Z0-9]/.test(pwd)) score++

    if (score <= 2) {
      return { score, label: '弱', feedback: '建议使用至少8位包含字母、数字和特殊字符的密码', color: 'bg-red-500' }
    } else if (score <= 3) {
      return { score, label: '中等', feedback: '可以更好，建议增加长度或添加特殊字符', color: 'bg-yellow-500' }
    } else if (score <= 4) {
      return { score, label: '强', feedback: '密码强度良好', color: 'bg-blue-500' }
    } else {
      return { score, label: '非常强', feedback: '密码强度优秀', color: 'bg-green-500' }
    }
  }

  const handleEncrypt = async () => {
    setError('')
    if (!password || password.length < 4) {
      setError('密码至少需要4位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    const strength = checkPasswordStrength(password)
    if (strength.score <= 2) {
      setError(`密码强度不足（${strength.label}）。${strength.feedback}`)
      return
    }

    setLoading(true)
    const result = await window.electronAPI.db.encrypt(password)
    setLoading(false)

    if (result.success) {
      setStep('status')
      setPassword('')
      setConfirmPassword('')
      checkStatus()
    } else {
      setError(result.error)
    }
  }

  const handleDecrypt = async () => {
    setError('')
    if (!password) {
      setError('请输入密码')
      return
    }

    setLoading(true)
    const result = await window.electronAPI.db.decrypt(password)
    setLoading(false)

    if (result.success) {
      setStep('status')
      setPassword('')
      checkStatus()
    } else {
      setError(result.error)
    }
  }

  const handleChangePassword = async () => {
    setError('')
    if (!oldPassword) {
      setError('请输入旧密码')
      return
    }
    if (!password || password.length < 4) {
      setError('新密码至少需要4位')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }

    const strength = checkPasswordStrength(password)
    if (strength.score <= 2) {
      setError(`新密码强度不足（${strength.label}）。${strength.feedback}`)
      return
    }

    setLoading(true)
    const result = await window.electronAPI.db.changePassword(oldPassword, password)
    setLoading(false)

    if (result.success) {
      setStep('status')
      setOldPassword('')
      setPassword('')
      setConfirmPassword('')
    } else {
      setError(result.error)
    }
  }

  if (!status) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">数据库加密</h3>
        <p className="text-sm text-gray-500">正在检查加密状态...</p>
      </div>
    )
  }

  if (step === 'encrypt') {
    const strength = password ? checkPasswordStrength(password) : null

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">加密数据库</h3>
        <p className="text-sm text-gray-500">
          加密后，数据库文件将使用 SQLCipher 进行加密保护。请务必记住您的密码，丢失密码将无法恢复数据。
        </p>
        <div>
          <label className="block text-sm text-gray-600 mb-1">设置密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="请输入密码"
          />
        </div>
        {strength && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-600">密码强度:</span>
              <span className={`text-sm font-medium ${
                strength.score <= 2 ? 'text-red-500' :
                strength.score <= 3 ? 'text-yellow-600' :
                strength.score <= 4 ? 'text-blue-500' : 'text-green-500'
              }`}>
                {strength.label}
              </span>
            </div>
            <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${(strength.score / 6) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{strength.feedback}</p>
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-600 mb-1">确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="再次输入密码"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleEncrypt}
            disabled={loading}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            {loading ? '加密中...' : '确认加密'}
          </button>
          <button
            onClick={() => { setStep('status'); setError(''); setPassword(''); setConfirmPassword('') }}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  if (step === 'decrypt') {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">解密数据库</h3>
        <p className="text-sm text-gray-500">
          解密后，数据库将恢复为明文存储。请确保在安全的环境下进行此操作。
        </p>
        <div>
          <label className="block text-sm text-gray-600 mb-1">输入密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="请输入加密密码"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleDecrypt}
            disabled={loading}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            {loading ? '解密中...' : '确认解密'}
          </button>
          <button
            onClick={() => { setStep('status'); setError(''); setPassword('') }}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  if (step === 'changePassword') {
    const strength = password ? checkPasswordStrength(password) : null

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">修改密码</h3>
        <p className="text-sm text-gray-500">修改加密数据库的访问密码</p>
        <div>
          <label className="block text-sm text-gray-600 mb-1">旧密码</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="请输入旧密码"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">新密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="请输入新密码"
          />
        </div>
        {strength && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-600">密码强度:</span>
              <span className={`text-sm font-medium ${
                strength.score <= 2 ? 'text-red-500' :
                strength.score <= 3 ? 'text-yellow-600' :
                strength.score <= 4 ? 'text-blue-500' : 'text-green-500'
              }`}>
                {strength.label}
              </span>
            </div>
            <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${(strength.score / 6) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{strength.feedback}</p>
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="再次输入新密码"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            {loading ? '修改中...' : '确认修改'}
          </button>
          <button
            onClick={() => { setStep('status'); setError(''); setOldPassword(''); setPassword(''); setConfirmPassword('') }}
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
      <h3 className="font-semibold text-gray-800">数据库加密</h3>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${status.encrypted ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-600">
          {status.encrypted ? '已加密' : '未加密'}
        </span>
      </div>
      <p className="text-sm text-gray-500">
        {status.encrypted
          ? '您的数据库已使用 SQLCipher 加密保护。每次打开应用时需要输入密码才能访问数据。'
          : '您的数据库当前未加密。建议启用加密以保护您的隐私数据。'}
      </p>
      <div className="space-y-2">
        {!status.encrypted && (
          <button
            onClick={() => setStep('encrypt')}
            className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-left"
          >
            🔒 启用加密
          </button>
        )}
        {status.encrypted && (
          <>
            <button
              onClick={() => setStep('changePassword')}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-left"
            >
              🔑 修改密码
            </button>
            <button
              onClick={() => setStep('decrypt')}
              className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors text-left"
            >
              ❌ 禁用加密
            </button>
          </>
        )}
      </div>
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          注意：加密操作会创建数据库备份，失败时自动回滚。请确保在操作前备份重要数据。
        </p>
      </div>
    </div>
  )
}