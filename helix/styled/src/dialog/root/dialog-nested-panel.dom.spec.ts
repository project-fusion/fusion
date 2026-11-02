import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* A panel opened from inside a modal surface stands a step above it in dark, where
   a shadow does not show. Measured November 1, 2026: both were `oklch(0.21 0 258)`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../drawer/index.js')
  await import('../../option/index.js')
  await import('../../select/index.js')
})

const run = hasLayout() ? test : (): void => {}

const SELECT =
  '<helix-select label="Fruit"><helix-option value="a">Apple</helix-option></helix-select>'

const fill = (element: Element | null | undefined): string =>
  getComputedStyle(element as Element).backgroundColor

describe('a Select panel inside a modal surface', () => {
  for (const [tag, part] of [
    ['helix-dialog', 'surface'],
    ['helix-drawer', 'panel'],
  ] as const) {
    run(`${tag} in dark takes a step up`, async () => {
      const root = await mount(
        `<div data-color-mode="dark"><${tag} label="Name">${SELECT}</${tag}></div>`,
      )
      const host = root.querySelector(tag) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      const select = root.querySelector('helix-select') as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      await select.updateComplete
      const ground = fill(host.shadowRoot?.querySelector(`[part="${part}"]`))
      const panel = fill(select.shadowRoot?.querySelector('[part="surface"]'))
      expect(panel).not.toBe(ground)
    })

    run(`${tag} in light keeps one fill`, async () => {
      const root = await mount(
        `<div data-color-mode="light"><${tag} label="Name">${SELECT}</${tag}></div>`,
      )
      const host = root.querySelector(tag) as HTMLElement & { updateComplete: Promise<unknown> }
      await host.updateComplete
      const select = root.querySelector('helix-select') as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      await select.updateComplete
      const ground = fill(host.shadowRoot?.querySelector(`[part="${part}"]`))
      const panel = fill(select.shadowRoot?.querySelector('[part="surface"]'))
      expect(panel).toBe(ground)
    })
  }
})
