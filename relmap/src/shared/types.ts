// RelMap 共享类型定义
// 所有 IPC 的输入输出类型统一在此定义

// ==================== 基础类型 ====================

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==================== 实体类型 ====================

export interface Person {
  id: string;
  name: string;
  nickname?: string;
  avatar_path?: string;
  birthday?: string;
  gender: 0 | 1 | 2;
  company?: string;
  title?: string;
  department?: string;
  notes?: string;
  home_address?: string;
  is_favorite: boolean;
  is_archived: boolean;
  is_main_identity: boolean;
  lifecycle_stage?: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  person_id: string;
  platform: string;
  account_id: string;
  account_name?: string;
  is_primary: 0 | 1;
  sort_order: number;
  created_at: string;
}

export interface Relationship {
  id: string;
  person_id: string;
  related_person_id: string;
  intimacy: number;
  intimacy_auto?: number;
  meet_method?: string;
  meet_date?: string;
  meet_location?: string;
  relation_label?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  event_date: string;
  event_time?: string;
  description?: string;
  location?: string;
  mood?: number;
  created_at: string;
  updated_at: string;
}

export interface Diary {
  id: string;
  title?: string;
  content: string;
  mood?: number;
  weather?: string;
  diary_date: string;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  file_path: string;
  thumbnail_path?: string;
  file_size?: number;
  width?: number;
  height?: number;
  taken_at?: string;
  description?: string;
  face_data?: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_path?: string;
  color: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  parent_id?: string;
}

export interface InteractionLog {
  id: string;
  person_id: string;
  interact_at: string;
  interact_type: 'call' | 'meet' | 'message' | 'social' | 'other';
  summary?: string;
  duration?: number;
  purpose?: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  person_id?: string;
  title: string;
  remind_date: string;
  remind_year?: number;
  repeat_type: 'once' | 'yearly' | 'monthly';
  is_active: 0 | 1;
  note?: string;
  created_at: string;
}

// ==================== DTO 类型 ====================

export interface CreatePersonDto {
  name: string;
  nickname?: string | null;
  birthday?: string | null;
  gender?: 0 | 1 | 2;
  company?: string | null;
  title?: string | null;
  department?: string | null;
  notes?: string | null;
  home_address?: string | null;
}

export interface UpdatePersonDto extends Partial<CreatePersonDto> {
  avatar_path?: string | null;
  is_main_identity?: boolean;
}

