import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role, slotted } from '@helix-io/testing/dom'

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
    // wrapper element at all.
    expect(card.shadowRoot?.querySelectorAll('div').length).toBe(0)
    expect(card.shadowRoot?.querySelectorAll('slot').length).toBe(4)
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

  test('carries the group role', async () => {
    const card = await mount('<helix-headless-card>Body</helix-headless-card>')
    // On the host, since the host is the box.
    expect(role(card)).toBe('group')
  })

  test('a consumer-supplied name is left alone', async () => {
    const card = await mount('<helix-headless-card aria-label="Report">Body</helix-headless-card>')
    expect(card.getAttribute('aria-label')).toBe('Report')
  })
})
