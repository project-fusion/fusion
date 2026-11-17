import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { changePage, PAGE_TRANSITION_ATTRIBUTE } from './page-transition.js'

beforeAll(() => {
  registerDom()
})

type Start = (update: () => unknown) => {
  finished: Promise<void>
  ready: Promise<void>
  updateCallbackDone: Promise<void>
}

const page = document as unknown as { startViewTransition?: Start }

afterEach(() => {
  delete page.startViewTransition
  document.documentElement.removeAttribute(PAGE_TRANSITION_ATTRIBUTE)
})

/** A browser's view transition, which runs the update and records what the document element said while it ran. */
const transitions = (seen: (string | null)[], skip = false): void => {
  page.startViewTransition = (update) => {
    seen.push(document.documentElement.getAttribute(PAGE_TRANSITION_ATTRIBUTE))
    const done = Promise.resolve().then(() => update()) as Promise<void>
    const ended = skip ? done.then(() => Promise.reject(new Error('skipped'))) : done
    return { finished: ended, ready: ended, updateCallbackDone: done }
  }
}

describe('changing the page in place', () => {
  test('runs the update at once where the browser has no view transitions', async () => {
    let changed = false
    await changePage(() => {
      changed = true
    })
    expect(changed).toBe(true)
  })

  test('names the way it moves while it moves, and puts back what was there', async () => {
    const seen: (string | null)[] = []
    transitions(seen)
    document.documentElement.setAttribute(PAGE_TRANSITION_ATTRIBUTE, 'fade')
    await changePage(() => {}, { transition: 'slide-back' })
    expect(seen).toEqual(['slide-back'])
    expect(document.documentElement.getAttribute(PAGE_TRANSITION_ATTRIBUTE)).toBe('fade')
  })

  test('leaves the document element as it was where no way is given', async () => {
    const seen: (string | null)[] = []
    transitions(seen)
    await changePage(() => {})
    expect(seen).toEqual([null])
    expect(document.documentElement.hasAttribute(PAGE_TRANSITION_ATTRIBUTE)).toBe(false)
  })

  test('starts no transition for none', async () => {
    const seen: (string | null)[] = []
    transitions(seen)
    let changed = false
    await changePage(
      () => {
        changed = true
      },
      { transition: 'none' },
    )
    expect(changed).toBe(true)
    expect(seen).toEqual([])
  })

  test('treats a skipped move as no error', async () => {
    transitions([], true)
    await changePage(() => {}, { transition: 'slide' })
    expect(document.documentElement.hasAttribute(PAGE_TRANSITION_ATTRIBUTE)).toBe(false)
  })

  test('rejects where the update does', async () => {
    transitions([])
    await expect(
      changePage(() => {
        throw new Error('no route')
      }),
    ).rejects.toThrow('no route')
  })
})
