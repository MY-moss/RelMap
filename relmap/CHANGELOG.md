# Changelog

## [2.0.0] - 2026-07-15
### Added
- React Query integration for data caching and optimistic updates
- Keyboard shortcuts (Ctrl+N/K/E/D)
- Desktop notifications with polling
- Birthday/anniversary auto-reminders
- PIN code app lock with PBKDF2 hashing
- BYOK AI provider configuration (Ollama, OpenAI, DeepSeek, Anthropic)
- Zustand state stores (useUIStore, useModalStore)
- Interaction purpose tracking
- Contact lifecycle stages (new/active/maintain/dormant/lost/archived)
- Follow-up queue for overdue reminders
- Hierarchical tag system with parent-child support
- Message templates library
- Louvain community detection algorithm
- Ollama auto-detection
- Photo batch operations and duplicate detection
- Dark mode support
- AI diary analysis (emotion + keywords)
- Semantic search with FTS5 relevance ranking
- Communication suggestion engine
- Personality profiles with radar charts
- Intimacy prediction (30d/90d trends)
- Bridge person detection (betweenness centrality)
- Social health dashboard with network stats
- Data analytics page
- RelMap Wrapped yearly summary
- Memory capsule (on this day)
- i18n framework (react-i18next, zh-CN/en-US)
- Pino structured logging
- Health check and crash detection
- Data security (path sanitization, integrity check)
- Vitest test infrastructure (36 tests)
- CI/CD pipeline (GitHub Actions)
- Graph enhanced (node details, legend, community coloring, search, export)

### Changed
- HomePage migrated to React Query with enhanced dashboard
- PersonDetailPage migrated to React Query
- PersonsPage with debounced search via React Query
- SettingsPage with new tabs (security, AI, language, privacy, templates)
- GraphPage with enhanced controls and export
- PhotoGrid with selection mode and batch delete
- GlobalSearch with FTS5 relevance scoring
- TagManager with tree hierarchy view
- IntimacyTrend with prediction section
- tailwind.config.js: added darkMode: 'class'
- electron/electron-env.d.ts: proper type declarations
- HelpPage: dynamic version from package.json

### Fixed
- contextBridge bypass removed
- canvas dependency declared
- @types/better-sqlite3 version aligned
- DOM types isolated from Electron
- Empty person ID handled (redirect)
- DB path leaked in error messages (4 locations)
- FTS5 used for keyword search
- N+1 query in smart_grouping
- Debounce search cancellation
- Route code splitting
- Export streaming
- Unmount setState fix in editors
- PhotoGrid fallback for broken images
- is_favorite type (boolean → 0|1)
- All 11 pre-existing TypeScript errors

## [1.2.0] - 2026-07-15
### Added
- Person lifecycle management with stage tracking
- Interaction purpose and follow-up queue
- Hierarchical tags with parent-child support
- Message templates
- Bridge person detection
- Personality profiles with radar charts
- Intimacy prediction with trend visualization
- Social health dashboard
- Data analytics page
- RelMap Wrapped yearly summary
- Memory capsule (on this day)
- Dark mode support
- AI diary emotion analysis
- Semantic search with FTS5
- Communication suggestion engine
- Community detection (Louvain algorithm)
- Ollama auto-detection
- Photo batch operations and duplicate detection

### Changed
- Enhanced GraphPage with community coloring and export
- SettingsPage reorganized with tabs
- Improved error handling across all pages

### Fixed
- Various UI layout and responsiveness fixes

## [1.1.0] - 2026-07-15
### Added
- AI features: OCR, face detection, emotion analysis
- Text analysis and duplicate contact detection
- Backup/restore/import/export functionality
- Contact groups and smart grouping
- Dashboard with statistics
- Global search with relevance ranking
- Tag management
- Photo gallery with grid view

### Changed
- Improved graph visualization with Cytoscape
- Enhanced person detail page layout

### Fixed
- Database connection error handling
- Search performance optimizations

## [1.0.0] - 2026-07-14
### Added
- Initial release with core CRUD operations for contacts
- Relationship graph visualization
- Basic search and filtering
- Contact groups
- Dashboard overview
- AI features: intimacy calculation, lost contact detection
- Backup/restore
- Import/export (CSV, vCard)
- Security: CSP, input sanitization
- ErrorBoundary and Toast notifications
- Social accounts management
