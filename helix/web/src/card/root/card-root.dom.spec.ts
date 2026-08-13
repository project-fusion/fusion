import { beforeAll, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

beforeAll(async () => {
  GlobalRegistrator.register()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete?: Promise<unknown> }

const mount = async (html: string): Promise<HTMLElement> => {
  document.body.innerHTML = html
  const root = document.body.firstElementChild as Updatable
  await root.updateComplete
  return root
}

const part = (host: HTMLElement, name: string): Element | null =>
  host.shadowRoot?.querySelector(`[part='${name}']`) ?? null

const slotted = (host: HTMLElement, name?: string): Element[] => {
  const selector = name ? `slot[name='${name}']` : 'slot:not([name])'
  const slot = host.shadowRoot?.querySelector(selector) as HTMLSlotElement | null
  return (slot?.assignedElements?.() ?? []) as Element[]
}

describe('card regions', () => {
  test('renders one element, not five', async () => {
    const card = await mount(`
      <helix-card>
        <h2 slot="header">Title</h2>
        Body
        <button slot="footer">Act</button>
      </helix-card>
    `)
    // The regions are parts of one shadow root, not separate custom elements.
    expect(card.querySelectorAll('helix-card-header, helix-card-body').length).toBe(0)
    expect(part(card, 'header')).not.toBeNull()
    expect(part(card, 'body')).not.toBeNull()
    expect(part(card, 'footer')).not.toBeNull()
  })

  test('routes content to the right region', async () => {
    const card = await mount(`
      <helix-card>
        <h2 slot="header">Title</h2>
        <p>Body</p>
        <button slot="footer">Act</button>
      </helix-card>
    `)
    expect(slotted(card, 'header')[0]?.tagName).toBe('H2')
    expect(slotted(card)[0]?.tagName).toBe('P')
    expect(slotted(card, 'footer')[0]?.tagName).toBe('BUTTON')
  })

  test('a consumer heading stays a real heading', async () => {
    // The reason a title is a slot rather than an element: an <h2> beats a
    // <div role="heading"> and needs no `level` prop to say so.
    const card = await mount('<helix-card><h2 slot="header">T</h2>Body</helix-card>')
    const heading = slotted(card, 'header')[0]
    expect(heading?.tagName).toBe('H2')
    expect(heading?.getAttribute('role')).toBeNull()
  })

  test('carries the group role', async () => {
    const card = await mount('<helix-card>Body</helix-card>')
    expect(part(card, 'container')?.getAttribute('role')).toBe('group')
  })

  test('a consumer-supplied name is left alone', async () => {
    const card = await mount('<helix-card aria-label="Report">Body</helix-card>')
    expect(card.getAttribute('aria-label')).toBe('Report')
  })
})
