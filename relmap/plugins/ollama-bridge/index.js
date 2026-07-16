// Ollama Bridge Plugin for RelMap
// Registers IPC handlers to query local Ollama models
// Runs inside a sandboxed worker_threads + vm.createContext environment

const OLLAMA_BASE = 'http://127.0.0.1:11434'

export default function setup(api) {
  api.registerIPC('query', async (prompt, model) => {
    const selectedModel = model || 'llama3.2'
    const response = await api.fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        prompt: String(prompt),
        stream: false,
      }),
    })
    const data = await response.json()
    return data.response || data
  })

  api.registerIPC('models', async () => {
    const response = await api.fetch(`${OLLAMA_BASE}/api/tags`)
    const data = await response.json()
    return data.models || []
  })

  api.on('app:ready', () => {
    api.logger.info('Ollama Bridge plugin ready — listening on http://127.0.0.1:11434')
    api.notify('Ollama Bridge', '插件已就绪，可通过 IPC 调用本地 LLM')
  })

  api.on('person:created', (person) => {
    api.logger.info(`New person created: ${person.name}`)
  })
}
