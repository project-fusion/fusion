import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, notYetDefined, part, registerDom } from '@fusion.dev/helix-testing/dom'

/*
 * A real Sigma drawing in WebGL, in a browser that has it: the scene follows
 * the frame's selection and its keys. happy-dom has no WebGL, so these run in
 * the browser only (`bun run specs:browser graph`).
 */
const webgl2 = hasLayout() && document.createElement('canvas').getContext('webgl2') !== null
const scene = webgl2 ? test : (): void => {}

/* **A skipped spec is an absence in the browser run**, which reports passes and
   failures and nothing else, so a browser with no WebGL 2 would drop every spec
   below without a word. In a browser the missing context is a failure that
   names itself. */
if (hasLayout()) {
  test('the browser draws in WebGL 2, so every spec on a Sigma drawing runs', () => {
    expect(webgl2).toBe(true)
  })
}

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/graph')
})

type Frame = HTMLElement & {
  active: string
  links: { source: string; target: string }[]
  nodes: { id: string; label: string; x: number; y: number }[]
  ready: boolean
}

/** What each spec made, taken down after it. */
const made: (() => void)[] = []
afterEach(() => {
  for (const undo of made.splice(0)) {
    undo()
  }
})

/**
 * The tokens the connector colors the drawing from, on the frame itself, so
 * it is drawn whichever stylesheet the runner loads.
 */
const TOKENS = [
  '--helix-color-accent: rgb(120, 60, 200)',
  '--helix-color-danger: rgb(200, 40, 40)',
  '--helix-color-surface-sunken: rgb(242, 242, 242)',
  '--helix-color-info: rgb(40, 120, 200)',
  '--helix-color-foreground: rgb(20, 20, 20)',
  '--helix-color-border: rgb(200, 200, 200)',
  '--helix-color-foreground-muted: rgb(100, 100, 100)',
  '--helix-color-surface-overlay: rgb(255, 255, 255)',
  '--helix-color-primary: rgb(30, 90, 220)',
  '--helix-color-success: rgb(30, 150, 80)',
  '--helix-color-warning: rgb(220, 150, 20)',
  '--helix-color-series-1: rgb(230, 80, 30)',
  '--helix-color-series-2: rgb(30, 130, 200)',
].join('; ')

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

const key = (target: Element, name: string): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, key: name }))
}

/** A frame drawn by Sigma, with five placed notes so no layout runs, once it is ready. */
const drawn = async () => {
  const [
    { default: Sigma },
    { default: Graph },
    { connectGraph },
    { sigmaDriver },
    { sigmaOptions },
  ] = await Promise.all([
    import('sigma'),
    import('graphology'),
    import('../connect-graph/connect-graph.js'),
    import('./sigma-driver.js'),
    import('./sigma-options.js'),
  ])
  const host = (await mount(
    `<helix-headless-graph label="Notes" style="display: block; inline-size: 640px; ${TOKENS}"><div style="block-size: 360px"></div></helix-headless-graph>`,
  )) as Frame
  host.nodes = [
    { id: 'a', label: 'Alpha', x: 0, y: 0 },
    { id: 'b', label: 'Bravo', x: 30, y: 4 },
    { id: 'c', label: 'Charlie', x: -6, y: 34 },
    { id: 'd', label: 'Delta', x: 120, y: 90 },
    { id: 'e', label: 'Echo', x: -110, y: 100 },
  ]
  host.links = [
    { source: 'a', target: 'b' },
    { source: 'c', target: 'a' },
    { source: 'd', target: 'e' },
  ]
  const box = host.querySelector('div') as HTMLElement
  const sigma = new Sigma(new Graph(), box, sigmaOptions())
  const connection = connectGraph(host, sigmaDriver(sigma))
  made.push(() => {
    connection.disconnect()
    sigma.kill()
    host.remove()
  })
  for (let tries = 0; tries < 60 && !host.ready; tries++) {
    await wait(50)
  }
  /** Where a note is drawn, in pixels from the box's corner. */
  const at = (id: string): { x: number; y: number } =>
    sigma.framedGraphToViewport(sigma.getNodeDisplayData(id) as { x: number; y: number })
  /** How strongly each note glows as drawn: the selected note's ring. */
  const glow = (): Record<string, unknown> =>
    Object.fromEntries(
      ['a', 'b', 'c', 'd', 'e'].map((id) => [
        id,
        (sigma.getNodeDisplayData(id) as { glow?: number } | undefined)?.glow,
      ]),
    )
  return { at, box, glow, host }
}

