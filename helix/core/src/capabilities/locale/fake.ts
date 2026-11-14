import type { Locale } from './contract.generated.js'
import { UNSTATED_LOCALE } from './server.js'

/** One request made of the locale: a read, an observe, or the stop of one. */
export type LocaleRequest = 'observe' | 'read' | 'stop'

/** A locale capability that keeps what it is asked, and changes when a spec changes it. */
export interface FakeLocale extends Locale {
  /** Every request made of it, in order. */
  readonly asked: readonly LocaleRequest[]
  /** How many observers are listening now. */
  readonly listening: number
  /**
   * Changes the locale, as a reader does in their settings, and calls each
   * observer with it where it moved.
   */
  readonly change: (next: string) => void
}

/** A fake system set to `initial`, which is `en-US` unless a spec names another. */
export const fakeLocale = (initial: string = UNSTATED_LOCALE): FakeLocale => {
  let current = initial
  const asked: LocaleRequest[] = []
  const observers = new Set<(locale: string) => void>()
  return {
    asked,
    change: (next) => {
      if (next === current) {
        return
      }
      current = next
      for (const observer of [...observers]) {
        observer(current)
      }
    },
    get listening() {
      return observers.size
    },
    observe: (changed) => {
      asked.push('observe')
      /* Its own function, so the same callback observed twice is two observers. */
      const observer = (now: string): void => changed(now)
      observers.add(observer)
      return () => {
        asked.push('stop')
        observers.delete(observer)
      }
    },
    read: () => {
      asked.push('read')
      return current
    },
  }
}
