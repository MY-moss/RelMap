import { getDb } from '../connection'
import type {
  Result,
  SearchResults,
  SemanticSearchResults,
  Person,
  EventItem,
  Diary,
  SearchResult,
} from '../../../shared/types'

const SEARCH_LIMIT = 20

// FTS5 查询转义：将 query 中的双引号转义为 ""，再用双引号包裹整个 query
// 这样 query 会作为 phrase query 处理，避免 FTS5 特殊字符（* : ^ ( ) 等）导致语法错误
export function escapeFtsQuery(query: string): string {
  const escaped = query.replace(/"/g, '""')
  return `"${escaped}"`
}

export function searchGlobal(query: string): Result<SearchResults> {
  try {
    const trimmed = query.trim()
    if (!trimmed) {
      return { success: true, data: { persons: [], events: [], diaries: [] } }
    }

    const db = getDb()
    const matchQuery = escapeFtsQuery(trimmed)

    // 通过 persons_fts 的 rowid 关联回 persons 表获取完整 Person 数据
    const persons = db.prepare(`
      SELECT p.* FROM persons_fts
      JOIN persons p ON p.rowid = persons_fts.rowid
      WHERE persons_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(matchQuery, SEARCH_LIMIT) as Person[]

    // 通过 events_fts 的 rowid 关联回 events 表获取完整 EventItem 数据
    const events = db.prepare(`
      SELECT e.* FROM events_fts
      JOIN events e ON e.rowid = events_fts.rowid
      WHERE events_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(matchQuery, SEARCH_LIMIT) as EventItem[]

    // 通过 diaries_fts 的 rowid 关联回 diaries 表获取完整 Diary 数据
    const diaries = db.prepare(`
      SELECT d.* FROM diaries_fts
      JOIN diaries d ON d.rowid = diaries_fts.rowid
      WHERE diaries_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(matchQuery, SEARCH_LIMIT) as Diary[]

    return { success: true, data: { persons, events, diaries } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function semanticSearch(query: string): Result<SemanticSearchResults> {
  try {
    const trimmed = query.trim()
    if (!trimmed) {
      return { success: true, data: { persons: [], events: [], diaries: [] } }
    }

    const db = getDb()
    const matchQuery = escapeFtsQuery(trimmed)

    const persons = db.prepare(`
      SELECT p.*, -fts.rank AS relevance_score FROM
      (SELECT rowid, rank FROM persons_fts WHERE persons_fts MATCH ?) fts
      JOIN persons p ON p.rowid = fts.rowid
      ORDER BY rank
      LIMIT ?
    `).all(matchQuery, SEARCH_LIMIT) as Array<Person & SearchResult>

    const events = db.prepare(`
      SELECT e.*, -fts.rank AS relevance_score FROM
      (SELECT rowid, rank FROM events_fts WHERE events_fts MATCH ?) fts
      JOIN events e ON e.rowid = fts.rowid
      ORDER BY rank
      LIMIT ?
    `).all(matchQuery, SEARCH_LIMIT) as Array<EventItem & SearchResult>

    const diaries = db.prepare(`
      SELECT d.*, -fts.rank AS relevance_score FROM
      (SELECT rowid, rank FROM diaries_fts WHERE diaries_fts MATCH ?) fts
      JOIN diaries d ON d.rowid = fts.rowid
      ORDER BY rank
      LIMIT ?
    `).all(matchQuery, SEARCH_LIMIT) as Array<Diary & SearchResult>

    return { success: true, data: { persons, events, diaries } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