export interface PersonFilter {
  keyword?: string;
  group_id?: string;
  tag_id?: string;
  min_intimacy?: number;
  max_intimacy?: number;
  is_favorite?: boolean;
  is_archived?: boolean;
  sort_by?: 'name' | 'intimacy' | 'created_at';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CreateSocialAccountDto {
  person_id: string;
  platform: string;
  account_id: string;
  account_name?: string;
  is_primary?: 0 | 1;
  sort_order?: number;
}

export interface UpdateSocialAccountDto extends Partial<CreateSocialAccountDto> {}

export interface CreateGroupDto {
  name: string;
  description?: string;
  color?: string;
}
export interface UpdateGroupDto extends Partial<CreateGroupDto> {}

export interface CreateTagDto {
  name: string;
  color?: string;
  parent_id?: string | null;
}
export interface UpdateTagDto extends Partial<CreateTagDto> {}

export type TagTargetType = 'person' | 'event' | 'diary';

export interface TagTarget {
  target_id: string;
  target_type: string;
}

// ==================== 提醒/交互日志 DTO ====================

export interface CreateReminderDto {
  person_id?: string;
  title: string;
  remind_date: string;
  repeat_type?: 'once' | 'yearly' | 'monthly';
  note?: string;
}

export interface UpdateReminderDto {
  title?: string;
  remind_date?: string;
  repeat_type?: 'once' | 'yearly' | 'monthly';
  is_active?: 0 | 1;
  note?: string;
}

export interface ReminderFilter {
  person_id?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface CreateInteractionLogDto {
  person_id: string;
  interact_at: string;
  interact_type: 'call' | 'meet' | 'message' | 'social' | 'other';
  summary?: string;
  duration?: number;
  purpose?: string;
}

export interface UpdateInteractionLogDto {
  interact_at?: string;
  interact_type?: 'call' | 'meet' | 'message' | 'social' | 'other';
  summary?: string;
  duration?: number;
  purpose?: string;
}

export interface InteractionLogFilter {
  person_id?: string;
  interact_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface LostContactItem {
  person: Person;
  last_interaction: string | null;
  days_since: number;
}
export interface FollowUpItem {
  reminder: Reminder;
  person_name?: string;
  days_overdue: number;
}

export interface FollowUpQueue {
  id: string;
  person_id: string;
  person_name?: string;
  follow_up_type: 'call' | 'meet' | 'message' | 'social' | 'gift' | 'other';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  next_follow_up_date: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFollowUpDto {
  person_id: string;
  follow_up_type?: 'call' | 'meet' | 'message' | 'social' | 'gift' | 'other';
  priority?: 'high' | 'medium' | 'low';
  next_follow_up_date: string;
  note?: string;
}

export interface UpdateFollowUpDto {
  follow_up_type?: 'call' | 'meet' | 'message' | 'social' | 'gift' | 'other';
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in_progress' | 'completed';
  next_follow_up_date?: string;
  note?: string;
}

export interface FollowUpFilter {
  person_id?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'high' | 'medium' | 'low';
  follow_up_type?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'next_follow_up_date' | 'priority';
  sort_order?: 'asc' | 'desc';
}

export interface IntimacyScore {
  person_id: string;
  total: number;
  dimensions: {
    frequency: number;
    recency: number;
    depth: number;
    manual: number;
  };
  details: {
    interaction_count: number;
    last_interaction_date: string | null;
    event_count: number;
    diary_count: number;
    manual_intimacy: number;
  };
}

export interface CreateRelationDto {
  person_id: string;
  related_person_id: string;
  intimacy?: number;
  meet_method?: string;
  meet_date?: string;
  meet_location?: string;
  relation_label?: string;
  notes?: string;
}

export interface UpdateRelationDto extends Partial<CreateRelationDto> {}

export interface CreateEventDto {
  title: string;
  event_date: string;
  event_time?: string | null;
  description?: string | null;
  location?: string | null;
  mood?: number | null;
  person_ids?: string[];
}

export interface UpdateEventDto extends Partial<CreateEventDto> {}

export interface EventFilter {
  person_id?: string;
  start_date?: string;
  end_date?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDiaryDto {
  title?: string | null;
  content: string;
  mood?: number | null;
  weather?: string | null;
  diary_date: string;
  person_ids?: string[];
}

export interface UpdateDiaryDto {
  title?: string | null;
  content?: string;
  mood?: number | null;
  weather?: string | null;
  diary_date?: string;
  person_ids?: string[];
}

export interface DiaryFilter {
  person_id?: string;
  start_date?: string;
  end_date?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

// ==================== 图谱类型 ====================

export interface GraphNode {
  id: string;
  name: string;
  nickname?: string;
  intimacy: number;
  is_favorite: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  intimacy: number;
  relation_label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ==================== 搜索类型 ====================

export interface SearchResults {
  persons: Person[];
  events: EventItem[];
  diaries: Diary[];
}

export interface SearchResult {
  relevance_score: number;
}

export type SemanticSearchResults = {
  persons: Array<Person & SearchResult>;
  events: Array<EventItem & SearchResult>;
  diaries: Array<Diary & SearchResult>;
};

// ==================== AI 类型 ====================

export interface OcrResult {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  address?: string;
  raw_text: string;
}

export interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  descriptor?: number[];
}

// ==================== 备份/导入导出 类型 ====================

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  timestamp: string;
  encrypted: boolean;
}

export interface BackupResult {
  path: string;
  size: number;
  timestamp: string;
}

export interface RestoreResult {
  restored: boolean;
  timestamp: string;
}

export interface ParsedContact {
  name: string;
  nickname?: string;
  company?: string;
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ==================== 消息模板 类型 ====================

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateDto {
  name: string;
  content: string;
  category?: string;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {}

// ==================== AI文本分析 类型 ====================

export interface KeywordResult {
  keywords: string[];
  topWords: { word: string; count: number }[];
}

export interface EmotionResult {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  positiveWords: string[];
  negativeWords: string[];
}

export interface DiaryAnalysis {
  keywords: string[];
  emotion: EmotionResult;
}

export interface DuplicateCandidate {
  person_id: string;
  person_name: string;
  similarity: number;
  reasons: string[];
}

export interface DuplicateResult {
  new_person: { name: string; company?: string; phone?: string; email?: string };
  duplicates: DuplicateCandidate[];
}

// ==================== 亲密度评分 ====================

export interface IntimacyDistribution {
  bucket: number
  count: number
}

// ==================== Wrapped 年度总结 ====================

export interface WrappedReport {
  year: number
  summary: {
    totalPersons: number
    newPersons: number
    totalEvents: number
    totalDiaries: number
    totalInteractions: number
    totalPhotos: number
    totalRelationships: number
    newRelationshipsThisYear: number
    avgIntimacy: number
  }
  highlights: {
    topContact: { name: string; intimacy: number; interactionCount: number } | null
    mostImproved: { name: string; intimacyStart: number; intimacyEnd: number } | null
    mostActiveMonth: { month: string; count: number }
    longestFriendship: { name: string; years: number }
    bestFriend: { name: string; totalInteractions: number }
    mostPurposeful: { name: string; purpose: string; count: number } | null
  }
  streaks: {
    longestStreak: { days: number; endDate: string }
    currentStreak: number
  }
  trends: {
    monthlyInteractions: { month: string; count: number }[]
    intimacyGrowth: { name: string; start: number; end: number }[]
    interactionTypeBreakdown: { type: string; count: number }[]
    topContacts: { name: string; interactionCount: number; intimacy: number }[]
    weekdayDistribution: { weekday: string; count: number }[]
    monthlyComparison: { month: string; currentYear: number; lastYear: number }[]
    groupDistribution: { name: string; count: number }[]
  }
}
// ==================== 记忆胶囊 ====================

export interface MemoryCapsuleItem {
  type: 'event' | 'diary'
  id: string
  title: string
  content: string
  date: string
  year: number
}

// ==================== 图谱增强 类型 ====================

export interface NodeDetail {
  person: Person
  intimacy: number
  relationships: Array<{ personId: string; personName: string; intimacy: number; label?: string }>
  communityId?: number
  communityName?: string
}

export interface CommunityInfo {
  communityId: number
  communityName: string
  memberIds: string[]
  color: string
}

export interface ExportResult {
  success: boolean
  data: string | null
}

// ==================== 智能分组 类型 ====================

export interface GroupSuggestion {
  group_name: string;
  group_color: string;
  person_ids: string[];
  reason: string;
  similarity: number;
}

export interface SmartGroupingResult {
  suggestions: GroupSuggestion[];
  total_persons: number;
  grouped_persons: number;
  ungrouped_persons: number;
}

// ==================== 分析仪表盘类型 ====================

export interface LifecycleDistribution {
  stage: string
  count: number
}

export interface MonthlyTrend {
  month: string
  count: number
}

export interface NetworkStats {
  totalNodes: number
  totalEdges: number
  connectedComponents: number
  avgIntimacy: number
  density: number
}

export interface TopPurpose {
  purpose: string
  count: number
}

export interface ContactGrowth {
  month: string
  count: number
}

export interface InteractionHeatmapItem {
  date: string
  count: number
}

export interface ActivityDistribution {
  type: string
  count: number
}

export interface TopRelationship {
  id: string
  person_name: string
  related_person_name: string
  intimacy: number
  relation_label?: string
}

// ==================== ElectronAPI 接口 ====================

// ==================== AI建议引擎 类型 ====================

export interface SuggestionItem {
  type: 'warning' | 'info' | 'tip';
  message: string;
  actionLabel?: string;
}

// ==================== 性格分析画像 类型 ====================

export interface PurposeDistribution {
  purpose: string;
  count: number;
}

export interface SentimentPoint {
  date: string;
  score: number;
}

export interface PersonalityProfile {
  dominantPurpose: string;
  emotionalTone: number;
  interactionStyle: Record<string, number>;
  relationshipDepth: number;
  totalInteractions: number;
  purposeDistribution: PurposeDistribution[];
  sentimentTrend: SentimentPoint[];
}

// ==================== 亲密度预测类型 ====================

export interface IntimacyPrediction {
  currentScore: number;
  predictedScore30d: number;
  predictedScore90d: number;
  trend: 'up' | 'stable' | 'down';
  confidence: number;
}

// ==================== 桥接人识别类型 ====================

export interface BridgePerson {
  personId: string;
  personName: string;
  betweennessScore: number;
  connects: number;
}

// ==================== 插件系统 v2 类型 ====================

/** 插件生命周期状态 */
export type PluginStatus = 'installed' | 'loading' | 'loaded' | 'enabled' | 'running' | 'disabled' | 'error'

/** v2 插件 Manifest schema（向后兼容 v1） */
export interface PluginManifest {
  name: string
  version: string
  description?: string
  author?: string
  main: string
  /** v2 新增：声明所需权限（默认拒绝，白名单放行） */
  permissions?: PluginPermission[]
  /** v2 新增：UI 插槽声明 */
  ui?: {
    slots?: string[]
  }
  /** v1 兼容字段：钩子列表（v2 现在真正执行） */
  hooks?: string[]
  /** v1 兼容字段（v2 建议用 actions） */
  ipcHandlers?: string[]
  /** v2 新增：插件暴露的操作列表 */
  actions?: string[]
  /** v2 新增：插件间依赖 */
  dependencies?: Record<string, string>
}

export type PluginPermission =
  | 'db:read'
  | 'db:write'
  | 'network'
  | 'filesystem'
  | 'clipboard'
  | 'notification'
  | 'shell:open'
  | 'ai:inference'

export interface PluginInfo {
  name: string
  version: string
  description: string
  author: string
  enabled: boolean
  status: PluginStatus
  error?: string
  hooks?: string[]
  permissions?: PluginPermission[]
  actions?: string[]
  uiSlots?: string[]
  cpuUsage?: number
  memoryUsage?: number
}

/** 插件暴露给主进程的 API */
export interface PluginAPI {
  registerIPC(channel: string, handler: (...args: unknown[]) => unknown): void
  on(event: string, handler: (...args: unknown[]) => void): void
  off(event: string, handler: (...args: unknown[]) => void): void
  db: {
    query(sql: string, params?: unknown[]): Promise<unknown[]>
    exec(sql: string): Promise<void>
  }
  logger: {
    info(msg: string, ...args: unknown[]): void
    warn(msg: string, ...args: unknown[]): void
    error(msg: string, ...args: unknown[]): void
  }
  fetch(url: string, options?: RequestInit): Promise<Response>
  notify(title: string, body: string): void
  getConfig(key: string): Promise<unknown>
  setConfig(key: string, value: unknown): Promise<void>
  getToken(provider?: string): Promise<Result<string>>
  createPerson(data: Record<string, unknown>): Promise<Result<{ id: string }>>
  updatePerson(id: string, data: Record<string, unknown>): Promise<Result<unknown>>
  listAllPersons(): Promise<Result<Array<{ id: string; name: string }>>>
  createEvent(data: Record<string, unknown>): Promise<Result<{ id: string }>>
  importVCard(vcardText: string): Promise<Result<{ imported: number }>>
  setExternalId(targetId: string, targetType: string, externalId: string, externalData?: string): Promise<Result<{ id: string }>>
  findByResourceName(resourceName: string): Promise<Result<unknown | null>>
  findEventByExternalId(eventId: string): Promise<Result<unknown | null>>
}

export interface PluginManagerAPI {
  scan(): Promise<Result<PluginInfo[]>>
  load(name: string): Promise<Result<boolean>>
  setEnabled(name: string, enabled: boolean): Promise<Result<void>>
  list(): Promise<Result<PluginInfo[]>>
  install(): Promise<Result<PluginInfo>>
  uninstall(name: string): Promise<Result<void>>
  callHandler(pluginName: string, handlerName: string, ...args: unknown[]): Promise<Result<unknown>>
  getStatus(name: string): Promise<Result<PluginInfo | null>>
  getPluginLogs(name: string): Promise<Result<string[]>>
}

export interface ElectronAPI {
  // 安全的 IPC 事件监听方法（仅允许白名单通道），返回取消监听函数
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  person: {
    create(data: CreatePersonDto): Promise<Result<Person>>;
    update(id: string, data: UpdatePersonDto): Promise<Result<Person>>;
    delete(id: string): Promise<Result<void>>;
    getById(id: string): Promise<Result<Person>>;
    list(filter?: PersonFilter): Promise<Result<Person[]>>;
    toggleFavorite(id: string): Promise<Result<Person>>;
    setMainIdentity(id: string): Promise<Result<Person>>;
    getMainIdentity(): Promise<Result<Person | null>>;
    uploadAvatar(personId: string, base64Data: string): Promise<Result<string>>;
    getAvatarDataUrl(personId: string): Promise<Result<string | null>>;
  };
  social: {
    create(data: CreateSocialAccountDto): Promise<Result<SocialAccount>>;
    update(id: string, data: UpdateSocialAccountDto): Promise<Result<SocialAccount>>;
    delete(id: string): Promise<Result<void>>;
    listByPerson(personId: string): Promise<Result<SocialAccount[]>>;
    setPrimary(id: string): Promise<Result<SocialAccount>>;
  };
  relation: {
    create(data: CreateRelationDto): Promise<Result<Relationship>>;
    update(id: string, data: UpdateRelationDto): Promise<Result<Relationship>>;
    delete(id: string): Promise<Result<void>>;
    getPersonRelations(personId: string): Promise<Result<Relationship[]>>;
    getGraphData(minIntimacy?: number, limit?: number): Promise<Result<GraphData>>;
    getIntimacyDistribution(): Promise<Result<IntimacyDistribution[]>>;
  };
  event: {
    create(data: CreateEventDto): Promise<Result<EventItem>>;
    update(id: string, data: UpdateEventDto): Promise<Result<EventItem>>;
    delete(id: string): Promise<Result<void>>;
    list(filter?: EventFilter): Promise<Result<EventItem[]>>;
  };
  diary: {
    create(data: CreateDiaryDto): Promise<Result<Diary>>;
    update(id: string, data: UpdateDiaryDto): Promise<Result<Diary>>;
    delete(id: string): Promise<Result<void>>;
    list(filter?: DiaryFilter): Promise<Result<Diary[]>>;
  };
  photo: {
    import(paths: string[]): Promise<Result<Photo[]>>;
    delete(id: string): Promise<Result<void>>;
    batchDelete(ids: string[]): Promise<Result<void>>;
    linkPerson(photoId: string, personIds: string[]): Promise<Result<void>>;
    getPersonPhotos(personId: string): Promise<Result<Photo[]>>;
    listAll(limit?: number, offset?: number): Promise<Result<Photo[]>>;
  };
  search: {
    global(query: string): Promise<Result<SearchResults>>;
    semantic(query: string): Promise<Result<SemanticSearchResults>>;
  };
  group: {
    create(data: CreateGroupDto): Promise<Result<Group>>;
    update(id: string, data: UpdateGroupDto): Promise<Result<Group>>;
    delete(id: string): Promise<Result<void>>;
    getById(id: string): Promise<Result<Group>>;
    list(): Promise<Result<Group[]>>;
    addMembers(groupId: string, personIds: string[]): Promise<Result<void>>;
    removeMember(groupId: string, personId: string): Promise<Result<void>>;
    listMembers(groupId: string): Promise<Result<Person[]>>;
    listPersonGroups(personId: string): Promise<Result<Group[]>>;
  };
  tag: {
    create(data: CreateTagDto): Promise<Result<Tag>>;
    update(id: string, data: UpdateTagDto): Promise<Result<Tag>>;
    delete(id: string): Promise<Result<void>>;
    getById(id: string): Promise<Result<Tag>>;
    list(): Promise<Result<Tag[]>>;
    listByParent(parentId?: string): Promise<Result<Tag[]>>;
    apply(tagId: string, targetId: string, targetType: TagTargetType): Promise<Result<void>>;
    remove(tagId: string, targetId: string, targetType: TagTargetType): Promise<Result<void>>;
    listByTarget(targetId: string, targetType: TagTargetType): Promise<Result<Tag[]>>;
    listTargets(tagId: string): Promise<Result<TagTarget[]>>;
  };
  ai: {
    ocrScan(imagePath: string): Promise<Result<OcrResult>>;
    detectFaces(imagePath: string): Promise<Result<FaceDetection[]>>;
    detectLostContacts(months: number): Promise<Result<LostContactItem[]>>;
    calculateIntimacy(personId: string): Promise<Result<IntimacyScore>>;
    extractKeywords(text: string, topN?: number): Promise<Result<KeywordResult>>;
    analyzeEmotion(text: string): Promise<Result<EmotionResult>>;
    detectDuplicates(newPerson: { name: string; company?: string; phone?: string; email?: string }): Promise<Result<DuplicateResult>>;
    generateGroupSuggestions(): Promise<Result<SmartGroupingResult>>;
  };
  reminder: {
    create(data: CreateReminderDto): Promise<Result<Reminder>>;
    update(id: string, data: UpdateReminderDto): Promise<Result<Reminder>>;
    delete(id: string): Promise<Result<void>>;
    getById(id: string): Promise<Result<Reminder>>;
    list(filter?: ReminderFilter): Promise<Result<Reminder[]>>;
    upcoming(days: number): Promise<Result<Reminder[]>>;
    listFollowUp(): Promise<Result<FollowUpItem[]>>;
  };
  followUp: {
    create(data: CreateFollowUpDto): Promise<Result<FollowUpQueue>>;
    update(id: string, data: UpdateFollowUpDto): Promise<Result<FollowUpQueue>>;
    delete(id: string): Promise<Result<void>>;
    getById(id: string): Promise<Result<FollowUpQueue>>;
    list(filter?: FollowUpFilter): Promise<Result<FollowUpQueue[]>>;
  };
  interaction: {
    create(data: CreateInteractionLogDto): Promise<Result<InteractionLog>>;
    update(id: string, data: UpdateInteractionLogDto): Promise<Result<InteractionLog>>;
    delete(id: string): Promise<Result<void>>;
    list(filter?: InteractionLogFilter): Promise<Result<InteractionLog[]>>;
    listByPerson(personId: string, limit?: number): Promise<Result<InteractionLog[]>>;
    lastDate(personId: string): Promise<Result<string | null>>;
  };
  backup: {
    export(password?: string): Promise<Result<BackupResult>>;
    import(password?: string): Promise<Result<RestoreResult>>;
    list(): Promise<Result<BackupInfo[]>>;
  };
  io: {
    importVCard(vcardText: string): Promise<Result<ImportResult>>;
    importVCardFile(): Promise<Result<ImportResult>>;
    exportCSV(): Promise<Result<string>>;
    exportJSON(mode: 'contacts' | 'all'): Promise<Result<string>>;
  };
  template: {
    create(data: CreateTemplateDto): Promise<Result<MessageTemplate>>;
    update(id: string, data: UpdateTemplateDto): Promise<Result<MessageTemplate>>;
    delete(id: string): Promise<Result<void>>;
    getById(id: string): Promise<Result<MessageTemplate>>;
    list(category?: string): Promise<Result<MessageTemplate[]>>;
  };
  app: {
    hasPin(): Promise<Result<boolean>>;
    getStartupConfig(): Promise<Result<{ hasPin: boolean; config: Record<string, unknown> }>>;
    setPin(pin: string): Promise<Result<void>>;
    verifyPin(pin: string): Promise<Result<boolean>>;
    getConfig(): Promise<Result<Record<string, unknown>>>;
    saveConfig(partial: Record<string, unknown>): Promise<Result<void>>;
    healthCheck(): Promise<Result<HealthReport>>;
  };
  ollama: {
    detect(): Promise<Result<{ available: boolean; models: string[] }>>;
    listModels(): Promise<Result<string[]>>;
  };
  suggestion: {
    generate(personId: string): Promise<Result<SuggestionItem[]>>;
  };
  personality: {
    buildProfile(personId: string): Promise<Result<PersonalityProfile>>;
  };
  intimacy_prediction: {
    predict(personId: string): Promise<Result<IntimacyPrediction>>;
  };
  bridge: {
    detect(topN?: number): Promise<Result<BridgePerson[]>>;
  };
  analytics: {
    getLifecycleDistribution(): Promise<Result<LifecycleDistribution[]>>;
    getMonthlyInteractionTrend(months: number): Promise<Result<MonthlyTrend[]>>;
    getNetworkStats(): Promise<Result<NetworkStats>>;
    getTopPurposes(): Promise<Result<TopPurpose[]>>;
    getContactGrowth(months: number): Promise<Result<ContactGrowth[]>>;
    getInteractionHeatmap(months: number): Promise<Result<InteractionHeatmapItem[]>>;
    getActivityDistribution(): Promise<Result<ActivityDistribution[]>>;
    getTopRelationships(limit: number): Promise<Result<TopRelationship[]>>;
  };
  analysis: {
    analyzeDiary(content: string): Promise<Result<DiaryAnalysis>>;
  };
  wrapped: {
    generate(year: number): Promise<Result<WrappedReport>>;
  };
  clipboard: {
    writeText(text: string): Promise<Result<void>>;
  };
  memory: {
    today(): Promise<Result<MemoryCapsuleItem[]>>;
    random(): Promise<Result<MemoryCapsuleItem>>;
  };
  graph_enhanced: {
    getNodeDetails(personId: string): Promise<Result<NodeDetail>>;
    getCommunities(): Promise<Result<CommunityInfo[]>>;
  };
  graph_export: {
    exportPng(dataUrl: string): Promise<ExportResult>;
    exportJson(graphData: unknown): Promise<ExportResult>;
    exportCsv(edges: Array<{ source: string; target: string; intimacy: number; label?: string }>): Promise<ExportResult>;
    shareSnapshot(graphData: unknown): Promise<ExportResult>;
  };
  db: {
    checkIntegrity(): Promise<Result<IntegrityCheckResult>>;
    checkEncryptionStatus(): Promise<Result<EncryptionStatus>>;
    encrypt(password: string): Promise<Result<EncryptResult>>;
    decrypt(password: string): Promise<Result<EncryptResult>>;
    changePassword(oldPassword: string, newPassword: string): Promise<Result<EncryptResult>>;
    testKey(password: string): Promise<Result<boolean>>;
  };
  plugin: PluginManagerAPI;
  external: {
    set(targetId: string, targetType: string, pluginId: string, externalId: string, externalData?: string): Promise<Result<{ id: string }>>;
    getByExternalId(pluginId: string, externalId: string, targetType: string): Promise<Result<{ target_id: string; external_data?: string } | null>>;
  };
  oauth: {
    getAuthorizeUrl(pluginId: string, provider: string, clientId: string, clientSecret: string): Promise<Result<string>>;
    authorize(pluginId: string, provider: string, clientId: string, clientSecret: string): Promise<Result<{ provider: string; scope: string }>>;
    getToken(pluginId: string, provider: string): Promise<Result<string>>;
    hasCredentials(pluginId: string, provider: string): Promise<Result<boolean>>;
    revoke(pluginId: string, provider: string): Promise<Result<void>>;
  };
  aiChat: {
    chat: (messages: { role: string; content: string }[], provider?: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    chatStream: (messages: { role: string; content: string }[], provider?: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    onChunk: (callback: (data: { text: string; done: boolean }) => void) => () => void;
    getHistory: () => Promise<{ success: boolean; data?: { id: string; title: string; systemPrompt?: string; createdAt: string; updatedAt: string; messageCount: number; lastMessage?: string }[]; error?: string }>;
    getSession: (id: string) => Promise<{ success: boolean; data?: { id: string; title: string; messages: { role: string; content: string }[]; systemPrompt?: string; createdAt: string; updatedAt: string } | null; error?: string }>;
    saveSession: (session: { id?: string; title: string; messages: { role: string; content: string }[]; systemPrompt?: string }) => Promise<{ success: boolean; error?: string }>;
    deleteSession: (id: string) => Promise<{ success: boolean; error?: string }>;
    clearHistory: () => Promise<{ success: boolean; error?: string }>;
  };
  update: {
    checkForUpdates: () => Promise<UpdateCheckResult>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    installUpdate: () => void;
    onChecking: (cb: () => void) => () => void;
    onAvailable: (cb: (info: UpdateInfo) => void) => () => void;
    onNotAvailable: (cb: () => void) => () => void;
    onProgress: (cb: (progress: UpdateProgress) => void) => () => void;
    onDownloaded: (cb: () => void) => () => void;
    onError: (cb: (message: string) => void) => () => void;
  };
}

export interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  total: number
  transferred: number
}

export interface UpdateCheckResult {
  success: boolean
  available?: boolean
  info?: UpdateInfo
  error?: string
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'warning'
  db: { ok: boolean; latency: number }
  memory: { usageMB: number; threshold: number }
  uptime: number
}

export interface IntegrityCheckResult {
  ok: boolean
  message: string
}

export interface EncryptionStatus {
  encrypted: boolean
  keyAvailable: boolean
}

export interface EncryptResult {
  success: boolean
  message: string
}

export interface PasswordStrength {
  score: number
  label: string
  feedback: string
}


