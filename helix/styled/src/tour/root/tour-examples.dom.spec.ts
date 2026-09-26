import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import nested from '../.examples/inside-a-menu-and-drawer.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import progress from '../.examples/with-actions.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
  await import('../../button/index.js')
  await import('../../menu/index.js')
  await import('../../drawer/index.js')
  await import('../../text/index.js')
  await import('../../switch/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

type Tour = HTMLElement & { index: number; length: number; open: boolean }
const tour = (): Tour => document.querySelector('helix-tour') as Tour
const stop = (): HTMLElement =>
  [...document.querySelectorAll<HTMLElement>('helix-tour-stop')][tour().index] as HTMLElement
const press = (name: string): void => {
  const control = part(stop(), name) as HTMLElement | null
  ;((control?.shadowRoot?.querySelector('button') ?? control) as HTMLElement | null)?.click()
}
const begin = async (): Promise<void> => {
  const button = document.getElementById('begin') as HTMLElement
  ;((button.shadowRoot?.querySelector('button') ?? button) as HTMLElement).click()
  await idle()
}

describe('the events example', () => {
  /* The tour hears the ask before the page does, on the same element and
     registered first, which is why the ask is not cancelable and the veto is
     \`helix-before-activate\`: the page is asked about the move before it
     hears the stop's request. */
  run('a stop asks the tour to move, and the page is asked about the move first', async () => {
    await example(events)
    press('next')
    await idle()
    expect(logged()).toEqual(['helix-before-activate', 'helix-tour-ask'])
    expect(tour().index).toBe(1)
  })
})

describe('the preview example', () => {
  run('beginning opens it at the first stop, and next moves it on', async () => {
    await example(preview)
    await begin()
    expect(tour().open).toBe(true)
    expect(tour().index).toBe(0)
    press('next')
    await idle()
    expect(tour().index).toBe(1)
  })
})

describe('the nested example', () => {
  run('each stop opens what it points into, and closes what it left', async () => {
    await example(nested)
    await begin()
    press('next')
    await idle()
    expect((document.getElementById('actions') as HTMLElement & { open: boolean }).open).toBe(true)
    press('next')
    await idle()
    expect((document.getElementById('actions') as HTMLElement & { open: boolean }).open).toBe(false)
    expect((document.getElementById('settings') as HTMLElement & { open: boolean }).open).toBe(true)
  })
})

describe('the progress example', () => {
  run('the count says where the reader is, and follows them', async () => {
    await example(progress)
    await begin()
    const count = (): string => stop().querySelector('.count')?.textContent?.trim() ?? ''
    expect(count()).toBe(`1 of ${tour().length}`)
    press('next')
    await idle()
    expect(count()).toBe(`2 of ${tour().length}`)
  })
})
