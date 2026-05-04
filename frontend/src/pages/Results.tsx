import { useEffect, useState } from 'react'
import { getResults, getReportUrl } from '../api/client'
import BiasChart from '../components/BiasChart'

interface Props { jobId: string }

export default function Results({ jobId }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'rankings' | 'bias' | 'jd'>('rankings')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    getResults(jobId)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null)
          setLoadError(e?.response?.data?.detail || e?.message || 'Failed to load results')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [jobId])

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/40">Loading results…</p>
      </div>
    </div>
  )

  if (loadError) {
    return (
      <div className="card border border-danger/30 bg-danger/10 p-6">
        <p className="font-medium text-danger">Could not load results</p>
        <p className="text-white/50 text-sm mt-2">{loadError}</p>
      </div>
    )
  }

  if (!data) return <p className="text-white/40">No results found.</p>

  const { rankings = [], bias_report, parsed_jd, job_title, total_candidates, shortlisted_count, overall_bias_score } = data

  const biasColor = !overall_bias_score ? 'text-success' :
    overall_bias_score < 20 ? 'text-success' :
    overall_bias_score < 50 ? 'text-warn' : 'text-danger'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{job_title}</h1>
          <p className="text-white/40 text-sm mt-1">{total_candidates} screened · {shortlisted_count} shortlisted</p>
        </div>
        <a
          href={getReportUrl(jobId)}
          download
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <span>⬇</span> PDF Report
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-accent">{total_candidates}</p>
          <p className="text-white/40 text-sm mt-1">Total Candidates</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-success">{shortlisted_count}</p>
          <p className="text-white/40 text-sm mt-1">Shortlisted</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${biasColor}`}>{overall_bias_score ?? '—'}</p>
          <p className="text-white/40 text-sm mt-1">Bias Score /100</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        {(['rankings', 'bias', 'jd'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-accent border-accent'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            {tab === 'jd' ? 'Job Details' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Rankings tab */}
      {activeTab === 'rankings' && (
        <div className="card">
          <div className="space-y-2">
            {rankings.length === 0 && (
              <p className="text-white/30 text-sm">No rankings available. Run the screening pipeline first.</p>
            )}
            {rankings.map((r: any) => {
              const expanded = expandedId === r.candidate_id
              const sb = r.score_breakdown || {}
              return (
                <div key={r.candidate_id} className="border border-white/10 rounded-xl overflow-hidden">
                  <div
                    onClick={() => setExpandedId(expanded ? null : r.candidate_id)}
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    {/* Rank badge */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      r.rank === 1 ? 'bg-yellow-400/20 text-yellow-400' :
                      r.rank === 2 ? 'bg-gray-300/20 text-gray-300' :
                      r.rank === 3 ? 'bg-orange-400/20 text-orange-400' :
                      'bg-white/10 text-white/50'
                    }`}>
                      #{r.rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.candidate_name || r.filename}</p>
                      <p className="text-white/30 text-xs truncate">{r.filename}</p>
                    </div>

                    {/* Score bar */}
                    <div className="hidden sm:flex items-center gap-3 w-48">
                      <div className="flex-1 bg-white/10 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-accent transition-all"
                          style={{ width: `${r.adjusted_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono w-10 text-right">{r.adjusted_score}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {r.shortlisted && <span className="badge-green">Shortlisted</span>}
                      {r.bias_corrected && <span className="badge-yellow">Bias corrected</span>}
                      <span className="text-white/30 text-sm">{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-white/10 p-4 bg-navy-900/50 space-y-4">
                      {/* Score breakdown bars */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          { label: 'Skills', val: sb.skills_score, max: 40 },
                          { label: 'Experience', val: sb.experience_score, max: 30 },
                          { label: 'Education', val: sb.education_score, max: 20 },
                          { label: 'Extras', val: sb.extras_score, max: 10 },
                        ].map(({ label, val, max }) => (
                          <div key={label}>
                            <div className="flex justify-between text-xs text-white/50 mb-1">
                              <span>{label}</span>
                              <span>{val ?? 0}/{max}</span>
                            </div>
                            <div className="bg-white/10 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-accent/70"
                                style={{ width: `${((val ?? 0) / max) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Matched / missing skills */}
                      {sb.matched_skills?.length > 0 && (
                        <div>
                          <p className="text-xs text-white/40 mb-1.5">Matched skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {sb.matched_skills.map((s: string) => (
                              <span key={s} className="badge-green">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {sb.missing_skills?.length > 0 && (
                        <div>
                          <p className="text-xs text-white/40 mb-1.5">Missing skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {sb.missing_skills.map((s: string) => (
                              <span key={s} className="badge-red">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {r.explanation && (
                        <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70 leading-relaxed">
                          <p className="text-xs text-white/30 mb-1">AI Explanation</p>
                          {r.explanation}
                        </div>
                      )}

                      {/* Reasoning */}
                      {sb.reasoning && (
                        <div className="bg-white/5 rounded-lg p-3 text-sm text-white/50 leading-relaxed">
                          <p className="text-xs text-white/30 mb-1">Scoring Reasoning</p>
                          {sb.reasoning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bias tab */}
      {activeTab === 'bias' && (
        <div className="card">
          {bias_report
            ? <BiasChart biasReport={bias_report} />
            : <p className="text-white/30 text-sm">No bias report available yet. Run the pipeline first.</p>
          }
        </div>
      )}

      {/* JD tab */}
      {activeTab === 'jd' && parsed_jd && (
        <div className="card space-y-5">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Required Skills</p>
            <div className="flex flex-wrap gap-2">
              {parsed_jd.required_skills?.map((s: string) => (
                <span key={s} className="bg-accent/20 text-accent-light text-sm px-3 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
          {parsed_jd.preferred_skills?.length > 0 && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Preferred Skills</p>
              <div className="flex flex-wrap gap-2">
                {parsed_jd.preferred_skills.map((s: string) => (
                  <span key={s} className="bg-white/10 text-white/60 text-sm px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/40">Min Experience</p>
              <p className="font-medium">{parsed_jd.min_experience_years || 0} years</p>
            </div>
            <div>
              <p className="text-white/40">Education</p>
              <p className="font-medium">{parsed_jd.education_level}</p>
            </div>
          </div>
          {parsed_jd.bias_flags?.length > 0 && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
              <p className="text-danger text-sm font-medium mb-2">⚠ JD Bias Flags</p>
              {parsed_jd.bias_flags.map((f: string, i: number) => (
                <p key={i} className="text-white/60 text-sm">• {f}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
