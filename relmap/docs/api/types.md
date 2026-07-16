# 类型定义

所有 IPC 的输入输出类型在 `src/shared/types.ts` 中统一定义。

## 基础类型

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

## 实体类型

### Person

```typescript
interface Person {
  id: string
  name: string
  nickname?: string
  avatar_path?: string
  birthday?: string
  gender: 0 | 1 | 2      // 0=未知, 1=男, 2=女
  company?: string
  title?: string
  department?: string
  notes?: string
  is_favorite: 0 | 1
  is_archived: 0 | 1
  lifecycle_stage?: string  // new|active|maintain|dormant|lost|archived
  created_at: string
  updated_at: string
}
```

### SocialAccount

```typescript
interface SocialAccount {
  id: string
  person_id: string
  platform: string
  account_id: string
  account_name?: string
  is_primary: 0 | 1
  sort_order: number
  created_at: string
}
```

### Relationship

```typescript
interface Relationship {
  id: string
  person_id: string
  related_person_id: string
  intimacy: number          // 0-100
  intimacy_auto?: number
  meet_method?: string
  meet_date?: string
  meet_location?: string
  relation_label?: string
  notes?: string
  created_at: string
  updated_at: string
}
```

### EventItem

```typescript
interface EventItem {
  id: string
  title: string
  event_date: string
  event_time?: string
  description?: string
  location?: string
  mood?: number          // 1-10
  created_at: string
  updated_at: string
}
```

### Diary

```typescript
interface Diary {
  id: string
  title?: string
  content: string
  mood?: number          // 1-10
  weather?: string
  diary_date: string
  created_at: string
  updated_at: string
}
```

### Photo

```typescript
interface Photo {
  id: string
  file_path: string
  thumbnail_path?: string
  file_size?: number
  width?: number
  height?: number
  taken_at?: string
  description?: string
  face_data?: string
  created_at: string
}
```

### Group

```typescript
interface Group {
  id: string
  name: string
  description?: string
  avatar_path?: string
  color: string
  created_at: string
}
```

### Tag

```typescript
interface Tag {
  id: string
  name: string
  color: string
  parent_id?: string
}
```

### InteractionLog

```typescript
interface InteractionLog {
  id: string
  person_id: string
  interact_at: string
  interact_type: 'call' | 'meet' | 'message' | 'social' | 'other'
  summary?: string
  duration?: number
  purpose?: string
  created_at: string
}
```

### Reminder

```typescript
interface Reminder {
  id: string
  person_id?: string
  title: string
  remind_date: string
  remind_year?: number
  repeat_type: 'once' | 'yearly' | 'monthly'
  is_active: 0 | 1
  note?: string
  created_at: string
}
```

## 图谱类型

```typescript
interface GraphNode {
  id: string
  name: string
  nickname?: string
  intimacy: number
  is_favorite: 0 | 1
}

interface GraphEdge {
  source: string
  target: string
  intimacy: number
  relation_label?: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface NodeDetail {
  person: Person
  intimacy: number
  relationships: Array<{
    personId: string
    personName: string
    intimacy: number
    label?: string
  }>
  communityId?: number
  communityName?: string
}

interface CommunityInfo {
  communityId: number
  communityName: string
  memberIds: string[]
  color: string
}
```

## AI 类型

```typescript
interface OcrResult {
  name?: string
  phone?: string
  email?: string
  company?: string
  title?: string
  address?: string
  raw_text: string
}

interface FaceDetection {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  descriptor?: number[]
}

interface KeywordResult {
  keywords: string[]
  topWords: { word: string; count: number }[]
}

interface EmotionResult {
  score: number
  label: 'positive' | 'neutral' | 'negative'
  positiveWords: string[]
  negativeWords: string[]
}

interface SuggestionItem {
  type: 'warning' | 'info' | 'tip'
  message: string
  actionLabel?: string
}

interface PersonalityProfile {
  dominantPurpose: string
  emotionalTone: number
  interactionStyle: Record<string, number>
  relationshipDepth: number
  totalInteractions: number
  purposeDistribution: PurposeDistribution[]
  sentimentTrend: SentimentPoint[]
}

interface IntimacyPrediction {
  currentScore: number
  predictedScore30d: number
  predictedScore90d: number
  trend: 'up' | 'stable' | 'down'
  confidence: number
}

interface BridgePerson {
  personId: string
  personName: string
  betweennessScore: number
  connects: number
}
```

## 备份/导入导出类型

```typescript
interface BackupInfo {
  name: string
  path: string
  size: number
  timestamp: string
  encrypted: boolean
}

interface BackupResult {
  path: string
  size: number
  timestamp: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}
```

## 仪表盘类型

```typescript
interface NetworkStats {
  totalNodes: number
  totalEdges: number
  connectedComponents: number
  avgIntimacy: number
  density: number
}

interface TopRelationship {
  id: string
  person_name: string
  related_person_name: string
  intimacy: number
  relation_label?: string
}
```

## ElectronAPI

完整的 `ElectronAPI` 接口定义请参考 `src/shared/types.ts` 中的 `ElectronAPI` 接口，包含了所有 IPC 方法的方法签名和参数类型。
