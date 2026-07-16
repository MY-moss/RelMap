import { useState, useEffect } from 'react'

export default function TelemetryConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    window.electronAPI.app.getConfig().then((r) => {
      if (r.success && r.data && r.data.telemetryConsentGiven === undefined) {
        setVisible(true)
      }
    })
  }, [])

  const handleConsent = async (consent: boolean) => {
    await window.electronAPI.app.saveConfig({ telemetryConsentGiven: consent })
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">隐私设置</h2>
        <p className="text-sm text-gray-600 mb-4">
          是否允许 RelMap 收集匿名的使用数据以帮助我们改进产品？
          我们不会收集您的联系人数据或任何可识别个人信息。
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => handleConsent(false)}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            拒绝
          </button>
          <button
            onClick={() => handleConsent(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            同意
          </button>
        </div>
      </div>
    </div>
  )
}
