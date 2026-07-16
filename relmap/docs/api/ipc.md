# IPC 接口

RelMap 使用 Electron IPC 实现主进程和渲染进程之间的通信。所有 IPC 调用通过 `window.electronAPI` 对象暴露。

所有接口返回统一格式：`Result<T> = { success: true; data: T } | { success: false; error: string }`

## 联系人 (Person)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `person.create(data)` | `person:create` | `CreatePersonDto` | `Result<Person>` |
| `person.update(id, data)` | `person:update` | `id: string, UpdatePersonDto` | `Result<Person>` |
| `person.delete(id)` | `person:delete` | `id: string` | `Result<void>` |
| `person.getById(id)` | `person:getById` | `id: string` | `Result<Person>` |
| `person.list(filter?)` | `person:list` | `PersonFilter?` | `Result<Person[]>` |
| `person.toggleFavorite(id)` | `person:toggleFavorite` | `id: string` | `Result<Person>` |
| `person.uploadAvatar(personId, base64Data)` | `person:uploadAvatar` | `personId: string, base64Data: string` | `Result<string>` |

## 社交账号 (Social)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `social.create(data)` | `social:create` | `CreateSocialAccountDto` | `Result<SocialAccount>` |
| `social.update(id, data)` | `social:update` | `id: string, UpdateSocialAccountDto` | `Result<SocialAccount>` |
| `social.delete(id)` | `social:delete` | `id: string` | `Result<void>` |
| `social.listByPerson(personId)` | `social:listByPerson` | `personId: string` | `Result<SocialAccount[]>` |
| `social.setPrimary(id)` | `social:setPrimary` | `id: string` | `Result<SocialAccount>` |

## 关系 (Relation)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `relation.create(data)` | `relation:create` | `CreateRelationDto` | `Result<Relationship>` |
| `relation.update(id, data)` | `relation:update` | `id: string, UpdateRelationDto` | `Result<Relationship>` |
| `relation.delete(id)` | `relation:delete` | `id: string` | `Result<void>` |
| `relation.getPersonRelations(personId)` | `relation:getPersonRelations` | `personId: string` | `Result<Relationship[]>` |
| `relation.getGraphData(minIntimacy?)` | `relation:getGraphData` | `minIntimacy?: number` | `Result<GraphData>` |
| `relation.getIntimacyDistribution()` | `relation:getIntimacyDistribution` | 无 | `Result<IntimacyDistribution[]>` |

## 事件 (Event)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `event.create(data)` | `event:create` | `CreateEventDto` | `Result<EventItem>` |
| `event.update(id, data)` | `event:update` | `id: string, UpdateEventDto` | `Result<EventItem>` |
| `event.delete(id)` | `event:delete` | `id: string` | `Result<void>` |
| `event.list(filter?)` | `event:list` | `EventFilter?` | `Result<EventItem[]>` |

## 日记 (Diary)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `diary.create(data)` | `diary:create` | `CreateDiaryDto` | `Result<Diary>` |
| `diary.update(id, data)` | `diary:update` | `id: string, UpdateDiaryDto` | `Result<Diary>` |
| `diary.delete(id)` | `diary:delete` | `id: string` | `Result<void>` |
| `diary.list(filter?)` | `diary:list` | `DiaryFilter?` | `Result<Diary[]>` |

## 照片 (Photo)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `photo.import(paths)` | `photo:import` | `paths: string[]` | `Result<Photo[]>` |
| `photo.delete(id)` | `photo:delete` | `id: string` | `Result<void>` |
| `photo.batchDelete(ids)` | `photo:batchDelete` | `ids: string[]` | `Result<void>` |
| `photo.linkPerson(photoId, personIds)` | `photo:linkPerson` | `photoId: string, personIds: string[]` | `Result<void>` |
| `photo.getPersonPhotos(personId)` | `photo:getPersonPhotos` | `personId: string` | `Result<Photo[]>` |
| `photo.listAll(limit?, offset?)` | `photo:listAll` | `limit?: number, offset?: number` | `Result<Photo[]>` |

## 搜索 (Search)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `search.global(query)` | `search:global` | `query: string` | `Result<SearchResults>` |
| `search.semantic(query)` | `search:semantic` | `query: string` | `Result<SemanticSearchResults>` |

## 分组 (Group)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `group.create(data)` | `group:create` | `CreateGroupDto` | `Result<Group>` |
| `group.update(id, data)` | `group:update` | `id: string, UpdateGroupDto` | `Result<Group>` |
| `group.delete(id)` | `group:delete` | `id: string` | `Result<void>` |
| `group.getById(id)` | `group:getById` | `id: string` | `Result<Group>` |
| `group.list()` | `group:list` | 无 | `Result<Group[]>` |
| `group.addMembers(groupId, personIds)` | `group:addMembers` | `groupId: string, personIds: string[]` | `Result<void>` |
| `group.removeMember(groupId, personId)` | `group:removeMember` | `groupId: string, personId: string` | `Result<void>` |
| `group.listMembers(groupId)` | `group:listMembers` | `groupId: string` | `Result<Person[]>` |
| `group.listPersonGroups(personId)` | `group:listPersonGroups` | `personId: string` | `Result<Group[]>` |

