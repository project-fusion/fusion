import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const names = (graph: HTMLElement): string[] =>
  [...(graph.shadowRoot?.querySelectorAll('[part~="note-name"]') ?? [])].map(
    (name) => name.textContent ?? '',
  )

describe('the preview example', () => {
  run('opens on the selected note, with its links and backlinks under it', async () => {
    await example(preview)
    await idle()
    const graph = document.querySelector('helix-graph') as HTMLElement
    expect(names(graph).slice(0, 4)).toEqual([
      'Pricing',
      'Budget',
      'Churn review',
      'Plans and tiers',
    ])
  })

  run('a press on a note selects it and puts it first', async () => {
    await example(preview)
    await idle()
    const graph = document.querySelector('helix-graph') as HTMLElement & { active: string }
    const row = [
      ...(graph.shadowRoot?.querySelectorAll<HTMLElement>('[role="option"]') ?? []),
    ].find((option) => option.textContent?.includes('Churn review'))
    row?.click()
    await idle()
    expect(graph.active).toBe('churn')
    expect(names(graph)[0]).toBe('Churn review')
    expect(part(graph, 'count')?.textContent).toBe('8 notes')
  })
})
