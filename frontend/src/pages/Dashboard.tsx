import { useEffect, useState } from 'react'
import { listJobs } from '../api/client'
import ScoreCard from '../components/ScoreCard'

interface Props { onNavigate: (page: string, jobId?: string) => void }

export default function Dashboard({ onNavigate }: Props) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listJobs().then(setJobs).finally(() => setLoading(false))
  }, [])

  const totalCandidates = jobs.reduce((a, j) => a + (j.candidate_count || 0), 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-white/40 mt-1">AI-powered recruitment with bias detection</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard label="Total Jobs" value={jobs.length} sub="all time" />
        <ScoreCard label="Completed" value={jobs.filter(j => j.status === 'complete').length} color="success" />
        <ScoreCard label="Running" value={jobs.filter(j => j.status === 'running').length} color="warn" />
        <ScoreCard label="Ready" value={jobs.filter(j => j.status === 'ready').length} color="accent" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg">Recent Jobs</h2>
          <button onClick={() => onNavigate('new-job')} className="btn-primary text-sm">
            + New Job
          </button>
        </div>

        {loading && <p className="text-white/30 text-sm">Loading…</p>}
        {!loading && jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/30 text-4xl mb-3">📋</p>
            <p className="text-white/50">No jobs yet. Create your first job posting.</p>
            <button onClick={() => onNavigate('new-job')} className="btn-primary mt-4 text-sm">
              Create Job
            </button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id}
                onClick={() => onNavigate('candidates', job.id)}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-white/30 text-xs mt-0.5 font-mono">{job.id.slice(0, 8)}…</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={
                    job.status === 'complete' ? 'badge-green' :
                    job.status === 'running' ? 'badge-yellow' :
                    job.status === 'error' ? 'badge-red' : 'badge-gray'
                  }>{job.status}</span>
                  <span className="text-white/30">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
