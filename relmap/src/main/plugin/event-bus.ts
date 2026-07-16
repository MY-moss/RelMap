type EventHandler = (...args: unknown[]) => void | Promise<void>

interface RegisteredHandler {
  pluginName: string
  handler: EventHandler
}

export class EventBus {
  private listeners = new Map<string, RegisteredHandler[]>()
  private history = new Map<string, unknown[][]>()

  on(event: string, pluginName: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push({ pluginName, handler })
  }

  off(event: string, pluginName: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    const idx = handlers.findIndex(
      (h) => h.pluginName === pluginName && h.handler === handler
    )
    if (idx !== -1) handlers.splice(idx, 1)
    if (handlers.length === 0) this.listeners.delete(event)
  }

  removePlugin(pluginName: string): void {
    for (const [event, handlers] of this.listeners) {
      const remaining = handlers.filter((h) => h.pluginName !== pluginName)
      if (remaining.length === 0) {
        this.listeners.delete(event)
      } else {
        this.listeners.set(event, remaining)
      }
    }
  }

  async emit(event: string, ...args: unknown[]): Promise<void> {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    if (!this.history.has(event)) {
      this.history.set(event, [])
    }
    this.history.get(event)!.push(args)
    const results = handlers.map(({ handler }) => {
      try {
        const result = handler(...args)
        return Promise.resolve(result)
      } catch (err) {
        return Promise.reject(err)
      }
    })
    await Promise.allSettled(results)
  }

  getHistory(event: string): unknown[][] {
    return this.history.get(event) ?? []
  }

  clearHistory(): void {
    this.history.clear()
  }
}

export const eventBus = new EventBus()
