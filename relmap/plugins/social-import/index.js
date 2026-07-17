let _api = null

function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.replace(/^"|"$/g, '').trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.replace(/^"|"$/g, '').trim())
  return fields
}

function parseLinkedInCSV(csvText) {
  const lines = csvText.split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase())
  const results = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    if (row['first name'] || row['name']) {
      results.push({
        name: [row['first name'], row['last name']].filter(Boolean).join(' '),
        company: row.company || row['company name'] || undefined,
        title: row.position || row.title || undefined,
        notes: [row.email && `邮箱: ${row.email}`, row['phone number'] && `电话: ${row['phone number']}`].filter(Boolean).join('\n') || undefined,
      })
    }
  }
  return results
}

function parseFacebookHTML(htmlText) {
  const names = []
  // Match <a> tags with facebook URLs (modern Facebook data export)
  const linkRegex = /<a[^>]*href="https?:\/\/(?:www\.)?facebook\.com[^"]*"[^>]*>([^<]+)<\/a>/gi
  let match
  while ((match = linkRegex.exec(htmlText)) !== null) {
    const name = match[1].trim()
    if (name && name.length > 1) names.push({ name })
  }
  // Fallback: match <div> with class containing "name"
  if (names.length === 0) {
    const divRegex = /<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/div>/gi
    while ((match = divRegex.exec(htmlText)) !== null) {
      const name = match[1].trim()
      if (name && name.length > 1 && !name.includes('Friend')) names.push({ name })
    }
  }
  return names
}

async function deduplicateAndImport(contacts) {
  const result = await _api.listAllPersons()
  const existing = result.success ? result.data : []
  const existingSet = new Set(existing.map((p) => p.name?.toLowerCase().trim()))
  const toImport = contacts.filter((p) => !existingSet.has(p.name?.toLowerCase().trim()))
  let imported = 0
  for (const person of toImport) {
    await _api.createPerson(person)
    imported++
  }
  return imported
}

export default function setup(api) {
  _api = api

  api.registerIPC('importLinkedIn', async (csvText) => {
    try {
      const contacts = parseLinkedInCSV(csvText)
      const imported = await deduplicateAndImport(contacts)
      if (imported > 0) _api.notify('LinkedIn Import', `已导入 ${imported} 位联系人`)
      return { success: true, data: { total: contacts.length, imported } }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  api.registerIPC('importFacebook', async (htmlText) => {
    try {
      const contacts = parseFacebookHTML(htmlText)
      const imported = await deduplicateAndImport(contacts)
      if (imported > 0) _api.notify('Facebook Import', `已导入 ${imported} 位联系人`)
      return { success: true, data: { total: contacts.length, imported } }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  api.registerIPC('importVCard', async (vcardText) => {
    try {
      const result = await _api.importVCard(vcardText)
      return result
    } catch (err) {
      return { success: false, error: err.message }
    }
  })
}
