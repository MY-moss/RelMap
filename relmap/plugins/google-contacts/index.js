const GOOGLE_PEOPLE_API = 'https://people.googleapis.com/v1/people/me/connections'
const PAGE_SIZE = 200
let syncInterval = null
let lastSyncToken = null
let _api = null

async function getToken() {
  const result = await _api.getToken('google-contacts')
  if (!result.success) throw new Error('Not authenticated: ' + result.error)
  return result.data
}

async function fetchConnections(pageToken) {
  const token = await getToken()
  const params = new URLSearchParams({
    pageSize: PAGE_SIZE,
    personFields: 'names,emailAddresses,phoneNumbers,photos,addresses,organizations,biographies',
    ...(pageToken ? { pageToken } : {}),
    ...(lastSyncToken ? { syncToken: lastSyncToken } : {}),
  })
  const url = `${GOOGLE_PEOPLE_API}?${params}`
  const res = await _api.fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

function mapContact(contact) {
  const names = contact.names?.[0]
  const email = contact.emailAddresses?.[0]?.value
  const phone = contact.phoneNumbers?.[0]?.value
  const address = contact.addresses?.[0]?.formattedValue
  const org = contact.organizations?.[0]
  const bio = contact.biographies?.[0]?.value
  const notes = [phone && `电话: ${phone}`, email && `邮箱: ${email}`, bio].filter(Boolean).join('\n')
  return {
    name: names?.displayName || names?.givenName || email || phone || 'Unknown',
    nickname: names?.givenName || undefined,
    company: org?.name || undefined,
    title: org?.title || undefined,
    home_address: address || undefined,
    notes: notes || undefined,
    _resourceName: contact.resourceName,
    _etag: contact.etag,
  }
}

async function runSync() {
  try {
    _api.logger.info('Starting Google Contacts sync...')
    let pageToken = null
    let synced = 0
    let skipped = 0
    let lastResult = null

    do {
      const data = await fetchConnections(pageToken)
      const connections = data.connections || []
      for (const contact of connections) {
        const personData = mapContact(contact)
        const existing = await _api.findByResourceName(contact.resourceName)
        if (existing.success && existing.data) {
          skipped++
        } else {
          const created = await _api.createPerson(personData)
          if (created.success && created.data?.id) {
            await _api.setExternalId(created.data.id, 'person', personData._resourceName, JSON.stringify({ etag: personData._etag }))
          }
          synced++
        }
      }
      pageToken = data.nextPageToken
      lastResult = data
    } while (pageToken)

    if (lastResult?.nextSyncToken) lastSyncToken = lastResult.nextSyncToken
    _api.logger.info(`Sync complete: ${synced} imported, ${skipped} skipped`)
    if (synced > 0) _api.notify('Google Contacts', `已同步 ${synced} 位联系人`)
  } catch (err) {
    _api.logger.error(`Sync failed: ${err.message}`)
  }
}

export default function setup(api) {
  _api = api

  api.registerIPC('sync', async () => {
    await runSync()
    return { success: true }
  })

  api.registerIPC('syncStatus', async () => {
    return { success: true, data: { lastSync: lastSyncToken ? 'synced' : 'never' } }
  })

  api.on('app:ready', async () => {
    _api.logger.info('Google Contacts plugin ready')
    await runSync()
    syncInterval = setInterval(() => runSync(), 30 * 60 * 1000)
  })
}
