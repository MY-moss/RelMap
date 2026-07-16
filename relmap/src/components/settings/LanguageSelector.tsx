import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en-US', label: 'English' },
]

export default function LanguageSelector() {
  const { t, i18n } = useTranslation()

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await i18n.changeLanguage(e.target.value)
    localStorage.setItem('relmap_lng', e.target.value)
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">{t('settings.language_title')}</h3>
      <p className="text-sm text-gray-500">{t('settings.language_description')}</p>
      <select
        value={i18n.language}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}
