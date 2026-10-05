import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, logged, part, registerDom } from '@fusion.dev/helix-testing/dom'
import events from '../.examples/events.html' with { type: 'text' }
import group from '../.examples/group.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../list/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the events example', () => {
  run('the close control asks, and asking is not removing', async () => {
    await example(events)
    const infra = [...document.querySelectorAll('helix-tag')][1] as HTMLElement
    ;(part(infra, 'dismiss') as HTMLElement).click()
    await idle()
    expect(logged()).toEqual(['helix-dismiss'])
    expect(document.querySelectorAll('helix-tag')).toHaveLength(3)
  })
})

describe('the group example', () => {
  /* Delete sends the focused tag's dismiss, the page's handler removes it, and
     focus stays in the group on the next tag. */
  run('Delete removes the focused tag, and focus moves to the next one', async () => {
    await example(group)
    const open = document.querySelector('helix-tag') as HTMLElement
    ;(part(open, 'cell') as HTMLElement).focus()
    open.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Delete' }))
    await idle()
    expect(document.querySelectorAll('helix-tag')).toHaveLength(3)
    expect(document.activeElement?.textContent?.trim()).toBe('Assigned to me')
  })
})
