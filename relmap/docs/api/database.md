# 数据库

RelMap 使用 SQLite（better-sqlite3）作为本地数据库引擎。

## 连接配置

- **引擎**：better-sqlite3
- **日志模式**：WAL（Write-Ahead Logging）
- **外键约束**：启用
- **忙等待超时**：5000ms

## 表结构

### persons — 联系人

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| name | TEXT | NOT NULL | 姓名 |
| nickname | TEXT | | 昵称 |
| avatar_path | TEXT | | 头像路径 |
| birthday | TEXT | | 生日 (YYYY-MM-DD) |
| gender | INTEGER | 0/1/2 | 0=未知, 1=男, 2=女 |
| company | TEXT | | 公司 |
| title | TEXT | | 职位 |
| department | TEXT | | 部门 |
| notes | TEXT | | 备注 |
| is_favorite | INTEGER | 0/1 | 是否收藏 |
| is_archived | INTEGER | 0/1 | 是否归档 |
| lifecycle_stage | TEXT | new/active/maintain/dormant/lost/archived | 生命周期阶段 |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

索引：`name`, `is_favorite`

### social_accounts — 社交账号

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| person_id | TEXT | FK → persons.id | 联系人 ID |
| platform | TEXT | NOT NULL | 平台名称 |
| account_id | TEXT | NOT NULL | 账号 ID |
| account_name | TEXT | | 显示名称 |
| is_primary | INTEGER | 0/1 | 是否主要账号 |
| sort_order | INTEGER | | 排序 |
| created_at | TEXT | DEFAULT now | 创建时间 |

唯一约束：`(person_id, platform, account_id)`

### relationships — 关系

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| person_id | TEXT | FK → persons.id | 联系人 A |
| related_person_id | TEXT | FK → persons.id | 联系人 B |
| intimacy | INTEGER | 0-100, DEFAULT 50 | 亲密度 |
| intimacy_auto | INTEGER | | 自动计算的亲密度 |
| meet_method | TEXT | | 认识方式 |
| meet_date | TEXT | | 认识日期 |
| meet_location | TEXT | | 认识地点 |
| relation_label | TEXT | | 关系标签 |
| notes | TEXT | | 备注 |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

检查：`person_id != related_person_id`
唯一约束：`(person_id, related_person_id)`

### events — 事件

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| title | TEXT | NOT NULL | 标题 |
| event_date | TEXT | NOT NULL | 事件日期 |
| event_time | TEXT | | 事件时间 |
| description | TEXT | | 描述 |
| location | TEXT | | 地点 |
| mood | INTEGER | 1-10 | 心情评分 |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

### event_persons — 事件参与者

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| event_id | TEXT | FK → events.id | 事件 ID |
| person_id | TEXT | FK → persons.id | 联系人 ID |
| role | TEXT | | 角色 |

### diaries — 日记

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| title | TEXT | | 标题 |
| content | TEXT | NOT NULL | 内容 |
| mood | INTEGER | 1-10 | 心情评分 |
| weather | TEXT | | 天气 |
| diary_date | TEXT | NOT NULL | 日记日期 |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

### diary_persons — 日记关联联系人

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| diary_id | TEXT | FK → diaries.id | 日记 ID |
| person_id | TEXT | FK → persons.id | 联系人 ID |

### photos — 照片

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| file_path | TEXT | NOT NULL | 文件路径 |
| thumbnail_path | TEXT | | 缩略图路径 |
| file_size | INTEGER | | 文件大小 |
| width | INTEGER | | 图片宽度 |
| height | INTEGER | | 图片高度 |
| taken_at | TEXT | | 拍摄时间 |
| description | TEXT | | 描述 |
| face_data | TEXT | | 人脸数据 (JSON) |
| created_at | TEXT | DEFAULT now | 创建时间 |

### photo_persons — 照片关联联系人

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| photo_id | TEXT | FK → photos.id | 照片 ID |
| person_id | TEXT | FK → persons.id | 联系人 ID |

### groups — 分组

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| name | TEXT | NOT NULL | 组名 |
| description | TEXT | | 描述 |
| avatar_path | TEXT | | 头像路径 |
| color | TEXT | DEFAULT '#6366f1' | 颜色 |
| created_at | TEXT | DEFAULT now | 创建时间 |

### group_members — 分组成员

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| group_id | TEXT | FK → groups.id | 分组 ID |
| person_id | TEXT | FK → persons.id | 联系人 ID |
| role | TEXT | owner/admin/member | 角色 |
| joined_at | TEXT | DEFAULT now | 加入时间 |

### tags — 标签

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| name | TEXT | UNIQUE NOT NULL | 标签名 |
| color | TEXT | DEFAULT '#6366f1' | 颜色 |
| parent_id | TEXT | FK → tags.id | 父标签 ID |

### taggings — 标签关联

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| tag_id | TEXT | FK → tags.id | 标签 ID |
| target_id | TEXT | NOT NULL | 目标 ID |
| target_type | TEXT | person/event/diary | 目标类型 |

### interaction_logs — 交互日志

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| person_id | TEXT | FK → persons.id | 联系人 ID |
| interact_at | TEXT | NOT NULL | 交互时间 |
| interact_type | TEXT | call/meet/message/social/other | 交互类型 |
| summary | TEXT | | 摘要 |
| duration | INTEGER | | 时长 (分钟) |
| purpose | TEXT | | 目的 |
| created_at | TEXT | DEFAULT now | 创建时间 |

### reminders — 提醒

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| person_id | TEXT | FK → persons.id | 联系人 ID |
| title | TEXT | NOT NULL | 标题 |
| remind_date | TEXT | NOT NULL | 提醒日期 |
| remind_year | INTEGER | | 提醒年份 |
| repeat_type | TEXT | once/yearly/monthly | 重复类型 |
| is_active | INTEGER | DEFAULT 1 | 是否启用 |
| note | TEXT | | 备注 |
| created_at | TEXT | DEFAULT now | 创建时间 |

### message_templates — 消息模板

| 列名 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | UUID |
| name | TEXT | NOT NULL | 模板名称 |
| content | TEXT | NOT NULL | 模板内容 |
| category | TEXT | general/birthday/holiday/greeting/follow_up/other | 分类 |
| created_at | TEXT | DEFAULT now | 创建时间 |
| updated_at | TEXT | DEFAULT now | 更新时间 |

## 全文搜索

使用 FTS5 实现全文搜索，搜索范围：

- **persons_fts** — name, nickname, company, title, notes
- **events_fts** — title, description, location
- **diaries_fts** — title, content

通过数据库触发器自动同步 FTS 索引与主表数据。

## 数据库工具

- `backup.ts` — 备份/恢复功能，支持加密备份
- `connection.ts` — 数据库连接管理，完整性检查
- `migrations.ts` — 版本迁移（当前最高版本: 7）
