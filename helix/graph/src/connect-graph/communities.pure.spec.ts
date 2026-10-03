import { describe, expect, test } from 'bun:test'
import { communitiesOf, groupByCommunity } from './communities.js'

/** Two rings of five, joined by one link, and a loose note. */
const ring = (prefix: string) =>
  [0, 1, 2, 3, 4].map((at) => ({ source: `${prefix}${at}`, target: `${prefix}${(at + 1) % 5}` }))
const ids = [
  ...[0, 1, 2, 3, 4].map((at) => `a${at}`),
  ...[0, 1, 2, 3, 4].map((at) => `b${at}`),
  'loose',
]
const links = [
  ...ring('a'),
  ...ring('b'),
  { source: 'a0', target: 'b0' },
  /* The rings' hubs: one more link each, inside their own ring. */
  { source: 'a2', target: 'a4' },
  { source: 'b3', target: 'b1' },
]

describe('communitiesOf', () => {
  test('finds the two rings the links form, and leaves a loose note to itself', () => {
    const found = communitiesOf(ids, links)
    const a = found.get('a0')
    const b = found.get('b0')
    expect(a).not.toBe(b)
    expect(['a1', 'a2', 'a3', 'a4'].every((id) => found.get(id) === a)).toBe(true)
    expect(['b1', 'b2', 'b3', 'b4'].every((id) => found.get(id) === b)).toBe(true)
    expect(found.get('loose')).not.toBe(a)
    expect(found.get('loose')).not.toBe(b)
  })

  test('the same communities on every call, whatever the links’ direction', () => {
    const reversed = links.map(({ source, target }) => ({ source: target, target: source }))
    expect([...communitiesOf(ids, reversed)]).toEqual([...communitiesOf(ids, links)])
  })

  test('recovers clusters that link mostly within themselves', () => {
    /* Six clusters of forty, each note linked to three in its own cluster
       and now and then to one in another, from a fixed seed. */
    let seed = 11
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    const notes: string[] = []
    const between: { source: string; target: string }[] = []
    for (let cluster = 0; cluster < 6; cluster++) {
      for (let at = 0; at < 40; at++) {
        notes.push(`${cluster}-${at}`)
      }
    }
    for (const id of notes) {
      const [cluster] = id.split('-')
      for (let step = 0; step < 3; step++) {
        between.push({ source: id, target: `${cluster}-${Math.floor(random() * 40)}` })
      }
      if (random() < 0.1) {
        between.push({
          source: id,
          target: `${Math.floor(random() * 6)}-${Math.floor(random() * 40)}`,
        })
      }
    }
    const found = communitiesOf(notes, between)
    /* Each cluster lands in one community, and no two share one. */
    const of = [0, 1, 2, 3, 4, 5].map((cluster) => {
      const counts = new Map<number, number>()
      for (let at = 0; at < 40; at++) {
        const community = found.get(`${cluster}-${at}`) as number
        counts.set(community, (counts.get(community) ?? 0) + 1)
      }
      return [...counts].sort((one, other) => other[1] - one[1])[0] as [number, number]
    })
    expect(of.every(([, count]) => count >= 36)).toBe(true)
    expect(new Set(of.map(([community]) => community)).size).toBe(6)
  })
})

describe('groupByCommunity', () => {
  const nodes = ids.map((id) => ({ id, label: id.toUpperCase() }))

  test('names each community after its most linked note, and gathers the small ones', () => {
    const grouped = groupByCommunity(nodes, links)
    const groupOf = (id: string) => grouped.find((node) => node.id === id)?.group
    /* a0, a2 and a4 have three links each, and a0 comes first. */
    expect(groupOf('a3')).toBe('A0')
    expect(groupOf('b2')).toBe('B0')
    expect(groupOf('loose')).toBe('Other')
  })

  test('keeps a group a note was given, and never names a community the same', () => {
    const given = nodes.map((node) => (node.id === 'b4' ? { ...node, group: 'A0' } : node))
    const grouped = groupByCommunity(given, links, { fewest: 1, rest: 'Loose' })
    expect(grouped.find((node) => node.id === 'b4')?.group).toBe('A0')
    expect(grouped.find((node) => node.id === 'a3')?.group).toBe('A0 2')
    expect(grouped.find((node) => node.id === 'loose')?.group).toBe('LOOSE')
  })
})
