import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { getStudentStats } from '../api/client'

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

interface AnalysisResult {
  id: string; job_title: string; total_score: number; skills_score: number
  experience_score: number; education_score: number; extras_score: number
  matched_skills: string[]; missing_skills: string[]; reasoning: string
  suggestions: string[]; detailed_advice?: Array<{
    skill: string; priority: string; current_level: string;
    action_steps: string[]; resources: string[]; estimated_time: string;
  }>; fit_verdict: string; created_at: string
}

interface StudentStats {
  total_analyses: number; average_score: number; highest_score: number
  lowest_score: number; recent_analyses: AnalysisResult[]
}

const StatCard = ({ label, value, colorHex }: { label: string; value: number | string; colorHex?: string }) => (
  <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 flex flex-col relative overflow-hidden transition-all shadow-lg hover:border-gray-600/50">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
    <p className="text-3xl font-bold text-white" style={{ color: colorHex || '#fff' }}>{value}</p>
  </div>
)

export default function StudentDashboard() {
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [jdText, setJdText] = useState('')
  const [cvText, setCvText] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [mode, setMode] = useState<'paste' | 'upload'>('paste')
  const [showAnalyzer, setShowAnalyzer] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const loadStats = () => { setLoadingStats(true); getStudentStats().then(setStats).finally(() => setLoadingStats(false)) }
  useEffect(() => { loadStats() }, [])

  const handleFileDrop = (files: FileList) => {
    const file = files[0]
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.endsWith('.txt')) { setError('Only PDF and TXT files are supported'); return }
    setCvFile(file); setError('')
  }

  const handleSubmit = async () => {
    if (!jdText.trim()) return
    if (mode === 'paste' && !cvText.trim()) return
    if (mode === 'upload' && !cvFile) return
    setLoading(true); setError(''); setResult(null)
    const token = localStorage.getItem('token')
    try {
      if (mode === 'upload') {
        const form = new FormData()
        form.append('jd_text', jdText); form.append('cv_file', cvFile!)
        const res = await axios.post('/api/student/analyze-upload', form, { headers: { Authorization: `Bearer ${token}` } })
        setResult(res.data)
      } else {
        const res = await axios.post('/api/student/analyze', { jd_text: jdText, cv_text: cvText }, { headers: { Authorization: `Bearer ${token}` } })
        setResult(res.data)
      }
    } catch (err: any) { setError(err?.response?.data?.detail || 'Analysis failed') }
    finally { setLoading(false); loadStats() }
  }

  const reset = () => { setResult(null); setSelectedAnalysis(null); setJdText(''); setCvText(''); setCvFile(null); setError(''); setShowAnalyzer(false) }

  const displayResult = result || selectedAnalysis

  // -----------------------------------------------------
  // VIEW: ANALYSIS RESULT
  // -----------------------------------------------------
  if (displayResult) {
    const r = displayResult
    const scoreColor = r.total_score >= 75 ? '#22c55e' : r.total_score >= 50 ? '#f59e0b' : '#f43f5e'
    const scoreClass = r.total_score >= 75 ? 'text-[#22c55e]' : r.total_score >= 50 ? 'text-[#f59e0b]' : 'text-[#f43f5e]'

    return (
      <div className="min-h-full text-white relative overflow-hidden flex flex-col">
        {/* Background Curves */}
        <svg className="absolute right-[-10%] top-0 h-full w-[120%] md:w-[70%] pointer-events-none opacity-30 md:opacity-40 z-0" viewBox="0 0 600 800" fill="none" preserveAspectRatio="xMaxYMid slice">
          <path d="M600 -50 C250 50 100 300 150 600 C170 750 350 850 600 900" stroke="url(#paint0_linear_res)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M600 80 C350 180 220 380 280 580 C310 680 450 760 600 800" stroke="url(#paint1_linear_res)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M600 210 C450 280 360 420 400 540 C430 620 520 670 600 690" stroke="url(#paint2_linear_res)" strokeWidth="4" className="blur-[2px]" strokeLinecap="round" />
          <defs>
            <linearGradient id="paint0_linear_res" x1="100" y1="400" x2="600" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#8A2387" stopOpacity="0.1" /><stop offset="0.5" stopColor="#E94057" stopOpacity="0.7" /><stop offset="1" stopColor="#F27121" stopOpacity="0.1" /></linearGradient>
            <linearGradient id="paint1_linear_res" x1="220" y1="450" x2="600" y2="450" gradientUnits="userSpaceOnUse"><stop stopColor="#ed4690" stopOpacity="0.9" /><stop offset="1" stopColor="#f58133" stopOpacity="0" /></linearGradient>
            <linearGradient id="paint2_linear_res" x1="360" y1="500" x2="600" y2="500" gradientUnits="userSpaceOnUse"><stop stopColor="#f58133" stopOpacity="1" /><stop offset="1" stopColor="#ed4690" stopOpacity="0" /></linearGradient>
          </defs>
        </svg>

        <div className="relative z-10 max-w-5xl mx-auto w-full space-y-6 animate-fade-in pb-12">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Analysis Results</p>
              <h1 className="text-3xl font-bold tracking-tight text-white">{r.job_title}</h1>
            </div>
            <button onClick={reset} className="bg-[#1c1c1e] border border-[#2c2c2e] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-[#232325] transition-colors">
              ← Back
            </button>
          </div>

          {/* Verdict Card */}
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 flex items-center gap-8 shadow-xl">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#2c2c2e" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeDasharray={`${(r.total_score / 100) * 327}`} strokeDashoffset="0"
                  strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${scoreColor}50)` }} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${scoreClass}`}>{r.total_score}</span>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold mb-1">AI Verdict</p>
              <p className={`text-xl font-bold ${scoreClass}`}>{r.fit_verdict}</p>
            </div>
          </div>

          {/* Sub Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Skills', score: r.skills_score, max: 40, color: '#ed4690' },
              { label: 'Experience', score: r.experience_score, max: 30, color: '#f58133' },
              { label: 'Education', score: r.education_score, max: 20, color: '#22c55e' },
              { label: 'Extras', score: r.extras_score, max: 10, color: '#06b6d4' },
            ].map(item => (
              <div key={item.label} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 shadow-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</p>
                <p className="text-2xl font-bold text-white mt-2">{item.score}<span className="text-gray-600 text-sm ml-1">/{item.max}</span></p>
                <div className="w-full h-1.5 bg-[#121212] rounded-full mt-3 overflow-hidden border border-[#2c2c2e]">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.score / item.max) * 100}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Skills Breakdown */}
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 space-y-6 shadow-xl">
            {r.matched_skills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Matched Skills</p>
                <div className="flex flex-wrap gap-2">
                  {r.matched_skills.map(s => <span key={s} className="bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-2.5 py-1 rounded text-xs font-semibold">{s}</span>)}
                </div>
              </div>
            )}
            {r.missing_skills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Missing Skills</p>
                <div className="flex flex-wrap gap-2">
                  {r.missing_skills.map(s => <span key={s} className="bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20 px-2.5 py-1 rounded text-xs font-semibold">{s}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Reasoning */}
          {r.reasoning && (
            <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 shadow-xl">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#ed4690]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>
                AI Reasoning
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">{r.reasoning}</p>
            </div>
          )}

          {/* Improvement Roadmap */}
          {r.detailed_advice && r.detailed_advice.length > 0 ? (
            <div className="space-y-4">
              <p className="font-bold text-[#ed4690] text-xl mt-4">Improvement Roadmap</p>
              {r.detailed_advice.map((adv, i) => {
                const prioClass = adv.priority === 'high' ? 'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20' : adv.priority === 'medium' ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20' : 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20'
                return (
                  <div key={i} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 space-y-4 shadow-lg animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="font-bold text-white text-lg">{adv.skill}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 border rounded text-[10px] uppercase tracking-wider font-bold ${prioClass}`}>{adv.priority} Priority</span>
                        <span className="bg-[#121212] border border-[#2c2c2e] text-gray-400 px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-bold">{adv.estimated_time}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm"><span className="text-gray-500 font-semibold mr-1">Current level:</span> {adv.current_level}</p>
                    
                    {adv.action_steps.length > 0 && (
                      <div className="bg-[#121212] border border-[#2c2c2e] rounded-lg p-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Action Steps</p>
                        <div className="space-y-3">
                          {adv.action_steps.map((step, j) => (
                            <div key={j} className="flex items-start gap-3">
                              <div className="w-5 h-5 bg-[#ed4690]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-[#ed4690]/20">
                                <span className="text-[#ed4690] text-[10px] font-bold">{j + 1}</span>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {adv.resources.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommended Resources</p>
                        <div className="flex flex-wrap gap-2">
                          {adv.resources.map((res, j) => (
                            <span key={j} className="bg-[#121212] border border-[#2c2c2e] text-[#f58133] px-3 py-1.5 rounded text-xs font-medium">{res}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : r.suggestions.length > 0 ? (
            <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 shadow-xl">
              <p className="font-bold text-[#ed4690] text-lg mb-4">Suggestions to Improve</p>
              <div className="space-y-4">
                {r.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#ed4690]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-[#ed4690]/20">
                      <span className="text-[#ed4690] text-[10px] font-bold">{i + 1}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // -----------------------------------------------------
  // VIEW: DASHBOARD HOME
  // -----------------------------------------------------
  if (loadingStats) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-[#ed4690] rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-[#f58133] rounded-full animate-bounce [animation-delay:0.15s]" />
        <div className="w-2 h-2 bg-[#ed4690] rounded-full animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  )

  return (
    <div className="min-h-full text-white relative overflow-hidden flex flex-col">
      <div className="relative z-10 max-w-5xl mx-auto w-full space-y-8 animate-fade-in pb-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">RecruitAI Workspace</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Student Dashboard</h1>
          <p className="text-gray-400 text-sm">Track your CV performance and get AI-powered tips to land the job.</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Analyses" value={stats.total_analyses} />
            <StatCard label="Avg Score" value={stats.total_analyses > 0 ? stats.average_score : '—'} colorHex={stats.average_score >= 70 ? '#22c55e' : stats.average_score >= 50 ? '#f59e0b' : '#f43f5e'} />
            <StatCard label="Best Score" value={stats.total_analyses > 0 ? stats.highest_score : '—'} colorHex="#22c55e" />
            <StatCard label="Lowest Score" value={stats.total_analyses > 0 ? stats.lowest_score : '—'} colorHex="#f43f5e" />
          </div>
        )}

        {/* Analyzer Toggle */}
        {!showAnalyzer ? (
          <div className="bg-[#1c1c1e] border border-[#ed4690]/30 rounded-xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ed4690]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <p className="font-bold text-xl text-white">CV Analyzer</p>
              <p className="text-gray-400 text-sm mt-1 max-w-md">Score your resume against any job description. Get instant, AI-driven feedback on skills gaps and how to improve.</p>
            </div>
            <button onClick={() => setShowAnalyzer(true)} className="relative z-10 bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white px-8 py-3 rounded-md font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shrink-0">
              New Analysis
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="font-bold text-xl text-white">New Analysis</p>
              <button onClick={() => setShowAnalyzer(false)} className="text-sm font-semibold text-gray-500 hover:text-white transition-colors">Cancel</button>
            </div>

            <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Job Description</p>
                <button onClick={() => setJdText(SAMPLE_JD)} className="text-xs font-bold text-[#ed4690] hover:text-[#f58133] transition-colors">Load sample</button>
              </div>
              <textarea 
                className="w-full min-h-[160px] bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-4 text-sm text-gray-300 leading-relaxed resize-y focus:outline-none focus:border-[#ed4690] transition-colors custom-scrollbar" 
                placeholder="Paste the job description here..." 
                value={jdText} 
                onChange={e => setJdText(e.target.value)} 
              />
            </div>

            <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Your CV</p>
                <div className="flex bg-[#121212] border border-[#2c2c2e] rounded-md p-1">
                  {(['paste', 'upload'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${mode === m ? 'bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                      {m === 'upload' ? 'Upload PDF' : 'Paste Text'}
                    </button>
                  ))}
                </div>
              </div>
              
              {mode === 'paste' ? (
                <textarea 
                  className="w-full min-h-[180px] bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-4 text-sm text-gray-300 leading-relaxed resize-y focus:outline-none focus:border-[#ed4690] transition-colors custom-scrollbar" 
                  placeholder="Paste your CV text here..." 
                  value={cvText} 
                  onChange={e => setCvText(e.target.value)} 
                />
              ) : (
                <div onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFileDrop(e.dataTransfer.files) }}
                  onClick={() => fileInput.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-[#ed4690] bg-[#ed4690]/5' : 'border-[#2c2c2e] bg-[#121212] hover:border-[#ed4690]/50'}`}>
                  <input ref={fileInput} type="file" accept=".pdf,.txt" className="hidden" onChange={e => { if (e.target.files) handleFileDrop(e.target.files) }} />
                  {cvFile ? (
                    <div>
                      <p className="font-semibold text-[#ed4690] text-lg">{cvFile.name}</p>
                      <p className="text-gray-500 text-xs mt-1">{(cvFile.size / 1024).toFixed(1)} KB</p>
                      <button onClick={e => { e.stopPropagation(); setCvFile(null) }} className="text-xs font-bold text-[#f43f5e] hover:underline mt-3 px-3 py-1 bg-[#f43f5e]/10 rounded">Remove File</button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-[#2c2c2e] rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                      </div>
                      <p className="text-white font-medium">Drop CV here or click to browse</p>
                      <p className="text-gray-500 text-xs mt-1">PDF or TXT formats supported</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-md px-4 py-3 text-sm text-[#f43f5e] font-medium">
                {error}
              </div>
            )}

            <button 
              onClick={handleSubmit} 
              disabled={loading || !jdText.trim() || (mode === 'paste' && !cvText.trim()) || (mode === 'upload' && !cvFile)} 
              className="w-full bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white py-4 rounded-md font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex justify-center items-center"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                  Analyzing with AI...
                </>
              ) : 'Analyze My CV'}
            </button>
          </div>
        )}

        {/* Recent Analyses List */}
        {stats && stats.recent_analyses.length > 0 && (
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 md:p-8 shadow-xl mt-8">
            <h2 className="font-bold text-xl text-white mb-5">Recent Analyses</h2>
            <div className="space-y-2">
              {stats.recent_analyses.map((a, i) => (
                <div key={a.id} onClick={() => { setSelectedAnalysis(a); setResult(null) }}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#121212] border border-[#2c2c2e] hover:border-gray-600/60 cursor-pointer transition-all group animate-slide-up"
                  style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-200 group-hover:text-white truncate transition-colors text-base">{a.job_title}</p>
                    <p className="text-xs font-mono text-gray-500 mt-1">{new Date(a.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className={`text-xl font-bold ${a.total_score >= 75 ? 'text-[#22c55e]' : a.total_score >= 50 ? 'text-[#f59e0b]' : 'text-[#f43f5e]'}`}>{a.total_score}</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#ed4690] transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}