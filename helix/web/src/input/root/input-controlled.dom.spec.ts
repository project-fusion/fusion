import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Input = HTMLElement & {
  requestValue(next: string): boolean
  updateComplete: Promise<boolean>
  value: string
}

const input = async (extra = ''): Promise<Input> =>
  (await mount(`<helix-input label="Name" ${extra}></helix-input>`)) as Input

/**
 * Runs a body with `console.warn` captured, and answers what it said.
 *
 * The audit is deferred by a task on purpose, so this waits one out. A test
 * that checked synchronously would pass on a warning that never arrives.
 */
const warnings = async (body: () => void | Promise<void>): Promise<string[]> => {
  const said: string[] = []
  const real = console.warn
  console.warn = (...parts: unknown[]) => said.push(parts.join(' '))
  try {
    await body()
    await new Promise((done) => setTimeout(done, 1))
  } finally {
    console.warn = real
  }
  return said
}

describe('a control that is controlled and unattended says so', () => {
  test('declaring `value` and listening to nothing is reported', async () => {
    /* The trap, and the reason this exists: `value="Ada"` is the native seed
       and here it is a claim of ownership, so the control announces and waits
       for an answer that never comes. Nothing was logged before this, and the
       symptom is a field that ignores typing. */
    const host = await input('value="Ada"')
    const said = await warnings(() => {
      // Twice: unmoved across two requests is unanswered, whatever the timing.
      host.requestValue('Grace')
      host.requestValue('Hopper')
    })
    expect(said).toHaveLength(1)
    expect(said[0]).toContain('<helix-input> is controlled')
    expect(said[0]).toContain('`value` was declared')
    expect(said[0]).toContain('default-value')
  })

  test('a consumer answering synchronously is not accused', async () => {
    // The reading has to be taken before the event, or a handler that assigns
    // straight away looks exactly like one that was never there.
    const host = await input('value="Ada"')
    host.addEventListener('helix-input', (event) => {
      host.value = (event as CustomEvent<{ value: string }>).detail.value
    })
    expect(await warnings(() => host.requestValue('Grace'))).toEqual([])
  })

  test('a consumer answering a task later is not accused either', async () => {
    // Which is what React does: `setState` in the handler, and the property
    // lands when React commits, after the event has finished.
    const host = await input('value="Ada"')
    host.addEventListener('helix-input', (event) => {
      const { value } = (event as CustomEvent<{ value: string }>).detail
      queueMicrotask(() => {
        host.value = value
      })
    })
    expect(await warnings(() => host.requestValue('Grace'))).toEqual([])
  })

  /* The case the old deadline got wrong. A consumer who answers by navigating
     cannot have moved the state within a task, and was accused of not
     listening: our own documentation nav derives a tree's `active` from the
     route and does exactly this. There is no deadline now, so a slow answer is
     an answer. */
  test('a consumer answering long after the fact is not accused', async () => {
    const host = await input('value="Ada"')
    host.addEventListener('helix-input', (event) => {
      const { value } = (event as CustomEvent<{ value: string }>).detail
      setTimeout(() => {
        host.value = value
      }, 8)
    })

    const said = await warnings(async () => {
      host.requestValue('Grace')
      await new Promise((done) => setTimeout(done, 20))
      host.requestValue('Hopper')
    })

    expect(said).toEqual([])
  })

  test('one request is never enough to accuse, however long nothing answers', async () => {
    const host = await input('value="Ada"')

    expect(await warnings(() => host.requestValue('Grace'))).toEqual([])
  })

  test('a deliberate refusal is silent, because refusing is listening', async () => {
    const host = await input('value="Ada"')
    host.addEventListener('helix-input', (event) => event.preventDefault())
    expect(await warnings(() => host.requestValue('Grace'))).toEqual([])
  })

  test('an uncontrolled control is never audited, however it is driven', async () => {
    const host = await input('default-value="Ada"')
    expect(await warnings(() => host.requestValue('Grace'))).toEqual([])
    expect(host.value).toBe('Grace')
  })

  test('it says it once, not once per keystroke', async () => {
    const host = await input('value="Ada"')
    const said = await warnings(async () => {
      host.requestValue('G')
      await new Promise((done) => setTimeout(done, 1))
      host.requestValue('Gr')
      await new Promise((done) => setTimeout(done, 1))
      host.requestValue('Gra')
    })
    expect(said).toHaveLength(1)
  })

  test('a control that answered once is not audited again when it stops', async () => {
    /* Deliberate, and worth naming. The audit is the first request an element
       ever makes: an element that answered it is wired up, and re-checking
       forever would cost a timer per keystroke to catch a consumer who removed
       their own listener. */
    const host = await input('value="Ada"')
    const answer = (event: Event): void => {
      host.value = (event as CustomEvent<{ value: string }>).detail.value
    }
    host.addEventListener('helix-input', answer)
    expect(await warnings(() => host.requestValue('Grace'))).toEqual([])

    host.removeEventListener('helix-input', answer)
    expect(await warnings(() => host.requestValue('Hopper'))).toEqual([])
  })
})
