import { REGISTRY } from './registry'
import type { CircuitElement } from './types'

/** "Resistor 1", "Resistor 2", "Lamp 1" ... numbered per type in placement order. */
export function elementNames(elements: CircuitElement[]): Record<string, string> {
  const count: Record<string, number> = {}
  const names: Record<string, string> = {}
  for (const el of elements) {
    count[el.type] = (count[el.type] ?? 0) + 1
    names[el.id] = `${REGISTRY[el.type].label} ${count[el.type]}`
  }
  return names
}