## 标签 (Tag)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `tag.create(data)` | `tag:create` | `CreateTagDto` | `Result<Tag>` |
| `tag.update(id, data)` | `tag:update` | `id: string, UpdateTagDto` | `Result<Tag>` |
| `tag.delete(id)` | `tag:delete` | `id: string` | `Result<void>` |
| `tag.getById(id)` | `tag:getById` | `id: string` | `Result<Tag>` |
| `tag.list()` | `tag:list` | 无 | `Result<Tag[]>` |
| `tag.listByParent(parentId?)` | `tag:listByParent` | `parentId?: string` | `Result<Tag[]>` |
| `tag.apply(tagId, targetId, targetType)` | `tag:apply` | `tagId, targetId, targetType: TagTargetType` | `Result<void>` |
| `tag.remove(tagId, targetId, targetType)` | `tag:remove` | `tagId, targetId, targetType: TagTargetType` | `Result<void>` |
| `tag.listByTarget(targetId, targetType)` | `tag:listByTarget` | `targetId, targetType: TagTargetType` | `Result<Tag[]>` |
| `tag.listTargets(tagId)` | `tag:listTargets` | `tagId: string` | `Result<TagTarget[]>` |

## AI

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `ai.ocrScan(imagePath)` | `ai:ocrScan` | `imagePath: string` | `Result<OcrResult>` |
| `ai.detectFaces(imagePath)` | `ai:detectFaces` | `imagePath: string` | `Result<FaceDetection[]>` |
| `ai.detectLostContacts(months)` | `ai:detectLostContacts` | `months: number` | `Result<LostContactItem[]>` |
| `ai.calculateIntimacy(personId)` | `ai:calculateIntimacy` | `personId: string` | `Result<IntimacyScore>` |
| `ai.extractKeywords(text, topN?)` | `ai:extractKeywords` | `text: string, topN?: number` | `Result<KeywordResult>` |
| `ai.analyzeEmotion(text)` | `ai:analyzeEmotion` | `text: string` | `Result<EmotionResult>` |
| `ai.detectDuplicates(newPerson)` | `ai:detectDuplicates` | `newPerson: object` | `Result<DuplicateResult>` |
| `ai.generateGroupSuggestions()` | `ai:generateGroupSuggestions` | 无 | `Result<SmartGroupingResult>` |

## 提醒 (Reminder)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `reminder.create(data)` | `reminder:create` | `CreateReminderDto` | `Result<Reminder>` |
| `reminder.update(id, data)` | `reminder:update` | `id, UpdateReminderDto` | `Result<Reminder>` |
| `reminder.delete(id)` | `reminder:delete` | `id: string` | `Result<void>` |
| `reminder.getById(id)` | `reminder:getById` | `id: string` | `Result<Reminder>` |
| `reminder.list(filter?)` | `reminder:list` | `ReminderFilter?` | `Result<Reminder[]>` |
| `reminder.upcoming(days)` | `reminder:upcoming` | `days: number` | `Result<Reminder[]>` |
| `reminder.listFollowUp()` | `reminder:listFollowUp` | 无 | `Result<FollowUpItem[]>` |

## 交互日志 (Interaction)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `interaction.create(data)` | `interaction:create` | `CreateInteractionLogDto` | `Result<InteractionLog>` |
| `interaction.update(id, data)` | `interaction:update` | `id, UpdateInteractionLogDto` | `Result<InteractionLog>` |
| `interaction.delete(id)` | `interaction:delete` | `id: string` | `Result<void>` |
| `interaction.list(filter?)` | `interaction:list` | `InteractionLogFilter?` | `Result<InteractionLog[]>` |
| `interaction.listByPerson(personId, limit?)` | `interaction:listByPerson` | `personId, limit?: number` | `Result<InteractionLog[]>` |
| `interaction.lastDate(personId)` | `interaction:lastDate` | `personId: string` | `Result<string \| null>` |

## 备份 (Backup)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `backup.export(password?)` | `backup:export` | `password?: string` | `Result<BackupResult>` |
| `backup.import(password?)` | `backup:import` | `password?: string` | `Result<RestoreResult>` |
| `backup.list()` | `backup:list` | 无 | `Result<BackupInfo[]>` |

## 导入导出 (IO)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `io.importVCard(vcardText)` | `io:importVCard` | `vcardText: string` | `Result<ImportResult>` |
| `io.importVCardFile()` | `io:importVCardFile` | 无 | `Result<ImportResult>` |
| `io.exportCSV()` | `io:exportCSV` | 无 | `Result<string>` |
| `io.exportJSON(mode)` | `io:exportJSON` | `mode: 'contacts' \| 'all'` | `Result<string>` |

