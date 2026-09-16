import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import controlled from '../.examples/controlled.html' with { type: 'text' }
import events from '../.examples/events.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const press = (tab: Element | null): void => {
  ;(part(tab as HTMLElement, 'tab') as HTMLElement | null)?.click()
}

describe('the events example', () => {
  run('pressing a tab asks to activate it, then selects it', async () => {
    await example(events)
    press(document.querySelector('helix-tab[value="billing"]'))
    await idle()
    expect(logged()).toEqual(['helix-before-activate', 'helix-select'])
    expect((document.getElementById('strip') as HTMLElement & { active: string }).active).toBe(
      'billing',
    )
  })
})

describe('the controlled example', () => {
  run('a press asks, and the page moves the tab it holds', async () => {
    await example(controlled)
    press(document.querySelector('helix-tab[value="overview"]'))
    await idle()
    expect((document.getElementById('strip') as HTMLElement & { active: string }).active).toBe(
      'overview',
    )
    /* **And the panel followed, which is the half that was not asserted.** The
       root pairs a tab with a panel by walking its own children, so a panel
       wrapped in anything is assigned to the slot and paired with nothing: two
       of these examples shipped their panels inside a `<div slot="panels">` and
       showed a strip of tabs over an empty box, for the life of the page, with
       `active` moving correctly the whole time. Reading `active` alone is what
       let that stand. */
    const panel = document.querySelector('helix-tab-panel[value="overview"]') as HTMLElement & {
      selected: boolean
    }
    expect(panel.selected).toBe(true)
  })
})
