import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Trail = HTMLElement & {
  overflowed: readonly HTMLElement[]
  updateComplete: Promise<unknown>
}

const trail = async (): Promise<Trail> => {
  const host = (await mount(
    `<helix-breadcrumbs collapse style="display:block;inline-size:200px">
      <helix-breadcrumb href="/">Home</helix-breadcrumb>
      <helix-breadcrumb overflow><button type="button">More</button></helix-breadcrumb>
      <helix-breadcrumb href="/a">Alpha</helix-breadcrumb>
      <helix-breadcrumb href="/b">Bravo</helix-breadcrumb>
      <helix-breadcrumb href="/c">Charlie</helix-breadcrumb>
      <helix-breadcrumb current>Delta</helix-breadcrumb>
    </helix-breadcrumbs>`,
  )) as Trail
  await host.updateComplete
  return host
}

if (hasLayout()) {
  describe('a trail that has collapsed', () => {
    test('says so, rather than only answering if asked', async () => {
      /* The overflow control is the consumer's, so filling it is their half,
         and a getter with no event gave them no moment to do it: the trail
         collapsed on a resize and whatever was slotted heard nothing. That is
         what "the overflow is not showing" looked like from the outside, the
         other half being an icon name that did not exist. */
      const host = await trail()
      const heard: string[] = []
      host.addEventListener('helix-change', (event) => {
        heard.push((event as CustomEvent<{ property: string; value: string }>).detail.property)
      })

      host.style.inlineSize = '900px'
      await new Promise((settled) => {
        setTimeout(settled, 200)
      })
      await host.updateComplete

      expect(heard).toContain('overflowed')
    })

    test('and hands over the crumbs themselves, not a copy of them', async () => {
      /* Elements, so a consumer reads `href` and text off the objects they
         wrote rather than a second version of the trail to keep in step. */
      const host = await trail()
      await new Promise((settled) => {
        setTimeout(settled, 200)
      })
      for (const crumb of host.overflowed) {
        expect(crumb.tagName.toLowerCase()).toBe('helix-breadcrumb')
        expect(host.contains(crumb)).toBe(true)
      }
    })
  })
}
