import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the rail draws, which only a browser computes. Run it with
   `bun run specs:browser outline`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Rail = HTMLElement & Updatable & { scrollToSection(id: string): boolean }

const rail = async (style = ''): Promise<Rail> => {
  const root = await mount(
    `<div><helix-outline marker="rail" style="${style}">` +
      '<a href="#one">One</a><a href="#two" data-level="2">Two</a><a href="#three">Three</a>' +
      '</helix-outline><section id="one"><h2>One</h2></section>' +
      '<section id="two"><h2>Two</h2></section><section id="three"><h2>Three</h2></section></div>',
  )
  const host = root.querySelector('helix-outline') as Rail
  await settle(host)
  return host
}

const part = (host: HTMLElement, name: string): HTMLElement =>
  host.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement

const width = (element: HTMLElement): number => element.getBoundingClientRect().width

describe('outline rail', () => {
  geometry('draws a deeper tick narrower, and the current tick longer', async () => {
    const host = await rail()
    host.scrollToSection('three')
    await settle(host)
    const [one, two, three] = [
      ...(host.shadowRoot?.querySelectorAll('[part="tick"]') ?? []),
    ] as HTMLElement[]
    expect(three?.hasAttribute('data-current')).toBe(true)
    expect(width(two as HTMLElement)).toBeLessThan(width(one as HTMLElement))
    expect(width(three as HTMLElement)).toBeGreaterThan(width(one as HTMLElement))
  })

  geometry('keeps the surface invisible at rest and shows it once a link has focus', async () => {
    const host = await rail()
    const surface = part(host, 'surface')
    expect(getComputedStyle(surface).opacity).toBe('0')
    expect(getComputedStyle(surface).pointerEvents).toBe('none')
    ;(host.querySelector('a') as HTMLElement).focus()
    await settle(host)
    expect(getComputedStyle(surface).pointerEvents).toBe('auto')
    expect(Number(getComputedStyle(surface).opacity)).toBeGreaterThan(0)
  })

  geometry('hides the ticks while the surface is open', async () => {
    const host = await rail()
    const ticks = part(host, 'ticks')
    expect(getComputedStyle(ticks).visibility).toBe('visible')
    ;(host.querySelector('a') as HTMLElement).focus()
    await settle(host)
    expect(getComputedStyle(ticks).visibility).toBe('hidden')
  })

  geometry('takes the hooks', async () => {
    const host = await rail(
      '--outline-tick-color: rgb(3, 3, 3); --outline-tick-current-color: rgb(5, 5, 5); --outline-tick-length: 40px; --outline-surface-max-inline-size: 90px; --outline-surface-background-color: rgb(9, 9, 9)',
    )
    host.scrollToSection('three')
    await settle(host)
    const ticks = [...(host.shadowRoot?.querySelectorAll('[part="tick"]') ?? [])] as HTMLElement[]
    const plain = ticks[0] as HTMLElement
    const lit = ticks[2] as HTMLElement
    expect(getComputedStyle(plain).backgroundColor).toBe('rgb(3, 3, 3)')
    expect(getComputedStyle(lit).backgroundColor).toBe('rgb(5, 5, 5)')
    expect(getComputedStyle(part(host, 'surface')).backgroundColor).toBe('rgb(9, 9, 9)')
    expect(getComputedStyle(part(host, 'surface')).maxWidth).toBe('90px')
    expect(width(lit)).toBe(60)
  })
})

describe('outline rail in a runtime without layout', () => {
  test('mounts', async () => {
    const host = await rail()
    expect(part(host, 'ticks')).not.toBeNull()
  })
})
