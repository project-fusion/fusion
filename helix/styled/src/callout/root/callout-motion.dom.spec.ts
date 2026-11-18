import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: the fold is measured from layout. */
const run = hasLayout() ? test : (): void => {}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('a dismissed callout', () => {
  run('folds its height and the gap after it, so what follows rises into place', async () => {
    const column = await mount(`<div style="display: flex; flex-direction: column; gap: 12px">
      <helix-callout dismissible>The release ships Tuesday.</helix-callout>
      <p>After</p>
    </div>`)
    const note = column.querySelector('helix-callout') as HTMLElement
    const after = column.querySelector('p') as HTMLElement
    await wait(50)
    const height = note.getBoundingClientRect().height
    ;(part(note, 'dismiss') as HTMLElement).click()
    await wait(0)
    expect(note.style.getPropertyValue('--_callout-block-size')).toBe(`${height}px`)
    expect(note.style.getPropertyValue('--_callout-fold-end')).toBe('-12px')
    const top = after.getBoundingClientRect().top
    await wait(1000)
    expect(note.hidden).toBe(true)
    expect(after.getBoundingClientRect().top).toBeLessThan(top)
  })
})
