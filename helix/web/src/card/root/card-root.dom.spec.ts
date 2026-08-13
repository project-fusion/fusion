import { beforeAll, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

beforeAll(async () => {
  GlobalRegistrator.register()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete?: Promise<unknown> }

/**
 * Waits for the element to settle.
 *
 * A card names itself from a title in its light DOM, which it cannot see until
 * `slotchange` fires. That is one microtask after insertion, and the resulting
 * update is another, so a single `updateComplete` observes the card before it
 * has found its title.
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

/**
 * Resolves an ARIA reference the way a browser does: within the tree scope of
 * the element carrying the attribute.
 *
 * This is the check the original specs were missing. They asserted that
 * `aria-labelledby` equalled the title's id, which was true while the reference
 * pointed from inside the shadow root at a light-DOM element and could never
 * resolve. An ARIA test that does not resolve proves nothing.
 */
const accessibleNameSource = (element: Element): Element | null => {
  const id = element.getAttribute('aria-labelledby')
  if (!id) {
    return null
  }
  const scope = element.getRootNode() as Document | ShadowRoot
  return scope.getElementById?.(id) ?? null
}

describe('card naming', () => {
  test('the name resolves to a nested title', async () => {
    const card = await mount(`
      <helix-card>
        <helix-card-header>
          <helix-card-title>Quarterly report</helix-card-title>
        </helix-card-header>
        <helix-card-body>Body</helix-card-body>
      </helix-card>
    `)

    const title = card.querySelector('helix-card-title')
    expect(accessibleNameSource(card)).toBe(title)
  })

  test('the reference lives on the host, where it can resolve', async () => {
    const card = await mount('<helix-card><helix-card-title>T</helix-card-title></helix-card>')

    // Not on the shadow container: IDREFs do not cross shadow boundaries.
    expect(card.shadowRoot?.querySelector('[aria-labelledby]')).toBeNull()
    expect(card.getAttribute('role')).toBe('group')
    expect(accessibleNameSource(card)).not.toBeNull()
  })

  test('a consumer-supplied id is left alone and still resolves', async () => {
    const card = await mount(
      '<helix-card><helix-card-title id="mine">T</helix-card-title></helix-card>',
    )

    expect(card.querySelector('helix-card-title')?.id).toBe('mine')
    expect(accessibleNameSource(card)?.id).toBe('mine')
  })

  test('a card without a title carries no dangling reference', async () => {
    const card = await mount('<helix-card><helix-card-body>No title</helix-card-body></helix-card>')
    expect(card.hasAttribute('aria-labelledby')).toBe(false)
  })

  test('ids are unique across cards on one page', async () => {
    document.body.innerHTML = `
      <helix-card><helix-card-title>One</helix-card-title></helix-card>
      <helix-card><helix-card-title>Two</helix-card-title></helix-card>
    `
    const titles = [...document.querySelectorAll('helix-card-title')] as Updatable[]
    // Ids are assigned in `willUpdate`, so they do not exist synchronously.
    await Promise.all(titles.map(settle))

    const ids = titles.map((t) => t.id)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('card title', () => {
  test('renders as a heading at the requested level', async () => {
    const card = await mount(
      '<helix-card><helix-card-title level="2">H</helix-card-title></helix-card>',
    )
    const title = card.querySelector('helix-card-title') as Updatable
    await settle(title)

    const heading = title.shadowRoot?.querySelector("[part='heading']")
    expect(heading?.getAttribute('role')).toBe('heading')
    expect(heading?.getAttribute('aria-level')).toBe('2')
  })
})
