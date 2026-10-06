import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('card regions', () => {
  test('renders one element, not five', async () => {
    const card = await mount(`
      <helix-headless-card>
        <h2 slot="header">Title</h2>
        Body
        <button slot="footer">Act</button>
      </helix-headless-card>
    `)
    // The regions are slots in one shadow root, not separate custom elements
    // and not wrapper divs either.
    expect(card.querySelectorAll('helix-card-header, helix-card-content').length).toBe(0)
    // The host is the surface, so the shadow root holds only slots: no
    // wrapper element at all while no actions slot holds anything.
    expect(card.shadowRoot?.querySelectorAll('div').length).toBe(0)
    expect(card.shadowRoot?.querySelectorAll('slot').length).toBe(6)
  })

  test('routes content to the right region', async () => {
    const card = await mount(`
      <helix-headless-card>
        <img slot="media" src="/cover.avif" alt="" />
        <h2 slot="header">Title</h2>
        <p>Body</p>
        <button slot="footer">Act</button>
      </helix-headless-card>
    `)
    expect(slotted(card, 'media')[0]?.tagName).toBe('IMG')
    expect(slotted(card, 'header')[0]?.tagName).toBe('H2')
    expect(slotted(card)[0]?.tagName).toBe('P')
    expect(slotted(card, 'footer')[0]?.tagName).toBe('BUTTON')
  })

  test('an omitted region leaves no element behind to take up space', async () => {
    // A bare slot is `display: contents`, so nothing is rendered for a region
    // the consumer did not fill. It has to be layout: `:host(:has(...))` is
    // invalid CSS, and the server cannot inspect children to do it in JS.
    const card = await mount('<helix-headless-card>Body</helix-headless-card>')
    const slots = [...(card.shadowRoot?.querySelectorAll('slot') ?? [])]
    for (const slot of slots) {
      const name = slot.getAttribute('name')
      if (name) {
        expect(slot.assignedNodes().length, name).toBe(0)
      }
    }
  })

  test('media is a region of the one element, not a wrapper around it', async () => {
    // Media sits in the same grid as the content stack, so `orientation` moves
    // it without any change to the markup a consumer wrote.
    const card = await mount(`
      <helix-headless-card orientation="horizontal">
        <img slot="media" src="/cover.avif" alt="" />
        Body
      </helix-headless-card>
    `)
    expect(slotted(card, 'media')[0]?.tagName).toBe('IMG')
    expect(card.getAttribute('orientation')).toBe('horizontal')
  })

  test('a consumer heading stays a real heading', async () => {
    // The reason a title is a slot rather than an element: an <h2> beats a
    // <div role="heading"> and needs no `level` prop to say so.
    const card = await mount(
      '<helix-headless-card><h2 slot="header">T</h2>Body</helix-headless-card>',
    )
    const heading = slotted(card, 'header')[0]
    expect(heading?.tagName).toBe('H2')
    expect(heading?.getAttribute('role')).toBeNull()
  })

  /* A group with no name adds "group" to what a reader says and nothing else,
     so the role waits for a name. */
  test('is a group once it is named, on the host since the host is the box', async () => {
    const card = (await mount('<helix-headless-card>Body</helix-headless-card>')) as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    expect(role(card)).toBeNull()
    card.setAttribute('aria-label', 'Storage')
    await card.updateComplete
    expect(role(card)).toBe('group')
    card.removeAttribute('aria-label')
    await card.updateComplete
    expect(role(card)).toBeNull()
  })

  /* Stat Group and the other named regions take `label`; a card took only the
     ARIA attributes. Through internals, so the host carries nothing more. */
  test('is a group named by label, with no attribute written', async () => {
    const card = (await mount(
      '<helix-headless-card label="Storage">Body</helix-headless-card>',
    )) as HTMLElement & {
      internals: ElementInternals
      label: string
      updateComplete: Promise<boolean>
    }
    expect(role(card)).toBe('group')
    expect(card.internals.ariaLabel).toBe('Storage')
    expect(card.hasAttribute('aria-label')).toBe(false)
    card.label = ''
    await card.updateComplete
    expect(role(card)).toBeNull()
  })

  test('and named by a heading it points at', async () => {
    const card = await mount(
      '<helix-headless-card aria-labelledby="t"><h2 id="t" slot="header">Storage</h2></helix-headless-card>',
    )
    expect(role(card)).toBe('group')
  })

  test('a consumer-supplied name is left alone', async () => {
    const card = await mount('<helix-headless-card aria-label="Report">Body</helix-headless-card>')
    expect(card.getAttribute('aria-label')).toBe('Report')
  })
})

