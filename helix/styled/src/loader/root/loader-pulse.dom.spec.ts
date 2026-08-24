import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

if (hasLayout()) {
  describe('a loader drawn as a pulse', () => {
    const pulse = async (): Promise<HTMLElement> =>
      mount('<helix-loader variant="pulse" label="Loading"><i></i></helix-loader>')

    test('draws neither the arc nor the ring', async () => {
      /* The turning rim is what this component is named for and it is wrong
         around a wordmark: a logo with something orbiting it reads as chrome
         bolted to the brand. The ring was carrying the motion whenever nothing
         was slotted, which left two things moving, and the outer one is the
         chrome this appearance exists to remove. */
      const host = await pulse()
      expect(globalThis.getComputedStyle(part(host, 'indicator') as Element).display).toBe('none')
      expect(globalThis.getComputedStyle(part(host, 'track') as Element).display).toBe('none')
    })

    test('and moves opacity alone, where the default also scales', async () => {
      /* A wordmark that grows and shrinks reads as a logo being animated rather
         than as a page waiting. */
      const host = await pulse()
      const mark = globalThis.getComputedStyle(part(host, 'mark') as Element)
      expect(mark.animationName).toBe('helix-loader-pulse-mark')

      const plain = await mount('<helix-loader label="Loading"><i></i></helix-loader>')
      expect(globalThis.getComputedStyle(part(plain, 'mark') as Element).animationName).toBe(
        'helix-loader-breathe-mark',
      )
    })
  })
}
