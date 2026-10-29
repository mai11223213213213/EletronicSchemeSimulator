import type { CircuitElement, ElementProps } from './types'
import { formatSI } from './units'

/** The shapes the AC source can produce. The position in this list is what an element stores (`waveform`). */
export const WAVEFORMS = ['Sine', 'Square', 'Triangle']

export const AC_DEFAULTS = { amplitude: 12, frequency: 50, waveform: 0, offset: 0, internalResistance: 0.1 }

type AcKey = keyof typeof AC_DEFAULTS
const num = (p: ElementProps, key: AcKey) => {
  const v = p[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : AC_DEFAULTS[key]
}

/** Anything that pushes the current: a battery or an AC source. Both have a "plus" and a "minus" pin. */
export const isSource = (el: CircuitElement) => el.type === 'battery' || el.type === 'acsource'

/**
 * One cycle of a waveform, as a number from −1 to +1.
 * `phase` is the position inside the cycle in radians (0 … 2π, then it repeats).
 */
export function waveform(shape: number, phase: number): number {
  const s = Math.sin(phase)
  switch (Math.round(shape)) {
    case 1: return s >= 0 ? 1 : -1 // square: just the sign of the sine
    case 2: return (2 / Math.PI) * Math.asin(s) // triangle: the arcsine "straightens" the sine into straight ramps
    default: return s
  }
}

/** The EMF a source drives at time `t` seconds. A battery is constant; an AC source follows its waveform. */
export function sourceVoltage(el: CircuitElement, t: number): number {
  if (el.type === 'battery') return typeof el.props.voltage === 'number' ? el.props.voltage : 9
  const p = el.props
  const phase = 2 * Math.PI * num(p, 'frequency') * t
  return num(p, 'offset') + num(p, 'amplitude') * waveform(num(p, 'waveform'), phase)
}

/** Effective (RMS) value of an AC source: the DC voltage that would heat a resistor equally. */
export function acRms(p: ElementProps): number {
  const a = num(p, 'amplitude')
  const rms = Math.round(num(p, 'waveform')) === 1 ? a : Math.round(num(p, 'waveform')) === 2 ? a / Math.sqrt(3) : a / Math.SQRT2
  const dc = num(p, 'offset')
  return Math.sqrt(dc * dc + rms * rms) // DC offset and AC part add as squares
}

export const acFrequency = (p: ElementProps) => num(p, 'frequency')

export function acReadouts(p: ElementProps): [label: string, value: string][] {
  return [
    ['RMS', formatSI(acRms(p), 'V')],
    ['Period', formatSI(1 / Math.max(num(p, 'frequency'), 1e-9), 's')],
  ]
}

export const AC_HELP =
  'Amplitude is the peak value. RMS (the "effective" voltage) is amplitude/√2 for a sine. ' +
  'The oscilloscope shows the waveform; meters show RMS values.'
