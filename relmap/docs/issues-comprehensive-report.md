# RelMap 项目问题清单 (完整汇总)

## 1. 数据库与数据模型问题

---

### REL-001: relationships 表缺少 related_person_id 索引
- **ID**: REL-001
- **标题**: relationships 表 `related_person_id` 字段缺少索引
- **模块**: 数据库与数据模型
- **严重级别**: P1
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/migrations.ts:34-49`
- **问题描述**: `relationships` 表仅对 `person_id` 和 `intimacy` 建立了索引，但 `related_person_id` 在 `getPersonRelations()` 等人际查询中作为 OR 条件频繁使用，缺少索引会导致全表扫描。
- **修复建议**: 为 `related_person_id` 添加独立索引: `CREATE INDEX IF NOT EXISTS idx_relationships_related_person ON relationships(related_person_id);`
- **预估工作量**: 小
- **依赖**: 无

---

### REL-002: event_persons 表缺少 person_id 索引
- **ID**: REL-002
- **标题**: `event_persons` 多对多关联表缺少 `person_id` 索引
- **模块**: 数据库与数据模型
- **严重级别**: P1
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/migrations.ts:62-65`
- **问题描述**: `event_persons` 表作为事件与联系人的多对多关联表，`person_id` 在亲密度计算 (`intimacy.ts:101`)、断联检测 (`lost_contact.ts:33`) 等场景中频繁作为查询条件，缺少索引会显著降低性能。
- **修复建议**: 添加索引: `CREATE INDEX IF NOT EXISTS idx_event_persons_person ON event_persons(person_id);`
- **预估工作量**: 小
- **依赖**: 无

---

### REL-003: FTS5 全文索引缺失 department 字段
- **ID**: REL-003
- **标题**: `persons_fts` FTS5 虚拟表未包含 `department` 字段
- **模块**: 数据库与数据模型
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/migrations.ts:143-145`
- **问题描述**: FTS5 `persons_fts` 表的创建语句中未包含 `department` 字段，导致按部门关键词搜索时无法命中。该字段存储于 persons 表中但不支持全文检索。
- **修复建议**: 在 v4 迁移中添加: `ALTER TABLE persons_fts ADD COLUMN department TEXT;` 或重建 FTS5 表，并更新触发器。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-004: reminders 表缺少 is_active 索引
- **ID**: REL-004
- **标题**: `reminders` 表 `is_active` 字段缺少索引
- **模块**: 数据库与数据模型
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/migrations.ts:130-140`
- **问题描述**: `reminders` 表查询频繁过滤 `is_active = 1` 的活跃提醒（如 `upcoming` 查询），但无该字段的索引，会扫描所有提醒记录。
- **修复建议**: 添加索引: `CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(is_active);`
- **预估工作量**: 小
- **依赖**: 无

---

### REL-005: 无软删除支持
- **ID**: REL-005
- **标题**: 所有实体缺少软删除（逻辑删除）支持
- **模块**: 数据库与数据模型
- **严重级别**: P1
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/migrations.ts:1-200` (全局)
- **问题描述**: 所有表均使用物理删除（`DELETE`），删除操作无法恢复。用户在 PersonDetailPage 点击删除后数据将永久丢失（`src/main/db/repositories/person.repo.ts:72-83`）。
- **修复建议**: 在每个表中添加 `deleted_at TEXT DEFAULT NULL` 字段，修改查询逻辑为 `WHERE deleted_at IS NULL`，提供回收站恢复功能。
- **预估工作量**: 大
- **依赖**: 无

---

### REL-006: 级联删除策略不一致
- **ID**: REL-006
- **标题**: 部分关联表缺少 ON DELETE CASCADE 或删除策略不完整
- **模块**: 数据库与数据模型
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/migrations.ts:62-97`
- **问题描述**: `event_persons`、`photo_persons`、`taggings` 等关联表均配置了 ON DELETE CASCADE，但 `interaction_logs` 和 `reminders` 的 `person_id` 外键也配置了级联删除。删除 person 时，关联的关系记录会级联删除，但关系图谱中涉及的另一方数据未被处理，可能导致数据不一致。
- **修复建议**: 评估级联删除对关系图谱的影响，删除联系人前检查是否存在关联关系并提示用户处理。
- **预估工作量**: 中
- **依赖**: REL-005

---

### REL-007: diary_persons 表缺少 person_id 索引
- **ID**: REL-007
- **标题**: `diary_persons` 多对多关联表缺少 `person_id` 索引
- **模块**: 数据库与数据模型
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/migrations.ts:77-80`
- **问题描述**: `diary_persons` 表在亲密度计算 (`intimacy.ts:104`) 和断联检测 (`lost_contact.ts:37`) 中通过 `person_id` 频繁查询，缺少索引影响性能。
- **修复建议**: 添加索引: `CREATE INDEX IF NOT EXISTS idx_diary_persons_person ON diary_persons(person_id);`
- **预估工作量**: 小
- **依赖**: 无

---

### REL-008: photo_persons 表缺少 person_id 索引
- **ID**: REL-008
- **标题**: `photo_persons` 关联表缺少 `person_id` 索引
- **模块**: 数据库与数据模型
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/migrations.ts:94-97`
- **问题描述**: `photo_persons` 表通过 `person_id` 查询联系人照片（`photos.repo.ts:110`），但无该字段索引，随数据增长查询性能会下降。
- **修复建议**: 添加索引: `CREATE INDEX IF NOT EXISTS idx_photo_persons_person ON photo_persons(person_id);`
- **预估工作量**: 小
- **依赖**: 无

---

### REL-009: duplicate DTO 定义 (IntimacyScore)
- **ID**: REL-009
- **标题**: `IntimacyScore` 类型在 shared/types 和 ai/intimacy 中重复定义
- **模块**: 数据库与数据模型
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/shared/types.ts:239-255` 和 `src/main/ai/intimacy.ts:4`
- **问题描述**: `IntimacyScore` 接口在 `shared/types.ts` 中定义，但 `IntimacyTrend.tsx:12` 却从 `../../main/ai/intimacy` 导入，绕过了类型中心化定义，导致类型不一致风险。
- **修复建议**: 统一从 `shared/types.ts` 导入 `IntimacyScore`，删除 `intimacy.ts` 中的重复类型导出。
- **预估工作量**: 小
- **依赖**: 无

---

## 2. Repository 层问题

---

### REL-010: updateRelationship 无法清空字段
- **ID**: REL-010
- **标题**: `updateRelationship` 使用 `??` 逻辑导致无法将字段设为 null/空
- **模块**: Repository 层
- **严重级别**: P1
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/repositories/relationships.repo.ts:90-99`
- **问题描述**: 更新关系时，`data.meet_method ?? existing.meet_method` 这类 `??` 逻辑在用户显式传递 `null` 或空字符串时依然会保留旧值，导致用户无法清空字段。同理，`data.intimacy ?? existing.intimacy` 也阻止了手动将亲密度设为 0。
- **修复建议**: 改为显式判断 `undefined`: `data.meet_method !== undefined ? data.meet_method : existing.meet_method`
- **预估工作量**: 中
- **依赖**: 无

---

### REL-011: importPhotos 不验证文件路径
- **ID**: REL-011
- **标题**: `importPhotos` 不验证传入的文件路径有效性
- **模块**: Repository 层
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/repositories/photos.repo.ts:17-56`
- **问题描述**: `importPhotos` 直接遍历传入的 `paths` 数组并尝试获取文件大小，如果路径无效会静默吃到异常并将 `file_size` 设为 null，不会报告错误。用户无法知道哪些文件导入失败。
- **修复建议**: 验证每个文件路径存在后再尝试插入，收集失败的路径返回给调用方。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-012: listPersons 的 group_id/tag_id 过滤未实现
- **ID**: REL-012
- **标题**: PersonFilter 中的 group_id/tag_id 过滤功能未实现
- **模块**: Repository 层
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/repositories/person.repo.ts:133`
- **问题描述**: `PersonFilter` 接口定义了 `group_id` 和 `tag_id` 字段，但 `listPersons` 中仅以 `// TODO: Phase 2 实现 group_id/tag_id 过滤` 注释标记，实际未实现。前端 UI 中也缺少对应的筛选器。
- **修复建议**: 实现 `group_id`（JOIN group_members）和 `tag_id`（JOIN taggings）的过滤逻辑，并添加相应的索引。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-013: listPersons intimacy 排序使用相关子查询
- **ID**: REL-013
- **标题**: `intimacy` 排序使用相关子查询导致性能问题
- **模块**: Repository 层
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/repositories/person.repo.ts:144-145`
- **问题描述**: `listPersons` 中按 `intimacy` 排序时使用了相关子查询 `(SELECT MAX(r.intimacy) FROM relationships r WHERE r.person_id = p.id OR r.related_person_id = p.id)`，该子查询对 persons 表中的每一行都会执行，在数据量较大时性能极差。
- **修复建议**: 改为 LEFT JOIN + GROUP BY 方式，或维护一个 `max_intimacy` 冗余字段并同步更新。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-014: listPersons 无分页
- **ID**: REL-014
- **标题**: `listPersons` 未实现分页
- **模块**: Repository 层
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/repositories/person.repo.ts:98-155`
- **问题描述**: `listPersons` 没有 `LIMIT/OFFSET` 或游标分页支持，当数据库中联系人达到数千人时，一次加载全部数据会消耗大量内存和渲染时间。前端 `PersonsPage` 也完全无分页逻辑。
- **修复建议**: 在 `PersonFilter` 中添加 `limit`/`offset` 或 `page`/`pageSize` 参数，在前端添加分页器或无限滚动。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-015: search.repo FTS5 缺少前缀索引
- **ID**: REL-015
- **标题**: FTS5 未配置前缀索引（prefix indexes），中文搜索性能差
- **模块**: Repository 层
- **严重级别**: P2
- **发现来源**: 安全审查
- **文件位置**: `src/main/db/migrations.ts:143-154`
- **问题描述**: FTS5 表创建时未指定 `prefix` 选项（如 `prefix='2 3 4'`），对中文输入法下的逐字搜索不友好，前缀查询（如输入"张"搜索"张三"）会退化全表扫描。
- **修复建议**: 在 FTS5 创建语句中添加 `prefix='2 3 4'` 选项以支持前缀搜索。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-016: JSON 导出不包含 tags/taggings/groups
- **ID**: REL-016
- **标题**: `exportAllDataJSON` 导出不包含 tags、taggings、groups 表数据
- **模块**: Repository 层
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: `src/main/db/repositories/import_export.repo.ts:462-526`
- **问题描述**: JSON 全量导出时仅导出 persons(含社交账号)、relationships、events、diaries、photos、interaction_logs、reminders，遗漏了 tags、taggings、groups 和 group_members 表，导致导出数据不完整，导入后丢失标签和群组信息。
- **修复建议**: 在导出全量 JSON 时补充 tags、taggings、groups、group_members 表的数据。
- **预估工作量**: 小
- **依赖**: 无

