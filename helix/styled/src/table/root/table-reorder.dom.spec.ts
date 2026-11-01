import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import reordering from '../.examples/reordering.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheets as text. happy-dom resolves no cascade, so what can be held
   here is that a rule exists rather than that it applied: the grip column's
   place and the line where a row lands are measured in Chromium. */
const sheet = (tag: 'helix-table' | 'helix-table-row'): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (tag: 'helix-table' | 'helix-table-row', selector: string): string =>
  sheet(tag).split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('a reorderable table', () => {
  test('draws the grip cell and its heading as the checkbox column is drawn', () => {
    const cell = rule('helix-table-row', '[part~="grip"]')
    expect(cell).toContain(
      'border-block-end: var(--helix-border-thin) solid var(--helix-color-border)',
    )
    expect(cell).toContain('min-block-size: var(--helix-size-control)')
    expect(rule('helix-table', '[part="grip-head"]')).toContain(
      'min-block-size: var(--helix-size-control-loose)',
    )
  })

  test('keeps the grip quiet, says when it does nothing, and keeps a drag on a phone from scrolling', () => {
    const grip = rule('helix-table-row', '[part="grip-button"]')
    expect(grip.trim().startsWith('all: unset')).toBe(true)
    expect(grip).toContain('var(--table-grip-color, var(--helix-color-foreground-muted))')
    expect(grip).toContain('touch-action: none')
    expect(rule('helix-table-row', '[part="grip-button"][aria-disabled="true"]')).toContain(
      'opacity: var(--table-grip-disabled-opacity, var(--helix-opacity-disabled))',
    )
  })

  test('fades the row being moved and draws a line on every cell where it lands', () => {
    const rows = sheet('helix-table-row')
    expect(rows).toContain(
      ':host(:state(dragging)) ::slotted(*) {opacity: var(--table-dragging-opacity, 0.5)',
    )
    expect(rows).toContain(
      ':host(:state(drop-before)) ::slotted(*) {box-shadow: inset 0 var(--table-drop-indicator-size, var(--helix-border-thick)) 0 0',
    )
    expect(rows).toContain(':host(:state(drop-after)) ::slotted(*) {box-shadow: inset 0 calc(')
  })

  test('draws the grips and says each step in the styled tier too', async () => {
    const host = (await mount(`<helix-table label="Queue" reorderable>
      <helix-table-column>Name</helix-table-column>
      <helix-table-row value="a"><helix-table-cell>One</helix-table-cell></helix-table-row>
      <helix-table-row value="b"><helix-table-cell>Two</helix-table-cell></helix-table-row>
    </helix-table>`)) as HTMLElement & { updateComplete: Promise<unknown> }
    const rows = [...host.querySelectorAll('helix-table-row')] as (HTMLElement & {
      updateComplete: Promise<unknown>
    })[]
    for (let round = 0; round < 3; round += 1) {
      await new Promise((done) => setTimeout(done, 0))
      await host.updateComplete
      await Promise.all(rows.map((row) => row.updateComplete))
    }
    const grip = part(rows[0] as HTMLElement, 'grip-button') as HTMLElement
    expect(grip.getAttribute('aria-label')).toBe('Move One')
    grip.click()
    await host.updateComplete
    expect(part(host, 'live')?.textContent?.trim()).toBe('Picked up One')
    host.remove()
  })
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the reordering example', () => {
  run(
    'a click picks up the first document, Down moves it, and a second click drops it there',
    async () => {
      await example(reordering)
      await idle()
      const queue = document.getElementById('queue') as HTMLElement
      const rows = (): HTMLElement[] => [...queue.querySelectorAll<HTMLElement>('helix-table-row')]
      const grip = part(rows()[0] as HTMLElement, 'grip-button') as HTMLElement
      grip.click()
      grip.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: 'ArrowDown',
        }),
      )
      grip.click()
      await idle()
      expect(rows().map((row) => row.getAttribute('value'))).toEqual([
        'brochure',
        'report',
        'contract',
      ])
    },
  )
})

describe('the drag preview of a reorderable table', () => {
  /* The copy a pointer drags is drawn in the table's own shadow root, so its
     sheet gives it its look. Nothing in it is animated, so it follows the
     pointer the same way whatever the reader's motion setting. */
  test('raises the copy over the page through the family hooks', () => {
    const preview = sheet('helix-table').split('[part="drag-preview"] {')[1]?.split('}')[0] ?? ''
    expect(preview).toContain(
      'background-color: var(--table-drag-preview-background-color, var(--helix-color-surface-raised))',
    )
    expect(preview).toContain(
      'border: var(--table-drag-preview-border-width, var(--helix-border-floating)) solid',
    )
    expect(preview).toContain(
      'border-radius: var(--table-drag-preview-radius, var(--helix-radii-sm))',
    )
    expect(preview).toContain(
      'box-shadow: var(--table-drag-preview-shadow, var(--helix-shadow-floating))',
    )
    expect(preview).toContain('opacity: var(--table-drag-preview-opacity, 0.9)')
    expect(preview).not.toContain('transition')
  })
})
