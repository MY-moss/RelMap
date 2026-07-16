import type Database from 'better-sqlite3-multiple-ciphers';

export const MIGRATIONS: { version: number; sql: string }[] = [
  { version: 1, sql: `
CREATE TABLE IF NOT EXISTS persons (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    nickname      TEXT,
    avatar_path   TEXT,
    birthday      TEXT,
    gender        INTEGER DEFAULT 0 CHECK(gender IN (0,1,2)),
    company       TEXT,
    title         TEXT,
    department    TEXT,
    notes         TEXT,
    is_favorite   INTEGER DEFAULT 0 CHECK(is_favorite IN (0,1)),
    is_archived   INTEGER DEFAULT 0 CHECK(is_archived IN (0,1)),
    created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);
CREATE INDEX IF NOT EXISTS idx_persons_favorite ON persons(is_favorite);
CREATE TABLE IF NOT EXISTS social_accounts (
    id            TEXT PRIMARY KEY,
    person_id     TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    platform      TEXT NOT NULL,
    account_id    TEXT NOT NULL,
    account_name  TEXT,
    is_primary    INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(person_id, platform, account_id)
);
CREATE INDEX IF NOT EXISTS idx_social_accounts_person ON social_accounts(person_id);
CREATE TABLE IF NOT EXISTS relationships (
    id                TEXT PRIMARY KEY,
    person_id         TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    related_person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    intimacy          INTEGER DEFAULT 50 CHECK(intimacy >= 0 AND intimacy <= 100),
    intimacy_auto     INTEGER,
    meet_method TEXT, meet_date TEXT, meet_location TEXT,
    relation_label    TEXT,
    notes             TEXT,
    created_at        TEXT DEFAULT (datetime('now','localtime')),
    updated_at        TEXT DEFAULT (datetime('now','localtime')),
    CHECK(person_id != related_person_id),
    UNIQUE(person_id, related_person_id)
);
CREATE INDEX IF NOT EXISTS idx_relationships_person ON relationships(person_id);
CREATE INDEX IF NOT EXISTS idx_relationships_intimacy ON relationships(intimacy);
CREATE TABLE IF NOT EXISTS events (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    event_date    TEXT NOT NULL,
    event_time    TEXT,
    description   TEXT,
    location      TEXT,
    mood          INTEGER CHECK(mood IS NULL OR (mood >= 1 AND mood <= 10)),
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    updated_at    TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE TABLE IF NOT EXISTS event_persons (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE, role TEXT, PRIMARY KEY (event_id, person_id)
);
CREATE TABLE IF NOT EXISTS diaries (
    id            TEXT PRIMARY KEY,
    title         TEXT,
    content       TEXT NOT NULL,
    mood          INTEGER CHECK(mood IS NULL OR (mood >= 1 AND mood <= 10)),
    weather       TEXT,
    diary_date    TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    updated_at    TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_diaries_date ON diaries(diary_date);
CREATE TABLE IF NOT EXISTS diary_persons (
    diary_id TEXT NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE, PRIMARY KEY (diary_id, person_id)
);
CREATE TABLE IF NOT EXISTS photos (
    id              TEXT PRIMARY KEY,
    file_path       TEXT NOT NULL,
    thumbnail_path  TEXT,
    file_size       INTEGER,
    width           INTEGER,
    height          INTEGER,
    taken_at        TEXT,
    description     TEXT,
    face_data       TEXT,
    created_at      TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_photos_taken ON photos(taken_at);
CREATE TABLE IF NOT EXISTS photo_persons (
    photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE, PRIMARY KEY (photo_id, person_id)
);
CREATE TABLE IF NOT EXISTS groups (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT,
    avatar_path   TEXT,
    color         TEXT DEFAULT '#6366f1',
    created_at    TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK(role IN ('owner','admin','member')), joined_at TEXT DEFAULT (datetime('now','localtime')), PRIMARY KEY (group_id, person_id)
);
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#6366f1'
);
CREATE TABLE IF NOT EXISTS taggings (
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL, target_type TEXT NOT NULL CHECK(target_type IN ('person','event','diary')), PRIMARY KEY (tag_id, target_id, target_type)
);
CREATE TABLE IF NOT EXISTS interaction_logs (
    id            TEXT PRIMARY KEY,
    person_id     TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    interact_at   TEXT NOT NULL,
    interact_type TEXT NOT NULL CHECK(interact_type IN ('call','meet','message','social','other')),
    summary       TEXT,
    duration      INTEGER,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_person ON interaction_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_time ON interaction_logs(interact_at);
CREATE TABLE IF NOT EXISTS reminders (
    id            TEXT PRIMARY KEY,
    person_id     TEXT REFERENCES persons(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    remind_date   TEXT NOT NULL,
    remind_year   INTEGER,
    repeat_type   TEXT DEFAULT 'once' CHECK(repeat_type IN ('once','yearly','monthly')),
    is_active     INTEGER DEFAULT 1,
    note          TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
);
` },
  { version: 2, sql: `
CREATE VIRTUAL TABLE IF NOT EXISTS persons_fts USING fts5(
    name, nickname, company, title, notes,
    content='persons', content_rowid='rowid', tokenize='unicode61'
);
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
    title, description, location,
    content='events', content_rowid='rowid', tokenize='unicode61'
);
CREATE VIRTUAL TABLE IF NOT EXISTS diaries_fts USING fts5(
    title, content,
    content='diaries', content_rowid='rowid', tokenize='unicode61'
);
` },
  { version: 3, sql: `
CREATE TRIGGER IF NOT EXISTS persons_ai AFTER INSERT ON persons BEGIN
    INSERT INTO persons_fts(rowid, name, nickname, company, title, notes) VALUES (new.rowid, new.name, new.nickname, new.company, new.title, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS persons_ad AFTER DELETE ON persons BEGIN
    INSERT INTO persons_fts(persons_fts, rowid, name, nickname, company, title, notes) VALUES ('delete', old.rowid, old.name, old.nickname, old.company, old.title, old.notes);
END;
CREATE TRIGGER IF NOT EXISTS persons_au AFTER UPDATE ON persons BEGIN
    INSERT INTO persons_fts(persons_fts, rowid, name, nickname, company, title, notes) VALUES ('delete', old.rowid, old.name, old.nickname, old.company, old.title, old.notes);
    INSERT INTO persons_fts(rowid, name, nickname, company, title, notes) VALUES (new.rowid, new.name, new.nickname, new.company, new.title, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
    INSERT INTO events_fts(rowid, title, description, location) VALUES (new.rowid, new.title, new.description, new.location);
END;
CREATE TRIGGER IF NOT EXISTS events_ad AFTER DELETE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, description, location) VALUES ('delete', old.rowid, old.title, old.description, old.location);
END;
CREATE TRIGGER IF NOT EXISTS events_au AFTER UPDATE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, description, location) VALUES ('delete', old.rowid, old.title, old.description, old.location);
    INSERT INTO events_fts(rowid, title, description, location) VALUES (new.rowid, new.title, new.description, new.location);
END;
CREATE TRIGGER IF NOT EXISTS diaries_ai AFTER INSERT ON diaries BEGIN
    INSERT INTO diaries_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS diaries_ad AFTER DELETE ON diaries BEGIN
    INSERT INTO diaries_fts(diaries_fts, rowid, title, content) VALUES ('delete', old.rowid, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS diaries_au AFTER UPDATE ON diaries BEGIN
    INSERT INTO diaries_fts(diaries_fts, rowid, title, content) VALUES ('delete', old.rowid, old.title, old.content);
    INSERT INTO diaries_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
` },
  { version: 4, sql: `
ALTER TABLE interaction_logs ADD COLUMN purpose TEXT;
` },
  { version: 5, sql: `
ALTER TABLE persons ADD COLUMN lifecycle_stage TEXT DEFAULT 'new' CHECK(lifecycle_stage IN ('new','active','maintain','dormant','lost','archived'));
` },
  { version: 6, sql: `
ALTER TABLE tags ADD COLUMN parent_id TEXT REFERENCES tags(id) ON DELETE SET NULL;
` },
  { version: 7, sql: `
CREATE TABLE IF NOT EXISTS message_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK(category IN ('general','birthday','holiday','greeting','follow_up','other')),
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);
` },
  // MED-007: 为 social_accounts.platform 添加大小写不敏感的生成列与索引
  // 解决 lower(platform) 查询导致索引失效的问题，使大小写不敏感匹配能命中索引
  { version: 8, sql: `
ALTER TABLE social_accounts ADD COLUMN platform_lower TEXT GENERATED ALWAYS AS (lower(platform)) VIRTUAL;
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform_lower ON social_accounts(platform_lower);
` },
  // AUDIT-P1-002: follow_up_queue 表迁移 — 跟进队列功能依赖此表
  { version: 9, sql: `CREATE TABLE IF NOT EXISTS follow_up_queue (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    follow_up_type TEXT DEFAULT 'call',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    next_follow_up_date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_person ON follow_up_queue(person_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_status ON follow_up_queue(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_priority ON follow_up_queue(priority);
CREATE INDEX IF NOT EXISTS idx_follow_up_queue_date ON follow_up_queue(next_follow_up_date);
` },
  { version: 10, sql: `
CREATE INDEX IF NOT EXISTS idx_group_members_person ON group_members(person_id);
CREATE INDEX IF NOT EXISTS idx_taggings_target ON taggings(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_persons_archived ON persons(is_archived);
CREATE INDEX IF NOT EXISTS idx_reminders_person ON reminders(person_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(remind_date);
` },
  // DB-P1-001/002/003: Add standalone indexes with exact names requested
  { version: 11, sql: `
CREATE INDEX IF NOT EXISTS idx_group_members_person_id ON group_members(person_id);
CREATE INDEX IF NOT EXISTS idx_taggings_target_id ON taggings(target_id);
CREATE INDEX IF NOT EXISTS idx_persons_is_archived ON persons(is_archived);
` },
  { version: 12, sql: `
ALTER TABLE persons ADD COLUMN is_main_identity INTEGER DEFAULT 0 CHECK(is_main_identity IN (0,1));
CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_main_identity ON persons(is_main_identity) WHERE is_main_identity = 1;
` },
  { version: 13, sql: `
ALTER TABLE persons ADD COLUMN home_address TEXT;
` },
  { version: 14, sql: `
CREATE TABLE IF NOT EXISTS external_ids (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('person','event')),
    plugin_id TEXT NOT NULL,
    external_id TEXT NOT NULL,
    external_data TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(target_type, target_id, plugin_id),
    UNIQUE(target_type, plugin_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_external_ids_lookup ON external_ids(target_type, plugin_id, external_id);
` },
];

export function runMigrations(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    const migrate = db.transaction(() => {
      db.exec(m.sql);
      db.pragma(`user_version = ${m.version}`);
    });
    migrate();
  }
}

