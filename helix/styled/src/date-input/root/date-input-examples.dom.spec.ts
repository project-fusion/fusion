import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import months from '../.examples/months.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

/* What a reader's typing looks like to the control: the value changes, then
   `input` fires. `change` is the commit, which a browser sends on blur. */
const type = (control: HTMLInputElement, text: string): void => {
  control.value = text
  control.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
}
const commit = (control: HTMLElement): void => {
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('the events example', () => {
  run('the calendar opens and closes, asking each time', async () => {
    await example(events)
    const trigger = part(document.getElementById('starts') as HTMLElement, 'trigger') as HTMLElement
    trigger.click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle'])
    trigger.click()
    await idle()
    expect(logged()).toEqual(['helix-before-open', 'toggle', 'helix-before-close', 'toggle'])
  })

  run('a date typed in proposes it, announces it, and commits on leaving', async () => {
    await example(events)
    const starts = document.getElementById('starts') as HTMLElement & { value: string }
    const control = part(starts, 'control') as HTMLInputElement
    type(control, '2026-08-20')
    await idle()
    commit(control)
    await idle()
    expect(logged()).toEqual(['helix-before-change', 'input', 'change'])
    expect(starts.value).toBe('2026-08-20')
  })
})

/**
 * Four months, two to a row, in a window that has room for one.
 *
 * Narrowed where placement measures the window, `visualViewport`, since a spec
 * page cannot be resized from inside; the headless spec says the same.
 */
describe('the months example', () => {
  afterEach(() => {
    delete (window as { visualViewport?: unknown }).visualViewport
    document.documentElement.removeAttribute('dir')
  })

  const opened = async (): Promise<{ host: HTMLElement; picker: HTMLElement }> => {
    const host = await example(months)
    ;(part(host, 'trigger') as HTMLElement).click()
    await idle()
    return { host, picker: part(host, 'picker') as HTMLElement }
  }

  const shown = (picker: HTMLElement): number =>
    picker.shadowRoot?.querySelectorAll('[part~="month"]').length ?? 0

  run('shows every month where there is room', async () => {
    const { picker } = await opened()
    expect(shown(picker)).toBe(4)
  })

  run('shows one at 390, inside the window in either direction', async () => {
    for (const dir of ['ltr', 'rtl']) {
      document.documentElement.dir = dir
      /* An `EventTarget`, because the page listens on the real one. */
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: Object.assign(new EventTarget(), {
          height: innerHeight,
          offsetLeft: 0,
          offsetTop: 0,
          pageLeft: 0,
          pageTop: 0,
          scale: 1,
          width: 390,
        }),
      })
      const { host, picker } = await opened()
      expect(shown(picker)).toBe(1)
      const box = (part(host, 'surface') as HTMLElement).getBoundingClientRect()
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(390)
    }
  })

  /* A caret is physical and the month it moves to is not: the earlier month's
     control is at the inline start, the right here, and points there, as
     Pagination's and Carousel's do. */
  run('on a right-to-left page the earlier month is on the right and points right', async () => {
    document.documentElement.dir = 'rtl'
    const { picker } = await opened()
    const previous = part(picker, 'previous') as HTMLElement
    const next = part(picker, 'next') as HTMLElement
    expect(previous.getBoundingClientRect().left).toBeGreaterThan(next.getBoundingClientRect().left)
    expect(getComputedStyle(previous.querySelector('svg') as Element).scale).toBe('-1 1')
    expect(getComputedStyle(next.querySelector('svg') as Element).scale).toBe('-1 1')
  })
})
