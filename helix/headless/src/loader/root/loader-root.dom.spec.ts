import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('spinner', () => {
  test('announces itself as outstanding work, without an attribute', async () => {
    // Through internals, so the host carries nothing a consumer's server markup
    // would not have.
    const spinner = await mount('<helix-headless-loader label="Fetching"></helix-headless-loader>')
    expect(role(spinner)).toBe('progressbar')
    expect(spinner.hasAttribute('role')).toBe(false)
    expect(spinner.hasAttribute('aria-label')).toBe(false)
  })

  test('draws a track behind the moving arc', async () => {
    // One circle turning reads as a shape adrift; the track is what makes it a
    // proportion of something.
    const spinner = await mount('<helix-headless-loader></helix-headless-loader>')
    expect(part(spinner, 'track')).not.toBeNull()
    expect(part(spinner, 'indicator')).not.toBeNull()
  })
})

/* sl-spinner and wa-spinner show at once and say nothing about the region they
   stand for. `for` marks that region busy, and `delay` keeps a quick load from
   flashing a loader. */
describe('a loader for a region', () => {
  const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))

  test('marks the region busy while it is on the page, and clears it after', async () => {
    const host = await mount(
      '<div><section id="results"></section><helix-headless-loader for="results"></helix-headless-loader></div>',
    )
    await frame()
    const region = host.querySelector('#results') as HTMLElement
    expect(region.getAttribute('aria-busy')).toBe('true')
    host.querySelector('helix-headless-loader')?.remove()
    expect(region.hasAttribute('aria-busy')).toBe(false)
  })

  test('moves the mark when it names another region', async () => {
    const host = await mount(
      '<div><section id="a"></section><section id="b"></section><helix-headless-loader for="a"></helix-headless-loader></div>',
    )
    await frame()
    const loader = host.querySelector('helix-headless-loader') as HTMLElement & {
      for: string
      updateComplete: Promise<unknown>
    }
    loader.for = 'b'
    await loader.updateComplete
    expect(host.querySelector('#a')?.hasAttribute('aria-busy')).toBe(false)
    expect(host.querySelector('#b')?.getAttribute('aria-busy')).toBe('true')
  })
})

describe('a loader with a delay', () => {
  type Loader = HTMLElement & { internals: ElementInternals; updateComplete: Promise<unknown> }

  test('is hidden and silent until the delay runs out, then shows', async () => {
    const loader = (await mount(
      '<helix-headless-loader delay="20"></helix-headless-loader>',
    )) as Loader
    expect(part(loader, 'svg')?.hasAttribute('hidden')).toBe(true)
    expect(loader.internals.ariaHidden).toBe('true')
    await new Promise((done) => setTimeout(done, 40))
    await loader.updateComplete
    expect(part(loader, 'svg')?.hasAttribute('hidden')).toBe(false)
    expect(loader.internals.ariaHidden ?? null).toBeNull()
  })

  test('shows at once without one', async () => {
    const loader = (await mount('<helix-headless-loader></helix-headless-loader>')) as Loader
    expect(part(loader, 'svg')?.hasAttribute('hidden')).toBe(false)
  })
})
