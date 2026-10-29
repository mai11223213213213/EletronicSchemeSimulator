interface Props {
  /** 0 (empty) … 1 (charged to its rated voltage). */
  level?: number
  burned?: boolean
}

/** Two plates. While it charges, a blue "electric field" fills the gap and a halo grows around the plates. */
export function CapacitorElement({ level = 0, burned = false }: Props) {
  const t = burned ? 0 : Math.min(1, Math.max(0, level))
  return (
    <g stroke="#1f2937" strokeWidth="3" fill="none" strokeLinecap="round">
      <line x1="-30" y1="0" x2="-5" y2="0" />
      <line x1="5" y1="0" x2="30" y2="0" />
      {t > 0 && (
        <>
          <rect x="-14" y="-19" width="28" height="38" rx="8" fill="#60a5fa" stroke="none" opacity={t * 0.35} pointerEvents="none" />
          <rect x="-5" y="-14" width="10" height="28" fill="#3b82f6" stroke="none" opacity={t * 0.8} pointerEvents="none" />
        </>
      )}
      {burned ? (
        // burst: the plates are bent and there is a scorch mark between them
        <>
          <path d="M-5 -14 L-8 -4 L-4 4 L-6 14" stroke="#6b7280" />
          <path d="M5 -14 L8 -5 L4 5 L7 14" stroke="#6b7280" />
          <path d="M-3 -2 L3 2 M-3 2 L3 -2" stroke="#9ca3af" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <line x1="-5" y1="-14" x2="-5" y2="14" />
          <line x1="5" y1="-14" x2="5" y2="14" />
        </>
      )}
    </g>
  )
}
