import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Result, EventItem } from '../shared/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState<EventItem[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEvents, setSelectedEvents] = useState<EventItem[]>([])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`
    window.electronAPI.event.list({ start_date: start, end_date: end }).then((res: Result<EventItem[]>) => {
      if (res.success) {
        setEvents(res.data)
      }
    })
  }, [year, month])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const e of events) {
      const dateStr = e.event_date.substring(0, 10)
      if (!map.has(dateStr)) map.set(dateStr, [])
      map.get(dateStr)!.push(e)
    }
    return map
  }, [events])

  const calendarDays: { day: number; dateStr: string; isToday: boolean; events: EventItem[] }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarDays.push({
      day: d,
      dateStr,
      isToday: dateStr === todayStr,
      events: eventsByDate.get(dateStr) || [],
    })
  }

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1))
  const handleToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))

  const handleDayClick = (dateStr: string, dayEvents: EventItem[]) => {
    setSelectedDate(dateStr === selectedDate ? null : dateStr)
    setSelectedEvents(dayEvents)
  }

  const handleCreateEvent = () => {
    if (!selectedDate) return
    navigate(`/timeline?date=${selectedDate}`)
  }

  return (
    <div className="p-6 page-enter">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">日历</h1>
        <p className="text-gray-500 text-sm mt-1">查看和管理日程事件</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-lg font-semibold text-gray-800 min-w-[140px] text-center">
                  {year}年 {MONTHS[month]}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 border border-primary-200 rounded-md transition-colors"
              >
                今天
              </button>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEKDAYS.map((w) => (
                <div key={w} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-50" />
              ))}
              {calendarDays.map((day) => {
                const isSelected = selectedDate === day.dateStr
                return (
                  <div
                    key={day.dateStr}
                    onClick={() => handleDayClick(day.dateStr, day.events)}
                    className={`min-h-[80px] border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors hover:bg-gray-50 ${
                      isSelected ? 'bg-primary-50 ring-2 ring-inset ring-primary-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1">
                      <span
                        className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          day.isToday
                            ? 'bg-primary-500 text-white'
                            : isSelected
                              ? 'text-primary-600'
                              : 'text-gray-700'
                        }`}
                      >
                        {day.day}
                      </span>
                    </div>
                    {day.events.length > 0 && (
                      <div className="space-y-0.5">
                        {day.events.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            className="text-[10px] px-1 py-0.5 bg-primary-100 text-primary-700 rounded truncate leading-tight"
                            title={e.title}
                          >
                            {e.title}
                          </div>
                        ))}
                        {day.events.length > 2 && (
                          <div className="text-[10px] text-gray-400 text-center">
                            +{day.events.length - 2} 更多
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">{selectedDate}</h3>
                <button
                  onClick={handleCreateEvent}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  添加事件
                </button>
              </div>
              <div className="p-3">
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">当天无事件</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e) => (
                      <div
                        key={e.id}
                        className="p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/timeline?event=${e.id}`)}
                      >
                        <p className="text-sm font-medium text-gray-800">{e.title}</p>
                        {e.event_time && (
                          <p className="text-xs text-gray-400 mt-0.5">{e.event_time.substring(0, 5)}</p>
                        )}
                        {e.location && (
                          <p className="text-xs text-gray-400 mt-0.5">{e.location}</p>
                        )}
                        {e.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{e.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
