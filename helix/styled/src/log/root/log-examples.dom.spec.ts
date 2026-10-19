import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import levels from '../.examples/levels.html' with { type: 'text' }
import search from '../.examples/search.html' with { type: 'text' }
import vercel from '../.examples/vercel.html' with { type: 'text' }
import written from '../.examples/written.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../flex/index.js')
  await import('../../input/index.js')
  await import('../../option/index.js')
  await import('../../select/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

type Log = Updatable & {
  level?: string | undefined
  lines: readonly { count?: number; level?: string; text: string }[]
  query: string
}

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

describe('the levels example', () => {
  run(
    'folds each repeat into one line, and the select picks the quietest level shown',
    async () => {
      await example(levels)
      const element = log()
      await settle(element)
      expect(element.lines.map((line) => line.count ?? 1)).toEqual([1, 1, 3, 2, 1, 1, 1, 1])
      const shown = (): number =>
        element.shadowRoot?.querySelectorAll('[part="row"] > helix-log-line').length ?? 0
      expect(shown()).toBe(6)
      const select = document.getElementById('level') as Updatable & { value: string }
      select.value = 'error'
      select.dispatchEvent(new Event('change', { bubbles: true }))
      await settle(element)
      expect(element.level).toBe('error')
      expect(shown()).toBe(1)
    },
  )
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

describe('the vercel example', () => {
  run('reads each phase as a step, timed from its lines, and its warning apart', async () => {
    await example(vercel)
    await settle(log())
    const groups = [...(log().shadowRoot?.querySelectorAll('[part="row"] > helix-log-group') ?? [])]
    expect(
      groups.map((group) => [group.getAttribute('heading'), group.getAttribute('duration')]),
    ).toEqual([
      ['vercel build', '1s'],
      ['install command', '32s'],
      ['next build', '1m 46s'],
      ['Deploying outputs', '7s'],
    ])
    expect(log().lines.find((line) => line.level === 'warn')?.text).toContain('Detected "engines"')
  })
})
