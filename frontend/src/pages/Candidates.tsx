import { useState, useEffect, useRef } from 'react'
import { uploadCandidates, getCandidates } from '../api/client'
import AgentLog from '../components/AgentLog'

interface Props {
  jobId: string
  onNavigate: (page: string, jobId?: string) => void
}

export default function Candidates({ jobId, onNavigate }: Props) {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const loadCandidates = () => {
    getCandidates(jobId).then(setCandidates).catch(() => {})
  }

  useEffect(() => { loadCandidates() }, [jobId])

  const handleFiles = async (files: FileList) => {
    const valid = Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.name.endsWith('.txt')
    )
    if (!valid.length) { setError('Only PDF and TXT files are supported'); return }
    
    setLoading(true)
    setError('')
    try {
      const result = await uploadCandidates(jobId, valid)
      setCandidates(prev => [...prev, ...result])
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full text-white relative overflow-hidden flex flex-col">
      
      <div className="relative z-10 max-w-4xl mx-auto w-full space-y-8 animate-fade-in pb-10">
        
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">RecruitAI Workspace</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Upload Candidates</h1>
          <p className="text-gray-400 text-sm md:text-base">
            <span className="text-white font-semibold">{candidates.length}</span> candidates uploaded for job <span className="font-mono text-xs bg-[#1c1c1e] px-2 py-1 rounded border border-[#2c2c2e]">{jobId.slice(0,8)}</span>
          </p>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileInput.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 shadow-lg ${
            dragOver 
              ? 'border-[#ed4690] bg-[#ed4690]/5 scale-[1.02]' 
              : 'border-[#2c2c2e] bg-[#1c1c1e] hover:border-[#ed4690]/50 hover:bg-[#1c1c1e]/80'
          }`}
        >
          <input ref={fileInput} type="file" accept=".pdf,.txt" multiple className="hidden"
            onChange={e => { if (e.target.files) handleFiles(e.target.files) }} />
            
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-[#ed4690]">
              <span className="w-10 h-10 border-4 border-[#ed4690]/30 border-t-[#ed4690] rounded-full animate-spin" />
              <span className="font-semibold tracking-wide animate-pulse text-white">Uploading files...</span>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-gradient-to-br from-[#ed4690]/20 to-[#f58133]/20 border border-[#ed4690]/20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                <svg className="w-8 h-8 text-[#ed4690]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
              </div>
              <p className="text-white font-medium text-lg mb-1">Drop CV files here or click to browse</p>
              <p className="text-gray-500 text-sm">Supports PDF and TXT formats</p>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-md px-5 py-4 text-sm text-[#f43f5e] font-medium flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
            {error}
          </div>
        )}

        {/* Candidate List */}
        {candidates.length > 0 && (
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 shadow-xl">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Uploaded Files</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {candidates.map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-[#121212] border border-[#2c2c2e] hover:border-gray-600/60 transition-all duration-200 animate-slide-up group"
                  style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="w-10 h-10 bg-[#ed4690]/10 rounded-lg flex items-center justify-center shrink-0 border border-[#ed4690]/10">
                    <svg className="w-5 h-5 text-[#ed4690]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200 truncate font-medium group-hover:text-white transition-colors">{c.name || c.filename}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{c.filename}</p>
                  </div>
                  <div className="shrink-0 text-[#22c55e]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent Pipeline / Processing Component */}
        {candidates.length > 0 && (
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 shadow-xl">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">AI Screening Pipeline</h3>
            <AgentLog jobId={jobId} onComplete={() => onNavigate('results', jobId)} />
          </div>
        )}

      </div>
    </div>
  )
}