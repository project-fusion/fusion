/**
 * The events an element sends as a value it computes changes, as its form's
 * events that `follow` one say: a meter's `band` as its reading moves into
 * another band, and a progress bar's `complete` as it arrives at its end.
 */
import { useEffect, useRef } from 'react'
import { senderOf, tell } from '../machines/props'
import { read, type Values } from './styles'

/** Words a detail field carries: the value as the web writes it, and nothing as the empty string. */
const wordsOf = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''

/**
 * Sends each event that follows a computed value as that value changes.
 * **Nothing is sent at the first render**, since an element that arrives in
 * a state has not moved into it, **except an event that `arrives`**, sent
 * where its value already holds, as a code too long from the start sends
 * `error` on the web. And **a flag sends only as it turns on**, as
 * a bar that empties again has not completed. Each field of the detail holds
 * what the event `gives` it, or the value it follows.
 */
export const useFollowed = (values: Values): void => {
  const events = (values.family.api?.events ?? []).filter(
    (event) => event.follows !== undefined && event.platform === undefined,
  )
  const now = events.map((event) => read(values, event.follows ?? ''))
  const before = useRef<readonly unknown[] | undefined>(undefined)
  const latest = useRef(values)
  latest.current = values
  const key = JSON.stringify(now.map(wordsOf))
  // biome-ignore lint/correctness/useExhaustiveDependencies: each value is read again through `key`
  useEffect(() => {
    const was = before.current
    before.current = now
    for (const [at, event] of events.entries()) {
      const value = now[at]
      /* At the first render, only an event that `arrives` is sent, and only where its value holds. */
      const moved =
        was === undefined
          ? event.arrives === true && wordsOf(value) !== ''
          : wordsOf(value) !== wordsOf(was[at])
      if (!moved || (typeof value === 'boolean' && !value)) {
        continue
      }
      const { family, props } = latest.current
      const detail = Object.fromEntries(
        event.detail.map((field) => {
          const from = event.gives?.[field]
          return [field, wordsOf(from === undefined ? value : read(latest.current, from))]
        }),
      )
      tell(family, props, event.name, detail, senderOf(family, props.value))
    }
  }, [key])
}
