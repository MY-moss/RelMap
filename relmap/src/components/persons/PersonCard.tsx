import { useEffect, useState, memo } from 'react'
import type { Person, Tag } from '../../shared/types'

// 将本地文件路径转换为可用的 file:// URL
function avatarPathToUrl(avatarPath: string): string {
  return `file:///${avatarPath.replace(/\\/g, '/').replace(/^\//, '')}`
}

interface PersonCardProps {
  person: Person
  onClick?: (id: string) => void
  onToggleFavorite?: (id: string) => void
}

// 根据亲密度值返回对应的颜色（0-100）
function getIntimacyColor(value: number): string {
  if (value >= 71) return 'bg-green-500'
  if (value >= 31) return 'bg-yellow-500'
  return 'bg-gray-400'
}

// 根据亲密度值返回对应的文字标签
function getIntimacyLabel(value: number): string {
  if (value >= 71) return '亲密'
  if (value >= 31) return '熟悉'
  return '一般'
}

const PersonCard = memo(function PersonCard({ person, onClick, onToggleFavorite }: PersonCardProps) {
  const initial = person.name?.charAt(0)?.toUpperCase() || '?'
  const isFavorite = person.is_favorite

  // 公司信息：company 与 title 组合显示
  const companyTitle = [person.company, person.title].filter(Boolean).join(' · ')

  // 亲密度（异步加载，避免阻塞首屏）
  const [intimacy, setIntimacy] = useState<number | null>(null)
  // 标签（异步加载，最多展示前 4 个 + 溢出计数）
  const [tags, setTags] = useState<Tag[]>([])
  const [totalTagCount, setTotalTagCount] = useState(0)
  // 头像图片加载失败时回退到首字母占位
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const loadExtra = async () => {
        try {
          const [intimacyRes, tagsRes] = await Promise.all([
            window.electronAPI.ai.calculateIntimacy(person.id),
            window.electronAPI.tag.listByTarget(person.id, 'person'),
          ])
          if (cancelled) return
          if (intimacyRes.success) {
            setIntimacy(intimacyRes.data.total)
          }
          if (tagsRes.success) {
            setTotalTagCount(tagsRes.data.length)
            setTags(tagsRes.data.slice(0, 4))
          }
        } catch {
          // silent
        }
      }
      await loadExtra()
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [person.id])

  // 头像路径变化时重置错误状态（如上传新头像后）
  useEffect(() => {
    setAvatarError(false)
  }, [person.avatar_path])

  const handleClick = () => {
    onClick?.(person.id)
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(person.id)
  }

  return (
    <div
      onClick={handleClick}
      className="card p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-start gap-3">
        {/* 头像：有图片则显示，加载失败或无图片时回退到首字母占位 */}
        <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
          {person.avatar_path && !avatarError ? (
            <img
              src={avatarPathToUrl(person.avatar_path)}
              alt={person.name}
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            initial
          )}
        </div>

        {/* 信息区 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-800 truncate">{person.name}</h3>
            <button
              onClick={handleToggleFavorite}
              className="flex-shrink-0 text-gray-300 hover:text-primary-500 transition-colors"
              title={isFavorite ? '取消收藏' : '添加收藏'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                className={`w-5 h-5 ${isFavorite ? 'text-primary-500' : ''}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          </div>

          {person.nickname && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{person.nickname}</p>
          )}

          {companyTitle && (
            <p className="text-sm text-gray-600 truncate mt-1">{companyTitle}</p>
          )}

          {/* 亲密度小条 */}
          {intimacy !== null && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>亲密度</span>
                <span className="font-medium">
                  {getIntimacyLabel(intimacy)} · {intimacy}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getIntimacyColor(intimacy)}`}
                  style={{ width: `${intimacy}%` }}
                />
              </div>
            </div>
          )}

          {/* 标签 chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: tag.color
                      ? `${tag.color}20`
                      : '#f3f4f6',
                    color: tag.color || '#6b7280',
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {totalTagCount > 4 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-400 bg-gray-50">
                  +{totalTagCount - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default PersonCard
