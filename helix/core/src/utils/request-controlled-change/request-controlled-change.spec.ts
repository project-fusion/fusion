import { afterEach, describe, expect, test } from 'bun:test'
import { requestControlledChange } from './request-controlled-change.js'

/**
 * The one audited path every stateful change in the library runs through.
 *
 * No DOM: this takes an `EventTarget` and a pair of callbacks, and what it
 * decides is an order and a verdict. A plain `EventTarget` is enough to ask
 * both, and it also exercises the branch a non-`Element` host takes when the
 * audit has to name something.
 *
 * The four controller mixins are its callers, so a fault here is a fault in
 * every stateful component at once.
 */
const warnings: string[] = []
const real = console.warn
console.warn = (...args: unknown[]): void => {
  warnings.push(args.map(String).join(' '))
}
afterEach(() => {
  warnings.length = 0
})
process.on('exit', () => {
  console.warn = real
})

/** A host that records the order of what happened to it. */
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
    requestControlledChange({
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
    const stood = requestControlledChange({
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
    expect(requestControlledChange({ apply: () => {}, event: change, host, next: 'after' })).toBe(
      true,
    )
  })
})

describe('the audit for a controlled element nothing is answering', () => {
  /* Judged on the second request rather than on a timer, because a consumer who
     answers by navigating cannot have moved the state within one task and used
     to be accused of not listening. */
  const asking = (host: EventTarget, read: () => string, next: string): void => {
    requestControlledChange({
      apply: () => {},
      controlled: true,
      event: change,
      host,
      label: 'value',
      next,
      read,
    })
  }

  test('says nothing about a control that has only asked once', () => {
    const { host } = target()
    asking(host, () => 'stuck', 'one')
    expect(warnings).toEqual([])
  })

  test('warns on the second unanswered request, naming the property and what it asked for', () => {
    const { host } = target()
    asking(host, () => 'stuck', 'one')
    asking(host, () => 'stuck', 'two')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('`value` was declared')
    expect(warnings[0]).toContain('"two"')
  })

  test('and only once, because a warning per keystroke is one people filter out', () => {
    const { host } = target()
    for (const next of ['one', 'two', 'three', 'four']) {
      asking(host, () => 'stuck', next)
    }
    expect(warnings).toHaveLength(1)
  })

  test('stays quiet when the consumer did answer, however slowly', () => {
    const { host } = target()
    let held = 'first'
    asking(host, () => held, 'one')
    held = 'answered'
    asking(host, () => held, 'two')
    expect(warnings).toEqual([])
  })

  /* An uncontrolled control applies its own changes, so nothing is waiting to
     be told and there is nothing to accuse anyone of. */
  test('never runs for an uncontrolled control', () => {
    const { host } = target()
    for (const next of ['one', 'two', 'three']) {
      requestControlledChange({
        apply: () => {},
        controlled: false,
        event: change,
        host,
        label: 'value',
        next,
        read: () => 'stuck',
      })
    }
    expect(warnings).toEqual([])
  })

  /* The audit needs a name to print and a way to read the state. Without either
     it cannot say anything useful, so it says nothing rather than guessing. */
  test('and not without a label or a way to read the state', () => {
    const { host } = target()
    for (const next of ['one', 'two']) {
      requestControlledChange({ apply: () => {}, controlled: true, event: change, host, next })
    }
    expect(warnings).toEqual([])
  })

  /* The reading is taken before the event goes out. A consumer answering
     synchronously has already moved the state by the time `dispatchEvent`
     returns, so a reading taken after would be the answer, and comparing it
     against itself would accuse everyone who did the right thing. */
  test('counts a synchronous answer as an answer', () => {
    const { host } = target()
    let held = 'start'
    host.addEventListener('probe-change', () => {
      held = `answered ${held}`
    })
    asking(host, () => held, 'one')
    asking(host, () => held, 'two')
    expect(warnings).toEqual([])
  })
})
