import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Area = HTMLElement & { updateComplete: Promise<unknown> }

const _area = async (attrs = '', body = '<p>One</p>'): Promise<Area> => {
  const host = (await mount(`<helix-scroll-area ${attrs}>${body}</helix-scroll-area>`)) as Area
  await host.updateComplete
  return host
}

/* The fades at the edges, which are drawn here and opted out of by giving one no depth.

   The behavior is the base element's and is tested there. */
if (hasLayout()) {
  describe('a scroll area with a page under it', () => {
    const sized = async (lines: number): Promise<Area> => {
      const body = Array.from({ length: lines }, (_, at) => `<p>Line ${at}</p>`).join('')
      const host = (await mount(
        `<helix-scroll-area label="Notes" style="display:block;block-size:80px;inline-size:200px">${body}</helix-scroll-area>`,
      )) as Area
      await host.updateComplete
      await new Promise((settled) => {
        requestAnimationFrame(() => {
          settled(undefined)
        })
      })
      return host
    }

    const box = (host: Area): HTMLElement => part(host, 'viewport') as HTMLElement

    test('says which edge has more past it, and only that edge', async () => {
      /* The whole component is this one fact, because CSS has no reading of
         scroll position and cannot work it out for itself. */
      const host = await sized(20)
      expect(host.getAttribute('data-more')).toBe('block-end')
    })

    test('both edges once it is somewhere in the middle', async () => {
      const host = await sized(20)
      box(host).scrollTop = 40
      box(host).dispatchEvent(new Event('scroll'))
      await host.updateComplete
      expect(host.getAttribute('data-more')).toBe('block-start block-end')
    })

    test('and the far edge goes out at the end rather than a pixel short', async () => {
      /* A pixel of slack, because a scroller at its end is routinely a fraction
         short of it: browsers round scroll positions differently under zoom, and
         a fade that never quite goes out at the bottom of a fully scrolled list
         is the bug that costs. */
      const host = await sized(20)
      box(host).scrollTop = box(host).scrollHeight
      box(host).dispatchEvent(new Event('scroll'))
      await host.updateComplete
      expect(host.getAttribute('data-more')).toBe('block-start')
    })

    test('takes the keyboard when it scrolls', async () => {
      // A box a reader can only reach with a pointer is one some cannot read.
      const host = await sized(20)
      expect(box(host).getAttribute('tabindex')).toBe('0')
      expect(host.hasAttribute('data-scrolls')).toBe(true)
    })

    test('names the sideways edges too, and draws them', async () => {
      /* Measured on all four from the start, and drawn on two until a row that
         ran past its box needed the other pair. The host has two
         pseudo-elements and four edges want four, so the sideways ones hang off
         a part of their own and are placed with logical properties, which is
         what makes inline-start the right-hand edge for a reader who reads that
         way. */
      const host = (await mount(
        `<helix-scroll-area label="Row" style="display:block;inline-size:120px"><div style="display:flex"><span style="flex:0 0 200px">a</span><span style="flex:0 0 200px">b</span></div></helix-scroll-area>`,
      )) as Area
      await host.updateComplete
      await new Promise((settled) => {
        requestAnimationFrame(() => {
          settled(undefined)
        })
      })
      expect(host.getAttribute('data-more')).toBe('inline-end')

      const view = part(host, 'viewport') as HTMLElement
      view.scrollLeft = 100
      view.dispatchEvent(new Event('scroll'))
      await host.updateComplete
      expect(host.getAttribute('data-more')).toBe('inline-start inline-end')

      /* After the fade, not during it. These cross-fade over `duration-fast`,
         so reading the moment the attribute lands catches them partway and the
         number is whatever the frame happened to be on. */
      await new Promise((settled) => {
        setTimeout(settled, 250)
      })
      const edges = part(host, 'edges') as HTMLElement
      expect(globalThis.getComputedStyle(edges, '::before').opacity).toBe('1')
      expect(globalThis.getComputedStyle(edges, '::after').opacity).toBe('1')
    })

    test('an edge is opted out by giving its fade no depth', async () => {
      /* A size rather than a switch, because it is the same question at both
         ends and a zero-depth fade has no box to be drawn in. A list scrolled
         to the top has nothing above it worth saying so about, and a fade there
         covers the first row for no reason. */
      const body = Array.from({ length: 20 }, (_, at) => `<p>Line ${at}</p>`).join('')
      const host = (await mount(
        `<helix-scroll-area label="Notes" style="display:block;block-size:80px;inline-size:200px;--scroll-area-fade-block-start:0">${body}</helix-scroll-area>`,
      )) as Area
      await host.updateComplete
      const top = globalThis.getComputedStyle(host, '::before')
      const bottom = globalThis.getComputedStyle(host, '::after')
      expect(Number.parseFloat(top.blockSize)).toBe(0)
      expect(Number.parseFloat(bottom.blockSize)).toBeGreaterThan(0)
    })

    test('and does not when there is nothing to scroll', async () => {
      /* A tab stop on a box with nothing in it to move is a stop that does
         nothing, and a form full of them is worse than the problem. */
      const host = await sized(1)
      expect(box(host).getAttribute('tabindex')).toBe(null)
      expect(host.hasAttribute('data-more')).toBe(false)
    })
  })
}
