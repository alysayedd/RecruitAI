import { useEffect, useRef, useState } from 'react'

interface LogEntry { step: string; message: string; timestamp: string }

const STEP_ICONS: Record<string, string> = {
  jd_parser: '📄',
  cv_screener: '🔍',
  bias_auditor: '⚖️',
  ranker: '🏆',
  explainer: '📊',
  done: '✅',
  persist: '💾',
  saved: '💾',
  error: '❌',
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

    const es = new EventSource(`/api/jobs/${jobId}/run`, { withCredentials: false })

    // SSE via POST requires fetch + ReadableStream since EventSource only does GET
    // We'll use fetch instead
    es.close()

    fetch(`/api/jobs/${jobId}/run`, { method: 'POST' }).then(async res => {
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
              setLogs(prev => [...prev, {
                step: event.step,
                message: event.message,
                timestamp: new Date().toLocaleTimeString(),
              }])
              if (event.step === 'done') {
                setLogs(prev => [...prev, {
                  step: 'persist',
                  message: 'Saving results to database…',
                  timestamp: new Date().toLocaleTimeString(),
                }])
              }
              // Only treat as finished after DB persist — "done" is LLM pipeline only.
              if (event.step === 'saved') {
                setDone(true)
                setRunning(false)
                onComplete?.()
              }
              if (event.step === 'error') {
                setRunning(false)
              }
            } catch {}
          }
        }
      }
      setRunning(false)
    }).catch(err => {
      setLogs(prev => [...prev, { step: 'error', message: String(err), timestamp: new Date().toLocaleTimeString() }])
      setRunning(false)
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Agent Pipeline</h3>
        {!done && (
          <button onClick={start} disabled={running} className="btn-primary text-sm">
            {running ? 'Running…' : 'Run Screening'}
          </button>
        )}
        {done && (
          <span className="badge-green">Complete</span>
        )}
      </div>

      <div className="space-y-2 min-h-[120px] max-h-80 overflow-y-auto font-mono text-sm">
        {logs.length === 0 && !running && (
          <p className="text-white/30 text-sm">Click "Run Screening" to start the pipeline.</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex items-start gap-3 py-1.5 px-3 rounded-lg bg-white/5 animate-pulse-once">
            <span className="text-lg leading-none">{STEP_ICONS[log.step] || '🔄'}</span>
            <div className="flex-1 min-w-0">
              <span className="text-white/90">{log.message}</span>
            </div>
            <span className="text-white/30 text-xs shrink-0">{log.timestamp}</span>
          </div>
        ))}
        {running && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.15s]" />
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.3s]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
