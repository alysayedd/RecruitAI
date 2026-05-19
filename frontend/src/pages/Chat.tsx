import { useState, useEffect, useRef } from 'react'
import api from '../api/client'

interface ChatMsg {
  id: number
  message: string
  response: string
  created_at: string
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    api.get('/chat/history').then(r => setMessages(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      const res = await api.post('/chat', { message: text })
      setMessages(prev => [...prev, {
        id: Date.now(),
        message: text,
        response: res.data.response,
        created_at: new Date().toISOString(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now(),
        message: text,
        response: 'Sorry, something went wrong. Try again.',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto text-white animate-fade-in">
      
      {/* Header */}
      <div className="mb-6 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">RecruitAI Workspace</p>
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-gray-400 text-sm mt-1">Ask anything about your recruitment, candidates, or career</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-6 custom-scrollbar">
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm p-4">
            <div className="w-2 h-2 bg-[#ed4690] rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-[#f58133] rounded-full animate-bounce [animation-delay:0.15s]" />
            <div className="w-2 h-2 bg-[#ed4690] rounded-full animate-bounce [animation-delay:0.3s]" />
            <span className="ml-2 font-medium">Loading history...</span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl flex items-center justify-center mb-5 shadow-lg">
              <svg className="w-8 h-8 text-[#ed4690]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">How can I help you today?</h3>
            <p className="text-gray-500 text-sm max-w-sm">No conversations yet. Send a message to start analyzing resumes, drafting emails, or asking for hiring advice.</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-4">
            
            {/* User Message */}
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white rounded-2xl rounded-br-sm px-5 py-3.5 max-w-[85%] md:max-w-[75%] text-sm leading-relaxed shadow-md">
                <p className="whitespace-pre-wrap">{m.message}</p>
              </div>
            </div>

            {/* AI Response */}
            <div className="flex justify-start">
              <div className="flex items-start gap-3 max-w-[85%] md:max-w-[75%]">
                <div className="w-8 h-8 rounded-full bg-[#1c1c1e] border border-[#2c2c2e] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <span className="text-[10px] font-bold text-[#ed4690]">AI</span>
                </div>
                <div className="bg-[#1c1c1e] border border-[#2c2c2e] text-gray-300 rounded-2xl rounded-bl-sm px-5 py-3.5 text-sm leading-relaxed shadow-sm">
                  <p className="whitespace-pre-wrap">{m.response}</p>
                </div>
              </div>
            </div>

          </div>
        ))}
        
        {/* Temporary "Thinking" indicator when sending */}
        {sending && (
          <div className="flex justify-start animate-fade-in">
             <div className="flex items-start gap-3 max-w-[85%] md:max-w-[75%]">
                <div className="w-8 h-8 rounded-full bg-[#1c1c1e] border border-[#2c2c2e] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <span className="text-[10px] font-bold text-[#ed4690]">AI</span>
                </div>
                <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-2 shadow-xl flex items-end gap-2 transition-colors focus-within:border-[#ed4690]/50">
        <textarea
          className="flex-1 bg-transparent border-none text-white placeholder:text-gray-500 px-4 py-3 min-h-[48px] max-h-32 resize-none text-sm leading-relaxed focus:outline-none focus:ring-0 custom-scrollbar"
          placeholder="Ask a question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white rounded-xl h-[48px] w-[48px] flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-0.5 mr-0.5"
          aria-label="Send message"
        >
          {sending ? (
            <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

    </div>
  )
}