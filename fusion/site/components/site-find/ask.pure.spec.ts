import { describe, expect, test } from 'bun:test'
import { type AskFact, askHits, askOnPath, askRest } from './ask'

const fact = (one: AskFact): AskFact => one

const button = fact({
  detail: 'Moves between pages.',
  href: '/helix/components/button',
  id: 'component:button',
  kind: 'component',
  label: 'Button',
  mark: 'helix-button',
  sandbox: '/helix/sandbox?e=button',
  terms: 'button helix-button',
})

const install = fact({
  detail: 'bun add @fusion.dev/helix',
  href: '/helix/docs/installation',
  id: 'install',
  kind: 'install',
  label: 'Install Helix',
  terms: 'install installation bun add package bun add @fusion.dev/helix',
})

const manifest = fact({
  detail: 'Every tag @fusion.dev/helix ships.',
  href: '/helix/custom-elements.json',
  id: 'manifest',
  kind: 'manifest',
  label: 'Custom elements manifest',
  terms: 'manifest cem custom-elements.json tag tags api',
})

const catalog = fact({
  detail: 'Families, tags, properties, and events.',
  href: '/helix/api.json',
  id: 'catalog',
  kind: 'manifest',
  label: 'Component catalog',
  terms: 'catalog api.json families tags properties events',
})

const contrast = fact({
  detail: 'Target contrast for body text. 4.5 is WCAG AA, and 7 is AAA. The default is 4.5.',
  href: '/helix/docs/intent-reference',
  id: 'contrast-target',
  kind: 'contrast',
  label: 'Contrast target',
  terms: 'contrast target wcag aa aaa grade 4.5 7 theme',
})

const results = fact({
  detail: 'Met, unverifiable, or pinned.',
  href: '/helix/theme',
  id: 'contrast-results',
  kind: 'contrast',
  label: 'Contrast results',
  terms: 'contrast met unverifiable pinned theme',
})

const sandbox = fact({
  detail: 'Edit an example and see the result beside it.',
  href: '/helix/sandbox',
  id: 'doc:/helix/sandbox',
  kind: 'doc',
  label: 'Sandbox',
  terms: 'sandbox workbench example',
})

const filler = (n: number): AskFact => ({
  detail: 'A component.',
  href: `/helix/components/filler-${n}`,
  id: `component:filler-${n}`,
  kind: 'component',
  label: `Filler ${n}`,
  mark: `helix-filler-${n}`,
  terms: `filler-${n} helix-filler-${n}`,
})

const corpus: AskFact[] = [
  install,
  manifest,
  catalog,
  contrast,
  results,
  sandbox,
  button,
  ...Array.from({ length: 24 }, (_, index) => filler(index)),
]

describe('askOnPath', () => {
  test('offers Ask on the docs, the reference, the sandbox, and the theme builder', () => {
    expect(askOnPath('/helix/docs')).toBe(true)
    expect(askOnPath('/helix/docs/installation')).toBe(true)
    expect(askOnPath('/helix/components')).toBe(true)
    expect(askOnPath('/helix/components/button')).toBe(true)
    expect(askOnPath('/helix/sandbox')).toBe(true)
    expect(askOnPath('/helix/theme')).toBe(true)
  })

  test('leaves the marketing pages on plain search', () => {
    expect(askOnPath('/')).toBe(false)
    expect(askOnPath('/helix')).toBe(false)
    expect(askOnPath('/cortex')).toBe(false)
    expect(askOnPath('/insights')).toBe(false)
    expect(askOnPath('/helix/aura')).toBe(false)
  })
})

describe('askHits', () => {
  test('an empty question shows the starter rows', () => {
    expect(askHits(corpus, '')).toEqual(askRest(corpus))
    expect(askHits(corpus, 'how do I').map((hit) => hit.id)).toEqual([
      'install',
      'manifest',
      'catalog',
      'contrast-target',
      'contrast-results',
    ])
  })

  test('a question about installing ranks the install command first', () => {
    const hits = askHits(corpus, 'how do I install helix')
    expect(hits[0]).toMatchObject({
      detail: 'bun add @fusion.dev/helix',
      href: '/helix/docs/installation',
      id: 'install',
    })
  })

  test('a tag ranks the component that publishes it', () => {
    const hits = askHits(corpus, 'helix-button')
    expect(hits[0]).toMatchObject({ id: 'component:button', mark: 'helix-button' })
  })

  test('a question about the tag for a component names that tag', () => {
    const hits = askHits(corpus, 'what is the tag for button')
    expect(hits[0]?.id).toBe('component:button')
    expect(hits[0]?.mark).toBe('helix-button')
  })

  test('a contrast question ranks the published target', () => {
    const hits = askHits(corpus, 'what contrast target is WCAG AA')
    expect(hits[0]?.id).toBe('contrast-target')
    expect(hits[0]?.detail).toContain('4.5')
    expect(hits[0]?.detail).toContain('7')
    expect(hits[0]?.href).toBe('/helix/docs/intent-reference')
  })

  test('sandbox ranks the sandbox page and not every component', () => {
    const hits = askHits(corpus, 'sandbox')
    expect(hits[0]?.href).toBe('/helix/sandbox')
    expect(hits.some((hit) => hit.id.startsWith('component:filler'))).toBe(false)
  })

  test('the catalog prefix alone does not list the catalog', () => {
    expect(askHits(corpus, 'helix')).toEqual(askRest(corpus))
  })

  test('an unknown api is empty', () => {
    expect(askHits(corpus, 'glow')).toEqual([])
    const hits = askHits(corpus, 'make the button glow')
    expect(hits.some((hit) => hit.detail.toLowerCase().includes('glow'))).toBe(false)
    expect(hits.some((hit) => hit.id === 'component:button')).toBe(true)
  })
})
