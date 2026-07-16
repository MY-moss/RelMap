import { app, ipcMain, Notification } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { eventBus } from './event-bus'
import { Sandbox } from './sandbox'
import type { PluginManifest, PluginInfo, PluginStatus, PluginAPI, PluginPermission } from '../../shared/types'
import { logger } from '../../../electron/logger'
import { createPerson, updatePerson, listPersons } from '../db/repositories/person.repo'
import { createEvent } from '../db/repositories/events.repo'
import { importVCard } from '../db/repositories/import_export.repo'
import { getCredentials } from '../../../electron/ipc/credentials-manager'
import { getDb } from '../db/connection'
import { setExternalId, getByExternalId } from '../db/repositories/external_ids.repo'

interface PluginContext {
  manifest: PluginManifest
  enabled: boolean
  status: PluginStatus
  error?: string
  sandbox: Sandbox | null
  registeredIpcChannels: string[]
  eventHandlers: Array<{ event: string; handler: (...args: unknown[]) => void }>
  pluginHandlers: Map<string, (...args: unknown[]) => unknown>
  logs: string[]
  cpuUsage: number
  memoryUsage: number
  loadTime: number | null
}

const PERMISSION_IPC_MAP: Record<string, PluginPermission[]> = {
  'db:query': ['db:read'],
  'db:exec': ['db:write'],
  'person:list': ['db:read'],
  'person:get': ['db:read'],
  'diary:list': ['db:read'],
}

