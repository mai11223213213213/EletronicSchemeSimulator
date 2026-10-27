const PREFIXES: [number, string][] = [
  [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'],
]

/** 0.00018 + 'A' -> "180 µA". Three significant digits, `∞` for infinity. */
export function formatSI(value: number, unit: string): string {
  if (!Number.isFinite(value)) return `∞ ${unit}`
  const abs = Math.abs(value)
  if (abs < 1e-12) return `0 ${unit}`
  const [scale, prefix] = PREFIXES.find(([s]) => abs >= s * 0.9995) ?? PREFIXES[PREFIXES.length - 1]
  return `${Number((value / scale).toPrecision(3))} ${prefix}${unit}`
}

export const formatTemp = (celsius: number) => `${Math.round(celsius)} °C`
