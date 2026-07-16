import { format, parseISO } from 'date-fns'
import type { Diary } from '../../shared/types'
import DiaryInsights from './DiaryInsights'

interface DiaryCardProps {
  diary: Diary
  onClick?: (diary: Diary) => void
}

function moodEmoji(mood?: number): string {
  if (mood === undefined) return ''
  if (mood <= 2) return '😢'
  if (mood <= 4) return '😟'
  if (mood <= 6) return '😐'
  if (mood <= 8) return '🙂'
  return '😊'
}

export default function DiaryCard({ diary, onClick }: DiaryCardProps) {
  const formattedDate = (() => {
    try {
      return format(parseISO(diary.diary_date), 'yyyy年MM月dd日')
    } catch {
      return diary.diary_date
    }
  })()

  const preview =
    diary.content.length > 100
      ? diary.content.slice(0, 100) + '...'
      : diary.content

  return (
    <div
      onClick={() => onClick?.(diary)}
      className={`bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 truncate">
          {diary.title || '无标题'}
        </h3>
        {diary.mood !== undefined && (
          <span
            title={`心情 ${diary.mood}/10`}
            className="text-lg shrink-0"
          >
            {moodEmoji(diary.mood)}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-2">{formattedDate}</p>

      <p className="text-gray-600 text-sm line-clamp-2 whitespace-pre-wrap break-words">
        {preview}
      </p>

      {diary.weather && (
        <div className="mt-3">
          <span className="inline-block text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-full">
            {diary.weather}
          </span>
        </div>
      )}

      <DiaryInsights diaryId={diary.id} content={diary.content} />
    </div>
  )
}