export class PluginManager {
  private plugins = new Map<string, PluginContext>()
  private pluginsDir: string
  private statePath: string
  constructor() {
    const isDev = !!process.env['VITE_DEV_SERVER_URL']
    const root = process.env.APP_ROOT || process.cwd()
    if (isDev) {
      this.pluginsDir = path.join(root, 'plugins')
      this.statePath = path.join(root, 'plugins-state.json')
    } else {
      this.pluginsDir = path.join(app.getPath('userData'), 'plugins')
      this.statePath = path.join(app.getPath('userData'), 'plugins-state.json')
    }
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true })
    }
  }

  private log(pluginName: string, msg: string): void {
    const ctx = this.plugins.get(pluginName)
    if (ctx) {
      ctx.logs.push(`[${new Date().toISOString()}] ${msg}`)
      if (ctx.logs.length > 1000) ctx.logs.splice(0, ctx.logs.length - 1000)
    }
    logger.debug({ plugin: pluginName }, msg)
  }

  private validatePluginName(name: string): boolean {
    if (typeof name !== 'string') return false
    if (name.length < 1 || name.length > 100) return false
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return false
    if (/\.\.[/\\]/.test(name)) return false
    return true
  }

  async initialize(): Promise<void> {
    await this.scanPlugins()
    await this.loadState()
    this.registerBuiltinIPC()
    logger.info('[PluginManager] Initialized')
  }

  private registerBuiltinIPC(): void {
    ipcMain.handle('plugin:getLogs', async (_event, name: string) => {
      if (!this.validatePluginName(name)) return { success: false, error: 'Invalid plugin name' } as const
      const ctx = this.plugins.get(name)
      if (!ctx) return { success: false, error: 'Plugin not found' } as const
      return { success: true, data: ctx.logs.slice(-200) } as const
    })

    ipcMain.handle('plugin:getStatus', async (_event, name: string) => {
      if (!this.validatePluginName(name)) return { success: false, error: 'Invalid plugin name' } as const
      const ctx = this.plugins.get(name)
      if (!ctx) return { success: false, error: 'Plugin not found' } as const
      return { success: true, data: this.toPluginInfo(ctx) } as const
    })
  }

  async scanPlugins(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = []
    if (!fs.existsSync(this.pluginsDir)) return manifests

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const safeName = path.basename(entry.name)
      if (!this.validatePluginName(safeName)) continue
      const manifestPath = path.join(this.pluginsDir, safeName, 'plugin.json')
      if (!fs.existsSync(manifestPath)) continue
      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8')
        const manifest = JSON.parse(raw) as PluginManifest
        if (manifest.name && manifest.version && manifest.main) {
          if (!this.validatePluginName(manifest.name)) continue
          manifests.push(manifest)
          if (!this.plugins.has(manifest.name)) {
            this.plugins.set(manifest.name, {
              manifest,
              enabled: false,
              status: 'installed',
              sandbox: null,
              registeredIpcChannels: [],
              eventHandlers: [],
              pluginHandlers: new Map(),
              logs: [],
              cpuUsage: 0,
              memoryUsage: 0,
              loadTime: null,
            })
          }
        }
      } catch {
        // skip invalid manifests
      }
    }
    return manifests
  }

  async loadPlugin(name: string): Promise<boolean> {
    const ctx = this.plugins.get(name)
    if (!ctx || !this.validatePluginName(name)) return false

    if (ctx.status === 'loading' || ctx.status === 'loaded' || ctx.status === 'enabled' || ctx.status === 'running') {
      return true
    }

    ctx.status = 'loading'
    ctx.error = undefined
    this.log(name, 'Loading plugin...')

    try {
      const pluginDir = path.join(this.pluginsDir, name)
      const sandbox = new Sandbox()
      sandbox.setLogHandler((msg) => this.log(name, msg))

      const startTime = Date.now()
      await sandbox.start(pluginDir, ctx.manifest.main)
      ctx.loadTime = Date.now() - startTime

      ctx.sandbox = sandbox
      ctx.status = 'loaded'
      this.log(name, `Plugin loaded in ${ctx.loadTime}ms`)

      if (ctx.enabled) {
        await this.enablePlugin(name)
      }

      return true
    } catch (err) {
      ctx.status = 'error'
      ctx.error = (err as Error).message
      ctx.sandbox = null
      this.log(name, `Plugin load failed: ${(err as Error).message}`)
      logger.error({ err, plugin: name }, 'PluginManager: load failed')
      return false
    }
  }

  private async enablePlugin(name: string): Promise<void> {
    const ctx = this.plugins.get(name)
    if (!ctx || !ctx.sandbox) return

    ctx.status = 'enabled'
    this.log(name, 'Enabling plugin...')

    const api = this.createPluginAPI(name)
    try {
      await ctx.sandbox.exec({ api: api as unknown as Record<string, unknown> })
      ctx.status = 'running'

      // Register event hooks
      if (ctx.manifest.hooks) {
        for (const hook of ctx.manifest.hooks) {
          const handler = (...args: unknown[]) => {
            if (ctx.sandbox?.alive) {
              ctx.sandbox.exec({ event: hook, args }).catch((err) => {
                this.log(name, `Hook ${hook} failed: ${err.message}`)
              })
            }
          }
          ctx.eventHandlers.push({ event: hook, handler })
          eventBus.on(hook, name, handler)
        }
      }

      this.log(name, 'Plugin enabled and running')
    } catch (err) {
      ctx.status = 'error'
      ctx.error = (err as Error).message
      this.log(name, `Plugin enable failed: ${(err as Error).message}`)
    }
  }

  private async disablePlugin(name: string): Promise<void> {
    const ctx = this.plugins.get(name)
    if (!ctx) return

    // Remove event handlers
    for (const { event, handler } of ctx.eventHandlers) {
      eventBus.off(event, name, handler)
    }
    ctx.eventHandlers = []

    // Remove registered IPC handlers
    for (const channel of ctx.registeredIpcChannels) {
      try { ipcMain.removeHandler(channel) } catch { /* already removed */ }
    }
    ctx.registeredIpcChannels = []

    // Stop sandbox
    if (ctx.sandbox) {
      await ctx.sandbox.stop()
      ctx.sandbox = null
    }

    ctx.status = 'disabled'
    this.log(name, 'Plugin disabled')
  }

  async setPluginEnabled(name: string, enabled: boolean): Promise<void> {
    const ctx = this.plugins.get(name)
    if (!ctx) throw new Error(`Plugin ${name} not found`)

    ctx.enabled = enabled

    if (enabled) {
      if (ctx.status === 'installed' || ctx.status === 'error' || ctx.status === 'disabled') {
        const loaded = await this.loadPlugin(name)
        if (!loaded) throw new Error(`Failed to load plugin ${name}: ${ctx.error}`)
      } else {
        await this.enablePlugin(name)
      }
    } else {
      await this.disablePlugin(name)
    }

    await this.saveState()
  }

  async uninstallPlugin(name: string): Promise<void> {
    const ctx = this.plugins.get(name)
    if (!ctx) throw new Error(`Plugin ${name} not found`)

    await this.disablePlugin(name)

    const pluginDir = path.join(this.pluginsDir, name)
    if (fs.existsSync(pluginDir)) {
      fs.rmSync(pluginDir, { recursive: true, force: true })
    }

    this.plugins.delete(name)
    this.log(name, 'Plugin uninstalled')
    await this.saveState()
  }

  private createPluginAPI(pluginName: string): PluginAPI {
    const ctx = this.plugins.get(pluginName)!
    const permissions = ctx.manifest.permissions ?? []

    const checkPermission = (perm: PluginPermission): void => {
      if (!permissions.includes(perm)) {
        throw new Error(`Plugin "${pluginName}" does not have "${perm}" permission`)
      }
    }

    return {
      registerIPC: (channel: string, handler: (...args: unknown[]) => unknown) => {
        const fullChannel = `plugin:${pluginName}:${channel}`
        try {
          ipcMain.handle(fullChannel, async (_event, ...args) => {
            const requiredPerms = PERMISSION_IPC_MAP[channel]
            if (requiredPerms) {
              for (const perm of requiredPerms) {
                try { checkPermission(perm as PluginPermission) } catch {
                  return { success: false, error: `Missing permission: ${perm}` }
                }
              }
            }
            return handler(...args)
          })
          ctx.registeredIpcChannels.push(fullChannel)
          ctx.pluginHandlers.set(channel, handler)
          this.log(pluginName, `Registered IPC: ${fullChannel}`)
        } catch (err) {
          this.log(pluginName, `IPC registration failed for ${fullChannel}: ${(err as Error).message}`)
        }
      },
      on: (event: string, handler: (...args: unknown[]) => void) => {
        ctx.eventHandlers.push({ event, handler })
        eventBus.on(event, pluginName, handler)
      },
      off: (event: string, handler: (...args: unknown[]) => void) => {
        const idx = ctx.eventHandlers.findIndex(
          (h) => h.event === event && h.handler === handler
        )
        if (idx !== -1) ctx.eventHandlers.splice(idx, 1)
        eventBus.off(event, pluginName, handler)
      },
      db: {
        query: async (sql: string, params?: unknown[]) => {
          checkPermission('db:read')
          try {
            const db = getDb()
            const stmt = db.prepare(sql)
            return params && params.length > 0 ? stmt.all(...params) : stmt.all()
          } catch (err) {
            this.log(pluginName, `db.query error: ${(err as Error).message}`)
            throw err
          }
        },
        exec: async (sql: string) => {
          checkPermission('db:write')
          try {
            const db = getDb()
            if (/^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REINDEX)\s/i.test(sql)) {
              db.exec(sql)
            } else {
              throw new Error('Only INSERT/UPDATE/DELETE/DDL statements allowed via db.exec')
            }
          } catch (err) {
            this.log(pluginName, `db.exec error: ${(err as Error).message}`)
            throw err
          }
        },
      },
      logger: {
        info: (msg: string, ...args: unknown[]) => this.log(pluginName, `[INFO] ${msg} ${args.join(' ')}`),
        warn: (msg: string, ...args: unknown[]) => this.log(pluginName, `[WARN] ${msg} ${args.join(' ')}`),
        error: (msg: string, ...args: unknown[]) => this.log(pluginName, `[ERROR] ${msg} ${args.join(' ')}`),
      },
      fetch: async (url: string, options?: RequestInit) => {
        checkPermission('network')
        return fetch(url, options)
      },
      notify: (title: string, body: string) => {
        checkPermission('notification')
        new Notification({ title, body }).show()
      },
      getConfig: async (key: string) => {
        return this.getPluginConfig(pluginName, key)
      },
      setConfig: async (key: string, value: unknown) => {
        this.setPluginConfig(pluginName, key, value)
      },
      getToken: async (provider?: string) => {
        checkPermission('network')
        const prov = provider || pluginName
        const cred = getCredentials(pluginName, prov)
        if (!cred) return { success: false, error: 'Not authenticated' }
        return { success: true, data: cred.accessToken }
      },
      createPerson: async (data: Record<string, unknown>) => {
        checkPermission('db:write')
        return createPerson(data as unknown as Parameters<typeof createPerson>[0])
      },
      updatePerson: async (id: string, data: Record<string, unknown>) => {
        checkPermission('db:write')
        return updatePerson(id, data as unknown as Parameters<typeof updatePerson>[1])
      },
      listAllPersons: async () => {
        checkPermission('db:read')
        return listPersons()
      },
      createEvent: async (data: Record<string, unknown>) => {
        checkPermission('db:write')
        return createEvent(data as unknown as Parameters<typeof createEvent>[0])
      },
      importVCard: async (vcardText: string) => {
        checkPermission('db:write')
        return importVCard(vcardText)
      },
      setExternalId: async (targetId: string, targetType: string, externalId: string, externalData?: string) => {
        checkPermission('db:write')
        if (targetType !== 'person' && targetType !== 'event') {
          return { success: false, error: 'Invalid target type' }
        }
        return setExternalId(targetId, targetType as 'person' | 'event', pluginName, externalId, externalData)
      },
      findByResourceName: async (resourceName: string) => {
        checkPermission('db:read')
        const result = getByExternalId(pluginName, resourceName, 'person')
        return result.success && result.data
          ? { success: true, data: { id: result.data.target_id } }
          : { success: true, data: null }
      },
      findEventByExternalId: async (eventId: string) => {
        checkPermission('db:read')
        const result = getByExternalId(pluginName, eventId, 'event')
        return result.success && result.data
          ? { success: true, data: { id: result.data.target_id } }
          : { success: true, data: null }
      },
    }
  }

  private toPluginInfo(ctx: PluginContext): PluginInfo {
    return {
      name: ctx.manifest.name,
      version: ctx.manifest.version,
      description: ctx.manifest.description || '',
      author: ctx.manifest.author || '',
      enabled: ctx.enabled,
      status: ctx.status,
      error: ctx.error,
      hooks: ctx.manifest.hooks,
      permissions: ctx.manifest.permissions,
      actions: ctx.manifest.actions || ctx.manifest.ipcHandlers,
      uiSlots: ctx.manifest.ui?.slots,
    }
  }

  getPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map((ctx) => this.toPluginInfo(ctx))
  }

  getPlugin(name: string): PluginInfo | undefined {
    const ctx = this.plugins.get(name)
    return ctx ? this.toPluginInfo(ctx) : undefined
  }

  getPluginContext(name: string): PluginContext | undefined {
    return this.plugins.get(name)
  }

  async emitEvent(event: string, ...args: unknown[]): Promise<void> {
    await eventBus.emit(event, ...args)
  }

  private async saveState(): Promise<void> {
    const state: Record<string, { enabled: boolean }> = {}
    for (const [name, ctx] of this.plugins) {
      state[name] = { enabled: ctx.enabled }
    }
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2))
  }

  private async loadState(): Promise<void> {
    if (!fs.existsSync(this.statePath)) return
    try {
      const raw = fs.readFileSync(this.statePath, 'utf-8')
      const state = JSON.parse(raw) as Record<string, { enabled: boolean }>
      for (const [name, s] of Object.entries(state)) {
        const ctx = this.plugins.get(name)
        if (ctx) {
          ctx.enabled = s.enabled
        }
      }
    } catch {
      // ignore corrupt state file
    }
  }

  async installPlugin(sourceDir: string): Promise<PluginManifest | null> {
    const manifestPath = path.join(sourceDir, 'plugin.json')
    if (!fs.existsSync(manifestPath)) return null

    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw) as PluginManifest
    if (!manifest.name || !manifest.version || !manifest.main) {
      throw new Error('Invalid plugin manifest')
    }

    if (!this.validatePluginName(manifest.name)) {
      throw new Error('Invalid plugin name')
    }

    const targetDir = path.join(this.pluginsDir, manifest.name)
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }

    this.copyDirSync(sourceDir, targetDir)
    this.plugins.set(manifest.name, {
      manifest,
      enabled: true,
      status: 'installed',
      sandbox: null,
      registeredIpcChannels: [],
      eventHandlers: [],
      pluginHandlers: new Map(),
      logs: [],
      cpuUsage: 0,
      memoryUsage: 0,
      loadTime: null,
    })
    await this.saveState()
    this.log(manifest.name, 'Plugin installed')
    return manifest
  }

  private configPath(): string {
    return path.join(this.pluginsDir, '..', 'plugin-config.json')
  }

  private getPluginConfig(pluginName: string, key: string): unknown {
    try {
      const cfgPath = this.configPath()
      if (!fs.existsSync(cfgPath)) return undefined
      const raw = fs.readFileSync(cfgPath, 'utf-8')
      const all = JSON.parse(raw)
      return all[pluginName]?.[key]
    } catch {
      return undefined
    }
  }

  private setPluginConfig(pluginName: string, key: string, value: unknown): void {
    const cfgPath = this.configPath()
    let all: Record<string, Record<string, unknown>> = {}
    try {
      if (fs.existsSync(cfgPath)) {
        all = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'))
      }
    } catch {
      all = {}
    }
    if (!all[pluginName]) all[pluginName] = {}
    all[pluginName][key] = value
    fs.writeFileSync(cfgPath, JSON.stringify(all, null, 2))
  }

  private copyDirSync(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true })
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        this.copyDirSync(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}

export const pluginManager = new PluginManager()
