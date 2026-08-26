import { describe, expect, test } from 'bun:test'
import { requestChange } from './request-change.js'

/**
 * The one path every stateful change in the library runs through.
 *
 * No DOM: this takes an `EventTarget` and a pair of callbacks, and what it
 * decides is an order and a verdict. A plain `EventTarget` is enough to ask
 * both.
 *
 * The four controller mixins are its callers, so a fault here is a fault in
 * every stateful component at once.
 *
 * **The audit's seven cases went with the audit.** They asserted that a
 * controlled element nothing answered warned on its second unanswered request,
 * which was machinery for making an invisible mode audible. There is no mode
 * now: the element applies, and a consumer refuses here to take over. See 294.
 */
const target = () => {
  const host = new EventTarget()
  const log: string[] = []
  return { host, log }
}

const change = (_next: string): Event => new CustomEvent('probe-change', { cancelable: true })

describe('announcing before applying', () => {
  test('the event goes out first, so a listener sees the state it is being asked to allow', () => {
    const { host, log } = target()
    let state = 'before'
    host.addEventListener('probe-change', () => {
      log.push(`heard, state is ${state}`)
    })
    requestChange({
      apply: (next) => {
        state = next
        log.push(`applied ${next}`)
      },
      event: change,
      host,
      next: 'after',
    })
    expect(log).toEqual(['heard, state is before', 'applied after'])
  })

  test('a refusal stops it, and says so', () => {
    const { host } = target()
    let applied = false
    host.addEventListener('probe-change', (event) => {
      event.preventDefault()
    })
    const stood = requestChange({
      apply: () => {
        applied = true
      },
      event: change,
      host,
      next: 'after',
    })
    expect([stood, applied]).toEqual([false, false])
  })

  test('and nobody refusing means it stands', () => {
    const { host } = target()
    expect(requestChange({ apply: () => {}, event: change, host, next: 'after' })).toBe(true)
  })

  test('applies for a host that declared the state, since a prop is a seed and not a claim', () => {
    const { host } = target()
    let state = 'seeded'
    requestChange({
      apply: (next) => {
        state = next
      },
      event: change,
      host,
      next: 'moved',
    })
    expect(state).toBe('moved')
  })
})
