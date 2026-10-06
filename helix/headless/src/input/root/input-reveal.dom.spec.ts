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

/* Web Awesome's input takes `clear-icon`, `show-password-icon` and
   `hide-password-icon`. Here the cross and the two eyes were drawn with no way
   to put a house glyph in their place. */
describe('the icons on the two buttons', () => {
  const slotIn = (host: HTMLElement, button: string): string | undefined =>
    part(host, button)?.querySelector('slot')?.getAttribute('name') ?? undefined

  test('each sits in a slot of its own, drawn by default', async () => {
    const host = (await mount(
      `<helix-headless-input label="Password" type="password" reveal clearable value="x">
         <svg slot="reveal-icon"></svg><svg slot="conceal-icon"></svg><svg slot="clear-icon"></svg>
       </helix-headless-input>`,
    )) as Input
    expect(slotIn(host, 'clear')).toBe('clear-icon')
    expect(slotIn(host, 'reveal')).toBe('reveal-icon')
    const assigned = (name: string): number =>
      host.shadowRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)?.assignedElements()
        .length ?? 0
    expect([assigned('clear-icon'), assigned('reveal-icon')]).toEqual([1, 1])
    ;(part(host, 'reveal') as HTMLElement).click()
    await host.updateComplete
    expect(slotIn(host, 'reveal')).toBe('conceal-icon')
    expect(assigned('conceal-icon')).toBe(1)
  })

  test('and the default glyph stays where nothing is slotted', async () => {
    const host = (await mount(
      '<helix-headless-input label="Name" clearable value="x"></helix-headless-input>',
    )) as Input
    expect(
      part(host, 'clear')?.querySelector('slot[name="clear-icon"] svg[data-glyph]'),
    ).not.toBeNull()
  })
})
