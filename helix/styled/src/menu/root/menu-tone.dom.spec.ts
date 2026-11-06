import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* `tone="danger"` on a menu item and on an option: the danger ink at rest, a
   quiet wash of it when highlighted, the shortcut muted, and a disabled row
   like any other. Colors are read back by painting them, as the chart tooltip
   spec does, so a `color-mix()` resolves to the pixel a reader sees. Run with
   `bun run specs:browser menu`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../filter/index.js')
  await import('../../button/index.js')
  await import('../../divider/index.js')
  await import('../../listbox/index.js')
  await import('../../option/index.js')
})

afterEach(() => {
  document.documentElement.style.colorScheme = ''
})

const geometry = hasLayout() ? test : (): void => {}

type Host = HTMLElement & Updatable

/** A color as painted over a ground, as channels from 0 to 255. */
const paint = (color: string, ground = 'rgb(255, 255, 255)'): number[] => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.fillStyle = ground
  context.fillRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
}

const rgb = (channels: number[]): string => `rgb(${channels.join(', ')})`

const luminance = (channels: number[]): number => {
  const [r = 0, g = 0, b = 0] = channels.map((one) => {
    const s = one / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (ink: number[], ground: number[]): number => {
  const [high = 0, low = 0] = [luminance(ink), luminance(ground)].sort((a, b) => b - a)
  return (high + 0.05) / (low + 0.05)
}

const frames = async (): Promise<void> => {
  for (let pass = 0; pass < 3; pass++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
}

const MENU = (attributes: string): string => `<helix-menu label="Token" open ${attributes}>
  <helix-button slot="trigger">Token</helix-button>
  <helix-menu-item value="copy" shortcut="⌘C"><span slot="start">C</span>Copy token</helix-menu-item>
  <helix-divider></helix-divider>
  <helix-menu-item value="revoke" tone="danger" shortcut="⌘⌫"><span slot="start">R</span>Revoke token</helix-menu-item>
  <helix-menu-item value="gone" tone="danger" disabled>Delete permanently</helix-menu-item>
  <helix-menu-item value="off" disabled>Archive</helix-menu-item>
</helix-menu>`

const menu = async (attributes = ''): Promise<Host> => {
  const host = (await mount(MENU(attributes))) as Host
  await settle(host)
  for (const item of host.querySelectorAll<Host>('helix-menu-item')) {
    await settle(item)
  }
  await frames()
  return host
}

const item = (host: Element, value: string): Host =>
  host.querySelector(`helix-menu-item[value="${value}"]`) as Host

const partOf = (host: Element, name: string): HTMLElement =>
  host.shadowRoot?.querySelector(`[part~="${name}"]`) as HTMLElement

/** The page behind the menu, then the menu's own surface painted over it. */
const surfaceOf = (host: Element): number[] => {
  const page = paint(getComputedStyle(document.body).backgroundColor)
  return paint(getComputedStyle(partOf(host, 'surface')).backgroundColor, rgb(page))
}

describe('a menu item', () => {
  test('reflects its tone, so a stylesheet can select it', async () => {
    const host = (await mount('<helix-menu-item value="a">Archive</helix-menu-item>')) as Host & {
      tone?: string
    }
    host.tone = 'danger'
    await host.updateComplete
    expect(host.getAttribute('tone')).toBe('danger')
  })

  geometry(
    'draws danger words and mark in the danger ink, and keeps the shortcut muted',
    async () => {
      const host = await menu()
      const danger = item(host, 'revoke')
      const neutral = item(host, 'copy')
      const probe = document.createElement('i')
      probe.style.color = 'var(--helix-color-danger)'
      document.body.append(probe)
      const ink = getComputedStyle(probe).color
      probe.remove()
      expect(getComputedStyle(partOf(danger, 'item')).color).toBe(ink)
      expect(getComputedStyle(partOf(danger, 'start')).color).toBe(ink)
      expect(getComputedStyle(partOf(neutral, 'item')).color).not.toBe(ink)
      expect(getComputedStyle(partOf(danger, 'end')).color).toBe(
        getComputedStyle(partOf(neutral, 'end')).color,
      )
    },
  )

  for (const scheme of ['light', 'dark'] as const) {
    geometry(`reads its danger words at 4.5:1 on the ${scheme} surface`, async () => {
      document.documentElement.style.colorScheme = scheme
      const host = await menu()
      const surface = surfaceOf(host)
      const words = paint(
        getComputedStyle(partOf(item(host, 'revoke'), 'item')).color,
        rgb(surface),
      )
      expect(ratio(words, surface)).toBeGreaterThanOrEqual(4.5)
    })

    geometry(
      `lights a highlighted danger row with a quiet wash of its ink, ${scheme}`,
      async () => {
        document.documentElement.style.colorScheme = scheme
        const host = await menu('filterable filter="rev"')
        const danger = item(host, 'revoke')
        const surface = surfaceOf(host)
        const wash = paint(getComputedStyle(partOf(danger, 'item')).backgroundColor, rgb(surface))
        const [r = 0, g = 0, b = 0] = wash
        /* Its hue, not the neutral highlight's grey. */
        expect(r).toBeGreaterThan(g + 4)
        expect(r).toBeGreaterThan(b + 4)
        /* Quiet: no further from the surface than a neutral highlight goes, and
         the words still read on it. */
        const hover = paint(
          getComputedStyle(document.documentElement).getPropertyValue('--helix-color-hover') ||
            'transparent',
          rgb(surface),
        )
        expect(ratio(wash, surface)).toBeLessThan(Math.max(ratio(hover, surface), 1.15) + 0.1)
        const words = paint(getComputedStyle(partOf(danger, 'item')).color, rgb(wash))
        expect(ratio(words, wash)).toBeGreaterThanOrEqual(4.5)
      },
    )
  }

  geometry('draws a disabled danger row as any disabled row', async () => {
    const host = await menu()
    const danger = partOf(item(host, 'gone'), 'item')
    const neutral = partOf(item(host, 'off'), 'item')
    expect(getComputedStyle(danger).color).toBe(getComputedStyle(neutral).color)
    expect(getComputedStyle(danger).opacity).toBe(getComputedStyle(neutral).opacity)
  })
})

describe('an option', () => {
  geometry('takes the same danger ink, and a disabled one is a disabled option', async () => {
    const host = (await mount(
      `<helix-listbox label="Actions">
        <helix-option value="copy">Copy</helix-option>
        <helix-option value="revoke" tone="danger">Revoke token</helix-option>
        <helix-option value="gone" tone="danger" disabled>Delete permanently</helix-option>
        <helix-option value="off" disabled>Archive</helix-option>
      </helix-listbox>`,
    )) as Host
    await settle(host)
    await frames()
    const option = (value: string): HTMLElement =>
      partOf(host.querySelector(`helix-option[value="${value}"]`) as Element, 'item')
    const probe = document.createElement('i')
    probe.style.color = 'var(--helix-color-danger)'
    document.body.append(probe)
    const ink = getComputedStyle(probe).color
    probe.remove()
    expect(getComputedStyle(option('revoke')).color).toBe(ink)
    expect(getComputedStyle(option('copy')).color).not.toBe(ink)
    expect(getComputedStyle(option('gone')).color).toBe(getComputedStyle(option('off')).color)
  })
})
