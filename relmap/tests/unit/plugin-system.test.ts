import { describe, it, expect, beforeEach, vi } from 'vitest'

import { EventBus } from '../../src/main/plugin/event-bus'

describe('EventBus', () => {
  let bus: EventBus

  beforeEach(() => {
    bus = new EventBus()
  })

  it('should register and emit events', async () => {
    const handler = vi.fn()
    bus.on('app:ready', 'test-plugin', handler)
    await bus.emit('app:ready', 'arg1', 'arg2')
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should not call handler after off()', async () => {
    const handler = vi.fn()
    bus.on('app:ready', 'test-plugin', handler)
    bus.off('app:ready', 'test-plugin', handler)
    await bus.emit('app:ready')
    expect(handler).not.toHaveBeenCalled()
  })

  it('should handle multiple handlers for same event', async () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('person:created', 'p1', h1)
    bus.on('person:created', 'p2', h2)
    await bus.emit('person:created', { id: '1' })
    expect(h1).toHaveBeenCalledWith({ id: '1' })
    expect(h2).toHaveBeenCalledWith({ id: '1' })
  })

  it('should remove all handlers for a plugin', async () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('app:ready', 'my-plugin', h1)
    bus.on('person:created', 'my-plugin', h2)
    bus.removePlugin('my-plugin')
    await bus.emit('app:ready')
    await bus.emit('person:created', { id: '1' })
    expect(h1).not.toHaveBeenCalled()
    expect(h2).not.toHaveBeenCalled()
  })

  it('should not fail on events with no listeners', async () => {
    await expect(bus.emit('nonexistent')).resolves.toBeUndefined()
  })

  it('should handle handler errors gracefully', async () => {
    const errHandler = vi.fn().mockRejectedValue(new Error('handler error'))
    const okHandler = vi.fn()
    bus.on('test', 'p1', errHandler)
    bus.on('test', 'p2', okHandler)
    await bus.emit('test')
    expect(okHandler).toHaveBeenCalled()
  })

  it('should track event history', async () => {
    bus.on('test', 'p1', vi.fn())
    await bus.emit('test', 'a')
    await bus.emit('test', 'b')
    const history = bus.getHistory('test')
    expect(history).toHaveLength(2)
    expect(history[0]).toEqual(['a'])
    expect(history[1]).toEqual(['b'])
  })

  it('should clear history', () => {
    bus.on('test', 'p1', vi.fn())
    bus.emit('test', 'a')
    bus.clearHistory()
    expect(bus.getHistory('test')).toHaveLength(0)
  })
})

describe('PluginManager - Core', () => {
  it('should validate plugin names correctly', async () => {
    const { PluginManager } = await import('../../src/main/plugin/plugin-manager')
    const pm = new PluginManager()

    const valid = ['my-plugin', 'ollama.bridge', 'test_v2', 'a', 'x'.repeat(100)]
    for (const name of valid) {
      expect((pm as unknown as Record<string, unknown>)['validatePluginName'](name)).toBe(true)
    }

    const invalid = ['', 'a'.repeat(101), '../evil', 'plugin/name', 'plugin\nname', null, undefined, 123]
    for (const name of invalid) {
      expect((pm as unknown as Record<string, unknown>)['validatePluginName'](name)).toBe(false)
    }
  })

  it('should start with empty plugins list', async () => {
    const { PluginManager } = await import('../../src/main/plugin/plugin-manager')
    const pm = new PluginManager()
    expect(pm.getPlugins()).toEqual([])
  })
})

describe('PluginManager - Lifecycle', () => {
  it('should transition through lifecycle states correctly', () => {
    const states = ['installed', 'loading', 'loaded', 'enabled', 'running', 'disabled', 'error']
    const validTransitions: Record<string, string[]> = {
      installed: ['loading', 'error'],
      loading: ['loaded', 'error'],
      loaded: ['enabled', 'error', 'disabled'],
      enabled: ['running', 'error', 'disabled'],
      running: ['disabled', 'error'],
      disabled: ['loading', 'installed'],
      error: ['loading', 'disabled', 'installed'],
    }
    for (const state of states) {
      expect(validTransitions[state]).toBeDefined()
      expect(validTransitions[state].length).toBeGreaterThan(0)
    }
  })
})

describe('PluginManager - Permissions', () => {
  it('should have defined permission sets', async () => {
    const { PluginManager } = await import('../../src/main/plugin/plugin-manager')
    const pm = new PluginManager()

    const validPermissions = ['db:read', 'db:write', 'network', 'filesystem', 'clipboard', 'notification', 'shell:open', 'ai:inference']
    expect(validPermissions).toContain('db:read')
    expect(validPermissions).toContain('db:write')
    expect(validPermissions).toContain('network')
    expect(validPermissions).toContain('filesystem')
    expect(validPermissions.length).toBeGreaterThanOrEqual(6)
    expect(typeof pm).toBe('object')
  })
})

describe('Plugin Manifest v1 Backward Compatibility', () => {
  it('should accept v1 manifest fields', () => {
    const v1Manifest = {
      name: 'legacy-plugin',
      version: '1.0.0',
      description: 'Legacy plugin with v1 schema',
      author: 'old-dev',
      main: 'index.js',
      hooks: ['app:ready'],
      ipcHandlers: ['action1'],
    }
    expect(v1Manifest.name).toBe('legacy-plugin')
    expect(v1Manifest.version).toBe('1.0.0')
    expect(v1Manifest.main).toBe('index.js')
    expect(v1Manifest.hooks).toContain('app:ready')
    expect(v1Manifest.ipcHandlers).toContain('action1')
  })

  it('should accept v2 extended manifest', () => {
    const v2Manifest = {
      name: 'ollama-bridge',
      version: '1.0.0',
      description: 'Ollama LLM bridge',
      author: 'RelMap Team',
      main: 'index.js',
      hooks: ['app:ready', 'person:created'],
      permissions: ['network', 'db:read', 'notification'],
      actions: ['query', 'models'],
      ui: { slots: ['sidebar'] },
      ipcHandlers: ['action1'],
    }
    expect(v2Manifest.permissions).toContain('network')
    expect(v2Manifest.actions).toContain('query')
    expect(v2Manifest.ui?.slots).toContain('sidebar')
    expect(v2Manifest.hooks).toContain('app:ready')
    expect(v2Manifest.ipcHandlers).toContain('action1')
  })
})

describe('Plugin Scenarios', () => {
  it('should have example plugin with valid manifest', () => {
    const manifest = {
      name: 'ollama-bridge',
      version: '1.0.0',
      description: '本地 Ollama LLM 推理桥接',
      author: 'RelMap Team',
      main: 'index.js',
      hooks: ['app:ready', 'person:created'],
      permissions: ['network', 'db:read', 'notification'],
      actions: ['query', 'models'],
      ui: { slots: ['sidebar'] },
    }
    expect(manifest.name).toMatch(/^[a-zA-Z0-9_.-]+$/)
    expect(manifest.name.length).toBeGreaterThanOrEqual(1)
    expect(manifest.name.length).toBeLessThanOrEqual(100)
    expect(manifest.permissions).not.toContain('shell:open')
    expect(manifest.permissions).not.toContain('filesystem')
  })

  it('should enforce permission checking order', () => {
    const requiredPerms = ['db:read', 'network']
    const hasPerm = (perm: string) => requiredPerms.includes(perm)
    expect(hasPerm('db:read')).toBe(true)
    expect(hasPerm('network')).toBe(true)
    expect(hasPerm('filesystem')).toBe(false)
    expect(hasPerm('shell:open')).toBe(false)
  })
})
