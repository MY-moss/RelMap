import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Person } from '../shared/types'

interface ChatMsg {
  role: 'user' | 'assistant' | 'system'
  content: string
  isStreaming?: boolean
}

interface SessionSummary {
  id: string
  title: string
  systemPrompt?: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage?: string
}

const SYSTEM_PROMPTS = [
  { label: '通用助手', value: '你是一个智能人际关系管理助手，帮助用户管理联系人、分析关系、提供沟通建议。当用户想添加联系人时，输出 JSON 格式数据方便快速创建：\n[CONTACT]{"name":"姓名","company":"公司","title":"职位","notes":"备注","gender":0}[/CONTACT]\ngender: 0=未知, 1=男, 2=女。用中文回复，JSON 只放关键字段。' },
  { label: '关系分析', value: '你是一个关系分析专家。分析用户提供的人际关系信息，给出客观的关系评估和改进建议。' },
  { label: '沟通教练', value: '你是一个沟通教练。根据用户描述的人际关系情况，提供具体的沟通策略和话术建议。' },
  { label: '生日祝福', value: '你是一个文案写手。根据用户提供的信息，创作个性化、真诚的生日祝福或节日问候语。' },
]

const QUICK_ACTIONS = [
  { label: '分析关系', prompt: '请帮我分析一下我的人际关系状况，给出改进建议。' },
  { label: '建议互动', prompt: '最近我和朋友联系较少，请给我一些建议，如何自然地重新建立联系。' },
  { label: '写祝福语', prompt: '请帮我写一段生日祝福语，要真诚自然不套路。' },
  { label: '总结联系人', prompt: '请给我一些建议，如何高效地管理和维护我的联系人列表。' },
]

