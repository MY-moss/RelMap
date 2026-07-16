import { useEffect, useRef } from 'react'

const NOTIFICATION_INTERVAL = 5 * 60 * 1000
const STORAGE_KEY = 'relmap-notified-reminders'

function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set<string>()
  }
}

function saveNotifiedIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore storage errors
  }
}

export function useNotifications() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const checkReminders = async () => {
      if (Notification.permission !== 'granted') return

      try {
        const result = await window.electronAPI.reminder.upcoming(1)
        if (!result.success || !result.data.length) return

        const notifiedIds = getNotifiedIds()
        let hasNew = false

        for (const reminder of result.data) {
          if (!notifiedIds.has(reminder.id)) {
            notifiedIds.add(reminder.id)
            hasNew = true
            const title = reminder.title
            const body = reminder.note || (reminder.person_id ? '有一个联系人相关的提醒' : '有一个待办提醒')
            new Notification(title, { body, icon: '/vite.svg' })
          }
        }

        if (hasNew) {
          saveNotifiedIds(notifiedIds)
        }
      } catch {
        // silent fail for notification polling
      }
    }

    // initial check after a short delay
    const initialTimer = setTimeout(checkReminders, 10_000)

    // periodic polling
    intervalRef.current = setInterval(checkReminders, NOTIFICATION_INTERVAL)

    return () => {
      clearTimeout(initialTimer)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}