---

## 3. AI 模块问题

---

### REL-017: face-api.js 模型文件缺失
- **ID**: REL-017
- **标题**: face-api.js 所需的模型权重文件未包含在仓库或打包中
- **模块**: AI 模块
- **严重级别**: P0
- **发现来源**: 功能审查
- **文件位置**: `src/main/ai/face.ts:32-48`, `public/models/`
- **问题描述**: `detectFaces` 在运行时会从 `public/models/` 目录加载 face-api.js 的 SSD Mobilenet v1、Face Landmark 68 等模型文件，但这些文件未包含在仓库中（`public/models/` 目录可能不存在）。用户需要手动从 face-api.js 仓库下载模型文件才能使用人脸检测功能。
- **修复建议**: 添加模型文件下载脚本/文档，或在应用首次启动时自动下载；打包时需要将模型文件包含在 `extraResources` 中。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-018: face-api.js + canvas 依赖风险
- **ID**: REL-018
- **标题**: face-api.js (停止维护) + canvas (原生模块) 的双重依赖风险
- **模块**: AI 模块
- **严重级别**: P1
- **发现来源**: 架构审查
- **文件位置**: `src/main/ai/face.ts:1-26`、`package.json`
- **问题描述**: face-api.js 已停止维护超过 3 年，无法适配新版 TensorFlow.js；canvas 包是 C++ 原生模块，在 Electron 中构建困难。两个依赖的版本兼容性和构建稳定性都是高风险点。Electron 30 + Node.js 环境下 canvas 的预编译二进制可能不兼容。
- **修复建议**: 评估替代方案：迁移到 TensorFlow.js（tfjs）或 ONNX Runtime Web；对 canvas 依赖考虑使用 Electron 内置的 nativeImage 进行图像加载。
- **预估工作量**: 大
- **依赖**: 无

---

### REL-019: OCR Worker 未在应用退出时清理
- **ID**: REL-019
- **标题**: OCR Tesseract Worker 未在应用退出时自动终止
- **模块**: AI 模块
- **严重级别**: P1
- **发现来源**: 架构审查
- **文件位置**: `src/main/ai/ocr.ts:11-43`、`electron/main.ts:68-70`
- **问题描述**: `ocr.ts` 使用 Tesseract Worker 单例（懒加载），提供了 `terminateOcrWorker()` 清理函数，但 `electron/main.ts` 的 `before-quit` 事件中并未调用它。应用退出时 OCR Worker 进程可能仍然存活，导致资源泄漏。
- **修复建议**: 在 `electron/main.ts` 的 `before-quit` 或 `will-quit` 事件中导入并调用 `terminateOcrWorker()`。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-020: OCR Worker 无崩溃恢复机制
- **ID**: REL-020
- **标题**: Tesseract Worker 进程崩溃后无自动重启机制
- **模块**: AI 模块
- **严重级别**: P1
- **发现来源**: 架构审查
- **文件位置**: `src/main/ai/ocr.ts:17-28`
- **问题描述**: `getOcrWorker()` 创建 Worker 后如果 Tesseract 子进程崩溃（如 OOM），Worker 进入不可用状态但 `ocrWorker` 变量仍持有引用。后续所有 OCR 请求将失败，且不会自动重建 Worker。
- **修复建议**: 为 `worker.recognize()` 添加错误处理，检测到 Worker 不可用时重置 `ocrWorker = null` 并重新创建；或使用 Tesseract.js v7 的 `worker.reinitialize()` 恢复。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-021: OCR Worker 无超时机制
- **ID**: REL-021
- **标题**: OCR 识别无超时控制，大图片可导致 Worker 永久挂起
- **模块**: AI 模块
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `src/main/ai/ocr.ts:126-170`
- **问题描述**: `scanCard` 调用 `worker.recognize()` 时未设置超时，当用户传入超大图片（如 10MB+）或格式异常图片时，Tesseract 可能长时间占用 CPU 或死锁，导致应用无响应。
- **修复建议**: 使用 `AbortController` 或 `Promise.race` 添加 60 秒超时，超时后终止当前识别并重置 Worker。
- **预估工作量**: 中
- **依赖**: REL-019

---

