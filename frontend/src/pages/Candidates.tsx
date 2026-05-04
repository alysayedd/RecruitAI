import { useEffect, useRef, useState } from 'react'
import { getJob, getCandidates, uploadCandidates } from '../api/client'
import AgentLog from '../components/AgentLog'

interface Props { jobId: string; onNavigate: (page: string, jobId?: string) => void }

export default function Candidates({ jobId, onNavigate }: Props) {
  const [job, setJob] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pipelineDone, setPipelineDone] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getJob(jobId).then(setJob)
    getCandidates(jobId).then(setCandidates)
  }, [jobId])

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    setUploading(true)
    try {
      const uploaded = await uploadCandidates(jobId, files)
      setCandidates(prev => [...prev, ...uploaded])
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'application/pdf' || f.name.endsWith('.txt')
    )
    handleFiles(files)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{job?.title || 'Loading…'}</h1>
          <p className="text-white/40 text-sm font-mono mt-1">{jobId.slice(0, 8)}…</p>
        </div>
        {job?.status && (
          <span className={
            job.status === 'complete' ? 'badge-green' :
            job.status === 'running' ? 'badge-yellow' :
            job.status === 'error' ? 'badge-red' : 'badge-gray'
          }>{job.status}</span>
        )}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-accent bg-accent/10' : 'border-white/20 hover:border-accent/50'
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.txt"
          className="hidden"
          onChange={e => handleFiles(Array.from(e.target.files || []))}
        />
        <p className="text-4xl mb-3">📁</p>
        {uploading ? (
          <p className="text-accent">Uploading…</p>
        ) : (
          <>
            <p className="font-medium text-white/80">Drop CVs here or click to browse</p>
            <p className="text-white/30 text-sm mt-1">PDF and TXT files supported</p>
          </>
        )}
      </div>

      {/* Candidates list */}
      {candidates.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}</h2>
          </div>
          <div className="space-y-2">
            {candidates.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5 text-sm">
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.filename}</p>
                  <p className="text-white/30 text-xs truncate">{c.name}</p>
                </div>
                <span className="badge-green text-xs">Uploaded</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent pipeline */}
      {candidates.length > 0 && (
        <AgentLog
          jobId={jobId}
          onComplete={() => {
            setPipelineDone(true)
          }}
        />
      )}

      {pipelineDone && (
        <div className="bg-success/10 border border-success/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-success">Screening complete!</p>
            <p className="text-white/50 text-sm mt-0.5">View rankings and bias report</p>
          </div>
          <button onClick={() => onNavigate('results', jobId)} className="btn-primary">
            View Results →
          </button>
        </div>
      )}
    </div>
  )
}
