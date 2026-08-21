import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Area = HTMLElement & { updateComplete: Promise<unknown> }

const area = async (attrs = '', body = '<p>One</p>'): Promise<Area> => {
  const host = (await mount(`<helix-scroll-area ${attrs}>${body}</helix-scroll-area>`)) as Area
  await host.updateComplete
  return host
}

describe('a scroll area', () => {
  test('names its region only when it has a name to give', async () => {
    /* An unnamed region is an announcement with no content: a reader is told
       "region" and has learned nothing they did not already know. */
    expect(part(await area('label="Notes"'), 'viewport')?.getAttribute('role')).toBe('region')
    expect(part(await area(), 'viewport')?.getAttribute('role')).toBe(null)
  })

  test('carries the name onto the box that scrolls', async () => {
    expect(part(await area('label="Notes"'), 'viewport')?.getAttribute('aria-label')).toBe('Notes')
  })
})

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

    test('and does not when there is nothing to scroll', async () => {
      /* A tab stop on a box with nothing in it to move is a stop that does
         nothing, and a form full of them is worse than the problem. */
      const host = await sized(1)
      expect(box(host).getAttribute('tabindex')).toBe(null)
      expect(host.hasAttribute('data-more')).toBe(false)
    })
  })
}
