import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import large from '../.examples/large.html' with { type: 'text' }
import live from '../.examples/live.html' with { type: 'text' }
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
    const graph = document.querySelector('helix-graph') as unknown as HTMLElement & {
      active: string
    }
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

describe('the live example', () => {
  run('gives the frame five subjects of notes, linked mostly within each', async () => {
    await example(live)
    await idle()
    const graph = document.querySelector('helix-graph') as unknown as HTMLElement & {
      links: { source: string; target: string }[]
      nodes: { group: string; id: string }[]
    }
    expect(graph.nodes).toHaveLength(195)
    expect(new Set(graph.nodes.map((node) => node.group)).size).toBe(5)
    const group = new Map(graph.nodes.map((node) => [node.id, node.group]))
    const within = graph.links.filter((link) => group.get(link.source) === group.get(link.target))
    expect(within.length / graph.links.length).toBeGreaterThan(0.85)
    expect(part(graph, 'count')?.textContent).toBe('195 notes')
  })
})

describe('the large example', () => {
  run(
    'gives the frame twenty thousand notes in twelve subjects, each with eight hubs',
    async () => {
      await example(large)
      await idle()
      const graph = document.querySelector('helix-graph') as unknown as HTMLElement & {
        links: { source: string; target: string }[]
        nodes: { group: string; id: string; shape?: string }[]
      }
      expect(graph.nodes).toHaveLength(19992)
      expect(new Set(graph.nodes.map((node) => node.group)).size).toBe(12)
      expect(graph.nodes.filter((node) => node.shape === 'square')).toHaveLength(96)
      const group = new Map(graph.nodes.map((node) => [node.id, node.group]))
      const within = graph.links.filter((link) => group.get(link.source) === group.get(link.target))
      expect(within.length / graph.links.length).toBeGreaterThan(0.95)
      expect(part(graph, 'count')?.textContent).toBe('19,992 notes')
    },
  )

  run('passes messages along its links, ten a second', async () => {
    await example(large)
    await idle()
    const graph = document.querySelector('helix-graph') as unknown as HTMLElement & {
      links: { source: string; target: string }[]
    }
    const keys = new Set(graph.links.map((link) => `${link.source}\u0000${link.target}`))
    const sent: { from: string; to: string }[] = []
    graph.addEventListener('helix-graph-signal', (event) => {
      sent.push((event as CustomEvent<{ from: string; to: string }>).detail)
    })
    await new Promise((done) => setTimeout(done, 450))
    expect(sent.length).toBeGreaterThanOrEqual(3)
    expect(sent.every((one) => keys.has(`${one.from}\u0000${one.to}`))).toBe(true)
  })
})
