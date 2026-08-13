import { beforeAll, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

beforeAll(async () => {
  GlobalRegistrator.register()
  await import('../index.js')
  await import('../../disclosure/index.js')
})

type Updatable = HTMLElement & { updateComplete?: Promise<unknown> }

/**
 * Waits for the element to settle.
 *
 * A card names itself from a title in its light DOM, which it cannot see until
 * `slotchange` fires. That is one microtask after insertion, and the resulting
 * `requestUpdate` is another, so a single `updateComplete` observes the card
 * before it has found its title.
 */
const settle = async (root: Updatable): Promise<void> => {
  await root.updateComplete
  await new Promise((resolve) => setTimeout(resolve, 0))
  await root.updateComplete
}

const mount = async (html: string): Promise<HTMLElement> => {
  document.body.innerHTML = html
  const root = document.body.firstElementChild as Updatable
  await settle(root)
  return root
}

const part = (host: HTMLElement, name: string): Element | null =>
  host.shadowRoot?.querySelector(`[part='${name}']`) ?? null

describe('card composition', () => {
  test('the root names itself from a nested title', async () => {
    const card = await mount(`
      <helix-card>
        <helix-card-header>
          <helix-card-title>Quarterly report</helix-card-title>
        </helix-card-header>
        <helix-card-body>Body</helix-card-body>
      </helix-card>
    `)

    const title = card.querySelector('helix-card-title') as HTMLElement
    expect(title.id).toBeTruthy()
    expect(part(card, 'container')?.getAttribute('aria-labelledby')).toBe(title.id)
  })

  test('a consumer-supplied id is left alone', async () => {
    const card = await mount(`
      <helix-card>
        <helix-card-title id="mine">Titled</helix-card-title>
      </helix-card>
    `)
    expect((card.querySelector('helix-card-title') as HTMLElement).id).toBe('mine')
    expect(part(card, 'container')?.getAttribute('aria-labelledby')).toBe('mine')
  })

  test('a card without a title is not left pointing at nothing', async () => {
    const card = await mount('<helix-card><helix-card-body>No title</helix-card-body></helix-card>')
    const labelledBy = part(card, 'container')?.getAttribute('aria-labelledby')
    expect(labelledBy === null || labelledBy === '').toBe(true)
  })

  test('the title renders as a heading at the requested level', async () => {
    const card = await mount(
      '<helix-card><helix-card-title level="2">H</helix-card-title></helix-card>',
    )
    const title = card.querySelector('helix-card-title') as Updatable
    await settle(title)
    const heading = title.shadowRoot?.querySelector("[part='heading']")
    expect(heading?.getAttribute('role')).toBe('heading')
    expect(heading?.getAttribute('aria-level')).toBe('2')
  })

  test('ids are unique across cards on one page', async () => {
    document.body.innerHTML = `
      <helix-card><helix-card-title>One</helix-card-title></helix-card>
      <helix-card><helix-card-title>Two</helix-card-title></helix-card>
    `
    const ids = [...document.querySelectorAll('helix-card-title')].map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