### REL-022: 人脸检测模型路径依赖 APP_ROOT
- **ID**: REL-022
- **标题**: face-api.js 模型路径硬编码依赖 process.env.APP_ROOT
- **模块**: AI 模块
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/ai/face.ts:32-34`
- **问题描述**: `getModelPath()` 直接拼接 `process.env.APP_ROOT` 来定位模型文件，但打包后 `APP_ROOT` 指向 `dist-electron` 目录，模型文件若未正确打包到 `extraResources` 中将找不到。同时，该方法缺乏对打包后路径的兼容处理。
- **修复建议**: 使用 `app.isPackaged` 判断是开发还是生产模式，生产模式下从 `process.resourcesPath` 加载模型；将模型文件配置到 `electron-builder.json5` 的 `extraResources` 中。
- **预估工作量**: 中
- **依赖**: REL-017

---

### REL-023: ai:calculateIntimacy 注册位置不一致
- **ID**: REL-023
- **标题**: `calculateIntimacy` IPC handler 未在 ai.ipc.ts 中注册，而在独立的 intimacy.ipc 中
- **模块**: AI 模块
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `electron/ipc/ai.ipc.ts` vs `electron/ipc/intimacy.ipc.ts`
- **问题描述**: 所有 AI 相关功能（OCR、人脸检测、断联检测）的 IPC handler 集中在 `ai.ipc.ts` 中，但 `calculateIntimacy` 却单独放在 `intimacy.ipc.ts` 中注册，导致 IPC handler 注册逻辑分散，维护成本高。
- **修复建议**: 将 `registerIntimacyIPC` 的注册逻辑合并到 `registerAIIPC` 中，统一在 `ai.ipc.ts` 中管理。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-024: 亲密度算法权重不可配置
- **ID**: REL-024
- **标题**: 亲密度算法四维权重硬编码于代码中，用户无法自定义
- **模块**: AI 模块
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/ai/intimacy.ts:125-127`
- **问题描述**: 综合评分公式 `frequency * 0.25 + recency * 0.30 + depth * 0.20 + manual * 0.25` 的权重是硬编码的。用户无法根据自身偏好调整各维度重要性（如更看重近期互动而非累计频率）。
- **修复建议**: 在 Settings 页面添加亲密度算法权重的自定义配置，持久化到数据库或配置文件中，算法模块从中读取动态权重。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-025: 断联检测边界条件问题
- **ID**: REL-025
- **标题**: 断联检测中 `new Date()` 解析边界日期字符串可能失败
- **模块**: AI 模块
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/ai/lost_contact.ts:72-75`
- **问题描述**: 断联检测中解析日期 `new Date(lastContactStr)` 可能返回 Invalid Date（如空字符串或格式异常），虽然代码中 `Number.isNaN` 做了检查并 `continue`，但这会导致该联系人被静默跳过，用户无法得知有联系人被遗漏检测。
- **修复建议**: 添加日志或错误收集，记录被跳过的联系人 ID；使用 date-fns 的 `parseISO` 替代 `new Date`。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-026: 断联检测无分页限制
- **ID**: REL-026
- **标题**: `detectLostContacts` 加载全表到内存，无分页限制
- **模块**: AI 模块
- **严重级别**: P1
- **发现来源**: 架构审查 / 安全审查
- **文件位置**: `src/main/ai/lost_contact.ts:27-40`
- **问题描述**: SQL 查询 `SELECT p.* ... FROM persons p` 不带 `LIMIT` 子句，将所有未归档联系人一次性加载到内存中。当联系人数量达到 10 万级时，内存占用可达数百 MB，且全量循环处理会长时间阻塞主线程。
- **修复建议**: 将 SQL 逻辑改为分页查询或在 SQLite 层面完成计算（使用 CASE WHEN + 日期比较），避免全量加载到内存。
- **预估工作量**: 中
- **依赖**: 无

---

## 4. IPC 层问题

---

### REL-027: IPC handler 无输入验证
- **ID**: REL-027
- **标题**: 所有 IPC handler 均无输入参数验证
- **模块**: IPC 层
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `electron/ipc/*.ts` (全局)
- **问题描述**: 所有 IPC handler 直接使用 `_event` 和参数，未对参数类型、长度、格式进行任何校验。恶意调用或前端 bug 传递异常数据（如超长字符串、null、undefined）可导致数据库错误、应用崩溃甚至注入攻击。例如 `person.ipc.ts:17` 的 `createPerson` 直接信任 `data` 对象的所有字段。
- **修复建议**: 引入输入验证层（如 zod 或简单的手动校验），对所有 IPC 入参进行类型、长度、必填项检查后再传递给 repository 层。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-028: window.ipcRenderer 直接暴露在全局
- **ID**: REL-028
- **标题**: preload.ts 中存在 window.ipcRenderer 的旧类型声明，contextBridge 虽未暴露但类型定义暴露了
- **模块**: IPC 层
- **严重级别**: P2
- **发现来源**: 安全审查
- **文件位置**: `electron/electron-env.d.ts:25-27`、`electron/preload.ts`
- **问题描述**: `electron-env.d.ts` 声明了 `window.ipcRenderer` 全局类型，`src/main.tsx:13` 中直接使用 `window.ipcRenderer.on` 监听消息。虽然 Electron 安全实践推荐使用 contextBridge 通道，但旧代码可能绕过安全隔离。
- **修复建议**: 移除 `electron-env.d.ts` 中的 `window.ipcRenderer` 声明，所有 IPC 通信统一通过 `window.electronAPI` 通道。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-029: EventItem 接口缺少 person_ids 字段
- **ID**: REL-029
- **标题**: `EventItem` 类型缺少 `person_ids` 字段，前端使用类型强制转换
- **模块**: IPC 层
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/shared/types.ts:55-65`、`src/pages/HomePage.tsx:62`
- **问题描述**: `EventItem` 接口未定义 `person_ids` 字段，但 `HomePage.tsx:62` 中使用 `(e as EventItem & { person_ids?: string[] }).person_ids` 强制类型转换访问。这表明 IPC 返回的数据结构比 TypeScript 类型定义更丰富，类型不安全。
- **修复建议**: 在 `EventItem` 接口中添加可选的 `person_ids` 字段，或确保后端 event list 查询返回关联的 person_ids。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-030: 缺失 getEventById / getDiaryById IPC
- **ID**: REL-030
- **标题**: IPC 缺少 `getEventById` 和 `getDiaryById` 单条查询通道
- **模块**: IPC 层
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `electron/preload.ts:27-38`、`electron/ipc/event.ipc.ts`、`electron/ipc/diary.ipc.ts`
- **问题描述**: `person`、`group`、`tag`、`reminder` 等模块均有 `getById` IPC，但 `event` 和 `diary` 模块只有 CRUD 的 list/create/update/delete，缺少按 ID 获取单条记录的 IPC 通道。前端无法在编辑模式下预填关联联系人数据。
- **修复建议**: 添加 `event:getById` 和 `diary:getById` 的 IPC handler 和 preload 通道，并在 Repository 层实现对应的查询方法。
- **预估工作量**: 小
- **依赖**: 无

---

## 5. Electron 安全配置问题

---

### REL-031: webPreferences 安全配置缺失
- **ID**: REL-031
- **标题**: BrowserWindow 创建时 webPreferences 缺少安全配置
- **模块**: Electron 安全配置
- **严重级别**: P0
- **发现来源**: 安全审查
- **文件位置**: `electron/main.ts:19-36`
- **问题描述**: BrowserWindow 创建时 `webPreferences` 只设置了 `preload`，未禁用 `nodeIntegration`（默认 false）、未设置 `contextIsolation: true`（虽然默认 true，但应显式声明）、未设置 `sandbox`、未设置 `webSecurity` 等安全选项。存在潜在的 XSS 和远程代码执行风险。
- **修复建议**: 显式设置: `webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true }`
- **预估工作量**: 小
- **依赖**: 无

---

### REL-032: 无 Content-Security-Policy (CSP)
- **ID**: REL-032
- **标题**: HTML 页面未设置 Content-Security-Policy 头
- **模块**: Electron 安全配置
- **严重级别**: P0
- **发现来源**: 安全审查
- **文件位置**: `index.html:1-13`、`electron/main.ts:31-35`
- **问题描述**: `index.html` 中没有 `<meta http-equiv="Content-Security-Policy">`，Electron 主进程也未通过 `session.defaultSession.webRequest` 设置 CSP 头。没有 CSP 保护，应用容易受到 XSS 攻击和内联脚本注入。
- **修复建议**: 在 `index.html` 中添加 CSP meta 标签，或通过 `session.defaultSession.webRequest.onHeadersReceived` 添加 CSP 头：`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
- **预估工作量**: 中
- **依赖**: REL-031

---

### REL-033: 备份加密使用固定盐值
- **ID**: REL-033
- **标题**: AES-256-CBC 密钥派生使用硬编码固定盐值
- **模块**: Electron 安全配置
- **严重级别**: P2
- **发现来源**: 安全审查
- **文件位置**: `src/main/db/backup.ts:17`
- **问题描述**: `KEY_DERIVATION_SALT = 'relmap-backup-salt-v1'` 作为静态字符串硬编码在源码中，且用于所有密码的 scrypt 密钥派生。固定盐值使彩虹表攻击变得更可行，虽然 scrypt 本身的计算开销提供了一定防护，但违背了密码学最佳实践。
- **修复建议**: 为每次备份生成随机盐值（`crypto.randomBytes(16)`），与 IV 一起存储在备份文件头中；读取时从文件头提取盐值进行密钥派生。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-034: 图片路径注入风险
- **ID**: REL-034
- **标题**: PhotoGrid 直接使用 `file:///` 协议加载用户输入路径，无路径校验
- **模块**: Electron 安全配置
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `src/components/photos/PhotoGrid.tsx:9-12`
- **问题描述**: `photoSrc` 函数将任意文件路径通过 `file:///` 协议加载为 `<img>` 标签的 `src`。如果数据库中的 `file_path` 被篡改为指向敏感文件（如 `/etc/passwd` 或 `C:/Windows/system32/config/SAM`），攻击者可以通过读取图片的渲染错误信息窥探系统文件存在性。
- **修复建议**: 对图片路径进行白名单校验，限制只加载指定照片目录下的文件；或使用 `protocol.registerFileProtocol` 在 Electron 主进程中注册安全的文件服务。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-035: vCard 解析器无输入上限
- **ID**: REL-035
- **标题**: vCard 解析器未限制输入大小，存在 DoS 风险
- **模块**: Electron 安全配置
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `src/main/db/repositories/import_export.repo.ts:196-288`
- **问题描述**: `parseVCard` 直接将文本按行拆分后逐行处理，如果恶意构造超大 vCard（如包含数百万个 VCARD 实例），会导致内存耗尽或主线程长时间阻塞，引发拒绝服务。
- **修复建议**: 添加输入大小限制（如 10MB），并在解析循环中添加行数上限（如 10 万行）。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-036: 无缩略图生成
- **ID**: REL-036
- **标题**: 照片导入时无缩略图生成，大图直接加载
- **模块**: Electron 安全配置
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `src/main/db/repositories/photos.repo.ts:17-56`
- **问题描述**: `importPhotos` 只记录文件路径和大小，不生成缩略图。前端 `PhotoGrid` 使用 `file:///` 直接加载原始图片。用户导入高分辨率照片（如 4000×3000，10MB）时，每次渲染都会加载完整原图，内存占用极高，且 `file:///` 协议在 Electron 中可能引发安全警告。
- **修复建议**: 导入时使用 sharp 或 Electron 的 nativeImage 生成 300px 缩略图存储到 `photos.thumbnail_path`，前端优先加载缩略图。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-037: react-markdown 死依赖
- **ID**: REL-037
- **标题**: react-markdown 依赖可能未在 UI 中实际使用
- **模块**: Electron 安全配置
- **严重级别**: P3
- **发现来源**: 安全审查
- **文件位置**: `package.json:19`
- **问题描述**: `react-markdown` 在 `package.json` 的 dependencies 中声明，但源码中未找到导入使用的地方（日记内容显示只是纯文本）。不必要的依赖增加了攻击面和包体积。
- **修复建议**: 确认是否真的需要 Markdown 渲染，若不需要则移除 `react-markdown` 依赖。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-038: Cytoscape 全量重绘
- **ID**: REL-038
- **标题**: 关系图谱无增量更新机制，每次变更全量重绘
- **模块**: Electron 安全配置
- **严重级别**: P2
- **发现来源**: 安全审查
- **文件位置**: `electron/preload.ts:25`
- **问题描述**: `getGraphData` 每次被调用时都全量重新查询关系数据并重建 Cytoscape 图。如果有数千个节点和边，每次筛选或更新都会造成明显的 UI 卡顿。
- **修复建议**: 实现增量更新：缓存已有图数据，仅对差异部分进行增删改操作（Cytoscape 原生支持增量操作，如 `cy.add()`、`cy.remove()`）。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-039: date-fns 不安全的日期解析
- **ID**: REL-039
- **标题**: 使用 `new Date()` 解析日期字符串，应使用 date-fns parse 函数
- **模块**: Electron 安全配置
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/pages/HomePage.tsx:194`、`src/components/events/EventCard.tsx:20`、`src/components/reminders/LostContactAlert.tsx:149`
- **问题描述**: 多处使用 `new Date(dateString)` 或 `new Date(date + 'T00:00:00')` 解析日期，这种方式对格式不一致的日期字符串容易产生无效日期或时区偏移。`date-fns` 已在依赖中，应使用其 `parse` 或 `parseISO` 函数。
- **修复建议**: 统一替换为 `parseISO(dateStr)` 或 `parse(dateStr, 'yyyy-MM-dd', new Date())`。
- **预估工作量**: 小
- **依赖**: 无

---

## 6. 前端/UI 组件问题

---

### REL-040: 缺少 404 通配路由
- **ID**: REL-040
- **标题**: React Router 缺少 `path="*"` 通配路由处理 404
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/App.tsx:16-26`
- **问题描述**: `<Routes>` 中只定义了 8 个已知路由，未添加 `path="*"` 通配路由。用户输入无效路径（如 `/invalid`）将看到一个空白页面，没有友好的 404 提示。
- **修复建议**: 在 `<Routes>` 最后添加 `<Route path="*" element={<NotFoundPage />} />`，创建一个美观的 404 页面。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-041: PersonDetailPage id 未做有效性校验
- **ID**: REL-041
- **标题**: PersonDetailPage 从路由获取的 id 未校验是否有效
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:36`
- **问题描述**: `useParams<{ id: string }>()` 获取的 `id` 直接用于 IPC 调用，未校验是否为有效的 UUID 格式。传入无效 ID 时后端返回 "Person not found" 错误，但前端只 `console.error` 并不显示给用户（`person` 变为 null 后显示通用"未找到联系人"）。
- **修复建议**: 添加 UUID 格式校验，无效时直接跳转到 404 页面或显示错误提示。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-042: 路由路径硬编码，无集中管理
- **ID**: REL-042
- **标题**: 路由路径字符串散落在各处，无集中常量定义
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/App.tsx:18-24`、`src/pages/HomePage.tsx:86`、`src/pages/PersonsPage.tsx:51`
- **问题描述**: 路由路径（如 `/persons`、`/persons/:id`）在 App.tsx、HomePage、PersonDetailPage、PersonsPage 等多处作为字符串字面量使用。路径重构时需搜索替换所有引用，容易遗漏。
- **修复建议**: 定义路由常量对象（如 `ROUTES = { persons: '/persons', personDetail: '/persons/:id' }`）统一管理，组件中引用常量。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-043: Zustand 完全未使用
- **ID**: REL-043
- **标题**: Zustand 状态管理库已安装但未在项目中使用
- **模块**: 前端/UI 组件
- **严重级别**: P0
- **发现来源**: 前端审查
- **文件位置**: `package.json:23`
- **问题描述**: `zustand` 5.0.14 已在 dependencies 中但全局搜索 `create(` 无使用。当前全局状态完全依赖 React 组件内 `useState` + props 传递，无跨组件通信机制。多个组件需要共享数据时只能层层传 prop 或重复调用 IPC。
- **修复建议**: 创建全局 Store（如 persons store、graph store），使用 zustand 管理跨组件共享状态，减少重复 IPC 调用。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-044: PersonDetailPage 每个 tab 独立拉取数据
- **ID**: REL-044
- **标题**: PersonDetailPage 切换 tab 时单独发起 IPC 请求
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:112-122`
- **问题描述**: 每次切换 tab 时都单独调用对应的 IPC 接口（`loadSocials`、`loadRelations` 等），切换回已查看过的 tab 会重新请求数据，没有缓存机制。每次切换都有网络等待时间（用户感知卡顿）。
- **修复建议**: 使用 SWR、TanStack Query 或简单的缓存策略，对已加载的 tab 数据缓存，避免重复请求。
- **预估工作量**: 中
- **依赖**: REL-043

---

### REL-045: HomePage 并行发起 4 个 IPC 请求
- **ID**: REL-045
- **标题**: HomePage 在单个 useEffect 中并行发起 4 个 IPC 请求
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/pages/HomePage.tsx:33-45`
- **问题描述**: `loadAll` 使用 `Promise.all` 发起 `person.list()`, `event.list()`, `diary.list()`, `relation.getGraphData()` 4 个请求。虽然并发了，但没有任何错误隔离 - 其中一个失败不影响其他，但全部失败后页面显示空数据，用户无反馈。且首页加载必经 4 个串行队列的 IPC 通信。
- **修复建议**: 为每个请求添加独立的错误处理；在相应数据为空时显示局部错误提示而非全空白。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-046: GroupManager N+1 查询
- **ID**: REL-046
- **标题**: GroupManager 对每个群组都单独调用 listMembers 计数
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/components/groups/GroupManager.tsx:386-397`
- **问题描述**: `loadGroups` 加载所有群组后，对每个群组都发起一个 `listMembers` IPC 调用来获取成员数量，形成 N+1 查询模式。如果有 50 个群组，就需要 1（群组列表）+ 50（成员计数）= 51 次 IPC 调用。
- **修复建议**: 在后端 `group:list` 中直接返回成员计数（使用 COUNT 子查询），避免前端逐个查询。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-047: PersonDetailPage relations N+1 查询
- **ID**: REL-047
- **标题**: loadRelations 对每个关系都单独发起 getPersonById 查询
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:76-86`
- **问题描述**: `loadRelations` 获取关系列表后，用 `Promise.all` + `map` 对每个关系的 `related_person_id` 都调用一次 `person.getById` 来获取姓名。如果有 30 个关系，就有 30 次额外 IPC 调用。
- **修复建议**: 修改后端 `getPersonRelations` 接口，通过 JOIN 关联 persons 表，直接返回包含 `related_person_name` 的结果。或提供批量查询接口。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-048: loadPersons 无 try/catch
- **ID**: REL-048
- **标题**: PersonsPage 的 loadPersons 未对 IPC 调用错误进行 try/catch
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/pages/PersonsPage.tsx:33-38`
- **问题描述**: `loadPersons` 调用 `window.electronAPI.person.list(filter)` 时未使用 try/catch 包裹，仅检查 `result.success`。如果 IPC 调用抛出网络层异常（如 Electron 内部错误），Promise reject 将导致 unhandled rejection，应用可能崩溃或进入不可预知状态。
- **修复建议**: 添加 try/catch 块，catch 中设置错误状态并显示给用户。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-049: 无乐观更新机制
- **ID**: REL-049
- **标题**: 数据变更操作无乐观更新，更新后每次都重新拉取全量数据
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: 全局
- **问题描述**: 所有 CRUD 操作完成后都通过重新调用 list/get 来刷新数据（如 `PersonDetailPage` 中的 `loadRelations`、`loadEvents`）。这种方式在数据量大时产生不必要的延迟和网络开销，且没有即时反馈。
- **修复建议**: 实现乐观更新：操作成功时直接更新本地状态（如 `setRelations(prev => prev.map(r => r.id === updated.id ? updated : r))`），不必重新拉取全量数据。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-050: 缺少通用 Modal 基组件
- **ID**: REL-050
- **标题**: 所有模态框都独立实现，没有可复用的 Modal 基组件
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/components/persons/CreatePersonModal.tsx`、`src/components/relations/RelationEditor.tsx` 等
- **问题描述**: 项目中 10+ 个模态框（CreatePersonModal、RelationEditor、EventEditor、DiaryEditor、PhotoImportDialog、AIImportWizard、GroupFormModal、AddMemberModal、BackupDialog 等）都各自独立实现遮罩层、关闭按钮、ESC 事件监听等逻辑。大量的重复代码，且行为不一致（部分支持 ESC 关闭，部分不支持）。
- **修复建议**: 创建一个通用的 `Modal` 基组件（包含遮罩层、ESC 关闭、focus trapping、过渡动画），所有编辑器模态框基于它实现。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-051: 缺少 ErrorBoundary
- **ID**: REL-051
- **标题**: React 应用无 ErrorBoundary 错误边界
- **模块**: 前端/UI 组件
- **严重级别**: P0
- **发现来源**: 前端审查
- **文件位置**: `src/main.tsx:6-9`
- **问题描述**: 整个 React 渲染树没有 ErrorBoundary 包裹，任何组件在渲染过程中抛出 JavaScript 错误时，整个应用会白屏崩溃（React 18 默认行为）。React 控制台会显示错误但用户会看到一个白屏。
- **修复建议**: 在 `App` 组件外层包裹 `ErrorBoundary` 组件，提供"重新加载"按钮和友好的错误提示界面。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-052: 文字"加载中..."散落多处
- **ID**: REL-052
- **标题**: "加载中..."等加载提示文字散落各处，无统一 Loading 组件
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: 全局 (HomePage、PersonsPage、PersonDetailPage、GroupManager、TagManager 等)
- **问题描述**: 项目中 15+ 处使用 `<p>加载中...</p>` 或 `${loading ? <p>加载中...</p> : ...}` 模式。文字不统一（"加载中...", "计算中...", "检测中...", "保存中..."），视觉表现力差（只有文字没有动画）。
- **修复建议**: 创建统一的 `Spinner` 或 `Loading` 组件（带 CSS 旋转动画），替换所有散落的手写加载提示。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-053: confirm()/alert() 原生弹窗
- **ID**: REL-053
- **标题**: 删除确认使用浏览器原生 confirm/alert 弹窗
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:131`、`src/components/groups/GroupManager.tsx:449/469`
- **问题描述**: 删除操作的关键确认弹窗使用 `window.confirm()` 和 `window.alert()` 原生浏览器弹窗。在 Electron 中这些弹窗样式原生且不可定制，无法与应用主题统一，用户体验割裂。
- **修复建议**: 创建统一的 `ConfirmDialog` 组件（基于通用 Modal 基组件），替换所有原生 confirm/alert。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-054: 缺少 EmptyState 组件
- **ID**: REL-054
- **标题**: 空数据状态在各处独立实现，无统一 EmptyState 组件
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: 全局
- **问题描述**: 列表无数据时的"暂无联系人"、"尚无事件"、"还没有标签"等提示在各页面重复实现，样式不一致。某些页面只有简单文字，某些有图标，某些有引导按钮。
- **修复建议**: 创建统一的 `EmptyState` 组件（支持 icon、title、description、action），统一所有空状态样式。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-055: AIImportWizard 无格式校验
- **ID**: REL-055
- **标题**: AI 名片导入电话/邮箱字段无格式校验
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/components/ai/AIImportWizard.tsx:405-485`
- **问题描述**: OCR 解析结果中的电话、邮箱字段在 Step 2 编辑表单中无格式校验。用户可能提交格式错误的电话号码或邮箱，这些内容直接存入 `notes` 字段，后续无法被识别和利用。
- **修复建议**: 在提交前对电话（正则 `^1[3-9]\d{9}$`）和邮箱（`^[\w.-]+@[\w.-]+\.\w+$`）进行格式校验，不合法时提示用户修正。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-056: 表单缺少字段长度上限校验
- **ID**: REL-056
- **标题**: 创建/编辑表单仅校验必填项，无字段长度上限校验
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/components/persons/CreatePersonModal.tsx:65-103`
- **问题描述**: 表单提交时只检查 `name` 是否为空，未对 `name`、`company`、`notes` 等字段做长度限制。用户可提交数千字符的姓名，超出 SQLite TEXT 默认上限或 UI 显示区域。
- **修复建议**: 在输入框上设置 `maxLength`，或在提交时对每个字段进行长度校验。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-057: 无未保存离开提醒
- **ID**: REL-057
- **标题**: 编辑表单无未保存修改的离开提醒
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: 所有编辑器组件
- **问题描述**: 所有模态编辑器中，如果用户填写了一半数据后点击遮罩层关闭或按 ESC 退出，表单数据直接丢失，无"你还有未保存的更改，确认离开吗？"提示，易导致数据丢失。
- **修复建议**: 在编辑器组件中添加 `dirty` 状态追踪，关闭时如果表单有修改则弹出确认对话框。
- **预估工作量**: 中
- **依赖**: REL-050、REL-053

---

### REL-058: CreatePersonModal 生日格式未校验
- **ID**: REL-058
- **标题**: 生日日期输入格式未校验
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/components/persons/CreatePersonModal.tsx:78`
- **问题描述**: `birthday` 使用 `<input type="date">`，但未验证日期是否合理（如 2025-13-01 或 1800-01-01）。无效日期会被 SQLite 接受但导致后续功能（生日提醒、统计）出错。
- **修复建议**: 提交前校验日期是否合理（如不早于 1900 年、不晚于当天），无效时显示提示。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-059: 大部分 modal 不支持 ESC 关闭
- **ID**: REL-059
- **标题**: 多数模态框不支持 ESC 键关闭
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: 全局
- **问题描述**: 项目中 10+ 个模态框中，只有 `AIImportWizard`（:83-84）和 `BackupDialog` 实现了 ESC 键关闭。其他如 `CreatePersonModal`、`RelationEditor`、`EventEditor` 等均不支持，用户必须点击取消/关闭按钮，交互效率低。
- **修复建议**: 在通用 Modal 基组件中统一实现 ESC 关闭逻辑。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-060: 所有 modal 缺少 focus trapping
- **ID**: REL-060
- **标题**: 模态框打开后焦点未锁定在模态框内
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: 全局
- **问题描述**: 模态框打开后，Tab 键焦点可以跳出模态框进入背景页面元素，键盘导航用户可能误操作背景元素。没有实现 aria 规范中的 focus trapping。
- **修复建议**: 在通用 Modal 基组件中实现 focus trapping（Tab 循环在模态框内），使用 `useFocusTrap` 钩子或第三方库。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-061: 缺少 aria-* 属性
- **ID**: REL-061
- **标题**: 大部分交互元素缺少 ARIA 无障碍属性
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: 全局
- **问题描述**: 按钮、表单、模态框、导航等交互元素缺少 `aria-label`、`role`、`aria-modal`、`aria-expanded` 等无障碍属性。屏幕阅读器用户无法有效使用应用。
- **修复建议**: 为关键交互元素添加必要的 ARIA 属性，确保模态框有 `role="dialog"`、`aria-modal="true"`、`aria-labelledby` 等。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-062: 暗色模式完全缺失
- **ID**: REL-062
- **标题**: 应用不支持暗色模式
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: 全局 (所有组件使用固定 text-gray-800/bg-white)
- **问题描述**: 所有组件使用固定的浅色背景（`bg-white`、`bg-gray-50`、`text-gray-800`），未使用 CSS 变量或 Tailwind `dark:` 修饰符。长时间使用高亮背景可能导致视疲劳。
- **修复建议**: 在 Tailwind 配置中启用 `darkMode: 'class'`，在 CSS 变量中定义颜色主题，为所有组件添加 `dark:` 样式变体，添加主题切换开关。
- **预估工作量**: 大
- **依赖**: 无

---

### REL-063: 移动端无响应式适配
- **ID**: REL-063
- **标题**: 页面在窄屏（移动端 / 小窗口）下布局错乱
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/components/layout/AppLayout.tsx:18`、全局
- **问题描述**: 侧边栏固定 64px 宽度不可折叠，首页统计卡片使用 `grid-cols-4` 在窄屏不换行，联系人卡片网格在小窗口下溢出。应用最小窗口 900px 宽，不满足 1024px 以下设备的适配需求。
- **修复建议**: 为页面添加合适的断点：侧边栏在 `<768px` 时折叠为底部导航栏或汉堡菜单；统计卡片改为响应式栅格（`grid-cols-2 md:grid-cols-4`）。
- **预估工作量**: 大
- **依赖**: 无

---

### REL-064: 无分页/虚拟滚动
- **ID**: REL-064
- **标题**: 长列表无分页或虚拟滚动支持
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/pages/PersonsPage.tsx:155`、`src/components/tags/TagManager.tsx:228`、`src/pages/PersonDetailPage.tsx:368/401`
- **问题描述**: 联系人列表、事件列表、日记列表等所有列表页面都一次性渲染全部数据。当数据量达到数百条时，DOM 节点数量过大会导致渲染卡顿和滚动性能下降。
- **修复建议**: 在长列表中引入分页组件或虚拟滚动（react-window / react-virtuoso），限制每页渲染 20-50 条。
- **预估工作量**: 中
- **依赖**: REL-014

---

### REL-065: Toast 通知缺失
- **ID**: REL-065
- **标题**: 操作成功无视觉反馈（Toast 通知）
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: 全局
- **问题描述**: 数据创建、更新、删除成功后没有任何 Toast/Snackbar 通知。用户无法确认操作是否成功，只能通过观察列表是否刷新来推断。错误信息通过 `alert()` 或 `console.error()` 显示。
- **修复建议**: 实现全局 Toast 通知系统（基于 zustand 或 context），在成功/失败操作后显示短暂的通知消息。
- **预估工作量**: 中
- **依赖**: REL-043

---

### REL-066: 图标使用 emoji
- **ID**: REL-066
- **标题**: 侧边栏导航图标使用 emoji 而非 SVG
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/components/layout/AppLayout.tsx:5-12`
- **问题描述**: 侧边栏 7 个导航项使用 emoji 字符（`🏠`, `👥`, `🕸️`, `📅`, `🖼️`, `⚙️`, `❓`），emoji 在不同操作系统/版本上渲染差异大，专业感不足。
- **修复建议**: 替换为 Heroicons 或 Lucide 等矢量图标库的 SVG 图标，保持跨平台一致性。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-067: PhotoImportDialog 手动输入路径
- **ID**: REL-067
- **标题**: 照片导入需要用户手动输入文件路径
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/components/photos/PhotoImportDialog.tsx:89-95`
- **问题描述**: 照片导入对话框要求用户手动输入或粘贴文件路径（"请输入照片文件路径，每行一个"），没有文件选择器按钮。普通用户很难找到图片文件的完整路径，交互体验极差。
- **修复建议**: 添加"选择文件"按钮，使用 `<input type="file" multiple>` 或 Electron 的 `dialog.showOpenDialog` API 让用户通过文件选择器选取照片。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-068: 大规模关系图节点无聚合策略
- **ID**: REL-068
- **标题**: 关系图谱在大规模节点下无聚合/聚类策略
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/pages/GraphPage.tsx` (隐式)
- **问题描述**: `getGraphData` 返回全部可见节点和边，Cytoscape 渲染数千个节点时浏览器难以处理。缺少度阈值过滤或聚类聚合策略。
- **修复建议**: 实现度数分布过滤（只显示度 >= n 的节点），或使用 Cytoscape 的 compound node 进行聚类聚合显示。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-069: index.html title 未改为 RelMap
- **ID**: REL-069
- **标题**: `index.html` 的 `title` 仍为 "Vite + React + TS"
- **模块**: 前端/UI 组件
- **严重级别**: P3
- **发现来源**: 前端审查
- **文件位置**: `index.html:7`
- **问题描述**: 页面标题未从 Vite 模板默认值改为应用名称，打包后的应用窗口标题显示为 "Vite + React + TS"。
- **修复建议**: 将 `<title>` 修改为 `<title>RelMap - 关系地图</title>`。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-070: EventItem 的 person_ids 字段缺失
- **ID**: REL-070
- **标题**: EventItem 接口缺少 person_ids，HomePage 使用类型强制转换
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/shared/types.ts:55-65`、`src/pages/HomePage.tsx:62`
- **问题描述**: 同 REL-029，HomePage 通过类型强转访问 `(e as any).person_ids`，表明后端返回的数据包含关联联系人 ID 但类型定义未反映这一事实。
- **修复建议**: 在 `EventItem` 和 `Diary` 接口中添加 `person_ids?: string[]` 字段。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-071: 社交账号缺少编辑/删除 UI
- **ID**: REL-071
- **标题**: 社交账号列表只有展示，缺少编辑和删除按钮
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:281-298`
- **问题描述**: 社交账号 tab 只显示列表，每条记录没有编辑和删除按钮。用户无法修改已有社交账号信息（如更新微信号），只能看不能改。后端 IPC 已实现 `update` 和 `delete` 通道但前端 UI 未接入。
- **修复建议**: 在社交账号列表项中添加编辑和删除按钮，点击编辑弹出社交账号编辑表单。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-072: PersonsPage SortBy 缺少 intimacy 选项
- **ID**: REL-072
- **标题**: PersonsPage 排序选择器只显示 name/created_at，缺少 intimacy 排序
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonsPage.tsx:8`、`src/pages/PersonsPage.tsx:136-139`
- **问题描述**: `SortBy` 类型只包含 `'name' | 'created_at'`，虽然 `PersonFilter.sort_by` 支持 `'intimacy'` 选项（`shared/types.ts:151`），UI 排序下拉框未提供该选项，用户无法按亲密度排序联系人。
- **修复建议**: 在排序下拉框中添加"按亲密度排序"选项。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-073: 社交账号添加按钮是空壳
- **ID**: REL-073
- **标题**: "添加社交账号"按钮点击只弹 alert 提示"即将实现"
- **模块**: 前端/UI 组件
- **严重级别**: P0
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:273`
- **问题描述**: PersonDetailPage 社交账号 tab 的"+ 添加"按钮点击后显示 `alert('添加社交账号功能即将实现')`，但后端 IPC 的 `social:create` 已经实现并可用。前端 UI 与后端能力脱节。
- **修复建议**: 创建社交账号编辑表单组件，替换 alert 占位符，调用 `window.electronAPI.social.create()` 实现真实添加功能。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-074: 标签关联 UI 缺失
- **ID**: REL-074
- **标题**: 联系人和事件/日记页面缺少标签关联 UI
- **模块**: 前端/UI 组件
- **严重级别**: P0
- **发现来源**: 功能审查
- **文件位置**: 全局 (TagManager 存在但未在其他页面集成)
- **问题描述**: `TagManager` 独立页面中支持创建/编辑标签和管理关联，但 PersonDetailPage 的基本信息 tab、事件编辑器和日记编辑器中未集成标签选择器。用户无法为联系人、事件、日记快速添加标签。后端 `tag:apply` IPC 已实现。
- **修复建议**: 在 PersonDetailPage info tab 中添加标签选择区域；在 EventEditor 和 DiaryEditor 中添加标签选择器。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-075: 关系编辑 UI 缺失
- **ID**: REL-075
- **标题**: PersonDetailPage 关系列表无编辑按钮
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:317-348`
- **问题描述**: 关系列表每条记录只有"删除"按钮，无"编辑"按钮。`RelationEditor` 组件已支持传入 `relation` 以支持编辑模式（`src/components/relations/RelationEditor.tsx:8`），但 PersonDetailPage 未接入。
- **修复建议**: 在关系列表项中添加编辑按钮，点击时打开 RelationEditor 并传入当前关系数据。
- **预估工作量**: 小
- **依赖**: REL-050

---

### REL-076: EventEditor 不支持编辑模式
- **ID**: REL-076
- **标题**: EventEditor 虽有编辑模式参数但关联联系人无法回填
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/components/events/EventEditor.tsx:50-51`
- **问题描述**: `EventEditor` 接受 `event` 参数支持编辑模式，但编辑时 `setPersonIds([])` 被硬编码为空数组，注释说明"当前 API 未提供按事件反查关联联系人"。编辑事件时之前关联的联系人丢失，保存后会解除所有现有关联。
- **修复建议**: 实现 `event:getById` IPC（或扩展 `event:list`），返回事件的关联 `person_ids`，编辑时预填已选联系人。
- **预估工作量**: 中
- **依赖**: REL-030

---

### REL-077: DiaryEditor 不支持编辑模式
- **ID**: REL-077
- **标题**: DiaryEditor 编辑模式下关联联系人无法回填
- **模块**: 前端/UI 组件
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/components/diaries/DiaryEditor.tsx:43-45`
- **问题描述**: 同 REL-076，`DiaryEditor` 编辑模式下 `setPersonIds` 也只预选 `personId`，无法回填已有的关联联系人。编辑日记保存后可能丢失原有的联系人关联。
- **修复建议**: 实现 `diary:getById` IPC，返回日记的关联 `person_ids`，编辑时预填。
- **预估工作量**: 中
- **依赖**: REL-030

---

### REL-078: IntimacyTrend 组件类型不安全
- **ID**: REL-078
- **标题**: IntimacyTrend 对 ai IPC 进行了不安全的手动类型扩展
- **模块**: 前端/UI 组件
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: `src/components/relations/IntimacyTrend.tsx:20-22`
- **问题描述**: `AiApiWithIntimacy` 类型断言绕过 `ElectronAPI` 接口约束，直接在渲染进程中调用 `window.electronAPI.ai.calculateIntimacy`，但 `shared/types.ts` 中 `ElectronAPI.ai` 未声明该通道。类型不安全，无法在编译期捕获错误。
- **修复建议**: 在 `ElectronAPI.ai` 接口中添加 `calculateIntimacy` 声明，移除类型扩展。
- **预估工作量**: 小
- **依赖**: REL-023

---

## 7. 性能问题

---

### REL-079: HomePage 并行发起 4 个 IPC 请求（同 REL-045，此条用于性能归类）
- **ID**: REL-079
- **标题**: HomePage 加载时发起 4 个独立 IPC 请求
- **模块**: 性能问题
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/pages/HomePage.tsx:34-38`
- **问题描述**: 同 REL-045，首页加载必须等待 4 个 IPC 请求全部完成后才能渲染，所有 IPC 调用通过 Electron 的 `ipcMain.handle` 在主进程串行执行，总延迟为各请求延迟之和。
- **修复建议**: 考虑在首页只加载关键数据（如 person list），其他数据懒加载或使用骨架屏。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-080: GroupManager N+1 查询（同 REL-046）
- **ID**: REL-080
- **标题**: 群组列表的成员计数导致 N+1 IPC 调用
- **模块**: 性能问题
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/components/groups/GroupManager.tsx:386-397`
- **问题描述**: 同 REL-046，每个群组的成员计数需要额外一次 IPC 调用。
- **修复建议**: 在 group list IPC 后端直接返回成员数量。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-081: PersonDetailPage relations N+1 查询（同 REL-047）
- **ID**: REL-081
- **标题**: 关系列表为获取姓名发起 N+1 IPC 调用
- **模块**: 性能问题
- **严重级别**: P1
- **发现来源**: 前端审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:76-86`
- **问题描述**: 同 REL-047，每个关系单独查询联系人姓名。
- **修复建议**: 后端 JOIN 查询直接返回姓名。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-082: TagManager N+1 查询
- **ID**: REL-082
- **标题**: TagManager 为每个标签发起 listTargets 计数
- **模块**: 性能问题
- **严重级别**: P2
- **发现来源**: 前端审查
- **文件位置**: `src/components/tags/TagManager.tsx:44-59`
- **问题描述**: `loadTargetCounts` 对每个标签都调用 `tag.listTargets` 来获取关联计数，构成 N+1 查询模式。
- **修复建议**: 在后端 `tag:list` 中通过子查询返回每个标签的关联计数。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-083: 联系人排序使用相关子查询（同 REL-013）
- **ID**: REL-083
- **标题**: intimacy 排序使用相关子查询导致性能瓶颈
- **模块**: 性能问题
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/repositories/person.repo.ts:144-145`
- **问题描述**: 同 REL-013。
- **修复建议**: 同 REL-013。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-084: 无分页 list 接口（同 REL-014）
- **ID**: REL-084
- **标题**: 多个 list 接口缺少分页
- **模块**: 性能问题
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/repositories/person.repo.ts:98-155`
- **问题描述**: 同 REL-014，所有 list 接口都返回全量数据。
- **修复建议**: 同 REL-014。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-085: detectLostContacts 加载全表（同 REL-026）
- **ID**: REL-085
- **标题**: 断联检测全表加载到内存
- **模块**: 性能问题
- **严重级别**: P1
- **发现来源**: 架构审查 / 安全审查
- **文件位置**: `src/main/ai/lost_contact.ts:27-40`
- **问题描述**: 同 REL-026。
- **修复建议**: 同 REL-026。
- **预估工作量**: 中
- **依赖**: 无

---

## 8. 功能缺失问题

---

### REL-086: 无法编辑事件
- **ID**: REL-086
- **标题**: 事件列表缺少编辑功能入口
- **模块**: 功能缺失
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:368-381`
- **问题描述**: 事件列表只显示 EventCard + 删除按钮，没有编辑按钮。虽然 EventEditor 已支持编辑模式，但 UI 未提供入口。用户只能删除事件后重新创建。
- **修复建议**: 在事件卡片或列表项中添加编辑按钮，打开 EventEditor 并传入 `event` 数据。
- **预估工作量**: 小
- **依赖**: REL-076

---

### REL-087: 无法编辑日记
- **ID**: REL-087
- **标题**: 日记列表缺少编辑功能入口
- **模块**: 功能缺失
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:400-413`
- **问题描述**: 同 REL-086，日记列表只显示 DiaryCard + 删除按钮，无编辑按钮。
- **修复建议**: 在日记卡片中添加编辑按钮，打开 DiaryEditor 并传入 `diary` 数据。
- **预估工作量**: 小
- **依赖**: REL-077

---

### REL-088: 无 NLP 关键词提取模块
- **ID**: REL-088
- **标题**: 缺少 NLP 关键词提取（@node-rs/jieba 未安装/未集成）
- **模块**: 功能缺失
- **严重级别**: P0
- **发现来源**: 功能审查
- **文件位置**: `package.json` (未安装)
- **问题描述**: 应用计划提供从日记/事件内容中自动提取关键词生成标签的功能，但 `@node-rs/jieba` 中文分词库未安装。`node-rs/jieba` 作为 Rust 原生模块在 Electron 中编译可能存在兼容性问题。
- **修复建议**: 安装 `@node-rs/jieba` 并集成到日记/事件创建流程，自动从内容中提取关键词建议作为标签。评估在 Electron 中的编译兼容性。
- **预估工作量**: 中
- **依赖**: REL-089

---

### REL-089: @node-rs/jieba 在 Electron 中编译兼容性
- **ID**: REL-089
- **标题**: `@node-rs/jieba` Rust 原生模块在 Electron 中可能编译失败
- **模块**: 功能缺失
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `package.json`
- **问题描述**: `@node-rs/jieba` 是 Rust 编写的原生 Node.js 模块，Electron 的 Node.js 版本与系统 Node.js 版本可能不兼容，导致 `npm install` 时编译失败或运行时崩溃。
- **修复建议**: 使用 `@electron/rebuild` 重编译原生模块，或在 Docker 中编译好后分发给各平台。评估替代方案（如 `nodejieba` 或调用外部分词服务）。
- **预估工作量**: 中
- **依赖**: REL-088

---

### REL-090: 无重复联系人检测
- **ID**: REL-090
- **标题**: 创建联系人时无重复检测（目前仅在 vCard 导入时有基于姓名+公司的简单检测）
- **模块**: 功能缺失
- **严重级别**: P0
- **发现来源**: 功能审查
- **文件位置**: `src/main/db/repositories/person.repo.ts:11-34`
- **问题描述**: `createPerson` 不检查同名联系人是否已存在，用户可能重复创建同一个人。vCard 导入虽有基于 `name + company` 的检查（`import_export.repo.ts:325`），但手动创建和 AI 名片导入都无重复检测。
- **修复建议**: 实现重复联系人检测：基于姓名相似度（如 Levenshtein 距离）+ 电话号码/邮箱匹配，创建时提示"检测到可能的重复联系人"。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-091: 无智能分组建议
- **ID**: REL-091
- **标题**: 缺少基于亲密度或交互频率的智能分组建议
- **模块**: 功能缺失
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: 全局
- **问题描述**: 应用未提供根据亲密度、交互频率、公司等维度自动将联系人分到建议群组的功能。用户需要手动创建群组并逐个添加成员。
- **修复建议**: 实现"智能分组"功能：基于亲密度（如亲密/普通/疏远）、公司、部门等维度自动生成推荐群组，用户一键确认。
- **预估工作量**: 大
- **依赖**: 无

---

### REL-092: 无日记情感分析
- **ID**: REL-092
- **标题**: 日记内容无情感分析功能
- **模块**: 功能缺失
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: 全局
- **问题描述**: `mood` 字段由用户手动设置（1-10），无自动情感分析。应用无法自动感知用户对某段关系的情感倾向变化趋势。情感分析可作为亲密度计算的辅助维度。
- **修复建议**: 集成轻量级情感分析模型（如 sentiment）或调用 NLP API，自动分析日记内容的正面/负面情感并建议 mood 值。
- **预估工作量**: 大
- **依赖**: 无

---

### REL-093: 无交互频率图表
- **ID**: REL-093
- **标题**: 缺少交互频率统计图表
- **模块**: 功能缺失
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: 全局
- **问题描述**: 应用没有交互频率的统计展示，用户无法直观看到与每个联系人的交互趋势。虽然 `recharts` 依赖已安装且 C 端在某些页面使用，但未用于交互日志可视化。
- **修复建议**: 在 PersonDetailPage 的"交互" tab 中添加交互频率图表（折线图/柱状图），按月份展示交互次数。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-094: 无趋势分析图表
- **ID**: REL-094
- **标题**: 缺少亲密度趋势变化图表
- **模块**: 功能缺失
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: `src/components/relations/IntimacyTrend.tsx`
- **问题描述**: `IntimacyTrend` 组件只展示当前四维得分的雷达图和单次评分详情，没有历史变化趋势曲线。无法查看亲密度随时间的变化轨迹。
- **修复建议**: 定期保存亲密度评分快照（按周/月），在 IntimacyTrend 中添加折线图展示历史变化趋势。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-095: 无法编辑社交账号（同 REL-071）
- **ID**: REL-095
- **标题**: 社交账号无编辑/删除功能
- **模块**: 功能缺失
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:281-298`
- **问题描述**: 同 REL-071。
- **修复建议**: 同 REL-071。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-096: 无法编辑关系（同 REL-075）
- **ID**: REL-096
- **标题**: 关系列表条目不支持编辑
- **模块**: 功能缺失
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonDetailPage.tsx:317-348`
- **问题描述**: 同 REL-075。
- **修复建议**: 同 REL-075。
- **预估工作量**: 小
- **依赖**: REL-050

---

### REL-097: 提醒功能无桌面通知
- **ID**: REL-097
- **标题**: 提醒到期后无桌面通知
- **模块**: 功能缺失
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: 全局 (reminders 模块)
- **问题描述**: `ReminderList` 组件只在页面内显示提醒列表，应用未在后台检查到期提醒并通过 Electron `Notification` API 发送桌面通知。用户必须打开应用才能看到提醒。
- **修复建议**: 在主进程中启动定时检查（`setInterval`），查找到期提醒后使用 `new Notification()` 发送系统通知。
- **预估工作量**: 中
- **依赖**: 无

---

### REL-098: 无生日自动提醒逻辑
- **ID**: REL-098
- **标题**: 联系人生日无自动提醒创建逻辑
- **模块**: 功能缺失
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/main/db/repositories/person.repo.ts:11-34`
- **问题描述**: 创建/编辑联系人时即使填了生日，也不会自动在 `reminders` 表中创建生日提醒。用户需要手动去提醒模块添加，流程割裂。
- **修复建议**: 在 `createPerson` 和 `updatePerson` 中，如果 birthday 有值，自动在 reminders 表中创建一条 `repeat_type: 'yearly'` 的生日提醒。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-099: 无头像上传 UI
- **ID**: REL-099
- **标题**: 联系人创建/编辑时无头像上传功能
- **模块**: 功能缺失
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/components/persons/CreatePersonModal.tsx`
- **问题描述**: 创建联系人表单没有头像上传/选择区域，`persons` 表虽然有 `avatar_path` 字段，但 UI 从未设置。所有联系人显示为首字母缩写圆圈。
- **修复建议**: 在创建/编辑联系人表单中添加头像上传区域（支持文件选择器选取头像图片），将路径存入 `avatar_path` 字段。
- **预估工作量**: 中
- **依赖**: REL-050

---

### REL-100: 无照片人脸标记 UI
- **ID**: REL-100
- **标题**: 照片中检测到的人脸无法在 UI 中标记关联联系人
- **模块**: 功能缺失
- **严重级别**: P0
- **发现来源**: 功能审查
- **文件位置**: `src/main/ai/face.ts:65-100`
- **问题描述**: 后端 `detectFaces` 已实现人脸检测和特征提取，但前端没有任何 UI 让用户将检测到的人脸标记为某个联系人。`photos.face_data` 字段存储的人脸特征数据无法被利用。
- **修复建议**: 在 PhotoDetail 或照片预览页面中，将检测到的人脸框叠加显示在图片上，提供"标记为某人"的下拉选择，将 `face_data + person_id` 关联存储。
- **预估工作量**: 大
- **依赖**: REL-017、REL-018

---

### REL-101: 无批量操作
- **ID**: REL-101
- **标题**: 联系人列表无批量选择/删除/分组操作
- **模块**: 功能缺失
- **严重级别**: P1
- **发现来源**: 功能审查
- **文件位置**: `src/pages/PersonsPage.tsx`
- **问题描述**: 联系人列表只支持单个操作（点击详情、单条收藏），无 checkbox 多选、批量删除、批量添加群组等功能。需要一次性管理大量联系人时非常不便。
- **修复建议**: 在 PersonsPage 添加选择模式（checkbox），实现批量删除、批量添加到群组、批量添加标签等功能。
- **预估工作量**: 中
- **依赖**: REL-064

---

### REL-102: 交互日志无统计图表
- **ID**: REL-102
- **标题**: 交互日志只展示列表，无统计图表
- **模块**: 功能缺失
- **严重级别**: P2
- **发现来源**: 功能审查
- **文件位置**: `src/components/interactions/InteractionLogger.tsx`
- **问题描述**: InteractionLogger 只按时间倒序列出交互记录，没有按交互类型（call/meet/message/social/other）分布饼图或按月份的柱状图统计。
- **修复建议**: 利用已安装的 `recharts` 库添加交互类型分布饼图和月度交互频率柱状图。
- **预估工作量**: 中
- **依赖**: 无

---

## 9. 依赖与打包问题

---

### REL-103: 打包缺少 macOS/Linux target
- **ID**: REL-103
- **标题**: electron-builder 配置缺少 macOS 和 Linux 的完整构建目标
- **模块**: 依赖与打包
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `electron-builder.json5:14-42`
- **问题描述**: macOS 只配了 `dmg` target，Linux 只配了 `AppImage`，但缺少 macOS 的 `mas`（Mac App Store）签名验证和 Linux 的 `deb`/`rpm` 包。此外 `appId` 和 `productName` 仍为占位符 `"YourAppID"`/`"YourAppName"`。
- **修复建议**: 补充完整的打包配置：macOS 添加 `mas`/`zip` target，Linux 添加 `deb`/`rpm`/`snap`；更新 `appId` 和 `productName`。
- **预估工作量**: 小
- **依赖**: 无

---

### REL-104: 无代码签名
- **ID**: REL-104
- **标题**: 未配置代码签名证书和签名流程
- **模块**: 依赖与打包
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `electron-builder.json5`
- **问题描述**: electron-builder 配置中未设置 `certificateFile`、`certificatePassword`、`win.certificateSubjectName` 等签名配置。发布的 Windows/macOS 安装包将未经数字签名，Windows SmartScreen 会阻止用户安装，macOS Gatekeeper 会阻止运行。
- **修复建议**: 获取代码签名证书（Apple Developer ID / Windows EV Code Signing），在 electron-builder 配置中添加签名配置，CI 流程中集成签名步骤。
- **预估工作量**: 中
- **依赖**: REL-103

---

### REL-105: 无自动更新机制
- **ID**: REL-105
- **标题**: 应用无自动更新检查与更新机制
- **模块**: 依赖与打包
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `package.json`、`electron/main.ts`
- **问题描述**: 未集成 `electron-updater` 或 `electron autoUpdater` 模块。发布新版本后用户无法自动收到更新通知，需要手动下载安装包重新安装，不利于安全补丁的快速部署。
- **修复建议**: 集成 `electron-updater`，在应用启动时检查 GitHub Releases 或自有更新服务器的版本，有更新时提示用户下载安装。
- **预估工作量**: 中
- **依赖**: REL-103

---

### REL-106: asarUnpack 未配置
- **ID**: REL-106
- **标题**: 未配置 electron-builder 的 asarUnpack，原生模块可能无法加载
- **模块**: 依赖与打包
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `electron-builder.json5`
- **问题描述**: `electron-builder.json5` 中启用了 `asar: true` 但未配置 `asarUnpack`。`better-sqlite3`（C++ 原生模块）和 face-api.js 的模型权重文件在 asar 打包后可能无法被正确加载，因为 asar 不支持原生模块和二进制资源的动态加载。
- **修复建议**: 在 `electron-builder.json5` 中添加 `asarUnpack: ['node_modules/better-sqlite3/**', 'public/models/**']`，将原生模块和模型文件从 asar 中排除。
- **预估工作量**: 小
- **依赖**: REL-103

---

### REL-107: better-sqlite3 原生模块兼容性
- **ID**: REL-107
- **标题**: better-sqlite3 作为 C++ 原生模块在 Electron 30 中需重编译
- **模块**: 依赖与打包
- **严重级别**: P1
- **发现来源**: 安全审查
- **文件位置**: `package.json:13`
- **问题描述**: `better-sqlite3` 是 C++ 原生模块，直接 `npm install` 安装的是针对系统 Node.js 版本的预编译二进制文件。在 Electron 中运行时需使用 `@electron/rebuild` 针对 Electron 的 Node.js 版本重编译，否则可能导致运行时崩溃。
- **修复建议**: 在 `postinstall` 脚本中添加 `electron-builder install-app-deps` 或 `npx electron-rebuild`。
- **预估工作量**: 小
- **依赖**: REL-106

---

### REL-108: face-api.js 停止维护
- **ID**: REL-108
- **标题**: face-api.js 已停止维护，长期安全风险
- **模块**: 依赖与打包
- **严重级别**: P0
- **发现来源**: 安全审查
- **文件位置**: `package.json:16`
- **问题描述**: face-api.js 最后更新于 2021 年，仓库已 archive 不再维护。底层依赖的 TensorFlow.js 版本过旧，存在已知的 CVE 漏洞。长期来看这不是一个可持续的依赖选择。
- **修复建议**: 迁移到活跃维护的替代方案：`@tensorflow/tfjs` + `@tensorflow-models/face-detection`，或使用 ONNX Runtime 加载人脸检测模型。
- **预估工作量**: 大
- **依赖**: REL-018

---

### REL-109: getDataDir() 代码重复
- **ID**: REL-109
- **标题**: `getDataDir()` 在 connection.ts 和 backup.ts 中重复实现
- **模块**: 依赖与打包
- **严重级别**: P2
- **发现来源**: 架构审查
- **文件位置**: `src/main/db/connection.ts:15-31` 和 `src/main/db/backup.ts:22-38`
- **问题描述**: `connection.ts` 和 `backup.ts` 中都实现了完全相同的 `getDataDir()` 函数（判断开发/生产模式、拼接 `APP_ROOT`、创建目录）。代码重复，如果目录策略变更需要同步修改两处。
- **修复建议**: 将 `getDataDir()` 提取到公用模块（如 `src/main/db/utils.ts`），两处统一引用。
- **预估工作量**: 小
- **依赖**: 无

---

## 问题统计汇总

| 模块 | P0 | P1 | P2 | P3 | 合计 |
|------|:--:|:--:|:--:|:--:|:----:|
| 数据库与数据模型 | 0 | 2 | 7 | 0 | 9 |
| Repository 层 | 0 | 1 | 6 | 0 | 7 |
| AI 模块 | 1 | 4 | 5 | 0 | 10 |
| IPC 层 | 0 | 1 | 3 | 0 | 4 |
| Electron 安全配置 | 2 | 4 | 3 | 1 | 10 |
| 前端/UI 组件 | 4 | 19 | 15 | 1 | 39 |
| 性能问题 | 0 | 4 | 4 | 0 | 8 |
| 功能缺失 | 4 | 8 | 5 | 0 | 17 |
| 依赖与打包 | 1 | 5 | 1 | 0 | 7 |
| **合计** | **12** | **48** | **49** | **2** | **111** |
