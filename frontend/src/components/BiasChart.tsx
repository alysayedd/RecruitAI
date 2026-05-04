import { BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  biasReport: {
    gender_dir: number
    name_origin_dir: number
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
    { name: 'Gender DIR', value: biasReport.gender_dir },
    { name: 'Name Origin DIR', value: biasReport.name_origin_dir },
  ]

  const shapData = (biasReport.shap_top_features || []).map(f => ({
    name: f.feature.replace('_score', '').replace('_', ' '),
    value: f.importance,
  }))

  const biasScore = biasReport.overall_bias_score || 0
  const biasColor = biasScore < 20 ? '#22c55e' : biasScore < 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-6">
      {/* Bias score ring */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={biasColor}
              strokeWidth="3"
              strokeDasharray={`${biasScore} 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: biasColor }}>{biasScore}</span>
            <span className="text-xs text-white/40">/100</span>
          </div>
        </div>
        <div>
          <p className="font-semibold text-white">Overall Bias Score</p>
          <p className="text-sm text-white/50 mt-1">
            {biasScore < 20 ? '✅ Minimal bias detected' : biasScore < 50 ? '⚠️ Moderate bias detected' : '🚨 Significant bias detected'}
          </p>
          <p className="text-xs text-white/30 mt-1">{biasReport.flagged_candidates?.length || 0} candidates flagged</p>
        </div>
      </div>

      {/* DIR chart */}
      <div>
        <p className="text-sm font-medium text-white/60 mb-3">Disparate Impact Ratios <span className="text-white/30">(≥ 0.8 = fair)</span></p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={dirData} layout="vertical" margin={{ left: 10, right: 40 }}>
            <XAxis type="number" domain={[0, 1]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} width={110} />
            <Tooltip
              contentStyle={{ background: '#16213e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: 'white' }}
              formatter={(v: number) => [v.toFixed(3), 'DIR']}
            />
            <ReferenceLine x={DIR_THRESHOLD} stroke="#f59e0b" strokeDasharray="4 2" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {dirData.map((entry, i) => (
                <Cell key={i} fill={entry.value >= DIR_THRESHOLD ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SHAP features */}
      {shapData.length > 0 && (
        <div>
          <p className="text-sm font-medium text-white/60 mb-3">Feature Importance (Score Drivers)</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={shapData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} width={90} />
              <Tooltip
                contentStyle={{ background: '#16213e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                formatter={(v: number) => [v.toFixed(2), 'importance']}
              />
              <Bar dataKey="value" fill="#6c63ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* University bias */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-white/50">University prestige bias:</span>
        {biasReport.university_bias_detected
          ? <span className="badge-red">⚠ Detected</span>
          : <span className="badge-green">✓ Not detected</span>}
      </div>

      {/* Recommendations */}
      {biasReport.recommendations?.length > 0 && (
        <div className="bg-warn/10 border border-warn/20 rounded-xl p-4 space-y-1">
          <p className="text-warn text-sm font-medium mb-2">Recommendations</p>
          {biasReport.recommendations.map((rec, i) => (
            <p key={i} className="text-white/70 text-sm">• {rec}</p>
          ))}
        </div>
      )}
    </div>
  )
}
