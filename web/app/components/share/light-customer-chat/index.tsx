'use client'

import { createLocalStorageState } from 'foxact/create-local-storage-state'
import { useCallback, useEffect, useRef, useState } from 'react'

type Site = {
  title: string
  icon_type?: 'image' | string | null
  icon?: string | null
  icon_background?: string | null
  icon_url?: string | null
  input_placeholder?: string | null
  default_language?: string | null
  chat_color_theme?: string | null
  chat_color_theme_inverted?: boolean | null
  use_icon_as_answer_icon?: boolean | null
}

type Parameters = {
  opening_statement?: string
  suggested_questions?: string[]
  suggested_questions_after_answer?: { enabled?: boolean }
}

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
  suggestedQuestions?: string[]
}

type StreamMessage = {
  event?: string
  answer?: string
  conversation_id?: string
  id?: string
  message_id?: string
  task_id?: string
}

const publicApiBasePath = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api`
const [useConversationIds] = createLocalStorageState<Record<string, string>>('dify-light-chat-conversations', {})
const [useLegacyConversationIds] = createLocalStorageState<Record<string, Record<string, string>>>('conversationIdInfo', {})

function getPassportKey(token: string) {
  return `passport-${token}`
}

function SiteIcon({ site, className, useSiteIcon = true }: { site?: Site, className: string, useSiteIcon?: boolean }) {
  if (!useSiteIcon) {
    return (
      <span className={`${className} flex items-center justify-center bg-blue-100 text-xl`} aria-hidden="true">
        🤖
      </span>
    )
  }

  if (site?.icon_type === 'image' && site.icon_url)
    return <img className={className} src={site.icon_url} alt="" />

  return (
    <span className={`${className} flex items-center justify-center text-xl`} style={{ background: site?.icon_background || '#E9F2FF' }} aria-hidden="true">
      {site?.icon || '🤖'}
    </span>
  )
}

function UserAvatar() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-sm" aria-hidden="true">
      <span className="i-ri-user-3-fill size-5" />
    </span>
  )
}

function SuggestedQuestions({ questions, onSend }: { questions?: string[], onSend: (question: string) => void }) {
  if (!questions?.length)
    return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {questions.filter(question => question.trim()).map(question => (
        <button
          key={question}
          type="button"
          className="rounded-xl border border-blue-200 bg-white/65 px-3 py-1.5 text-left text-sm text-blue-600 transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          onClick={() => onSend(question)}
        >
          {question}
        </button>
      ))}
    </div>
  )
}

function getLocalizedText(language?: string | null) {
  if (language?.startsWith('zh'))
    return { customerService: '智能客服', message: '发送消息', send: '发送消息', stop: '停止回复', loading: '正在加载聊天…', loadError: '无法加载此聊天', sendError: '无法发送消息' }
  if (language?.startsWith('es'))
    return { customerService: 'Atención al cliente', message: 'Escribe un mensaje', send: 'Enviar mensaje', stop: 'Detener respuesta', loading: 'Cargando el chat…', loadError: 'No se pudo cargar este chat', sendError: 'No se pudo enviar el mensaje' }
  return { customerService: 'Customer service', message: 'Message', send: 'Send message', stop: 'Stop responding', loading: 'Loading chat…', loadError: 'Unable to load this chat', sendError: 'Unable to send the message' }
}

function getAccentColor(site?: Site) {
  return /^#[0-9a-f]{6}$/i.test(site?.chat_color_theme || '') ? site!.chat_color_theme! : '#2563eb'
}

function getHeaders(token: string) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-App-Code': token,
  })
  // eslint-disable-next-line no-restricted-properties -- Reuses Dify's existing WebApp authentication passport.
  const passport = globalThis.localStorage.getItem(getPassportKey(token))
  if (passport)
    headers.set('X-App-Passport', passport)
  return headers
}

async function ensurePassport(token: string) {
  // eslint-disable-next-line no-restricted-properties -- Reuses Dify's existing WebApp authentication passport.
  if (globalThis.localStorage.getItem(getPassportKey(token)))
    return

  const response = await fetch(`${publicApiBasePath}/passport`, {
    headers: { 'X-App-Code': token },
    credentials: 'include',
  })
  if (!response.ok)
    throw new Error('Unable to start this chat')

  const data = await response.json() as { access_token?: string }
  if (!data.access_token)
    throw new Error('Unable to start this chat')

  // eslint-disable-next-line no-restricted-properties -- Stores the passport in Dify's established WebApp key.
  globalThis.localStorage.setItem(getPassportKey(token), data.access_token)
}

function normalizeHistory(messages: Array<{ id: string, query: string, answer: string }>): ChatMessage[] {
  return messages.flatMap(message => [
    { id: `question-${message.id}`, role: 'user' as const, content: message.query },
    { id: message.id, role: 'assistant' as const, content: message.answer },
  ])
}

function LightCustomerChat({ token }: { token: string }) {
  const [site, setSite] = useState<Site>()
  const [parameters, setParameters] = useState<Parameters>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState('')
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState('')
  const [conversationIds, setConversationIds] = useConversationIds()
  const [legacyConversationIds] = useLegacyConversationIds()
  const conversationIdsRef = useRef(conversationIds)
  const legacyConversationIdsRef = useRef(legacyConversationIds)
  const taskIdRef = useRef('')
  const abortControllerRef = useRef<AbortController | undefined>(undefined)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    conversationIdsRef.current = conversationIds
  }, [conversationIds])

  useEffect(() => {
    legacyConversationIdsRef.current = legacyConversationIds
  }, [legacyConversationIds])

  useEffect(() => {
    if (!token)
      return

    const load = async () => {
      try {
        await ensurePassport(token)
        const headers = getHeaders(token)
        const storedConversationId = conversationIdsRef.current[token]
          || legacyConversationIdsRef.current[token]?.DEFAULT
          || ''
        const [siteResponse, parametersResponse, historyResponse] = await Promise.all([
          fetch(`${publicApiBasePath}/site`, { headers, credentials: 'include' }),
          fetch(`${publicApiBasePath}/parameters`, { headers, credentials: 'include' }),
          storedConversationId
            ? fetch(`${publicApiBasePath}/messages?conversation_id=${encodeURIComponent(storedConversationId)}&limit=20`, { headers, credentials: 'include' })
            : Promise.resolve(null),
        ])
        if (!siteResponse.ok || !parametersResponse.ok)
          throw new Error('Unable to load this chat')

        const [nextSite, nextParameters] = await Promise.all([
          siteResponse.json() as Promise<{ site: Site } & Site>,
          parametersResponse.json() as Promise<Parameters>,
        ])
        setSite(nextSite.site || nextSite)
        setParameters(nextParameters)
        setConversationId(storedConversationId)

        if (historyResponse?.ok) {
          const history = await historyResponse.json() as { data?: Array<{ id: string, query: string, answer: string }> }
          setMessages(normalizeHistory(history.data || []))
        }
        else if (nextParameters.opening_statement) {
          setMessages([{
            id: 'opening-statement',
            role: 'assistant',
            content: nextParameters.opening_statement,
            suggestedQuestions: nextParameters.suggested_questions,
          }])
        }
      }
      catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this chat')
      }
      finally {
        setIsLoading(false)
      }
    }
    load()
  }, [token])

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: 'end', behavior: isResponding ? 'auto' : 'smooth' })
  }, [isResponding, messages])

  useEffect(() => {
    if (site?.default_language)
      document.documentElement.lang = site.default_language
  }, [site?.default_language])

  const updateAssistantMessage = useCallback((id: string, content: string) => {
    setMessages(items => items.map(item => item.id === id ? { ...item, content: item.content + content } : item))
  }, [])

  const send = useCallback(async (message: string) => {
    const text = message.trim()
    if (!text || isResponding)
      return

    const userMessage: ChatMessage = { id: `question-${Date.now()}`, role: 'user', content: text }
    const assistantMessageId = `answer-${Date.now()}`
    setMessages(items => [...items, userMessage, { id: assistantMessageId, role: 'assistant', content: '' }])
    setQuery('')
    setError('')
    setIsResponding(true)

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    try {
      const response = await fetch(`${publicApiBasePath}/chat-messages`, {
        method: 'POST',
        headers: getHeaders(token),
        credentials: 'include',
        signal: abortController.signal,
        body: JSON.stringify({
          query: text,
          inputs: {},
          response_mode: 'streaming',
          conversation_id: conversationId || undefined,
        }),
      })
      if (!response.ok || !response.body)
        throw new Error('Unable to send the message')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let messageId = ''
      const handleSseLine = (line: string) => {
        if (!line.startsWith('data: '))
          return
        const payload = JSON.parse(line.slice(6)) as StreamMessage
        const event = payload.event
        if (event === 'message' && payload.answer) {
          updateAssistantMessage(assistantMessageId, payload.answer)
          taskIdRef.current = payload.task_id || taskIdRef.current
          messageId = payload.id || payload.message_id || messageId
          if (payload.conversation_id) {
            setConversationId(payload.conversation_id)
            setConversationIds(ids => ({ ...ids, [token]: payload.conversation_id! }))
          }
        }
        if (event === 'message_end') {
          messageId = payload.id || payload.message_id || messageId
          if (payload.conversation_id) {
            setConversationId(payload.conversation_id)
            setConversationIds(ids => ({ ...ids, [token]: payload.conversation_id! }))
          }
        }
      }
      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        lines.forEach(handleSseLine)
        if (done)
          break
      }
      if (messageId && parameters?.suggested_questions_after_answer?.enabled) {
        const suggestedResponse = await fetch(`${publicApiBasePath}/messages/${messageId}/suggested-questions`, {
          headers: getHeaders(token),
          credentials: 'include',
        })
        if (suggestedResponse.ok) {
          const suggested = await suggestedResponse.json() as { data?: string[] }
          setMessages(items => items.map(item => item.id === assistantMessageId ? { ...item, suggestedQuestions: suggested.data || [] } : item))
        }
      }
    }
    catch (sendError) {
      if (!abortController.signal.aborted)
        setError(sendError instanceof Error ? sendError.message : 'Unable to send the message')
    }
    finally {
      taskIdRef.current = ''
      setIsResponding(false)
    }
  }, [conversationId, isResponding, parameters?.suggested_questions_after_answer?.enabled, setConversationIds, token, updateAssistantMessage])

  const stop = useCallback(async () => {
    abortControllerRef.current?.abort()
    if (taskIdRef.current) {
      await fetch(`${publicApiBasePath}/chat-messages/${taskIdRef.current}/stop`, {
        method: 'POST',
        headers: getHeaders(token),
        credentials: 'include',
      })
    }
    setIsResponding(false)
  }, [token])

  const text = getLocalizedText(site?.default_language)
  const accentColor = getAccentColor(site)
  const placeholder = site?.input_placeholder?.trim() || `${text.message} ${site?.title || text.customerService}`

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[radial-gradient(110%_68%_at_50%_0%,#e8edff_0%,#f4f7ff_54%,#eef4ff_100%)] text-slate-900">
      <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-white/70 bg-white/82 px-3 shadow-[0_1px_0_rgba(15,23,42,0.05)] backdrop-blur sm:h-15 sm:justify-start sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <SiteIcon site={site} className="size-7 shrink-0 rounded-lg border border-slate-100 object-cover shadow-sm" />
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-slate-800">{site?.title || text.customerService}</h1>
        </div>
      </header>

      <section className="min-h-0 grow overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          {isLoading && <div className="h-24 animate-pulse rounded-3xl bg-white/55" aria-label={text.loading} />}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {messages.map(message => (
            <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && <SiteIcon site={site} useSiteIcon={site?.use_icon_as_answer_icon === true} className="mt-1 size-10 shrink-0 rounded-full border-2 border-white object-cover shadow-md" />}
              <div
                className={message.role === 'user'
                  ? 'max-w-[78%] rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-7 text-white shadow-[0_6px_14px_rgba(37,99,235,0.28)]'
                  : 'max-w-[78%] rounded-2xl rounded-tl-md border border-white/85 bg-white/92 px-4 py-3 text-[15px] leading-7 whitespace-pre-wrap text-slate-700 shadow-[0_5px_14px_rgba(30,64,175,0.09)]'}
                style={message.role === 'user' ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bf)` } : undefined}
              >
                {message.content || (isResponding && (
                  <span className="inline-flex gap-1">
                    <i className="size-1.5 animate-bounce rounded-full bg-blue-400" />
                    <i className="size-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
                    <i className="size-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
                  </span>
                ))}
                <SuggestedQuestions questions={message.suggestedQuestions} onSend={send} />
              </div>
              {message.role === 'user' && <UserAvatar />}
            </div>
          ))}
          <div ref={scrollAnchorRef} />
        </div>
      </section>

      <footer className="shrink-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-8 sm:pb-7">
        <div className="mx-auto flex w-full max-w-4xl items-center rounded-2xl border border-white/90 bg-white p-1.5 shadow-[0_10px_24px_rgba(47,97,181,0.16)]">
          <textarea
            className="max-h-24 min-h-9 grow resize-none bg-transparent px-2.5 py-1.5 text-sm leading-5 text-slate-800 outline-hidden placeholder:text-slate-400"
            rows={1}
            value={query}
            placeholder={placeholder}
            aria-label={placeholder}
            disabled={isLoading || isResponding}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                send(query)
              }
            }}
          />
          <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
          <button type="button" className="flex size-8 shrink-0 items-center justify-center rounded-lg transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300" style={{ color: accentColor }} aria-label={isResponding ? text.stop : text.send} disabled={!isResponding && !query.trim()} onClick={isResponding ? stop : () => send(query)}>
            <span className={isResponding ? 'i-ri-stop-circle-fill size-5' : 'i-ri-send-plane-2-fill size-5'} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </main>
  )
}

export default LightCustomerChat
