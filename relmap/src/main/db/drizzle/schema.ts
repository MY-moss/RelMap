import { sqliteTable, text, integer, uniqueIndex, index, primaryKey } from 'drizzle-orm/sqlite-core'

export const persons = sqliteTable('persons', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nickname: text('nickname'),
  avatarPath: text('avatar_path'),
  birthday: text('birthday'),
  gender: integer('gender').default(0),
  company: text('company'),
  title: text('title'),
  department: text('department'),
  notes: text('notes'),
  homeAddress: text('home_address'),
  isFavorite: integer('is_favorite').default(0),
  isArchived: integer('is_archived').default(0),
  lifecycleStage: text('lifecycle_stage').default('new'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  nameIdx: index('idx_persons_name').on(table.name),
  favoriteIdx: index('idx_persons_favorite').on(table.isFavorite),
}))

export const socialAccounts = sqliteTable('social_accounts', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  accountId: text('account_id').notNull(),
  accountName: text('account_name'),
  isPrimary: integer('is_primary').default(0),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  personIdx: index('idx_social_accounts_person').on(table.personId),
  uniquePlatformAccount: uniqueIndex('uq_social_accounts').on(table.personId, table.platform, table.accountId),
}))

export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  relatedPersonId: text('related_person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  intimacy: integer('intimacy').default(50),
  intimacyAuto: integer('intimacy_auto'),
  meetMethod: text('meet_method'),
  meetDate: text('meet_date'),
  meetLocation: text('meet_location'),
  relationLabel: text('relation_label'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  personIdx: index('idx_relationships_person').on(table.personId),
  intimacyIdx: index('idx_relationships_intimacy').on(table.intimacy),
  uniquePair: uniqueIndex('uq_relationships').on(table.personId, table.relatedPersonId),
}))

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  eventDate: text('event_date').notNull(),
  eventTime: text('event_time'),
  description: text('description'),
  location: text('location'),
  mood: integer('mood'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  dateIdx: index('idx_events_date').on(table.eventDate),
}))

export const eventPersons = sqliteTable('event_persons', {
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  role: text('role'),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.personId] }),
}))

export const diaries = sqliteTable('diaries', {
  id: text('id').primaryKey(),
  title: text('title'),
  content: text('content').notNull(),
  mood: integer('mood'),
  weather: text('weather'),
  diaryDate: text('diary_date').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  dateIdx: index('idx_diaries_date').on(table.diaryDate),
}))

export const diaryPersons = sqliteTable('diary_persons', {
  diaryId: text('diary_id').notNull().references(() => diaries.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.diaryId, table.personId] }),
}))

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  filePath: text('file_path').notNull(),
  thumbnailPath: text('thumbnail_path'),
  fileSize: integer('file_size'),
  width: integer('width'),
  height: integer('height'),
  takenAt: text('taken_at'),
  description: text('description'),
  faceData: text('face_data'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  takenIdx: index('idx_photos_taken').on(table.takenAt),
}))

export const photoPersons = sqliteTable('photo_persons', {
  photoId: text('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.photoId, table.personId] }),
}))

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  avatarPath: text('avatar_path'),
  color: text('color').default('#6366f1'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  nameIdx: index('idx_groups_name').on(table.name),
}))

export const groupMembers = sqliteTable('group_members', {
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  role: text('role').default('member'),
  joinedAt: text('joined_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.groupId, table.personId] }),
}))

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').default('#6366f1'),
  parentId: text('parent_id'),
}, (table) => ({
  parentRef: index('idx_tags_parent').on(table.parentId),
}))

export const taggings = sqliteTable('taggings', {
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.tagId, table.targetId, table.targetType] }),
  targetIdx: index('idx_taggings_target').on(table.targetId, table.targetType),
}))

export const interactionLogs = sqliteTable('interaction_logs', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  interactAt: text('interact_at').notNull(),
  interactType: text('interact_type').notNull(),
  summary: text('summary'),
  duration: integer('duration'),
  purpose: text('purpose'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  personIdx: index('idx_interaction_logs_person').on(table.personId),
  timeIdx: index('idx_interaction_logs_time').on(table.interactAt),
}))

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  personId: text('person_id').references(() => persons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  remindDate: text('remind_date').notNull(),
  remindYear: integer('remind_year'),
  repeatType: text('repeat_type').default('once'),
  isActive: integer('is_active').default(1),
  note: text('note'),
  createdAt: text('created_at').notNull(),
})

export const followUpQueue = sqliteTable('follow_up_queue', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  followUpType: text('follow_up_type').default('call'),
  priority: text('priority').default('medium'),
  status: text('status').default('pending'),
  nextFollowUpDate: text('next_follow_up_date').notNull(),
  note: text('note'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  personIdx: index('idx_follow_up_queue_person').on(table.personId),
  statusIdx: index('idx_follow_up_queue_status').on(table.status),
  priorityIdx: index('idx_follow_up_queue_priority').on(table.priority),
  dateIdx: index('idx_follow_up_queue_date').on(table.nextFollowUpDate),
}))

export const messageTemplates = sqliteTable('message_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  category: text('category').default('general'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
