import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

const item = async (attributes = ''): Promise<Item> =>
  (await mount(
    `<helix-headless-accordion-item ${attributes}><span slot="summary">Summary</span>Body</helix-headless-accordion-item>`,
  )) as Item

/**
 * One section, and the contract that is the section's rather than the
 * accordion's.
 *
 * **The accordion already proves the coordination**, which is `single` closing
 * the peers and one section staying open. What one section owns alone is that
 * being closed is a fact in its markup rather than a height its stylesheet
 * chose, and that is exactly the thing an accordion-level spec cannot see: from
 * up there a section collapsed by `grid-template-rows: 0fr` and one that is
 * genuinely closed look the same.
 */
describe('one accordion section', () => {
  /* Delete every stylesheet and a closed section is still closed. All three are
     required: `hidden` takes it off the screen, `inert` takes it out of the tab
     order and the accessibility tree, and the trigger says which it is. `inert`
     alone leaves the region unreachable, unannounced, and every pixel still
     painted. */
  test('is closed in its markup, not in a stylesheet', async () => {
    const host = await item('hidden-until-found="false"')
    const content = part(host, 'content')
    expect(content?.hasAttribute('hidden')).toBe(true)
    expect(content?.hasAttribute('inert')).toBe(true)
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('false')
  })

  /* And the same three move together when it opens, which is what makes the
     first assertion a contract rather than a description of a resting state. */
  test('gives all three up together when the reader opens it', async () => {
    const host = await item('hidden-until-found="false"')
    ;(part(host, 'trigger') as HTMLElement).click()
    await host.updateComplete

    expect(host.open).toBe(true)
    const content = part(host, 'content')
    expect(content?.hasAttribute('hidden')).toBe(false)
    expect(content?.hasAttribute('inert')).toBe(false)
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('true')
  })

  /* The region names its trigger and the trigger names the region, both by id
     inside this one shadow root, which is the only place such a pair can
     resolve: an IDREF does not cross a shadow boundary. */
  test('ties its region and its trigger together inside its own root', async () => {
    const host = await item('default-open')
    const trigger = part(host, 'trigger')
    const content = part(host, 'content')
    expect(trigger?.getAttribute('aria-controls')).toBe(content?.id)
    expect(content?.getAttribute('aria-labelledby')).toBe(trigger?.id)
    expect(content?.getAttribute('role')).toBe('region')
  })

  /* A row carrying its own affordance would otherwise have two, so `none` is a
     real answer rather than a hidden chevron. */
  test('draws no chevron where the row was told it has one already', async () => {
    expect(part(await item('chevron-placement="none"'), 'chevron')).toBeNull()
    expect(part(await item(), 'chevron')).not.toBeNull()
  })
})

