import { format } from 'date-fns'
import type { EventItem } from '../../shared/types'

interface EventCardProps {
  event: EventItem
  onClick?: (event: EventItem) => void
}

function moodIcon(mood?: number): string {
  if (mood == null) return ''
  if (mood <= 2) return '😢'
  if (mood <= 4) return '😐'
  if (mood <= 6) return '🙂'
  if (mood <= 8) return '😊'
  return '😄'
}

export default function EventCard({ event, onClick }: EventCardProps) {
  const dateStr = event.event_date
    ? format(new Date(event.event_date + 'T00:00:00'), 'yyyy年MM月dd日')
    : ''

  return (
    <div
      onClick={() => onClick?.(event)}
      className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer flex gap-3"
    >
      <div className="w-1 bg-primary-500 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-800 truncate">{event.title}</h3>
          {event.mood != null && (
            <span className="text-xl flex-shrink-0" title={`心情: ${event.mood}/10`}>
              {moodIcon(event.mood)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
          {dateStr && <span>{dateStr}</span>}
          {event.event_time && <span>{event.event_time}</span>}
          {event.location && (
            <span className="truncate max-w-[200px]">📍 {event.location}</span>
          )}
        </div>
        {event.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
        )}
      </div>
    </div>
  )
}
