interface SpinnerProps { size?: number }

export function Spinner({ size = 20 }: SpinnerProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className="animate-spin text-slate-400"
      aria-label="Carregando"
      role="status"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  )
}
