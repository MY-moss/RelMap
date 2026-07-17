import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../src/shared/types'

// 允许渲染进程监听的合法通道白名单
const validChannels = ['ai:progress', 'backup:progress', 'import:progress', 'ai:chat:chunk']

const api: ElectronAPI = {
  // 安全的 IPC 事件监听方法，仅允许白名单通道，避免 contextBridge 绕过
  on: (channel, callback) => {
    if (validChannels.includes(channel)) {
      const listener = (_event: unknown, ...args: unknown[]) => callback(...args)
      ipcRenderer.on(channel, listener)
      // 返回取消监听函数，便于组件卸载时清理
      return () => ipcRenderer.removeListener(channel, listener)
    }
    return () => {}
  },
  person: {
    create: (data) => ipcRenderer.invoke('person:create', data),
    update: (id, data) => ipcRenderer.invoke('person:update', id, data),
    delete: (id) => ipcRenderer.invoke('person:delete', id),
    batchTag: (personIds, tagIds) => ipcRenderer.invoke('person:batchTag', personIds, tagIds),
    batchDelete: (ids) => ipcRenderer.invoke('person:batchDelete', ids),
    getById: (id) => ipcRenderer.invoke('person:getById', id),
    list: (filter) => ipcRenderer.invoke('person:list', filter),
    toggleFavorite: (id) => ipcRenderer.invoke('person:toggleFavorite', id),
    setMainIdentity: (id) => ipcRenderer.invoke('person:setMainIdentity', id),
    getMainIdentity: () => ipcRenderer.invoke('person:getMainIdentity'),
    uploadAvatar: (personId, base64Data) => ipcRenderer.invoke('person:uploadAvatar', personId, base64Data),
    getAvatarDataUrl: (personId) => ipcRenderer.invoke('person:getAvatarDataUrl', personId),
  },
  social: {
    create: (data) => ipcRenderer.invoke('social:create', data),
    update: (id, data) => ipcRenderer.invoke('social:update', id, data),
    delete: (id) => ipcRenderer.invoke('social:delete', id),
    listByPerson: (personId) => ipcRenderer.invoke('social:listByPerson', personId),
    setPrimary: (id) => ipcRenderer.invoke('social:setPrimary', id),
  },
  relation: {
    create: (data) => ipcRenderer.invoke('relation:create', data),
    update: (id, data) => ipcRenderer.invoke('relation:update', id, data),
    delete: (id) => ipcRenderer.invoke('relation:delete', id),
    getPersonRelations: (personId) => ipcRenderer.invoke('relation:getPersonRelations', personId),
    getGraphData: (minIntimacy, limit) => ipcRenderer.invoke('relation:getGraphData', minIntimacy, limit),
    getIntimacyDistribution: () => ipcRenderer.invoke('relation:getIntimacyDistribution'),
  },
  event: {
    create: (data) => ipcRenderer.invoke('event:create', data),
    update: (id, data) => ipcRenderer.invoke('event:update', id, data),
    delete: (id) => ipcRenderer.invoke('event:delete', id),
    list: (filter) => ipcRenderer.invoke('event:list', filter),
  },
  diary: {
    create: (data) => ipcRenderer.invoke('diary:create', data),
    update: (id, data) => ipcRenderer.invoke('diary:update', id, data),
    delete: (id) => ipcRenderer.invoke('diary:delete', id),
    list: (filter) => ipcRenderer.invoke('diary:list', filter),
  },
  photo: {
    import: (paths) => ipcRenderer.invoke('photo:import', paths),
    delete: (id) => ipcRenderer.invoke('photo:delete', id),
    batchDelete: (ids) => ipcRenderer.invoke('photo:batchDelete', ids),
    linkPerson: (photoId, personIds) => ipcRenderer.invoke('photo:linkPerson', photoId, personIds),
    getPersonPhotos: (personId) => ipcRenderer.invoke('photo:getPersonPhotos', personId),
    listAll: (limit?, offset?) => ipcRenderer.invoke('photo:listAll', limit, offset),
  },
  search: {
    global: (query) => ipcRenderer.invoke('search:global', query),
    semantic: (query) => ipcRenderer.invoke('search:semantic', query),
  },
  group: {
    create: (data) => ipcRenderer.invoke('group:create', data),
    update: (id, data) => ipcRenderer.invoke('group:update', id, data),
    delete: (id) => ipcRenderer.invoke('group:delete', id),
    getById: (id) => ipcRenderer.invoke('group:getById', id),
    list: () => ipcRenderer.invoke('group:list'),
    addMembers: (groupId, personIds) => ipcRenderer.invoke('group:addMembers', groupId, personIds),
    removeMember: (groupId, personId) => ipcRenderer.invoke('group:removeMember', groupId, personId),
    listMembers: (groupId) => ipcRenderer.invoke('group:listMembers', groupId),
    listPersonGroups: (personId) => ipcRenderer.invoke('group:listPersonGroups', personId),
  },
  tag: {
    create: (data) => ipcRenderer.invoke('tag:create', data),
    update: (id, data) => ipcRenderer.invoke('tag:update', id, data),
    delete: (id) => ipcRenderer.invoke('tag:delete', id),
    getById: (id) => ipcRenderer.invoke('tag:getById', id),
    list: () => ipcRenderer.invoke('tag:list'),
    listByParent: (parentId) => ipcRenderer.invoke('tag:listByParent', parentId),
    apply: (tagId, targetId, targetType) => ipcRenderer.invoke('tag:apply', tagId, targetId, targetType),
    remove: (tagId, targetId, targetType) => ipcRenderer.invoke('tag:remove', tagId, targetId, targetType),
    listByTarget: (targetId, targetType) => ipcRenderer.invoke('tag:listByTarget', targetId, targetType),
    listTargets: (tagId) => ipcRenderer.invoke('tag:listTargets', tagId),
  },
  ai: {
    ocrScan: (imagePath) => ipcRenderer.invoke('ai:ocrScan', imagePath),
    detectFaces: (imagePath) => ipcRenderer.invoke('ai:detectFaces', imagePath),
    detectLostContacts: (months) => ipcRenderer.invoke('ai:detectLostContacts', months),
    calculateIntimacy: (personId) => ipcRenderer.invoke('ai:calculateIntimacy', personId),
    extractKeywords: (text, topN) => ipcRenderer.invoke('ai:extractKeywords', text, topN),
    analyzeEmotion: (text) => ipcRenderer.invoke('ai:analyzeEmotion', text),
    detectDuplicates: (newPerson) => ipcRenderer.invoke('ai:detectDuplicates', newPerson),
    generateGroupSuggestions: () => ipcRenderer.invoke('ai:generateGroupSuggestions'),
  },
  reminder: {
    create: (data) => ipcRenderer.invoke('reminder:create', data),
    update: (id, data) => ipcRenderer.invoke('reminder:update', id, data),
    delete: (id) => ipcRenderer.invoke('reminder:delete', id),
    getById: (id) => ipcRenderer.invoke('reminder:getById', id),
    list: (filter) => ipcRenderer.invoke('reminder:list', filter),
    upcoming: (days) => ipcRenderer.invoke('reminder:upcoming', days),
    listFollowUp: () => ipcRenderer.invoke('reminder:listFollowUp'),
  },
  followUp: {
    create: (data) => ipcRenderer.invoke('follow-up:create', data),
    update: (id, data) => ipcRenderer.invoke('follow-up:update', id, data),
    delete: (id) => ipcRenderer.invoke('follow-up:delete', id),
    getById: (id) => ipcRenderer.invoke('follow-up:getById', id),
    list: (filter) => ipcRenderer.invoke('follow-up:list', filter),
  },
  interaction: {
    create: (data) => ipcRenderer.invoke('interaction:create', data),
    update: (id, data) => ipcRenderer.invoke('interaction:update', id, data),
    delete: (id) => ipcRenderer.invoke('interaction:delete', id),
    list: (filter) => ipcRenderer.invoke('interaction:list', filter),
    listByPerson: (personId, limit) => ipcRenderer.invoke('interaction:listByPerson', personId, limit),
    lastDate: (personId) => ipcRenderer.invoke('interaction:lastDate', personId),
  },
  backup: {
    export: (password) => ipcRenderer.invoke('backup:export', password),
    import: (password) => ipcRenderer.invoke('backup:import', password),
    list: () => ipcRenderer.invoke('backup:list'),
  },
  io: {
    importVCard: (vcardText) => ipcRenderer.invoke('io:importVCard', vcardText),
    importVCardFile: () => ipcRenderer.invoke('io:importVCardFile'),
    exportCSV: () => ipcRenderer.invoke('io:exportCSV'),
    exportJSON: (mode) => ipcRenderer.invoke('io:exportJSON', mode),
  },
  template: {
    create: (data) => ipcRenderer.invoke('template:create', data),
    update: (id, data) => ipcRenderer.invoke('template:update', id, data),
    delete: (id) => ipcRenderer.invoke('template:delete', id),
    getById: (id) => ipcRenderer.invoke('template:getById', id),
    list: (category) => ipcRenderer.invoke('template:list', category),
  },
  app: {
    hasPin: () => ipcRenderer.invoke('app:hasPin'),
    getStartupConfig: () => ipcRenderer.invoke('app:getStartupConfig'),
    setPin: (pin) => ipcRenderer.invoke('app:setPin', pin),
    verifyPin: (pin) => ipcRenderer.invoke('app:verifyPin', pin),
    getConfig: () => ipcRenderer.invoke('app:getConfig'),
    saveConfig: (partial) => ipcRenderer.invoke('app:saveConfig', partial),
    healthCheck: () => ipcRenderer.invoke('app:healthCheck'),
  },
  ollama: {
    detect: () => ipcRenderer.invoke('ollama:detect'),
    listModels: () => ipcRenderer.invoke('ollama:listModels'),
  },
  analysis: {
    analyzeDiary: (content) => ipcRenderer.invoke('diary:analyze', content),
  },
  analytics: {
    getLifecycleDistribution: () => ipcRenderer.invoke('analytics:getLifecycleDistribution'),
    getMonthlyInteractionTrend: (months) => ipcRenderer.invoke('analytics:getMonthlyInteractionTrend', months),
    getNetworkStats: () => ipcRenderer.invoke('analytics:getNetworkStats'),
    getTopPurposes: () => ipcRenderer.invoke('analytics:getTopPurposes'),
    getContactGrowth: (months) => ipcRenderer.invoke('analytics:getContactGrowth', months),
    getInteractionHeatmap: (months) => ipcRenderer.invoke('analytics:getInteractionHeatmap', months),
    getActivityDistribution: () => ipcRenderer.invoke('analytics:getActivityDistribution'),
    getTopRelationships: (limit) => ipcRenderer.invoke('analytics:getTopRelationships', limit),
  },
  wrapped: {
    generate: (year) => ipcRenderer.invoke('wrapped:generate', year),
  },
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
  },
  update: {
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    onChecking: (cb) => {
      const listener = () => cb()
      ipcRenderer.on('update:checking', listener)
      return () => ipcRenderer.removeListener('update:checking', listener)
    },
    onAvailable: (cb) => {
      const listener = (_event: unknown, info: unknown) => cb(info as { version: string; releaseDate?: string; releaseNotes?: string })
      ipcRenderer.on('update:available', listener)
      return () => ipcRenderer.removeListener('update:available', listener)
    },
    onNotAvailable: (cb) => {
      const listener = () => cb()
      ipcRenderer.on('update:not-available', listener)
      return () => ipcRenderer.removeListener('update:not-available', listener)
    },
    onProgress: (cb) => {
      const listener = (_event: unknown, p: unknown) => cb(p as { percent: number; bytesPerSecond: number; total: number; transferred: number })
      ipcRenderer.on('update:progress', listener)
      return () => ipcRenderer.removeListener('update:progress', listener)
    },
    onDownloaded: (cb) => {
      const listener = () => cb()
      ipcRenderer.on('update:downloaded', listener)
      return () => ipcRenderer.removeListener('update:downloaded', listener)
    },
    onError: (cb) => {
      const listener = (_event: unknown, msg: unknown) => cb(msg as string)
      ipcRenderer.on('update:error', listener)
      return () => ipcRenderer.removeListener('update:error', listener)
    },
  },
  memory: {
    today: () => ipcRenderer.invoke('memory:today'),
    random: () => ipcRenderer.invoke('memory:random'),
  },
  suggestion: {
    generate: (personId) => ipcRenderer.invoke('suggestion:generate', personId),
  },
  personality: {
    buildProfile: (personId) => ipcRenderer.invoke('personality:buildProfile', personId),
  },
  intimacy_prediction: {
    predict: (personId) => ipcRenderer.invoke('intimacy_prediction:predict', personId),
  },
  bridge: {
    detect: (topN) => ipcRenderer.invoke('bridge:detect', topN),
  },
  pathfinder: {
    find: (aId, bId, maxPaths) => ipcRenderer.invoke('pathfinder:find', aId, bId, maxPaths),
  },
  graph_enhanced: {
    getNodeDetails: (personId) => ipcRenderer.invoke('graph:getNodeDetails', personId),
    getCommunities: () => ipcRenderer.invoke('graph:getCommunities'),
  },
  graph_export: {
    exportPng: (dataUrl) => ipcRenderer.invoke('graph:exportPng', dataUrl),
    exportJson: (graphData) => ipcRenderer.invoke('graph:exportJson', graphData),
    exportCsv: (edges) => ipcRenderer.invoke('graph:exportCsv', edges),
    shareSnapshot: (graphData) => ipcRenderer.invoke('graph:shareSnapshot', graphData),
  },
  db: {
    checkIntegrity: () => ipcRenderer.invoke('db:checkIntegrity'),
    checkEncryptionStatus: () => ipcRenderer.invoke('db:checkEncryptionStatus'),
    encrypt: (password) => ipcRenderer.invoke('db:encrypt', password),
    decrypt: (password) => ipcRenderer.invoke('db:decrypt', password),
    changePassword: (oldPassword, newPassword) => ipcRenderer.invoke('db:changePassword', oldPassword, newPassword),
    testKey: (password) => ipcRenderer.invoke('db:testKey', password),
  },
  plugin: {
    scan: () => ipcRenderer.invoke('plugin:scan'),
    load: (name) => ipcRenderer.invoke('plugin:load', name),
    setEnabled: (name, enabled) => ipcRenderer.invoke('plugin:setEnabled', name, enabled),
    list: () => ipcRenderer.invoke('plugin:list'),
    install: () => ipcRenderer.invoke('plugin:install'),
    uninstall: (name) => ipcRenderer.invoke('plugin:uninstall', name),
    getStatus: (name) => ipcRenderer.invoke('plugin:getStatus', name),
    getPluginLogs: (name) => ipcRenderer.invoke('plugin:getLogs', name),
    callHandler: (pluginName, handlerName, ...args) => ipcRenderer.invoke('plugin:callHandler', pluginName, handlerName, ...args),
  },
  external: {
    set: (targetId, targetType, pluginId, externalId, externalData) => ipcRenderer.invoke('external:set', targetId, targetType, pluginId, externalId, externalData),
    getByExternalId: (pluginId, externalId, targetType) => ipcRenderer.invoke('external:getByExternalId', pluginId, externalId, targetType),
  },
  oauth: {
    getAuthorizeUrl: (pluginId, provider, clientId, clientSecret) => ipcRenderer.invoke('oauth:getAuthorizeUrl', pluginId, provider, clientId, clientSecret),
    authorize: (pluginId, provider, clientId, clientSecret) => ipcRenderer.invoke('oauth:authorize', pluginId, provider, clientId, clientSecret),
    getToken: (pluginId, provider) => ipcRenderer.invoke('oauth:getToken', pluginId, provider),
    hasCredentials: (pluginId, provider) => ipcRenderer.invoke('oauth:hasCredentials', pluginId, provider),
    revoke: (pluginId, provider) => ipcRenderer.invoke('oauth:revoke', pluginId, provider),
  },
  aiChat: {
    chat: (messages, provider) => ipcRenderer.invoke('ai:chat', { messages, provider }),
    chatStream: (messages, provider) => ipcRenderer.invoke('ai:chat', { messages, provider, stream: true }),
    onChunk: (callback) => {
      const listener = (_event: unknown, data: { text: string; done: boolean }) => callback(data)
      ipcRenderer.on('ai:chat:chunk', listener)
      return () => ipcRenderer.removeListener('ai:chat:chunk', listener)
    },
    getHistory: () => ipcRenderer.invoke('chat:history:list'),
    getSession: (id) => ipcRenderer.invoke('chat:history:get', id),
    saveSession: (session) => ipcRenderer.invoke('chat:history:save', session),
    deleteSession: (id) => ipcRenderer.invoke('chat:history:delete', id),
    clearHistory: () => ipcRenderer.invoke('chat:history:clear'),
    searchHistory: (query) => ipcRenderer.invoke('chat:history:search', query),
    extractInfo: (sessionId) => ipcRenderer.invoke('chat:history:extractInfo', sessionId),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
