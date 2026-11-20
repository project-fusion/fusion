import type { Conditions } from '../types.generated.js'
import type { Environment } from './contract.generated.js'
import { conditionsMoved } from './moved.js'
import { UNSTATED_CONDITIONS } from './server.js'

/** One request made of the environment: a read, an observe, or the stop of one. */
export type EnvironmentRequest = 'observe' | 'read' | 'stop'

/** An environment capability that keeps what it is asked, and changes when a spec changes it. */
export interface FakeEnvironment extends Environment {
  /** Every request made of it, in order. */
  readonly asked: readonly EnvironmentRequest[]
  /** How many observers are listening now. */
  readonly listening: number
  /**
   * Changes what the system says, as a reader does in their settings, and
   * calls each observer with the result where any of it moved.
   */
  readonly change: (next: Partial<Conditions>) => void
}

/**
 * A fake system that starts with the conditions in `initial`, over the ones a
 * server returns for a request that states nothing.
 */
export const fakeEnvironment = (initial: Partial<Conditions> = {}): FakeEnvironment => {
  let conditions: Conditions = { ...UNSTATED_CONDITIONS, ...initial }
  const asked: EnvironmentRequest[] = []
  const observers = new Set<(conditions: Conditions) => void>()
  return {
    asked,
    change: (next) => {
      if (!conditionsMoved(next, conditions)) {
        return
      }
      conditions = { ...conditions, ...next }
      for (const observer of [...observers]) {
        observer({ ...conditions })
      }
    },
    get listening() {
      return observers.size
    },
    observe: (changed) => {
      asked.push('observe')
      /* Its own function, so the same callback observed twice is two observers. */
      const observer = (now: Conditions): void => changed(now)
      observers.add(observer)
      return () => {
        asked.push('stop')
        observers.delete(observer)
      }
    },
    read: () => {
      asked.push('read')
      return { ...conditions }
    },
  }
}
