import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3-multiple-ciphers'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.resolve(__dirname, '../data/relmap.db')

const FIRST_NAMES = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '胡', '朱', '郭', '何', '罗', '高', '林']
const LAST_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '桂英', '文']
const COMPANIES = ['阿里巴巴', '腾讯', '百度', '字节跳动', '华为', '小米', '京东', '网易', '美团', '滴滴', '快手', '中兴', 'OPPO', 'vivo', '小红书']
const TITLES = ['工程师', '经理', '总监', '主管', '设计师', '分析师', '架构师', '总裁', '总经理', '专员']
const PLATFORMS = ['phone', 'email', 'wechat', 'whatsapp', 'telegram']

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1).getTime()
  const end = new Date(endYear, 11, 31).getTime()
  const date = new Date(start + Math.random() * (end - start))
  return date.toISOString().split('T')[0]
}

function generatePerson(index) {
  const name = randomPick(FIRST_NAMES) + randomPick(LAST_NAMES)
  return {
    id: randomUUID(),
    name,
    nickname: Math.random() > 0.7 ? `${name}${randomInt(1, 99)}` : null,
    company: Math.random() > 0.4 ? randomPick(COMPANIES) : null,
    title: Math.random() > 0.5 ? randomPick(TITLES) : null,
    birthday: Math.random() > 0.6 ? randomDate(1960, 2005) : null,
    gender: randomInt(0, 2),
    is_favorite: Math.random() > 0.8 ? 1 : 0,
    is_archived: 0,
    notes: Math.random() > 0.7 ? `这是第${index}个测试联系人` : null,
    lifecycle_stage: 'active',
    created_at: randomDate(2024, 2026),
    updated_at: new Date().toISOString(),
  }
}

function main() {
  const count = parseInt(process.argv[2] || '100', 10)

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`)
    console.error('Please run the app first to create the database.')
    process.exit(1)
  }

  const db = new Database(DB_PATH)
  console.log(`Generating ${count} test persons...`)

  const insert = db.prepare(`
    INSERT OR IGNORE INTO persons (id, name, nickname, company, title, birthday, gender, is_favorite, is_archived, notes, lifecycle_stage, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertSocial = db.prepare(`
    INSERT OR IGNORE INTO social_accounts (id, person_id, platform, account_id, account_name, is_primary, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertRelation = db.prepare(`
    INSERT OR IGNORE INTO relationships (id, person_id, related_person_id, intimacy)
    VALUES (?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      const person = generatePerson(i)
      insert.run(
        person.id, person.name, person.nickname, person.company,
        person.title, person.birthday, person.gender, person.is_favorite,
        person.is_archived, person.notes, person.lifecycle_stage,
        person.created_at, person.updated_at
      )

      const numSocial = randomInt(0, 3)
      for (let j = 0; j < numSocial; j++) {
        const platform = randomPick(PLATFORMS)
        insertSocial.run(
          randomUUID(), person.id, platform,
          `${person.name}${platform}${randomInt(1, 999)}`,
          person.name, j === 0 ? 1 : 0, j
        )
      }
    }

    const allIds = db.prepare('SELECT id FROM persons').all().map(r => r.id)
    const numRelations = Math.min(count * 2, allIds.length * (allIds.length - 1) / 2)
    const existingPairs = new Set()

    for (let i = 0; i < numRelations; i++) {
      const idx1 = randomInt(0, allIds.length - 1)
      const idx2 = randomInt(0, allIds.length - 1)
      if (idx1 === idx2) continue

      const [a, b] = idx1 < idx2 ? [allIds[idx1], allIds[idx2]] : [allIds[idx2], allIds[idx1]]
      const key = `${a}:${b}`
      if (existingPairs.has(key)) continue
      existingPairs.add(key)

      insertRelation.run(randomUUID(), a, b, randomInt(1, 100))
    }
  })

  transaction()
  console.log(`✅ Generated ${count} test persons with social accounts and relationships.`)
  db.close()
}

main()
