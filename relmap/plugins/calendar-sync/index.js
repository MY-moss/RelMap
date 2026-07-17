const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const DEFAULT_DAYS_BACK = 30
const DEFAULT_DAYS_FORWARD = 90
let syncInterval = null
let selectedCalendars = []
let lastSyncTime = null
let daysBack = DEFAULT_DAYS_BACK
let daysForward = DEFAULT_DAYS_FORWARD
let _api = null

async function getToken() {
  const result = await _api.getToken('google-calendar')
  if (!result.success) throw new Error('Not authenticated: ' + result.error)
  return result.data
}

async function fetchCalendarList() {
  const token = await getToken()
  const res = await _api.fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Calendar list error: ${res.status}`)
  return res.json()
}

async function fetchEvents(calendarId) {
  const token = await getToken()
  const params = new URLSearchParams({
    timeMin: new Date(Date.now() - daysBack * 86400000).toISOString(),
    timeMax: new Date(Date.now() + daysForward * 86400000).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  const res = await _api.fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Events error: ${res.status}`)
  return res.json()
}

function mapEvent(calEvent, calSummary) {
  const startDate = calEvent.start?.dateTime || calEvent.start?.date
  return {
    title: `[日历] ${calEvent.summary || '无标题'}`,
    event_date: startDate ? startDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
    event_time: startDate ? startDate.substring(11, 16) : undefined,
    description: [calEvent.description, calSummary ? `日历: ${calSummary}` : '', calEvent.htmlLink ? `链接: ${calEvent.htmlLink}` : ''].filter(Boolean).join('\n\n'),
    location: calEvent.location || undefined,
    _eventId: calEvent.id,
  }
}

async function runSync() {
  try {
    _api.logger.info('Starting calendar sync...')
    const calendars = await fetchCalendarList()
    const items = calendars.items || []
    const targetCalendars = selectedCalendars.length > 0
      ? items.filter((c) => selectedCalendars.includes(c.id))
      : items.filter((c) => c.selected !== false)

    let synced = 0
    for (const cal of targetCalendars) {
      const events = await fetchEvents(cal.id)
      for (const ev of events.items || []) {
        const existing = await _api.findEventByExternalId(ev.id)
        if (!existing.success || !existing.data) {
          const created = await _api.createEvent(mapEvent(ev, cal.summary))
          if (created.success && created.data?.id) {
            await _api.setExternalId(created.data.id, 'event', ev.id)
          }
          synced++
        }
      }
    }
    lastSyncTime = new Date().toISOString()
    _api.logger.info(`Calendar sync complete: ${synced} new events`)
    if (synced > 0) _api.notify('Calendar Sync', `已同步 ${synced} 个事件`)
  } catch (err) {
    _api.logger.error(`Calendar sync failed: ${err.message}`)
  }
}

export default function setup(api) {
  _api = api

  api.registerIPC('sync', async () => {
    await runSync()
    return { success: true }
  })

  api.registerIPC('syncStatus', async () => {
    return { success: true, data: { lastSync: lastSyncTime || 'never' } }
  })

  api.registerIPC('selectCalendars', async (calendarIds) => {
    selectedCalendars = calendarIds || []
    await _api.setConfig('selectedCalendars', selectedCalendars)
    return { success: true }
  })

  api.registerIPC('getRange', async () => {
    return { success: true, data: { daysBack, daysForward } }
  })

  api.registerIPC('setRange', async (data) => {
    if (data && typeof data.daysBack === 'number') daysBack = Math.max(1, Math.min(365, data.daysBack))
    if (data && typeof data.daysForward === 'number') daysForward = Math.max(1, Math.min(365, data.daysForward))
    await _api.setConfig('daysBack', daysBack)
    await _api.setConfig('daysForward', daysForward)
    _api.logger.info(`Sync range updated: ${daysBack}d back, ${daysForward}d forward`)
    return { success: true }
  })

  api.on('app:ready', async () => {
    const saved = await _api.getConfig('selectedCalendars')
    if (saved) selectedCalendars = saved
    const savedBack = await _api.getConfig('daysBack')
    if (typeof savedBack === 'number') daysBack = savedBack
    const savedForward = await _api.getConfig('daysForward')
    if (typeof savedForward === 'number') daysForward = savedForward
    _api.logger.info('Calendar sync plugin ready')
    syncInterval = setInterval(() => runSync(), 60 * 60 * 1000)
  })
}