describe('a Sigma drawing in WebGL', () => {
  scene('frames the note chosen in the list with its neighbor, and rings it alone', async () => {
    const { at, box, glow, host } = await drawn()
    expect(host.ready).toBe(true)
    expect(glow()).toEqual({ a: 0, b: 0, c: 0, d: 0, e: 0 })
    const list = part(host, 'list') as HTMLElement
    key(list, 'ArrowDown')
    key(list, 'ArrowDown')
    key(list, 'Enter')
    await wait(800)
    expect(host.active).toBe('c')
    expect(glow()).toEqual({ a: 0, b: 0, c: 1, d: 0, e: 0 })
    /* Charlie and Alpha, the note it links to, about the middle of the view. */
    const middle = {
      x: (at('a').x + at('c').x) / 2 - box.clientWidth / 2,
      y: (at('a').y + at('c').y) / 2 - box.clientHeight / 2,
    }
    expect(Math.abs(middle.x)).toBeLessThan(2)
    expect(Math.abs(middle.y)).toBeLessThan(2)
  })

  scene(
    'moves under the frame’s keys with the ring on its note, and says which way',
    async () => {
      const { at, box, glow, host } = await drawn()
      host.active = 'c'
      await wait(800)
      const region = part(host, 'region') as HTMLElement
      const live = () => part(host, 'live')?.textContent
      const before = at('c')
      key(region, 'ArrowRight')
      await wait(500)
      /* A quarter of the box to the right, so the note is drawn a quarter to the left. */
      expect(Math.round(before.x - at('c').x)).toBe(Math.round(box.clientWidth / 4))
      expect(Math.round(at('c').y - before.y)).toBe(0)
      expect(live()).toBe('Moved right')
      expect(glow()).toEqual({ a: 0, b: 0, c: 1, d: 0, e: 0 })
      const spread = Math.hypot(at('a').x - at('c').x, at('a').y - at('c').y)
      key(region, '=')
      await wait(500)
      expect(live()).toBe('Zoomed in')
      expect(Math.hypot(at('a').x - at('c').x, at('a').y - at('c').y)).toBeGreaterThan(spread * 1.4)
      expect(glow()).toEqual({ a: 0, b: 0, c: 1, d: 0, e: 0 })
      /* **Four seconds, not the runner's two**: the three moves wait 1.8 seconds
       for their animations, and Sigma 4 compiles the shaders it generates as
       it is made, which in CI's software WebGL took the rest. */
    },
    4000,
  )

  /* **As the guide writes it**: the frame is in the page, the import defines
     it, and Sigma is made in its box on the next line, with no await between
     them. Sigma measures the box as it is made and throws on one with no
     width. */
  scene('draws in a box Sigma is given in the same turn the frame is defined', async () => {
    const [
      { default: Sigma },
      { default: Graph },
      { connectGraph },
      { sigmaDriver },
      { sigmaOptions },
    ] = await Promise.all([
      import('sigma'),
      import('graphology'),
      import('../connect-graph/connect-graph.js'),
      import('./sigma-driver.js'),
      import('./sigma-options.js'),
    ])
    const late = notYetDefined('helix-headless-graph')
    const host = late.element as Frame
    host.setAttribute('label', 'Notes')
    host.setAttribute('style', `display: block; inline-size: 640px; ${TOKENS}`)
    host.innerHTML = '<div style="block-size: 360px"></div>'
    document.body.replaceChildren(host)
    late.define()
    host.nodes = [
      { id: 'a', label: 'Alpha', x: 0, y: 0 },
      { id: 'b', label: 'Bravo', x: 30, y: 4 },
    ]
    host.links = [{ source: 'a', target: 'b' }]
    const sigma = new Sigma(new Graph(), host.querySelector('div') as HTMLElement, sigmaOptions())
    const connection = connectGraph(host, sigmaDriver(sigma))
    made.push(() => {
      connection.disconnect()
      sigma.kill()
      host.remove()
    })
    for (let tries = 0; tries < 60 && !host.ready; tries++) {
      await wait(50)
    }
    expect(host.ready).toBe(true)
    expect(sigma.getDimensions()).toEqual({ height: 360, width: 640 })
  })

  scene('a list arrow moves only the list, and leaves the drawing where it is', async () => {
    const { at, glow, host } = await drawn()
    host.active = 'c'
    await wait(800)
    const before = at('c')
    key(part(host, 'list') as HTMLElement, 'ArrowDown')
    await wait(400)
    expect(at('c')).toEqual(before)
    expect(glow()).toEqual({ a: 0, b: 0, c: 1, d: 0, e: 0 })
  })
})
