import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../tag/index.js')
})

const FIVE = (
  attributes: string,
) => `<helix-headless-filter-input label="Filter rows" ${attributes}>
  <helix-headless-tag dismissible slot="tags">design</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">infra</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">docs</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">security</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">billing</helix-headless-tag>
</helix-headless-filter-input>`

const settle = (host: HTMLElement): Promise<unknown> =>
  (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete

/** How many tokens are on screen rather than merely assigned. */
const showing = (host: HTMLElement): number =>
  slotted(host, 'tags').filter((tag) => !tag.hasAttribute('hidden')).length

describe('the count as a control', () => {
  test('stays a span, and a silent one, without the opt-in', async () => {
    /* The tab order is the reason this is opt-in, so the default has to be
       provably inert rather than merely unstyled. */
    const filter = await mount(FIVE('max-tags="3"'))
    const rest = part(filter, 'rest')

    expect(rest?.tagName).toBe('SPAN')
    expect(rest?.textContent).toBe('+2')
  })

  test('becomes a real button with it', async () => {
    const filter = await mount(FIVE('expandable max-tags="3"'))
    const rest = part(filter, 'rest')

    expect(rest?.tagName).toBe('BUTTON')
    // A real button, so Enter and Space work with no key handler.
    expect(rest?.getAttribute('type')).toBe('button')
    expect(rest?.getAttribute('aria-expanded')).toBe('false')
    // `+2` names a number rather than what pressing it does.
    expect(rest?.getAttribute('aria-label')).toBe('Show all')
  })

  test('pressing it shows every token', async () => {
    const filter = await mount(FIVE('expandable max-tags="3"'))
    expect(showing(filter)).toBe(3)

    ;(part(filter, 'rest') as HTMLElement).click()
    await settle(filter)

    expect(showing(filter)).toBe(5)
  })

  test('and the control is still there to put them back', async () => {
    /* Expanded, nothing is over the cap, so a control gated on the count would
       vanish and leave no way back. */
    const filter = await mount(FIVE('expandable max-tags="3"'))
    ;(part(filter, 'rest') as HTMLElement).click()
    await settle(filter)

    const rest = part(filter, 'rest')
    expect(rest).not.toBeNull()
    expect(rest?.getAttribute('aria-expanded')).toBe('true')
    /* The name rather than the words on it: expanded the control draws a caret,
       which needs no translating and does not change width as it is pressed. */
    expect(rest?.getAttribute('aria-label')).toBe('Show fewer')
  })

  test('pressing it again collapses back to the cap', async () => {
    const filter = await mount(FIVE('expandable max-tags="3"'))
    ;(part(filter, 'rest') as HTMLElement).click()
    await settle(filter)
    ;(part(filter, 'rest') as HTMLElement).click()
    await settle(filter)

    expect(showing(filter)).toBe(3)
    expect(part(filter, 'rest')?.textContent?.trim()).toBe('+2')
  })

  test('both words can be said differently', async () => {
    const filter = await mount(
      FIVE('collapse-label="Fewer" expand-label="Show the other two" expandable max-tags="3"'),
    )
    expect(part(filter, 'rest')?.getAttribute('aria-label')).toBe('Show the other two')

    ;(part(filter, 'rest') as HTMLElement).click()
    await settle(filter)

    expect(part(filter, 'rest')?.getAttribute('aria-label')).toBe('Fewer')
  })

  test('nothing to expand means no control', async () => {
    const three = `<helix-headless-filter-input expandable label="Filter rows" max-tags="3">
      <helix-headless-tag slot="tags">design</helix-headless-tag>
      <helix-headless-tag slot="tags">infra</helix-headless-tag>
      <helix-headless-tag slot="tags">docs</helix-headless-tag>
    </helix-headless-filter-input>`
    const filter = await mount(three)

    expect(part(filter, 'rest')).toBeNull()
  })

  test('expanding is the reader’s, so markup cannot seed it', async () => {
    /* `Input.revealed`'s rule: a momentary choice about what is on one screen is
       not something a consumer sets, so it is `@state` and observes no
       attribute. A consumer who wants the field open asks for `max-tags="0"`,
       which is the one lever rather than a second way to say it. */
    const filter = await mount(FIVE('expandable expanded max-tags="3"'))

    expect(showing(filter)).toBe(3)
    expect(part(filter, 'rest')?.getAttribute('aria-expanded')).toBe('false')
  })
})
