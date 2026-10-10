import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import search from '../.examples/search.html' with { type: 'text' }
import written from '../.examples/written.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../flex/index.js')
  await import('../../input/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

type Log = Updatable & { lines: readonly { level?: string; text: string }[]; query: string }

const log = (): Log => document.querySelector('helix-log') as Log

describe('the written example', () => {
  run(
    'writes the run, one line for the progress bar, with the steps read off the markers',
    async () => {
      await example(written)
      await settle(log())
      const lines = log().lines.map((line) => line.text)
      expect(lines.filter((text) => text.includes('Downloading'))).toEqual(['Downloading 100%'])
      expect(lines.some((text) => text.startsWith('::'))).toBe(false)
      expect(log().lines.find((line) => line.level === 'error')?.text).toBe(
        'expected the label "Save changes" to stay on one line',
      )
      const groups = log().shadowRoot?.querySelectorAll('[part="row"] > helix-log-group') ?? []
      expect([...groups].map((group) => group.getAttribute('status'))).toEqual(['done', 'failed'])
    },
  )

  run('starts the run over when the button is pressed', async () => {
    await example(written)
    const element = log() as Log & { done: boolean }
    expect(element.lines).toHaveLength(9)
    ;(document.getElementById('again') as HTMLElement).click()
    await settle(element)
    expect(element.done).toBe(false)
    expect(element.lines.length).toBeLessThan(9)
  })
})

describe('the search example', () => {
  run('typing in the toolbar shows only the matching lines', async () => {
    await example(search)
    const input = document.getElementById('query') as Updatable
    const field = part(input, 'control') as HTMLInputElement
    field.value = 'checkout'
    field.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
    )
    await settle(log())
    expect(log().query).toBe('checkout')
    const shown = [...log().querySelectorAll('helix-log-line')].filter(
      (line) => part(line as HTMLElement, 'line') !== null,
    )
    expect(shown).toHaveLength(3)
  })
})
