import { useEffect, useRef, useState } from 'react'

interface LogEntry { step: string; message: string; ts: string }

const stepConfig: Record<string, { label: string; color: string }> = {
  jd_parser: { label: 'Parser', color: 'text-accent-light' },
  cv_screener: { label: 'Screener', color: 'text-cyan' },
  bias_auditor: { label: 'Bias', color: 'text-amber' },
  ranker: { label: 'Ranker', color: 'text-emerald' },
  explainer: { label: 'Explain', color: 'text-accent-light' },
  done: { label: 'Done', color: 'text-emerald' },
  persist: { label: 'Saving', color: 'text-cyan' },
  saved: { label: 'Saved', color: 'text-emerald' },
  error: { label: 'Error', color: 'text-rose' },
}

export default function AgentLog({ jobId, onComplete }: { jobId: string; onComplete?: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const start = () => {
    setLogs([])
    setRunning(true)
    setDone(false)

    const token = localStorage.getItem('token')
    fetch(`/api/jobs/${jobId}/run`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(async res => {
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      let buffer = ''
      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              setLogs(prev => [...prev, { step: event.step, message: event.message, ts }])
              if (event.step === 'done') {
                setLogs(prev => [...prev, { step: 'persist', message: 'Saving results to database...', ts }])
              }
              if (event.step === 'saved') {
                setDone(true)
                setRunning(false)
                onComplete?.()
              }
              if (event.step === 'error') setRunning(false)
            } catch {}
          }
        }
      }
      setRunning(false)
    }).catch(err => {
      setLogs(prev => [...prev, { step: 'error', message: String(err), ts: new Date().toLocaleTimeString() }])
      setRunning(false)
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="card-glow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-light" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
          </div>
          <p className="font-semibold">Agent Pipeline</p>
        </div>
        {!done && (
          <button onClick={start} disabled={running} className="btn-primary text-sm px-4 py-2">
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running...
              </span>
            ) : 'Run Screening'}
          </button>
        )}
        {done && <span className="pill-green font-semibold">Complete</span>}
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto">
        {logs.length === 0 && !running && (
          <div className="text-center py-8">
            <p className="text-white/25 text-sm">Click Run Screening to start the 5-agent pipeline</p>
          </div>
        )}
        {logs.map((log, i) => {
          const cfg = stepConfig[log.step] || { label: log.step, color: 'text-white/40' }
          return (
            <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors animate-slide-up"
              style={{ animationDelay: `${i * 30}ms` }}>
              <span className={`text-xs font-mono font-bold w-16 text-right shrink-0 ${cfg.color}`}>{cfg.label}</span>
              <span className="text-sm text-white/60 flex-1">{log.message}</span>
              <span className="text-xs text-white/15 font-mono shrink-0">{log.ts}</span>
            </div>
          )
        })}
        {running && (
          <div className="flex items-center justify-center gap-1.5 py-4">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-accent-light rounded-full animate-bounce [animation-delay:0.1s]" />
            <div className="w-1.5 h-1.5 bg-cyan rounded-full animate-bounce [animation-delay:0.2s]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
