import { useTranslation } from 'react-i18next'
import { zhCN } from 'date-fns/locale/zh-CN'
import { enUS } from 'date-fns/locale/en-US'

type DateLocale = typeof zhCN

const localeMap: Record<string, DateLocale> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export function useDateFnsLocale(): DateLocale {
  const { i18n } = useTranslation()
  return localeMap[i18n.language] || zhCN
}
