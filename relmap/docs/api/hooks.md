# React Query Hooks

RelMap 使用 TanStack React Query 管理服务端状态。所有 hooks 位于 `src/hooks/` 目录。

## 联系人 Hooks

```typescript
// 获取联系人列表（支持筛选）
usePersonList(filter?: PersonFilter)
// 获取单个联系人
usePerson(id: string)
// 创建联系人
useCreatePerson()
// 更新联系人
useUpdatePerson()
// 删除联系人
useDeletePerson()
// 切换收藏状态
useToggleFavorite()
// 上传头像
useUploadAvatar()
```

## 关系 Hooks

```typescript
// 获取联系人的关系列表（自动关联对方姓名）
usePersonRelations(personId: string)
// 获取图谱数据
useGraphData(minIntimacy?: number)
// 获取亲密度分布
useIntimacyDistribution()
// 创建关系
useCreateRelation()
// 更新关系
useUpdateRelation()
// 删除关系
useDeleteRelation()
```

## 事件 Hooks

```typescript
useEventList(filter?: EventFilter)
useCreateEvent()
useUpdateEvent()
useDeleteEvent()
```

## 日记 Hooks

```typescript
useDiaryList(filter?: DiaryFilter)
useCreateDiary()
useUpdateDiary()
useDeleteDiary()
```

## 提醒 Hooks

```typescript
useReminderList(filter?: ReminderFilter)
useUpcomingReminders(days: number)
useCreateReminder()
useUpdateReminder()
useDeleteReminder()
```

## 社交账号 Hooks

```typescript
useSocialList(personId: string)
useCreateSocial()
useUpdateSocial()
useDeleteSocial()
```

## 照片 Hooks

```typescript
usePersonPhotos(personId: string)
usePhotoList(limit?: number, offset?: number)
useImportPhotos()
useDeletePhoto()
useLinkPersonPhoto()
```

## 搜索 Hooks

```typescript
useGlobalSearch(query: string)
```

## 分组 Hooks

```typescript
useGroupList()
useGroup(id: string)
useGroupMembers(groupId: string)
usePersonGroups(personId: string)
useCreateGroup()
useUpdateGroup()
useDeleteGroup()
```

## 标签 Hooks

```typescript
useTagList()
useTagsByTarget(targetId: string, targetType: TagTargetType)
useCreateTag()
useUpdateTag()
useDeleteTag()
useApplyTag()
useRemoveTag()
```

## 交互日志 Hooks

```typescript
useInteractionList(filter?: InteractionLogFilter)
useInteractionsByPerson(personId: string, limit?: number)
useLastInteractionDate(personId: string)
useCreateInteraction()
useUpdateInteraction()
useDeleteInteraction()
```

## 分析仪表盘 Hooks

```typescript
useLifecycleDistribution()
useMonthlyInteractionTrend(months: number)
useNetworkStats()
useTopPurposes()
useContactGrowth(months: number)
useInteractionHeatmap(months: number)
useActivityDistribution()
useTopRelationships(limit: number)
useInvalidateAnalytics()
```

## Query Keys

`src/hooks/queryKeys.ts` 中定义了标准化的 query key 结构，确保缓存一致性：

```typescript
personKeys.all       // ['persons']
personKeys.lists()   // ['persons', 'list']
personKeys.list(f)   // ['persons', 'list', filters]
personKeys.details() // ['persons', 'detail']
personKeys.detail(i) // ['persons', 'detail', id]

relationKeys.all           // ['relations']
relationKeys.list(id)      // ['relations', 'list', personId]
relationKeys.graph(i)      // ['relations', 'graph', minIntimacy]
relationKeys.distribution()// ['relations', 'distribution']

// 类似结构：eventKeys, diaryKeys, reminderKeys, socialKeys,
// photoKeys, groupKeys, tagKeys, interactionKeys, searchKeys
```
