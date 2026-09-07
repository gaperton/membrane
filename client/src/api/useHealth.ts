import { useCallback, useEffect, useState } from 'react'

import type { HealthResponse } from '@server/application/health.js'

import { fetchHealth } from './health.js'

export type HealthState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: HealthResponse; checkedAt: Date }
  | { kind: 'error'; message: string }

export interface UseHealthResult {
  state: HealthState
  refresh: () => void
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export function useHealth(): UseHealthResult {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setState({ kind: 'loading' })

    fetchHealth(controller.signal)
      .then((data) => {
        setState({ kind: 'ready', data, checkedAt: new Date() })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setState({ kind: 'error', message: describeError(error) })
      })

    return () => {
      controller.abort()
    }
  }, [attempt])

  const refresh = useCallback(() => {
    setAttempt((value) => value + 1)
  }, [])

  return { state, refresh }
}
