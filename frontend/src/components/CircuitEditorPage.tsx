
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getCircuit, updateCircuit } from '../api/circuits'
import { useCircuitStore } from '../store/circuitStore'
import { CircuitWorkspace } from './CircuitWorkspace'
import { WorkspaceSkeleton } from './WorkspaceSkeleton'

type SaveStatus = 'saved' | 'saving' | 'error'

export function CircuitEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [circuitName, setCircuitName] = useState('')
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [exiting, setExiting] = useState(false)

  const skipSave = useRef(false)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const saveVersion = useRef(0)
  const saveTimer = useRef<number | null>(null)

  const elements = useCircuitStore((state) => state.elements)
  const wires = useCircuitStore((state) => state.wires)
  const junctions = useCircuitStore((state) => state.junctions)
  const loadCircuit = useCircuitStore((state) => state.loadCircuit)

  // Load circuit
  useEffect(() => {
    if (!id) return

    let active = true

    getCircuit(id)
      .then((circuit) => {
        if (!active) return

        skipSave.current = true
        loadCircuit(circuit.data)
        setCircuitName(circuit.name)
        setLoadedId(id)
        setSaveStatus('saved')
        setError('')
      })
      .catch((err) => {
        if (!active) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load this circuit.',
        )
      })

    return () => {
      active = false
    }
  }, [id, loadCircuit])

  // Autosave
  useEffect(() => {
    const version = ++saveVersion.current

    if (!id || loadedId !== id || exiting) return

    if (skipSave.current) {
      skipSave.current = false
      return
    }

    const timeout = window.setTimeout(() => {
      saveTimer.current = null
      setSaveStatus('saving')

      const data = { elements, wires, junctions }

      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => updateCircuit(id, { data }))
        .then(() => {
          if (version !== saveVersion.current) return

          setSaveStatus('saved')
          setError('')
        })
        .catch((err) => {
          if (version !== saveVersion.current) return

          setSaveStatus('error')
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to save this circuit.',
          )
        })
    }, 700)

    saveTimer.current = timeout

    return () => {
      window.clearTimeout(timeout)

      if (saveTimer.current === timeout) {
        saveTimer.current = null
      }
    }
  }, [id, loadedId, elements, wires, junctions, exiting])

  // Rename circuit
  async function handleRename(name: string) {
    if (!id) throw new Error('Circuit ID is missing.')

    const updated = await updateCircuit(id, { name })

    setCircuitName(updated.name)
  }

  // Save current state and leave editor
  async function handleExit() {
    if (!id || exiting) return

    setExiting(true)
    setError('')

    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }

    const data = { elements, wires, junctions }

    ++saveVersion.current
    setSaveStatus('saving')

    try {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => updateCircuit(id, { data }))
        .then(() => undefined)

      await saveQueue.current

      setSaveStatus('saved')
      navigate('/dashboard')
    } catch (err) {
      setSaveStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save this circuit.',
      )
      setExiting(false)
    }
  }

  if (error && loadedId !== id) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#101716] p-6">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold text-white">
            Unable to open circuit
          </p>
          <p className="mt-2 text-sm text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  if (loadedId !== id) {
    return <WorkspaceSkeleton />
  }

  return (
    <>
      <CircuitWorkspace
        circuitName={circuitName}
        onRename={handleRename}
        onExit={handleExit}
        exiting={exiting}
      />

      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-1 left-1/2 z-40 -translate-x-1/2 text-xs font-medium ${
          saveStatus === 'error'
            ? 'text-red-400'
            : saveStatus === 'saving'
              ? 'text-amber-400'
              : 'text-emerald-400'
        }`}
      >
        {saveStatus === 'saving'
          ? 'Saving...'
          : saveStatus === 'error'
            ? 'Save failed'
            : 'All changes saved'}
      </div>

      {error && (
        <div
          role="alert"
          className="fixed bottom-7 left-1/2 z-50 -translate-x-1/2 text-xs text-red-400"
        >
          {error}
        </div>
      )}
    </>
  )
}