export default function AiChatPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPTS[0].value)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [persons, setPersons] = useState<Person[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [injectedContacts, setInjectedContacts] = useState<Set<string>>(new Set())
  const [autoInjectEnabled, setAutoInjectEnabled] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load sessions + persons on mount
  useEffect(() => {
    refreshSessions()
    window.electronAPI.person.list({ limit: 1000 }).then(r => {
      if (r.success) setPersons(r.data)
    })
    window.electronAPI.app.getConfig().then(r => {
      if (r.success && r.data) {
        const providers = (r.data as Record<string, unknown>).aiProviders as Record<string, { model?: string }> | undefined
        if (providers) {
          const firstEnabled = Object.entries(providers).find(([, v]) => v)
          if (firstEnabled) {
            setSelectedProvider(firstEnabled[0])
            setSelectedModel(firstEnabled[1]?.model || '')
          }
        }
      }
    })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const refreshSessions = async () => {
    const r = await window.electronAPI.aiChat.getHistory()
    if (r.success && r.data) setSessions(r.data)
  }

  // --- Auto-inject contacts ---
  const findMentionedContacts = useCallback((text: string): Person[] => {
    if (!autoInjectEnabled || persons.length === 0) return []
    const found: Person[] = []
    const lowerText = text.toLowerCase()
    for (const p of persons) {
      if (injectedContacts.has(p.id)) continue
      const nameLower = p.name.toLowerCase()
      if (lowerText.includes(nameLower)) {
        found.push(p)
      }
    }
    return found
  }, [persons, autoInjectEnabled, injectedContacts])

  const buildContactContext = useCallback((contacts: Person[]): string => {
    if (contacts.length === 0) return ''
    const parts = contacts.map(p =>
      `- ${p.name}${p.company ? ` (${p.company})` : ''}${p.title ? ` / ${p.title}` : ''}${p.notes ? `: ${p.notes.slice(0, 100)}` : ''}`
    )
    return `以下联系人在对话中被提及，他们的信息供参考：\n${parts.join('\n')}`
  }, [])

  // --- Save session ---
  const saveCurrentSession = useCallback(async (msgs: ChatMsg[], sp: string) => {
    if (msgs.filter(m => m.role !== 'system').length === 0) return
    const title = msgs.find(m => m.role === 'user')?.content.slice(0, 40) || '新对话'
    await window.electronAPI.aiChat.saveSession({
      id: currentSessionId || undefined,
      title,
      messages: msgs.map((m) => ({ role: m.role, content: m.content })),
      systemPrompt: sp,
    })
    if (!currentSessionId) refreshSessions()
  }, [currentSessionId])

  // --- Load session ---
  const loadSession = async (id: string) => {
    const r = await window.electronAPI.aiChat.getSession(id)
    if (r.success && r.data) {
      setMessages(r.data.messages as ChatMsg[])
      setSystemPrompt(r.data.systemPrompt || SYSTEM_PROMPTS[0].value)
      setCurrentSessionId(r.data.id)
    }
  }

  const handleNewSession = () => {
    setMessages([])
    setCurrentSessionId(null)
    setInjectedContacts(new Set())
  }

  const handleDeleteSession = async (id: string) => {
    await window.electronAPI.aiChat.deleteSession(id)
    refreshSessions()
    if (currentSessionId === id) handleNewSession()
  }

  // --- Send (streaming) ---
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || loading) return

    setInput('')

    // Auto-inject contacts mentioned in the message
    const mentioned = findMentionedContacts(text)
    let contextBlock = ''
    if (mentioned.length > 0) {
      contextBlock = buildContactContext(mentioned)
      setInjectedContacts(prev => {
        const next = new Set(prev)
        mentioned.forEach(p => next.add(p.id))
        return next
      })
    }

    // Manual contact context
    const manualContext = selectedPerson
      ? `当前对话涉及联系人：${selectedPerson.name}${selectedPerson.company ? `，公司：${selectedPerson.company}` : ''}${selectedPerson.title ? `，职位：${selectedPerson.title}` : ''}`
      : ''

    const userMsg: ChatMsg = { role: 'user', content: text }
    const placeholderMsg: ChatMsg = { role: 'assistant', content: '', isStreaming: true }

    setMessages(prev => [...prev, userMsg, placeholderMsg])
    setLoading(true)

    // Build message list (exclude the placeholder we just added)
    const historyMessages = messages.filter(m => m.role !== 'system')
    const systemMsgs: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ]
    if (contextBlock) {
      systemMsgs.push({ role: 'system', content: contextBlock })
    }
    if (manualContext) {
      systemMsgs.push({ role: 'system', content: manualContext })
    }

    let streamingText = ''

    try {
      const msgs = [
        ...systemMsgs,
        ...historyMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text },
      ]

      const removeListener = window.electronAPI.aiChat.onChunk((data) => {
        if (data.done) {
          setMessages(prev => {
            const copy = [...prev]
            const idx = copy.findIndex(m => m.isStreaming)
            if (idx >= 0) {
              copy[idx] = { role: 'assistant', content: streamingText, isStreaming: false }
            }
            return copy
          })
          saveCurrentSession(
            [...messages, userMsg, { role: 'assistant', content: streamingText }],
            systemPrompt
          )
          return
        }
        streamingText += data.text
        setMessages(prev => {
          const copy = [...prev]
          const idx = copy.findIndex(m => m.isStreaming)
          if (idx >= 0) {
            copy[idx] = { role: 'assistant', content: streamingText, isStreaming: true }
          }
          return [...copy]
        })
      })

      const result = await window.electronAPI.aiChat.chatStream(msgs, selectedProvider || undefined)
      removeListener()

      if (!result.success) {
        setMessages(prev => {
          const copy = [...prev]
          const idx = copy.findIndex(m => m.isStreaming)
          if (idx >= 0) {
            copy[idx] = { role: 'assistant', content: `❌ ${result.error || '请求失败'}`, isStreaming: false }
          }
          return copy
        })
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev]
        const idx = copy.findIndex(m => m.isStreaming)
        if (idx >= 0) {
          copy[idx] = { role: 'assistant', content: `❌ 网络错误: ${(err as Error).message}`, isStreaming: false }
        }
        return copy
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (prompt: string) => {
    const text = selectedPerson
      ? prompt + `\n\n当前联系人：${selectedPerson.name}`
      : prompt
    handleSend(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] page-enter">
      {/* Session sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">会话</span>
            <button onClick={handleNewSession} className="text-xs text-primary-500 hover:text-primary-700 font-medium">
              + 新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
              <div
                key={s.id}
                className={`group flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  currentSessionId === s.id ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => loadSession(s.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-xs text-gray-400 truncate">{s.lastMessage || `${s.messageCount} 条消息`}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs ml-2 flex-shrink-0"
                >
                  删除
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-8">暂无历史会话</p>
            )}
          </div>
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => setShowSidebar(false)}
              className="text-xs text-gray-400 hover:text-gray-600 w-full text-left"
            >
              收起侧栏
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {!showSidebar && (
              <button onClick={() => setShowSidebar(true)} className="text-xs text-primary-500 hover:text-primary-700 flex-shrink-0">
                会话
              </button>
            )}
            <h2 className="font-semibold text-gray-800 flex-shrink-0">AI 助手</h2>
            {selectedPerson && (
              <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded truncate max-w-32">
                {selectedPerson.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoInjectEnabled}
                onChange={(e) => setAutoInjectEnabled(e.target.checked)}
                className="rounded"
              />
              自动识别
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-xs outline-none"
            >
              <option value="">默认提供商</option>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="anthropic">Anthropic</option>
              <option value="siliconflow">SiliconFlow</option>
              <option value="ollama">Ollama</option>
            </select>
            <input
              type="text"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              placeholder="模型名"
              className="border border-gray-200 rounded px-2 py-1 text-xs w-24 outline-none font-mono"
            />
          </div>
        </div>

        {/* System prompt selector */}
        <div className="border-b border-gray-100 px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <span className="text-xs text-gray-400 flex-shrink-0">角色:</span>
          {SYSTEM_PROMPTS.map(sp => (
            <button
              key={sp.label}
              onClick={() => setSystemPrompt(sp.value)}
              className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors flex-shrink-0 ${systemPrompt === sp.value ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {sp.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden chat-container-warm mx-2 my-1 rounded-xl">
        <div className="h-full overflow-y-auto px-3 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-12">
              <p className="text-lg mb-2">AI 助手</p>
              <p className="text-sm">选择一个角色，然后开始对话</p>
              <p className="text-xs text-gray-300 mt-1 mb-4">
                在消息中提到联系人名字会自动注入上下文
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_ACTIONS.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => handleQuickAction(qa.prompt)}
                    className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-primary-50 text-gray-600 hover:text-primary-600 border border-gray-200 hover:border-primary-200 rounded-lg transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
              {/* Contact mention quick-select */}
              <div className="mt-6 max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="搜索联系人注入上下文..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  onChange={(e) => {
                    const kw = e.target.value.toLowerCase()
                    window.electronAPI.person.list({ keyword: kw, limit: 10 }).then(r => {
                      if (r.success) setPersons(prev => {
                        const ids = new Set(prev.map(p => p.id))
                        const merged = [...prev]
                        for (const p of r.data) {
                          if (!ids.has(p.id)) { merged.push(p); ids.add(p.id) }
                        }
                        return merged
                      })
                    })
                  }}
                />
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  {persons.slice(0, 20).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPerson(selectedPerson?.id === p.id ? null : p)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        selectedPerson?.id === p.id
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-primary-200 hover:text-primary-600'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => {
            // Detect [CONTACT]{...}[/CONTACT] blocks for quick contact creation
            const contactMatch = !msg.isStreaming ? msg.content.match(/\[CONTACT\]({.*?})\[\/CONTACT\]/s) : null
            interface ContactJson { name?: string; company?: string; title?: string; notes?: string; gender?: number }
            const contactData = contactMatch ? (() => { try { return JSON.parse(contactMatch[1]) as ContactJson } catch { return null } })() : null
            const cleanContent = contactMatch ? msg.content.replace(/\[CONTACT\].*?\[\/CONTACT\]/gs, '').trim() : msg.content
            return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : msg.role === 'system'
                      ? 'bg-gray-100 text-gray-500 text-xs italic'
                      : 'msg-warm-assistant'
                }`}>
                  {cleanContent && <p className="text-sm whitespace-pre-wrap">{cleanContent}</p>}
                  {contactData && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">检测到联系人信息:</p>
                      <div className="text-sm">
                        <span className="font-medium">{String(contactData.name || '')}</span>
                        {contactData.company && <span className="text-gray-500 ml-2">{String(contactData.company)}</span>}
                        {contactData.title && <span className="text-gray-500 ml-2">{String(contactData.title)}</span>}
                      </div>
                      <button
                        onClick={async () => {
                          const r = await window.electronAPI.person.create({
                            name: String(contactData.name || ''),
                            company: contactData.company ? String(contactData.company) : undefined,
                            title: contactData.title ? String(contactData.title) : undefined,
                            notes: contactData.notes ? String(contactData.notes) : undefined,
                            gender: typeof contactData.gender === 'number' ? contactData.gender as 0|1|2 : 0,
                          })
                          if (r.success) {
                            navigate(`/persons/${r.data.id}`)
                          }
                        }}
                        className="mt-2 px-3 py-1 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                      >
                        添加为联系人
                      </button>
                    </div>
                  )}
                  {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-gray-500 ml-0.5 animate-pulse" />}
                </div>
              </div>
            )
          })}
          {loading && !messages.some(m => m.isStreaming) && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-2.5 msg-warm-assistant">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              rows={2}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg transition-colors self-end"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
