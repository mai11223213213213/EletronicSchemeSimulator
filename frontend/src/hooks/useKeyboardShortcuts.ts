import { useEffect } from 'react'
import { useCircuitStore } from '../store/circuitStore'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** R rotate · D wire style (orthogonal/diagonal) · Delete remove · Esc cancel wire/deselect · Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y undo/redo */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const st = useCircuitStore.getState()
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()

      if (mod && k === 'z') {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }
      if (mod && k === 'y') { e.preventDefault(); st.redo(); return }
      if (mod || e.altKey) return

      if (k === 'r') st.rotateSelected()
      else if (k === 'd') st.toggleWireStyle()
      else if (k === 'delete' || k === 'backspace') st.deleteSelected()
      else if (k === 'escape') {
        if (st.draft) st.cancelWire()
        else st.select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
