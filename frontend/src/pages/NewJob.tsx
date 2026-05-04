import { useState } from 'react'
import { createJob } from '../api/client'

interface Props { onNavigate: (page: string, jobId?: string) => void }

const SAMPLE_JD = `Software Engineer – Backend

We are looking for a Python developer with 3+ years experience.

Required: Python, FastAPI, PostgreSQL, REST APIs, Git
Preferred: Docker, Redis, AWS, CI/CD
Education: Bachelor's in Computer Science or equivalent

Responsibilities:
- Build and maintain backend APIs
- Collaborate with frontend teams
- Participate in code reviews
- Write unit tests and documentation`

export default function NewJob({ onNavigate }: Props) {
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!jdText.trim()) return
    setLoading(true)
    setError('')
    try {
      const job = await createJob(jdText)
      setResult(job)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const parsed = result.parsed_jd || {}
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <h1 className="text-2xl font-bold">{result.title}</h1>
            <p className="text-white/40 text-sm font-mono">{result.id}</p>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-white/80">Parsed Job Requirements</h2>

          {parsed.required_skills?.length > 0 && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {parsed.required_skills.map((s: string) => (
                  <span key={s} className="bg-accent/20 text-accent-light text-sm px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {parsed.preferred_skills?.length > 0 && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Preferred Skills</p>
              <div className="flex flex-wrap gap-2">
                {parsed.preferred_skills.map((s: string) => (
                  <span key={s} className="bg-white/10 text-white/60 text-sm px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/40">Min Experience</p>
              <p className="font-medium">{parsed.min_experience_years || 0} years</p>
            </div>
            <div>
              <p className="text-white/40">Education</p>
              <p className="font-medium">{parsed.education_level || 'Not specified'}</p>
            </div>
          </div>

          {parsed.bias_flags?.length > 0 && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
              <p className="text-danger text-sm font-medium mb-2">⚠ Bias Flags Detected in JD</p>
              {parsed.bias_flags.map((flag: string, i: number) => (
                <p key={i} className="text-white/60 text-sm">• {flag}</p>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => onNavigate('candidates', result.id)} className="btn-primary">
            Upload CVs →
          </button>
          <button onClick={() => { setResult(null); setJdText('') }} className="btn-secondary">
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">New Job Posting</h1>
        <p className="text-white/40 mt-1">Paste the job description and we'll extract requirements automatically</p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-white/70">Job Description</label>
          <button
            onClick={() => setJdText(SAMPLE_JD)}
            className="text-xs text-accent hover:text-accent-light transition-colors"
          >
            Load sample JD
          </button>
        </div>
        <textarea
          className="input min-h-[280px] resize-y font-mono text-sm leading-relaxed"
          placeholder="Paste your job description here…"
          value={jdText}
          onChange={e => setJdText(e.target.value)}
        />

        {error && (
          <p className="text-danger text-sm bg-danger/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !jdText.trim()}
          className="btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Parsing with AI…
            </span>
          ) : 'Parse & Create Job'}
        </button>
      </div>
    </div>
  )
}
