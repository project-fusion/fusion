import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Area = HTMLElement & { updateComplete: Promise<unknown> }

/* The scrollbars drawn under `scrollbars`, which are placed by this sheet from
   the fractions the headless tier writes. A browser's: happy-dom lays nothing out. */
if (hasLayout()) {
  describe('scrollbars of its own, drawn', () => {
    const tall = async (attrs: string): Promise<Area> => {
      const host = (await mount(
        `<helix-scroll-area ${attrs} style="display:block;block-size:200px;inline-size:200px"><p style="margin:0;block-size:800px">Tall</p></helix-scroll-area>`,
      )) as Area
      await host.updateComplete
      await new Promise((settled) => {
        requestAnimationFrame(() => {
          settled(undefined)
        })
      })
      await host.updateComplete
      return host
    }

    test('take the place of the browser’s, so the content keeps its whole width', async () => {
      const view = part(await tall('scrollbars="auto"'), 'viewport') as HTMLElement
      expect(view.offsetWidth - view.clientWidth).toBe(0)
    })

    test('and leave the browser’s alone when not asked for', async () => {
      /* The default look: `thin`, which takes room in a browser with classic scrollbars. */
      const view = part(await tall(''), 'viewport') as HTMLElement
      expect(getComputedStyle(view).scrollbarWidth).toBe('thin')
    })

    test('draw a thumb the length of its share of the track, at the top to start', async () => {
      const host = await tall('scrollbars="auto"')
      const bar = (part(host, 'scrollbar-vertical') as HTMLElement).getBoundingClientRect()
      const thumb = (part(host, 'thumb-vertical') as HTMLElement).getBoundingClientRect()
      expect(Math.round(thumb.height)).toBe(Math.round(bar.height / 4))
      expect(Math.round(thumb.top)).toBe(Math.round(bar.top))
    })
  })
}
