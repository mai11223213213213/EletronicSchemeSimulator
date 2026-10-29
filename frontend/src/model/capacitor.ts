import type { ElementProps } from './types'
import { formatSI } from './units'

/** Permittivity of free space, F/m. */
export const EPSILON_0 = 8.8541878128e-12

export interface Dielectric {
  name: string
  /** Relative permittivity εr: how many times more charge fits on the plates than with vacuum between them. */
  epsilonR: number
  /** Dielectric strength in MV/m: the electric field at which the material breaks down and conducts (typical values). */
  strength: number
}

/** What the gap between the plates can be filled with. The position in this list is what an element stores (`dielectric`). */
export const DIELECTRICS: Dielectric[] = [
  { name: 'Air', epsilonR: 1.0006, strength: 3 },
  { name: 'Paper', epsilonR: 3.7, strength: 16 },
  { name: 'Polyester film', epsilonR: 3.3, strength: 100 },
  { name: 'Glass', epsilonR: 6, strength: 14 },
  { name: 'Mica', epsilonR: 6, strength: 118 },
  { name: 'Ceramic (high-k)', epsilonR: 2000, strength: 10 },
  { name: 'Tantalum oxide', epsilonR: 27, strength: 200 },
]

/** The two ways to describe a capacitor. The position in this list is what an element stores (`mode`). */
export const CAPACITOR_MODES = ['Capacitance', 'Construction']

/**
 * Mode 0 ("Capacitance"): the user types the capacitance (µF) and the rated voltage.
 * Mode 1 ("Construction"): the user types plate area (cm²), gap (µm) and dielectric; the capacitance follows.
 * The numbers of the mode that is not in use are kept, so switching back does not lose anything.
 * The defaults describe a 1 mF / 16 V capacitor: 1130 cm² of plate, 2 µm of high-k ceramic (breaks down at 20 V).
 */
export const CAPACITOR_DEFAULTS = {
  mode: 0, capacitance: 1000, plateArea: 1130, plateDistance: 2, dielectric: 5, maxVoltage: 16,
  esr: 0.1, // equivalent series resistance, Ω: only used by the "real" model
}

type CapacitorKey = keyof typeof CAPACITOR_DEFAULTS
/** Read a number from the element's props; parts created before a prop existed fall back to the default. */
const num = (p: ElementProps, key: CapacitorKey) => {
  const v = p[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : CAPACITOR_DEFAULTS[key]
}

/** Is this capacitor described by its construction (instead of by a typed capacitance)? */
export const isConstruction = (p: ElementProps) => Math.round(num(p, 'mode')) === 1

export function dielectricOf(p: ElementProps): Dielectric {
  const i = Math.round(num(p, 'dielectric'))
  return DIELECTRICS[Math.min(DIELECTRICS.length - 1, Math.max(0, i))]
}

/** C = ε₀ · εr · A / d from the construction, in farads. Area is stored in cm² and the gap in µm, so convert to m² and m. */
function capacitanceFromConstruction(p: ElementProps): number {
  const area = num(p, 'plateArea') * 1e-4
  const gap = num(p, 'plateDistance') * 1e-6
  return (EPSILON_0 * dielectricOf(p).epsilonR * area) / gap
}

/** Series resistance of the leads and plates, Ω. Only the "real" model uses it. */
export const capacitorEsr = (p: ElementProps) => Math.max(0, num(p, 'esr'))

/** The capacitance the simulation uses, in farads: the typed value, or the one the construction gives. */
export function capacitance(p: ElementProps): number {
  return isConstruction(p) ? capacitanceFromConstruction(p) : num(p, 'capacitance') * 1e-6
}

/** Highest voltage the gap survives: field strength × gap (E = U / d, so U = E · d), in volts. */
export function breakdownVoltage(p: ElementProps): number {
  return dielectricOf(p).strength * 1e6 * num(p, 'plateDistance') * 1e-6
}

/** Float noise (19.999999999999996 instead of 20) must not count as "over the limit" or change the result. */
const TOLERANCE = 1e-9

/** Round DOWN to 3 significant digits, so the result is never above the limit it came from. */
function floorSignificant(x: number): number {
  if (!(x > 0)) return 0
  const step = 10 ** (Math.floor(Math.log10(x)) - 2)
  return Math.floor(x / step + TOLERANCE) * step
}

/** Round to 4 significant digits (for numbers the app calculates and puts into an input field). */
const roundSignificant = (x: number) => Number(x.toPrecision(4))

/**
 * Makes the numbers describe a capacitor that can physically exist. `changedKey` is the property the user just edited.
 *
 *  1. Switching the mode must not change the capacitor, so the other mode's numbers are brought in line:
 *     - Capacitance → Construction: the plate area is recalculated so the capacitance stays the same
 *       (gap and dielectric are kept: they are the user's choices);
 *     - Construction → Capacitance: the capacitance field gets the value the construction gave.
 *  2. In Construction mode the rated voltage may not exceed the breakdown voltage. If it does it is lowered.
 *     Area, gap and dielectric are never changed to make a rated voltage fit.
 * Returns the (possibly corrected) props and the notes to show to the user.
 */
export function normalizeCapacitor(p: ElementProps, changedKey?: string): { props: ElementProps; notes: string[] } {
  const notes: string[] = []
  let q = p

  if (changedKey === 'mode') {
    if (isConstruction(p)) {
      // A = C · d / (ε₀ · εr), then back from m² to cm²
      const c = num(p, 'capacitance') * 1e-6
      const area = roundSignificant(((c * num(p, 'plateDistance') * 1e-6) / (EPSILON_0 * dielectricOf(p).epsilonR)) * 1e4)
      q = { ...q, plateArea: area }
      notes.push(`Plate area set to ${area} cm² so the capacitance stays ${formatSI(c, 'F')}.`)
    } else {
      const microfarads = roundSignificant(capacitanceFromConstruction(p) * 1e6)
      q = { ...q, capacitance: microfarads }
      notes.push(`Capacitance set to ${formatSI(microfarads * 1e-6, 'F')}, the value of the construction.`)
    }
  }

  if (isConstruction(q)) {
    const limit = breakdownVoltage(q)
    const rated = num(q, 'maxVoltage')
    if (rated > limit * (1 + TOLERANCE)) {
      const fixed = floorSignificant(limit)
      q = { ...q, maxVoltage: fixed }
      notes.push(
        `Rated voltage lowered from ${formatSI(rated, 'V')} to ${formatSI(fixed, 'V')}: ` +
          `a ${formatSI(num(q, 'plateDistance') * 1e-6, 'm')} gap of ${dielectricOf(q).name.toLowerCase()} breaks down at ${formatSI(limit, 'V')}.`,
      )
    }
  }
  return { props: q, notes }
}

/** Calculated values shown (read-only) in the properties card. */
export function capacitorReadouts(p: ElementProps): [label: string, value: string][] {
  const rows: [string, string][] = [['Capacitance', formatSI(capacitance(p), 'F')]]
  if (isConstruction(p)) {
    const d = dielectricOf(p)
    rows.push(['Breakdown at', formatSI(breakdownVoltage(p), 'V')], ['Dielectric', `εr = ${d.epsilonR}, ${d.strength} MV/m`])
  }
  return rows
}

export const capacitorHelp = (p: ElementProps) =>
  isConstruction(p)
    ? 'Capacitance is calculated: C = ε₀·εr·A / d. The rated voltage can never exceed the breakdown voltage ' +
      '(dielectric strength × gap), so it is lowered automatically. Area, gap and dielectric are never changed for you.'
    : 'Type the capacitance and the rated voltage. Switch to "Construction" to describe the plates instead.'
