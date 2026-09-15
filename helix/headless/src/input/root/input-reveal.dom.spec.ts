import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Input = HTMLElement & { updateComplete: Promise<boolean> }

/**
 * The reveal toggle, and what it tells a stylesheet.
 *
 * `aria-pressed` is what a reader hears, and nothing outside the element can
 * follow `::part()` with it, so the pressed state is a second part name too.
 */
describe('a password reveal', () => {
  test('is pressed in a part name while the password shows, and not otherwise', async () => {
    const host = (await mount(
      '<helix-headless-input label="Password" type="password" reveal></helix-headless-input>',
    )) as Input
    const reveal = (): HTMLElement => part(host, 'reveal') as HTMLElement
    expect(reveal().getAttribute('part')).toBe('reveal')
    reveal().click()
    await host.updateComplete
    expect(reveal().getAttribute('part')).toBe('reveal reveal-pressed')
    expect(reveal().getAttribute('aria-pressed')).toBe('true')
    reveal().click()
    await host.updateComplete
    expect(reveal().getAttribute('part')).toBe('reveal')
  })
})
