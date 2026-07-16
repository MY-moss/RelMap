import { useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Home, ClipboardList, Users, Share2, Bot, BarChart3,
  Timeline, Image, Settings, HelpCircle, Calendar
} from 'lucide-react'
import GlobalSearch from '../search/GlobalSearch'
import RewardButton from '../common/RewardButton'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useMainPerson } from '../../hooks'

const navItems = [
  { to: '/', labelKey: 'home', icon: Home },
  { to: '/follow-up', labelKey: 'follow_up', icon: ClipboardList },
  { to: '/persons', labelKey: 'persons', icon: Users },
  { to: '/graph', labelKey: 'graph', icon: Share2 },
  { to: '/ai', labelKey: 'ai_assistant', icon: Bot },
  { to: '/analytics', labelKey: 'analytics', icon: BarChart3 },
  { to: '/timeline', labelKey: 'timeline', icon: Timeline },
  { to: '/photos', labelKey: 'photos', icon: Image },
  { to: '/settings', labelKey: 'settings', icon: Settings },
  { to: '/help', labelKey: 'help', icon: HelpCircle },
  { to: '/wrapped', labelKey: 'wrapped', icon: Calendar },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()
  const { data: mainPerson } = useMainPerson()

  useKeyboardShortcuts(navigate, searchRef)

  return (
    <div className="flex h-screen app-bg">
      <aside
        className="sidebar-glass flex flex-col items-center py-3 gap-0.5"
        style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)' }}
      >
        {/* 主身份头像 */}
        <div className="relative mb-2 mt-1 flex-shrink-0">
          <div
            onClick={() => mainPerson ? navigate(`/persons/${mainPerson.id}`) : navigate('/persons')}
            title={mainPerson?.name || t('nav.set_main_identity_hint')}
            className="avatar-ring w-10 h-10"
          >
            <div className="avatar-inner">
              {mainPerson?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
          {/* 在线指示点 */}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-gray-800 rounded-full" />
        </div>

        {/* 分隔线 */}
        <div className="w-7 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-600 to-transparent mb-1" />

        {/* 导航项 */}
        <nav className="enter-stagger flex flex-col items-center gap-0.5">
          {navItems.map((item) => {
            const label = t(`nav.${item.labelKey}`)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                title={label}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className="nav-icon"
                    />
                    <span className="nav-label">{label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="flex-1" />
        <RewardButton />
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部搜索栏 */}
        <div className="search-bar-glass px-6 py-3 flex-shrink-0">
          <GlobalSearch ref={searchRef} />
        </div>
        {/* 页面内容 */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
