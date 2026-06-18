import { useEffect, useState } from 'react'
import { getResults, downloadReport, draftEmail, sendEmail } from '../api/client'

interface Props { jobId: string }

type DraftResult = {
  candidateId: string
  candidateName: string
  subject: string
  body: string
  email_type: string
  interview_time?: string
}

export default function Results({ jobId }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'rankings' | 'jd'>('rankings')
  const [draftLoading, setDraftLoading] = useState<string | null>(null)
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<{ candidateId: string; candidateName: string } | null>(null)
  const [interviewTime, setInterviewTime] = useState('')
  const [sendLoading, setSendLoading] = useState(false)
  const [sendMessage, setSendMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    getResults(jobId)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => {
        if (!cancelled) {
          setData(null)
          setLoadError(e?.response?.data?.detail || e?.message || 'Failed')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [jobId])

  const defaultInterviewTime = () => {
    const next = new Date()
    next.setDate(next.getDate() + 1)
    next.setHours(9, 0, 0, 0)
    const offset = next.getTimezoneOffset() * 60000
    return new Date(next.getTime() - offset).toISOString().slice(0, 16)
  }

  const beginNextStepEmail = (candidateId: string, candidateName: string) => {
    setScheduleTarget({ candidateId, candidateName })
    setInterviewTime(defaultInterviewTime())
  }

  const handleDraft = async (candidateId: string, candidateName: string, emailType: string, selectedTime?: string) => {
    setDraftLoading(`${candidateId}-${emailType}`)
    setSendMessage(null)
    try {
      const res = await draftEmail(jobId, candidateId, emailType, selectedTime)
      setDraftResult({
        candidateId,
        candidateName,
        subject: res.subject,
        body: res.body,
        email_type: res.email_type,
        interview_time: selectedTime,
      })
      setScheduleTarget(null)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to generate email draft')
    } finally {
      setDraftLoading(null)
    }
  }

  const handleCopy = () => {
    if (!draftResult) return
    navigator.clipboard.writeText(`Subject: ${draftResult.subject}\n\n${draftResult.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = async () => {
    if (!draftResult) return
    setSendLoading(true)
    setSendMessage(null)
    try {
      const res = await sendEmail(
        jobId,
        draftResult.candidateId,
        draftResult.email_type,
        draftResult.subject,
        draftResult.body,
        draftResult.interview_time,
      )
      if (res.mailto_url) window.location.href = res.mailto_url
      setSendMessage(res.sent ? `Sent to ${res.recipient_email}` : res.message)
    } catch (e: any) {
      setSendMessage(e?.response?.data?.detail || 'Failed to send email')
    } finally {
      setSendLoading(false)
    }
  }

  // View States
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center flex flex-col items-center">
        <div className="flex gap-2 mb-4">
          <div className="w-3 h-3 bg-[#ed4690] rounded-full animate-bounce" />
          <div className="w-3 h-3 bg-[#f58133] rounded-full animate-bounce [animation-delay:0.15s]" />
          <div className="w-3 h-3 bg-[#ed4690] rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
        <p className="text-gray-400 text-sm font-medium tracking-wide">Crunching AI Results...</p>
      </div>
    </div>
  )

  if (loadError) return (
    <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-xl p-6 animate-fade-in max-w-2xl mx-auto mt-10">
      <p className="text-[#f43f5e] font-semibold text-lg">Could not load results</p>
      <p className="text-[#f43f5e]/70 text-sm mt-1">{loadError}</p>
    </div>
  )

  if (!data) return <p className="text-gray-500 text-center mt-10">No results found.</p>

  // Derived Data
  const { rankings = [], bias_report, parsed_jd, job_title, total_candidates, shortlisted_count, overall_bias_score } = data
  const measuredBias = overall_bias_score ?? bias_report?.overall_bias_score ?? 0
  const preMitigationBias = bias_report?.pre_mitigation_bias_score
  const calibratedCount = Object.keys(bias_report?.candidate_adjustments || {}).length
  
  const biasColor = measuredBias < 20 ? 'text-[#22c55e]' : measuredBias < 50 ? 'text-[#f59e0b]' : 'text-[#f43f5e]'
  const fairnessTone = measuredBias === 0 ? 'bg-[#22c55e]/15 text-[#22c55e]' : measuredBias < 20 ? 'bg-[#f59e0b]/15 text-[#f59e0b]' : 'bg-[#f43f5e]/15 text-[#f43f5e]'
  const fairnessCopy = measuredBias === 0
    ? 'Residual measured bias is 0/100 for audited groups.'
    : measuredBias < 20
      ? 'Residual measured bias is low after calibration.'
      : 'Review rankings and criteria before making decisions.'

  return (
    <div className="min-h-full text-white relative overflow-hidden flex flex-col">
      <div className="relative z-10 w-full space-y-6 animate-fade-in pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Analysis Results</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{job_title}</h1>
            <p className="text-gray-400 text-sm">
              <span className="text-white font-semibold">{total_candidates}</span> screened • <span className="text-white font-semibold">{shortlisted_count}</span> shortlisted
            </p>
          </div>
          <button onClick={() => downloadReport(jobId)} className="bg-[#1c1c1e] border border-[#2c2c2e] text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-[#232325] transition-colors flex items-center gap-2 shadow-lg w-fit">
            <svg className="w-4 h-4 text-[#ed4690]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
            PDF Report
          </button>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 text-center shadow-lg"><p className="text-4xl font-bold text-[#ed4690]">{total_candidates}</p><p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-2">Candidates</p></div>
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 text-center shadow-lg"><p className="text-4xl font-bold text-[#22c55e]">{shortlisted_count}</p><p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-2">Shortlisted</p></div>
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 text-center shadow-lg"><p className={`text-4xl font-bold ${biasColor}`}>{measuredBias}</p><p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-2">Measured bias /100</p></div>
        </div>

        {/* Fairness Bar */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-6 shadow-lg flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${fairnessTone}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2 2 4-4.5M12 3.75l7.5 3v5.25c0 4.35-3.02 8.39-7.5 9.75-4.48-1.36-7.5-5.4-7.5-9.75V6.75l7.5-3z"/></svg>
            </div>
            <div>
              <p className="font-bold text-lg text-white">Fairness Calibrated</p>
              <p className="text-sm text-gray-400 mt-1">{fairnessCopy}</p>
              {typeof preMitigationBias === 'number' && preMitigationBias !== measuredBias && (
                <p className="text-xs text-gray-500 mt-2 font-medium bg-[#121212] px-2 py-1 rounded inline-block border border-[#2c2c2e]">Before calibration: {preMitigationBias}/100</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-80 shrink-0">
            <div className="rounded-lg bg-[#121212] border border-[#2c2c2e] p-3 text-center">
              <p className={`text-2xl font-bold ${biasColor}`}>{measuredBias}</p>
              <p className="text-[10px] uppercase font-semibold text-gray-500 mt-1">Residual Bias</p>
            </div>
            <div className="rounded-lg bg-[#121212] border border-[#2c2c2e] p-3 text-center">
              <p className="text-2xl font-bold text-[#06b6d4]">{calibratedCount}</p>
              <p className="text-[10px] uppercase font-semibold text-gray-500 mt-1">Calibrated</p>
            </div>
            {bias_report?.gender_mean_dir != null && (
              <div className="rounded-lg bg-[#121212] border border-[#2c2c2e] p-3 text-center">
                <p className={`text-2xl font-bold ${bias_report.gender_mean_dir >= 0.85 ? 'text-[#22c55e]' : 'text-[#f43f5e]'}`}>{bias_report.gender_mean_dir.toFixed(3)}</p>
                <p className="text-[10px] uppercase font-semibold text-gray-500 mt-1">Gender DIR</p>
              </div>
            )}
            {bias_report?.name_origin_mean_dir != null && (
              <div className="rounded-lg bg-[#121212] border border-[#2c2c2e] p-3 text-center">
                <p className={`text-2xl font-bold ${bias_report.name_origin_mean_dir >= 0.85 ? 'text-[#22c55e]' : 'text-[#f43f5e]'}`}>{bias_report.name_origin_mean_dir.toFixed(3)}</p>
                <p className="text-[10px] uppercase font-semibold text-gray-500 mt-1">Origin DIR</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#2c2c2e]">
          {(['rankings', 'jd'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                tab === t ? 'text-[#ed4690] border-[#ed4690]' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}>
              {t === 'jd' ? 'Job Details' : 'Rankings'}
            </button>
          ))}
        </div>

        {/* Tab Content: Rankings */}
        {tab === 'rankings' && (
          <div className="space-y-3">
            {rankings.length === 0 && <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-10 text-center"><p className="text-gray-500">No rankings yet - run the screening pipeline first</p></div>}
            
            {rankings.map((r: any, idx: number) => {
              const open = expandedId === r.candidate_id
              const sb = r.score_breakdown || {}
              return (
                <div key={r.candidate_id} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl overflow-hidden animate-slide-up shadow-lg" style={{ animationDelay: `${idx * 40}ms` }}>
                  
                  {/* Accordion Header */}
                  <div onClick={() => setExpandedId(open ? null : r.candidate_id)}
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#232325] transition-colors">
                    
                    {/* Rank Badge */}
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      r.rank === 1 ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30' :
                      r.rank === 2 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/30' :
                      r.rank === 3 ? 'bg-[#f58133]/20 text-[#f58133] border border-[#f58133]/30' :
                      'bg-[#121212] border border-[#2c2c2e] text-gray-500'
                    }`}>
                      #{r.rank}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate text-lg">{r.candidate_name || r.filename}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{r.filename}</p>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 w-48 shrink-0">
                      <div className="flex-1 bg-[#121212] border border-[#2c2c2e] rounded-full h-2.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${r.adjusted_score}%`, background: 'linear-gradient(90deg, #ed4690, #f58133)' }} />
                      </div>
                      <span className="text-sm font-mono font-bold text-gray-300 w-8 text-right">{r.adjusted_score}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {r.shortlisted && <span className="bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider hidden md:block">Shortlisted</span>}
                      {r.bias_corrected && <span className="bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider hidden md:block">Calibrated</span>}
                      <svg className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {open && (
                    <div className="border-t border-[#2c2c2e] bg-[#121212] px-6 py-6 space-y-6 animate-fade-in">
                      
                      {/* Score Breakdown Bars */}
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                        {[
                          { label: 'Skills', val: sb.skills_score, max: 40, color: '#ed4690' },
                          { label: 'Experience', val: sb.experience_score, max: 30, color: '#f58133' },
                          { label: 'Education', val: sb.education_score, max: 20, color: '#22c55e' },
                          { label: 'Extras', val: sb.extras_score, max: 10, color: '#06b6d4' },
                        ].map(({ label, val, max, color }) => (
                          <div key={label} className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-3">
                            <div className="flex justify-between items-end mb-2">
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                              <span className="font-mono text-sm font-bold text-white">{val ?? 0}<span className="text-gray-500 text-xs">/{max}</span></span>
                            </div>
                            <div className="bg-[#121212] rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((val ?? 0) / max) * 100}%`, background: color }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Skills Tags */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {sb.matched_skills?.length > 0 && (
                          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Matched Skills</p>
                            <div className="flex flex-wrap gap-2">{sb.matched_skills.map((s: string) => <span key={s} className="bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-2.5 py-1 rounded text-xs font-medium">{s}</span>)}</div>
                          </div>
                        )}
                        {sb.missing_skills?.length > 0 && (
                          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Missing Skills</p>
                            <div className="flex flex-wrap gap-2">{sb.missing_skills.map((s: string) => <span key={s} className="bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20 px-2.5 py-1 rounded text-xs font-medium">{s}</span>)}</div>
                          </div>
                        )}
                      </div>

                      {/* Explanations */}
                      <div className="space-y-3">
                        {r.explanation && (
                          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4 text-[#ed4690]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/></svg>
                              AI Summary
                            </p>
                            <p className="text-sm text-gray-300 leading-relaxed">{r.explanation}</p>
                          </div>
                        )}
                        {sb.reasoning && (
                          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg p-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scoring Reasoning</p>
                            <p className="text-sm text-gray-400 leading-relaxed italic">{sb.reasoning}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <button onClick={() => handleDraft(r.candidate_id, r.candidate_name || r.filename, 'rejection')} disabled={draftLoading !== null} 
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20 hover:bg-[#f43f5e]/20 transition-colors disabled:opacity-50">
                          {draftLoading === `${r.candidate_id}-rejection` ? <span className="w-4 h-4 border-2 border-[#f43f5e]/30 border-t-[#f43f5e] rounded-full animate-spin" /> : null}
                          Draft Rejection
                        </button>
                        <button onClick={() => beginNextStepEmail(r.candidate_id, r.candidate_name || r.filename)} disabled={draftLoading !== null} 
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 hover:bg-[#22c55e]/20 transition-colors disabled:opacity-50">
                          {draftLoading === `${r.candidate_id}-next_step` ? <span className="w-4 h-4 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" /> : null}
                          Draft Next-Step
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tab Content: Job Details */}
        {tab === 'jd' && parsed_jd && (
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-8 space-y-8 shadow-xl">
            {parsed_jd.required_skills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {parsed_jd.required_skills.map((s: string) => <span key={s} className="px-3.5 py-1.5 rounded-full bg-[#ed4690]/10 border border-[#ed4690]/20 text-[#ed4690] text-sm font-medium">{s}</span>)}
                </div>
              </div>
            )}
            {parsed_jd.preferred_skills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Preferred Skills</p>
                <div className="flex flex-wrap gap-2">
                  {parsed_jd.preferred_skills.map((s: string) => <span key={s} className="px-3.5 py-1.5 rounded-full bg-[#121212] border border-[#2c2c2e] text-gray-400 text-sm font-medium">{s}</span>)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-[#121212] border border-[#2c2c2e] rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Min Experience</p>
                <p className="text-xl font-bold text-white">{parsed_jd.min_experience_years || 0} Years</p>
              </div>
              <div className="bg-[#121212] border border-[#2c2c2e] rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Education</p>
                <p className="text-xl font-bold text-white truncate" title={parsed_jd.education_level}>{parsed_jd.education_level}</p>
              </div>
            </div>
            {parsed_jd.bias_flags?.length > 0 && (
              <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-xl p-5">
                <p className="text-[#f43f5e] font-semibold mb-2 text-sm uppercase tracking-wider">JD Bias Flags</p>
                <div className="space-y-1">
                  {parsed_jd.bias_flags.map((f: string, i: number) => (
                    <p key={i} className="text-sm text-rose-200/80 flex items-start gap-2">
                      <span className="mt-1 text-[#f43f5e]">•</span> {f}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modals overlay rendering on top of everything */}
      
      {/* Schedule Modal */}
      {scheduleTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setScheduleTarget(null)}>
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xl font-bold text-white mb-1">Schedule Interview</p>
                <p className="text-gray-400 text-sm">Next-step email for <span className="font-semibold text-gray-200">{scheduleTarget.candidateName}</span></p>
              </div>
              <button onClick={() => setScheduleTarget(null)} className="text-gray-500 hover:text-white transition-colors bg-[#121212] p-1.5 rounded-md border border-[#2c2c2e]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Select Date & Time</label>
              <input type="datetime-local" 
                className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ed4690]" 
                value={interviewTime} onChange={e => setInterviewTime(e.target.value)} required />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleDraft(scheduleTarget.candidateId, scheduleTarget.candidateName, 'next_step', interviewTime)} disabled={!interviewTime || draftLoading !== null} 
                className="flex-1 bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white py-3 rounded-md font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {draftLoading === `${scheduleTarget.candidateId}-next_step` ? 'Generating Draft...' : 'Generate Email'}
              </button>
              <button onClick={() => setScheduleTarget(null)} className="flex-1 bg-[#121212] border border-[#2c2c2e] text-white py-3 rounded-md font-semibold text-sm hover:bg-[#232325] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Email Modal */}
      {draftResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setDraftResult(null)}>
          <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-[#2c2c2e] shrink-0">
              <div>
                <p className="text-xl font-bold text-white mb-1">Email Draft generated</p>
                <p className="text-gray-400 text-sm">
                  {draftResult.email_type === 'rejection' ? <span className="bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20 px-2 py-0.5 rounded text-xs font-semibold mr-2">Rejection</span> : <span className="bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-2 py-0.5 rounded text-xs font-semibold mr-2">Next Step</span>}
                  Prepared for <span className="font-semibold text-gray-200">{draftResult.candidateName}</span>
                </p>
              </div>
              <button onClick={() => setDraftResult(null)} className="text-gray-500 hover:text-white transition-colors bg-[#121212] p-1.5 rounded-md border border-[#2c2c2e]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Subject</label>
                <input className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ed4690]" 
                  value={draftResult.subject} onChange={e => setDraftResult({ ...draftResult, subject: e.target.value })} />
              </div>
              {draftResult.email_type === 'next_step' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Interview Time</label>
                  <input type="datetime-local" className="w-full bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ed4690]" 
                    value={draftResult.interview_time || ''} onChange={e => setDraftResult({ ...draftResult, interview_time: e.target.value })} />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Body</label>
                <textarea className="w-full min-h-[280px] bg-[#121212] border border-[#2c2c2e] rounded-md px-4 py-4 text-sm text-gray-300 leading-relaxed resize-y focus:outline-none focus:border-[#ed4690] custom-scrollbar" 
                  value={draftResult.body} onChange={e => setDraftResult({ ...draftResult, body: e.target.value })} />
              </div>
              
              {sendMessage && (
                <div className={`rounded-md px-4 py-3 text-sm font-medium border ${sendMessage.toLowerCase().includes('failed') || sendMessage.toLowerCase().includes('not found') ? 'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20' : 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20'}`}>
                  {sendMessage}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#2c2c2e] shrink-0 flex flex-wrap gap-3 bg-[#1c1c1e] rounded-b-2xl">
              <button onClick={handleSend} disabled={sendLoading} className="bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white px-6 py-2.5 rounded-md font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[120px]">
                {sendLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Email'}
              </button>
              <button onClick={handleCopy} className="bg-[#121212] border border-[#2c2c2e] text-white px-6 py-2.5 rounded-md font-semibold text-sm hover:bg-[#232325] transition-colors min-w-[150px]">
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}