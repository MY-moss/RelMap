import { randomUUID } from 'node:crypto'
import { getDb } from '../connection'
import type {
  Result,
  Relationship,
  CreateRelationDto,
  UpdateRelationDto,
  GraphData,
  GraphNode,
  GraphEdge,
  IntimacyDistribution,
} from '../../../shared/types'

/** 判断是否为 UNIQUE 约束冲突 */
function isUniqueConstraintError(e: unknown): boolean {
  const err = e as Error & { code?: string }
  return err.code === 'SQLITE_CONSTRAINT_UNIQUE'
}

/** 创建关系 */
export function createRelationship(data: CreateRelationDto): Result<Relationship> {
  try {
    const db = getDb()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO relationships
        (id, person_id, related_person_id, intimacy, meet_method, meet_date, meet_location, relation_label, notes)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.person_id,
      data.related_person_id,
      data.intimacy ?? 50,
      data.meet_method ?? null,
      data.meet_date ?? null,
      data.meet_location ?? null,
      data.relation_label ?? null,
      data.notes ?? null,
    )

    const created = db.prepare(
      'SELECT * FROM relationships WHERE id = ?',
    ).get(id) as Relationship | undefined

    if (!created) {
      return { success: false, error: '插入后未能读取到关系记录' }
    }
    return { success: true, data: created }
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return {
        success: false,
        error: '该关系已存在（person_id 与 related_person_id 组合必须唯一）',
      }
    }
    return { success: false, error: (e as Error).message }
  }
}

/** 更新关系 */
export function updateRelationship(
  id: string,
  data: UpdateRelationDto,
): Result<Relationship> {
  try {
    const db = getDb()

    const existing = db.prepare(
      'SELECT * FROM relationships WHERE id = ?',
    ).get(id) as Relationship | undefined

    if (!existing) {
      return { success: false, error: `关系 ${id} 不存在` }
    }

    db.prepare(`
      UPDATE relationships
      SET
        person_id         = ?,
        related_person_id = ?,
        intimacy          = ?,
        meet_method       = ?,
        meet_date         = ?,
        meet_location     = ?,
        relation_label    = ?,
        notes             = ?,
        updated_at        = datetime('now','localtime')
      WHERE id = ?
    `).run(
      data.person_id ?? existing.person_id,
      data.related_person_id ?? existing.related_person_id,
      data.intimacy ?? existing.intimacy,
      data.meet_method ?? existing.meet_method ?? null,
      data.meet_date ?? existing.meet_date ?? null,
      data.meet_location ?? existing.meet_location ?? null,
      data.relation_label ?? existing.relation_label ?? null,
      data.notes ?? existing.notes ?? null,
      id,
    )

    const updated = db.prepare(
      'SELECT * FROM relationships WHERE id = ?',
    ).get(id) as Relationship | undefined

    if (!updated) {
      return { success: false, error: '更新后未能读取到关系记录' }
    }
    return { success: true, data: updated }
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return {
        success: false,
        error: '该关系已存在（person_id 与 related_person_id 组合必须唯一）',
      }
    }
    return { success: false, error: (e as Error).message }
  }
}

/** 删除关系 */
export function deleteRelationship(id: string): Result<void> {
  try {
    const db = getDb()

    const existing = db.prepare(
      'SELECT id FROM relationships WHERE id = ?',
    ).get(id)

    if (!existing) {
      return { success: false, error: `关系 ${id} 不存在` }
    }

    db.prepare('DELETE FROM relationships WHERE id = ?').run(id)
    return { success: true, data: undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

/** 获取某人的所有关系（包含作为 person_id 或 related_person_id 的记录） */
export function getPersonRelations(personId: string): Result<Relationship[]> {
  try {
    const db = getDb()

    const rows = db.prepare(`
      SELECT * FROM relationships
      WHERE person_id = ? OR related_person_id = ?
      ORDER BY updated_at DESC
    `).all(personId, personId) as Relationship[]

    return { success: true, data: rows }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

/**
 * 获取关系图谱数据
 * - 查询所有 relationships（如提供 minIntimacy，则过滤 intimacy >= minIntimacy）生成 edges
 * - 如提供 limit，则按亲密度降序取前 limit 条 edges，减少大数据量时的内存占用
 * - 查询涉及的 persons 生成 nodes（去重）
 * - 节点的 intimacy 取该 person 在可见边中的最大关系亲密度
 */
export function getGraphData(minIntimacy?: number, limit?: number): Result<GraphData> {
  try {
    const db = getDb()

    // 查询 1：生成 edges（支持 minIntimacy 过滤和 limit 限制，按亲密度降序取前 N 条）
    let edges: GraphEdge[]
    if (minIntimacy !== undefined && limit !== undefined) {
      edges = db
        .prepare(`
          SELECT
            person_id         AS source,
            related_person_id AS target,
            intimacy,
            relation_label
          FROM relationships
          WHERE intimacy >= ?
          ORDER BY intimacy DESC
          LIMIT ?
        `)
        .all(minIntimacy, limit) as GraphEdge[]
    } else if (minIntimacy !== undefined) {
      edges = db
        .prepare(`
          SELECT
            person_id         AS source,
            related_person_id AS target,
            intimacy,
            relation_label
          FROM relationships
          WHERE intimacy >= ?
        `)
        .all(minIntimacy) as GraphEdge[]
    } else if (limit !== undefined) {
      edges = db
        .prepare(`
          SELECT
            person_id         AS source,
            related_person_id AS target,
            intimacy,
            relation_label
          FROM relationships
          ORDER BY intimacy DESC
          LIMIT ?
        `)
        .all(limit) as GraphEdge[]
    } else {
      edges = db
        .prepare(`
          SELECT
            person_id         AS source,
            related_person_id AS target,
            intimacy,
            relation_label
          FROM relationships
        `)
        .all() as GraphEdge[]
    }

    if (edges.length === 0) {
      return { success: true, data: { nodes: [], edges: [] } }
    }

    // 从 edges 中收集所有 person id，并计算每个 person 的最大亲密度
    const personIds = new Set<string>()
    const maxIntimacyMap = new Map<string, number>()
    for (const edge of edges) {
      personIds.add(edge.source)
      personIds.add(edge.target)
      for (const pid of [edge.source, edge.target]) {
        const cur = maxIntimacyMap.get(pid)
        if (cur === undefined || edge.intimacy > cur) {
          maxIntimacyMap.set(pid, edge.intimacy)
        }
      }
    }

    // 查询 2：生成 nodes（仅查询 persons 表获取 name/nickname/is_favorite）
    const idList = Array.from(personIds)
    const placeholders = idList.map(() => '?').join(', ')

    const personRows = db
      .prepare(
        `SELECT id, name, nickname, CAST(is_favorite AS INTEGER) as is_favorite
         FROM persons
         WHERE id IN (${placeholders})`,
      )
      .all(...idList) as {
      id: string
      name: string
      nickname?: string
      is_favorite: 0 | 1
    }[]

    const nodes: GraphNode[] = personRows.map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname ?? undefined,
      intimacy: maxIntimacyMap.get(p.id) ?? 0,
      is_favorite: p.is_favorite !== 0,
    }))

    return { success: true, data: { nodes, edges } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getIntimacyDistribution(): Result<IntimacyDistribution[]> {
  try {
    const db = getDb()
    const rows = db
      .prepare(`SELECT CAST(intimacy / 20 AS INTEGER) AS bucket, COUNT(*) AS count FROM relationships GROUP BY bucket ORDER BY bucket`)
      .all() as { bucket: number; count: number }[]
    return { success: true, data: rows.map(r => ({ bucket: r.bucket, count: r.count })) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
