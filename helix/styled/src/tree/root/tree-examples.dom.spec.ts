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

describe('the events example', () => {
  run('pressing a row asks to activate it, then selects it', async () => {
    await example(events)
    const cortex = document.querySelector('helix-tree-item[value="cortex"]') as HTMLElement
    ;(part(cortex, 'row') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-before-activate', 'helix-select'])
  })

  run('and a branch folds from anywhere in its row, asking first', async () => {
    await example(events)
    const helix = document.querySelector('helix-tree-item[value="helix"]') as HTMLElement & {
      open: boolean
    }
    const was = helix.open
    ;(part(helix, 'row') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual([was ? 'helix-before-close' : 'helix-before-open', 'toggle'])
  })
})

describe('the controlled example', () => {
  run('a press asks, and the page decides where the tree stands', async () => {
    await example(controlled)
    const tree = document.querySelector('helix-tree') as HTMLElement & { active: string }
    const before = tree.active
    const rows = [...document.querySelectorAll<HTMLElement>('helix-tree-item')]
    const other = rows.find((one) => one.getAttribute('value') !== before)
    ;(part(other as HTMLElement, 'row') as HTMLElement).click()
    await idle()
    expect(tree.active).toBe(other?.getAttribute('value') ?? '')
  })
})
