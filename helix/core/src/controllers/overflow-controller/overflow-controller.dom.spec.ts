import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * A row of six 40 pixel items with 4 pixel gaps and a 20 pixel button, as
 * Editor's toolbar folds its tools from the end. The row's width is
 * computed, so the search is held without layout: Editor's and Navigation's
 * own specs hold the fold against real boxes in Chromium and WebKit.
 */
type Row = HTMLElement & {
  applied: number[]
  fold: { measure: () => void; request: () => void; step: number }
  room: number
  updateComplete: Promise<boolean>
}

const COUNT = 6

/** The width the row takes with `step` items folded. */
const needs = (step: number): number => {
  const shown = COUNT - step
  return shown * 40 + Math.max(0, shown - 1) * 4 + (step > 0 ? 24 : 0)
}

beforeAll(async () => {
  registerDom()
  const { LitElement, html } = await import('lit')
  const { OverflowController } = await import('./overflow-controller.js')
  class TestRow extends LitElement {
    applied: number[] = []
    room = 1000
    /** The step last written, which `fits` reads as a box would show it. */
    private written = 0
    fold = new OverflowController(this, {
      apply: (step) => {
        this.written = step
        this.applied.push(step)
      },
      box: () => this.renderRoot.querySelector<HTMLElement>('#row'),
      fits: () => needs(this.written) <= this.room,
      steps: () => COUNT,
    })
    override render() {
      return html`<div id="row"></div>`
    }
  }
  customElements.define('test-overflow-row', TestRow)
})

const row = async (room: number): Promise<Row> => {
  document.body.innerHTML = '<test-overflow-row></test-overflow-row>'
  const element = document.body.firstElementChild as Row
  element.room = room
  await element.updateComplete
  /* `ready` resolves in a microtask, and the first render after it measures. */
  await Promise.resolve()
  element.fold.measure()
  return element
}

describe('the overflow controller', () => {
  test('folds nothing where the row fits', async () => {
    const element = await row(1000)
    expect(element.fold.step).toBe(0)
  })

  test('keeps the least folded step that fits', async () => {
    /* Two items, their gap, and the button are 128 of 130; three are 172. */
    const element = await row(130)
    expect(element.fold.step).toBe(4)
    expect(element.applied.at(-1)).toBe(4)
  })

  test('folds every item where none fits beside the button', async () => {
    const element = await row(10)
    expect(element.fold.step).toBe(COUNT)
  })

  test('searches from the step on the page, one step at a time, in either direction', async () => {
    const element = await row(130)
    element.applied = []
    element.room = 1000
    element.fold.measure()
    expect(element.fold.step).toBe(0)
    element.applied = []
    element.room = 180
    element.fold.measure()
    /* Three items, their gaps, and the button are 172 of 180. */
    expect(element.fold.step).toBe(3)
    /* Up from 0 a step at a time, and the chosen step written last. */
    expect(element.applied).toEqual([0, 1, 2, 3, 3])
  })

  test('reads the layout twice where nothing changed', async () => {
    const element = await row(130)
    element.applied = []
    element.fold.measure()
    expect(element.applied).toEqual([4, 3, 4])
  })
})
