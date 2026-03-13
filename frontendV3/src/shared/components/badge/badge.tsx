interface BadgeProps {
  variant?: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'violet'
  children: React.ReactNode
}

const VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  slate:   'bg-slate-100 text-slate-700 border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  red:     'bg-red-50 text-red-700 border-red-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  violet:  'bg-violet-50 text-violet-700 border-violet-200',
}

export function Badge({ variant = 'slate', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${VARIANTS[variant]}`}>
      {children}
    </span>
  )
}