describe('a section find in page can search', () => {
  /* React Aria's disclosure: a closed section is searched, and a match opens
     it. Without it, text in a closed FAQ answer was invisible to Control+F. */
  test('is hidden until found and not inert while closed, and a match opens it', async () => {
    const host = await item()
    const content = part(host, 'content') as HTMLElement
    expect(content.getAttribute('hidden')).toBe('until-found')
    expect(content.hasAttribute('inert')).toBe(false)
    content.dispatchEvent(new Event('beforematch'))
    await host.updateComplete
    expect(host.open).toBe(true)
    expect(content.hasAttribute('hidden')).toBe(false)
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('true')
  })

  /* `content-visibility` hides the content and leaves the region's own box in
     the tree, so every closed section was listed as an empty landmark. */
  test('is no landmark while closed, and the region again once open', async () => {
    const host = await item()
    const content = part(host, 'content') as HTMLElement
    expect(content.hasAttribute('role')).toBe(false)
    expect(content.hasAttribute('aria-labelledby')).toBe(false)
    host.open = true
    await host.updateComplete
    expect(content.getAttribute('role')).toBe('region')
    expect(content.getAttribute('aria-labelledby')).toBe('trigger')
  })

  /* In the browser's order: the event, its listeners and their microtasks, and
     only then the removal of `hidden`. Putting it back in the listener left a
     closed section drawn, read and reachable by Tab. */
  test('a refused opening puts the region back to hidden until found', async () => {
    const host = await item()
    host.addEventListener('helix-before-open', (event) => event.preventDefault())
    const content = part(host, 'content') as HTMLElement
    content.dispatchEvent(new Event('beforematch'))
    await Promise.resolve()
    content.removeAttribute('hidden')
    await new Promise((resolve) => setTimeout(resolve))
    await host.updateComplete
    expect(host.open).toBe(false)
    expect(content.getAttribute('hidden')).toBe('until-found')
  })

  test('an accordion turns it off for every section, and a section turns it back on', async () => {
    document.body.innerHTML = `<helix-headless-accordion hidden-until-found="false">
      <helix-headless-accordion-item><span slot="summary">A</span>Body</helix-headless-accordion-item>
      <helix-headless-accordion-item hidden-until-found><span slot="summary">B</span>Body</helix-headless-accordion-item>
    </helix-headless-accordion>`
    const [off, on] = document.querySelectorAll(
      'helix-headless-accordion-item',
    ) as unknown as Item[]
    await (document.body.firstElementChild as Item).updateComplete
    await new Promise((resolve) => setTimeout(resolve))
    await off?.updateComplete
    await on?.updateComplete
    expect(part(off as Item, 'content')?.getAttribute('hidden')).toBe('')
    expect(part(off as Item, 'content')?.hasAttribute('inert')).toBe(true)
    expect(part(on as Item, 'content')?.getAttribute('hidden')).toBe('until-found')
  })

  /* `content-visibility` empties the box at once, which an author's `display`
     does not undo, so a section a sheet shrinks closed showed an empty box for
     the length of the shrink. The content stays drawn, and inert, until what
     animates the content part has finished. */
  test('a closing section keeps its content drawn until its motion ends', async () => {
    const host = await item('default-open')
    const content = part(host, 'content') as HTMLElement
    let end = (): void => {}
    const finished = new Promise<unknown>((resolve) => {
      end = () => resolve(undefined)
    })
    content.getAnimations = () => [{ finished } as unknown as Animation]
    host.open = false
    await host.updateComplete
    expect(content.hasAttribute('hidden')).toBe(false)
    expect(content.hasAttribute('inert')).toBe(true)
    end()
    await finished
    await new Promise((resolve) => setTimeout(resolve))
    await host.updateComplete
    expect(content.getAttribute('hidden')).toBe('until-found')
    expect(content.hasAttribute('inert')).toBe(false)
  })

  test('and nothing running hides it at once', async () => {
    const host = await item('default-open')
    host.open = false
    await host.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
    await host.updateComplete
    expect(part(host, 'content')?.getAttribute('hidden')).toBe('until-found')
  })
})

describe('the height a stylesheet animates to', () => {
  /* Radix's --radix-accordion-content-height, for keyframes of your own. */
  test('is written on the content part once the section is open', async () => {
    const host = await item()
    const content = part(host, 'content') as HTMLElement
    expect(content.style.getPropertyValue('--accordion-content-height')).toBe('')
    host.open = true
    await host.updateComplete
    expect(content.style.getPropertyValue('--accordion-content-height')).toMatch(/^\d+px$/)
  })
})

describe('the chevron', () => {
  /* The drawn caret was the only indicator a section could have. */
  test('is the fallback of a slot an icon of your own replaces', async () => {
    const host = await item()
    const slot = host.shadowRoot?.querySelector('slot[name="chevron"]')
    expect(slot?.querySelector('[part="chevron"]')).not.toBeNull()
  })

  /* A glyph written as text, such as "+", joined the trigger's name. */
  test('keeps what is slotted there out of the trigger name', async () => {
    const host = await item()
    const slot = host.shadowRoot?.querySelector('slot[name="chevron"]')
    expect(slot?.getAttribute('aria-hidden')).toBe('true')
  })
})
