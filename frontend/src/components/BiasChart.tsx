import { BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  biasReport: {
    gender_dir: number
    gender_mean_dir?: number
    name_origin_dir: number
    name_origin_mean_dir?: number
    university_bias_detected: boolean
    overall_bias_score: number
    shap_top_features: { feature: string; importance: number }[]
    recommendations: string[]
    flagged_candidates: string[]
  }
}

const DIR_THRESHOLD = 0.8

export default function BiasChart({ biasReport }: Props) {
  const dirData = [
    { name: 'Gender Selection DIR', value: biasReport.gender_dir },
    { name: 'Gender Mean DIR', value: biasReport.gender_mean_dir ?? 1 },
    { name: 'Origin Selection DIR', value: biasReport.name_origin_dir },
    { name: 'Origin Mean DIR', value: biasReport.name_origin_mean_dir ?? 1 },
  ]

  const shapData = (biasReport.shap_top_features || []).map(f => ({
    name: f.feature.replace('_score', '').replace('_', ' '),
    value: f.importance,
  }))

  const biasScore = biasReport.overall_bias_score || 0
  const biasColor = biasScore < 20 ? '#34d399' : biasScore < 50 ? '#fbbf24' : '#fb7185'

  const tooltipStyle = {
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 12,
    backdropFilter: 'blur(8px)',
  }

  return (
    <div className="space-y-8">
      {/* Score ring */}
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={biasColor} strokeWidth="3"
              strokeDasharray={`${biasScore} 100`} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${biasColor}40)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: biasColor }}>{biasScore}</span>
            <span className="text-[10px] text-white/30">/100</span>
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold">Overall Bias Score</p>
          <p className="text-sm text-white/40 mt-1">
            {biasScore < 20 ? 'Minimal bias detected — good to go' : biasScore < 50 ? 'Moderate bias — review recommended' : 'Significant bias — action needed'}
          </p>
          <p className="text-xs text-white/25 mt-1">{biasReport.flagged_candidates?.length || 0} candidates flagged for correction</p>
        </div>
      </div>

      {/* DIR chart */}
      <div>
        <p className="label mb-4">Disparate Impact Ratios <span className="text-white/20 normal-case">(0.8+ = fair)</span></p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dirData} layout="vertical" margin={{ left: 10, right: 40 }}>
            <XAxis type="number" domain={[0, 1]} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'white' }} formatter={(v: number) => [v.toFixed(3), 'DIR']} />
            <ReferenceLine x={DIR_THRESHOLD} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
              {dirData.map((entry, i) => (
                <Cell key={i} fill={entry.value >= DIR_THRESHOLD ? '#34d399' : '#fb7185'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SHAP features */}
      {shapData.length > 0 && (
        <div>
          <p className="label mb-4">Feature Importance (Score Drivers)</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={shapData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} width={90} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toFixed(2), 'importance']} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                {shapData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${240 + i * 30}, 80%, 70%)`} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* University bias */}
      <div className="flex items-center gap-3">
        <span className="text-white/40 text-sm">University prestige bias:</span>
        {biasReport.university_bias_detected
          ? <span className="pill-red">Detected</span>
          : <span className="pill-green">Not detected</span>}
      </div>

      {/* Recommendations */}
      {biasReport.recommendations?.length > 0 && (
        <div className="bg-amber/5 border border-amber/15 rounded-2xl p-5">
          <p className="text-amber font-semibold mb-3">Recommendations</p>
          <div className="space-y-2">
            {biasReport.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-amber text-[10px] font-bold">{i + 1}</span>
                </div>
                <p className="text-white/60 text-sm leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