## 消息模板 (Template)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `template.create(data)` | `template:create` | `CreateTemplateDto` | `Result<MessageTemplate>` |
| `template.update(id, data)` | `template:update` | `id, UpdateTemplateDto` | `Result<MessageTemplate>` |
| `template.delete(id)` | `template:delete` | `id: string` | `Result<void>` |
| `template.getById(id)` | `template:getById` | `id: string` | `Result<MessageTemplate>` |
| `template.list(category?)` | `template:list` | `category?: string` | `Result<MessageTemplate[]>` |

## 应用配置 (App)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `app.hasPin()` | `app:hasPin` | 无 | `Result<boolean>` |
| `app.setPin(pin)` | `app:setPin` | `pin: string` | `Result<void>` |
| `app.verifyPin(pin)` | `app:verifyPin` | `pin: string` | `Result<boolean>` |
| `app.getConfig()` | `app:getConfig` | 无 | `Result<Record<string, unknown>>` |
| `app.saveConfig(partial)` | `app:saveConfig` | `partial: Record<string, unknown>` | `Result<void>` |
| `app.healthCheck()` | `app:healthCheck` | 无 | `Result<HealthReport>` |

## Ollama

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `ollama.detect()` | `ollama:detect` | 无 | `Result<{ available: boolean; models: string[] }>` |
| `ollama.listModels()` | `ollama:listModels` | 无 | `Result<string[]>` |

## 建议 (Suggestion)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `suggestion.generate(personId)` | `suggestion:generate` | `personId: string` | `Result<SuggestionItem[]>` |

## 性格画像 (Personality)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `personality.buildProfile(personId)` | `personality:buildProfile` | `personId: string` | `Result<PersonalityProfile>` |

## 亲密度预测 (Intimacy Prediction)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `intimacy_prediction.predict(personId)` | `intimacy_prediction:predict` | `personId: string` | `Result<IntimacyPrediction>` |

## 桥接人 (Bridge)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `bridge.detect(topN?)` | `bridge:detect` | `topN?: number` | `Result<BridgePerson[]>` |

## 分析仪表盘 (Analytics)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `analytics.getLifecycleDistribution()` | `analytics:getLifecycleDistribution` | 无 | `Result<LifecycleDistribution[]>` |
| `analytics.getMonthlyInteractionTrend(months)` | `analytics:getMonthlyInteractionTrend` | `months: number` | `Result<MonthlyTrend[]>` |
| `analytics.getNetworkStats()` | `analytics:getNetworkStats` | 无 | `Result<NetworkStats>` |
| `analytics.getTopPurposes()` | `analytics:getTopPurposes` | 无 | `Result<TopPurpose[]>` |
| `analytics.getContactGrowth(months)` | `analytics:getContactGrowth` | `months: number` | `Result<ContactGrowth[]>` |
| `analytics.getInteractionHeatmap(months)` | `analytics:getInteractionHeatmap` | `months: number` | `Result<InteractionHeatmapItem[]>` |
| `analytics.getActivityDistribution()` | `analytics:getActivityDistribution` | 无 | `Result<ActivityDistribution[]>` |
| `analytics.getTopRelationships(limit)` | `analytics:getTopRelationships` | `limit: number` | `Result<TopRelationship[]>` |

## 分析 (Analysis)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `analysis.analyzeDiary(content)` | `diary:analyze` | `content: string` | `Result<DiaryAnalysis>` |

## Wrapped 年度总结

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `wrapped.generate(year)` | `wrapped:generate` | `year: number` | `Result<WrappedReport>` |

## 记忆胶囊 (Memory)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `memory.today()` | `memory:today` | 无 | `Result<MemoryCapsuleItem[]>` |
| `memory.random()` | `memory:random` | 无 | `Result<MemoryCapsuleItem>` |

## 图谱增强 (Graph Enhanced)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `graph_enhanced.getNodeDetails(personId)` | `graph:getNodeDetails` | `personId: string` | `Result<NodeDetail>` |
| `graph_enhanced.getCommunities()` | `graph:getCommunities` | 无 | `Result<CommunityInfo[]>` |

## 图谱导出 (Graph Export)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `graph_export.exportPng(dataUrl)` | `graph:exportPng` | `dataUrl: string` | `ExportResult` |
| `graph_export.exportJson(graphData)` | `graph:exportJson` | `graphData: unknown` | `ExportResult` |
| `graph_export.exportCsv(edges)` | `graph:exportCsv` | `edges: array` | `ExportResult` |
| `graph_export.shareSnapshot(graphData)` | `graph:shareSnapshot` | `graphData: unknown` | `ExportResult` |

## 数据库 (DB)

| 方法 | IPC 通道 | 参数 | 返回 |
|------|----------|------|------|
| `db.checkIntegrity()` | `db:checkIntegrity` | 无 | `Result<IntegrityCheckResult>` |

## 事件监听

可通过 `electronAPI.on(channel, callback)` 监听进度事件。返回取消监听函数。

合法通道：`ai:progress`、`backup:progress`、`import:progress`
