interface Props {
  label: string
  value: string | number
  sub?: string
  color?: 'accent' | 'success' | 'danger' | 'warn' | 'cyan'
}

const colorMap = {
  accent: 'text-accent-light',
  success: 'text-emerald',
  danger: 'text-rose',
  warn: 'text-amber',
  cyan: 'text-cyan',
}

export default function ScoreCard({ label, value, sub, color = 'accent' }: Props) {
  return (
    <div className="card group hover:border-white/15 transition-all duration-300">
      <p className="text-xs font-semibold text-white/35 uppercase tracking-wider">{label}</p>
      <p className={`stat-value mt-2 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-white/25 text-xs mt-1">{sub}</p>}
    </div>
  )
}
