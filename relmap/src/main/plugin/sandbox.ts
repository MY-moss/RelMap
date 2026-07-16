import { Worker } from 'node:worker_threads'
import path from 'node:path'
import fs from 'node:fs'

const SANDBOX_TIMEOUT_MS = 30_000
const MAX_IPC_MSGS_PER_SEC = 100

interface SandboxMessage {
  type: 'exec' | 'init' | 'ping' | 'pong' | 'log' | 'error' | 'result' | 'ipc:register' | 'ipc:call' | 'db:query' | 'db:exec' | 'fetch'
  id?: string
  payload?: unknown
  error?: string
}

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class Sandbox {
  private worker: Worker | null = null
  private pending = new Map<string, PendingRequest>()
  private msgCount = 0
  private msgResetTimer: ReturnType<typeof setInterval> | null = null
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private _alive = false
  private _stopped = false
  private onLog: ((msg: string) => void) | null = null

  get alive(): boolean {
    return this._alive
  }

  setLogHandler(handler: (msg: string) => void): void {
    this.onLog = handler
  }

  private normalizeCode(code: string): string {
    return code
      .replace(/^export\s+default\s+/gm, '')
      .replace(/^export\s+/gm, '')
      .trim()
  }

  async start(pluginDir: string, mainFile: string): Promise<void> {
    const mainPath = path.resolve(pluginDir, mainFile)
    if (!mainPath.startsWith(path.resolve(pluginDir))) {
      throw new Error('Sandbox: path traversal detected')
    }
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Sandbox: main file not found: ${mainPath}`)
    }

    const pluginCode = this.normalizeCode(fs.readFileSync(mainPath, 'utf-8'))

    const workerCode = `
      const { parentPort } = require('worker_threads');
      const vm = require('vm');

      const sandboxGlobal = {
        console: { log: (...args) => parentPort.postMessage({ type: 'log', payload: args.join(' ') }) },
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        setInterval: globalThis.setInterval,
        clearInterval: globalThis.clearInterval,
        Promise: globalThis.Promise,
        Math: globalThis.Math,
        JSON: globalThis.JSON,
        Date: globalThis.Date,
        RegExp: globalThis.RegExp,
        Array: globalThis.Array,
        Object: globalThis.Object,
        String: globalThis.String,
        Number: globalThis.Number,
        Boolean: globalThis.Boolean,
        Map: globalThis.Map,
        Set: globalThis.Set,
        Error: globalThis.Error,
        TypeError: globalThis.TypeError,
        RangeError: globalThis.RangeError,
      };

      const context = vm.createContext(sandboxGlobal);

      parentPort.on('message', async (msg) => {
        try {
          if (msg.type === 'init') {
            const script = new vm.Script(
              'globalThis.__pluginSetupFn = (' + msg.payload.code + ')',
              { filename: msg.payload.filename }
            );
            script.runInContext(context);
            sandboxGlobal.__pluginSetupFn = typeof sandboxGlobal.__pluginSetupFn === 'function'
              ? sandboxGlobal.__pluginSetupFn
              : null;
            parentPort.postMessage({ type: 'init', id: msg.id, payload: 'ok' });
          } else if (msg.type === 'exec') {
            if (typeof sandboxGlobal.__pluginSetupFn === 'function') {
              const result = await sandboxGlobal.__pluginSetupFn(msg.payload.api);
              parentPort.postMessage({ type: 'result', id: msg.id, payload: result });
            } else {
              parentPort.postMessage({ type: 'result', id: msg.id, payload: null });
            }
          } else if (msg.type === 'ping') {
            parentPort.postMessage({ type: 'pong', id: msg.id });
          }
        } catch (err) {
          parentPort.postMessage({ type: 'error', id: msg.id, error: err.message });
        }
      });
    `

    this.worker = new Worker(workerCode, { eval: true })

    this.worker.on('message', (msg: SandboxMessage) => {
      if (msg.type === 'log' && typeof msg.payload === 'string') {
        this.onLog?.(msg.payload)
        return
      }
      if (msg.type === 'pong') {
        this._alive = true
        return
      }
      if (msg.id && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id)!
        clearTimeout(pending.timer)
        this.pending.delete(msg.id)
        if (msg.type === 'error') {
          pending.reject(new Error(msg.error || 'Sandbox execution error'))
        } else {
          pending.resolve(msg.payload)
        }
      }
    })

    this.worker.on('error', (err) => {
      this._alive = false
      this.onLog?.(`[Sandbox Error] ${err.message}`)
    })

    this.worker.on('exit', (code) => {
      this._alive = false
      if (code !== 0) {
        this.onLog?.(`[Sandbox] Worker exited with code ${code}`)
      }
    })

    await this.postMessage('init', { code: pluginCode, filename: mainPath })

    this.msgResetTimer = setInterval(() => { this.msgCount = 0 }, 1000)
    this.healthCheckTimer = setInterval(() => this.healthCheck(), 15_000)
    this._alive = true
  }

  async exec(api: Record<string, unknown>): Promise<unknown> {
    return this.postMessage('exec', { api })
  }

  async stop(): Promise<void> {
    this._stopped = true
    if (this.msgResetTimer) clearInterval(this.msgResetTimer)
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer)
    this._alive = false
    this.worker?.terminate()
    this.worker = null
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Sandbox stopped'))
    }
    this.pending.clear()
  }

  private async healthCheck(): Promise<void> {
    if (!this._alive || !this.worker) return
    try {
      await this.postMessage('ping', null, 5000)
    } catch {
      this._alive = false
      this.onLog?.('[Sandbox] Health check failed, worker unresponsive')
    }
  }

  private postMessage(type: string, payload: unknown, timeout = SANDBOX_TIMEOUT_MS): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.worker || this._stopped) {
        reject(new Error('Sandbox worker not available'))
        return
      }

      this.msgCount++
      if (this.msgCount > MAX_IPC_MSGS_PER_SEC) {
        reject(new Error('Sandbox: IPC rate limit exceeded'))
        return
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('Sandbox: execution timed out'))
      }, timeout)

      this.pending.set(id, { resolve, reject, timer })
      this.worker!.postMessage({ type, id, payload } as SandboxMessage)
    })
  }
}