/* wa-card's header-actions and footer-actions. A line becomes a wrapper only
   while its actions slot holds something, so a card without actions renders the
   bare slots it always did. */
describe('card actions', () => {
  type Card = HTMLElement & { updateComplete: Promise<boolean> }
  const row = (card: Element, name: string) => card.shadowRoot?.querySelector(`[part="${name}"]`)

  test('a card without actions draws no line of its own', async () => {
    const card = await mount(
      '<helix-headless-card><h2 slot="header">T</h2>Body<button slot="footer">Go</button></helix-headless-card>',
    )
    expect(row(card, 'header-row')).toBeNull()
    expect(row(card, 'footer-row')).toBeNull()
  })

  test('header actions share a line with the header', async () => {
    const card = (await mount(
      '<helix-headless-card><h2 slot="header">T</h2><button slot="header-actions">Menu</button>Body</helix-headless-card>',
    )) as Card
    await card.updateComplete
    const line = row(card, 'header-row')
    expect(line?.querySelector('slot[name="header"]')).not.toBeNull()
    expect(slotted(card, 'header-actions')[0]?.textContent).toBe('Menu')
    expect(
      (
        line?.querySelector('slot[name="header-actions"]') as HTMLSlotElement | null
      )?.assignedElements(),
    ).toHaveLength(1)
    expect(row(card, 'footer-row')).toBeNull()
  })

  test('footer actions arriving later draw the footer line, and leaving remove it', async () => {
    const card = (await mount(
      '<helix-headless-card>Body<button slot="footer">Back</button></helix-headless-card>',
    )) as Card
    const action = document.createElement('button')
    action.slot = 'footer-actions'
    action.textContent = 'Save'
    card.append(action)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await card.updateComplete
    expect(row(card, 'footer-row')?.querySelector('slot[name="footer"]')).not.toBeNull()
    action.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await card.updateComplete
    expect(row(card, 'footer-row')).toBeNull()
  })
})

/* Web Awesome's card publishes its header, body and footer as parts. Here the
   regions are bare slots, so the part is on the slot: a name a page reaches,
   with no box until the page gives it one. */
describe('card region parts', () => {
  test('each region slot is a part of its name, the default one body', async () => {
    const card = await mount('<helix-headless-card>Body</helix-headless-card>')
    const parts = [...(card.shadowRoot?.querySelectorAll('[part]') ?? [])].map((element) => [
      element.tagName,
      element.getAttribute('part'),
    ])
    expect(parts).toEqual([
      ['SLOT', 'media'],
      ['SLOT', 'header'],
      ['SLOT', 'header-actions'],
      ['SLOT', 'body'],
      ['SLOT', 'footer'],
      ['SLOT', 'footer-actions'],
    ])
  })
})

/* Web Awesome's card writes `with-header`, `with-footer` and `with-media`, so a
   sheet draws a card by what it holds. Here they are states, so the card's
   markup is the page's alone. */
describe('card region states', () => {
  type Held = HTMLElement & { internals: ElementInternals; updateComplete: Promise<boolean> }
  const held = (card: Held): string[] =>
    ['has-media', 'has-header', 'has-footer'].filter((name) => card.internals.states.has(name))

  test('say which regions hold something', async () => {
    expect(held((await mount('<helix-headless-card>Body</helix-headless-card>')) as Held)).toEqual(
      [],
    )
    const full = (await mount(
      '<helix-headless-card><img slot="media" alt=""><h3 slot="header">Title</h3>Body<button slot="footer-actions">Save</button></helix-headless-card>',
    )) as Held
    expect(held(full)).toEqual(['has-media', 'has-header', 'has-footer'])
  })

  test('follow a region filled or emptied later', async () => {
    const card = (await mount('<helix-headless-card>Body</helix-headless-card>')) as Held
    const header = document.createElement('h3')
    header.slot = 'header'
    card.append(header)
    await new Promise((resolve) => setTimeout(resolve, 0))
    await card.updateComplete
    expect(held(card)).toEqual(['has-header'])
    header.remove()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await card.updateComplete
    expect(held(card)).toEqual([])
  })
})
