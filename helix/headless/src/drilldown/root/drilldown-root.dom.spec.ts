import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, role } from '@fusion.dev/helix-testing/dom'

/* happy-dom before the element, and the import dynamic for that reason: an
   element registered against the `customElements` happy-dom then replaces never
   upgrades, and every read comes back undefined. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & { onPage: boolean; showingPage: boolean; value: string }
type Stack = HTMLElement & { back(): boolean; updateComplete: Promise<boolean> }

const stack = async (): Promise<Stack> =>
  (await mount(
    `<helix-headless-drilldown label="Settings">
      <helix-headless-drilldown-item value="appearance">Appearance
        <helix-headless-drilldown-item slot="page" value="theme">Theme</helix-headless-drilldown-item>
      </helix-headless-drilldown-item>
      <helix-headless-drilldown-item value="about">About</helix-headless-drilldown-item>
    </helix-headless-drilldown>`,
  )) as Stack

/** The rows a reader can see, which is the whole of what a page is. */
const showing = (host: HTMLElement): string[] =>
  [...host.querySelectorAll('helix-headless-drilldown-item')]
    .filter((item) => (item as Item).onPage)
    .map((item) => (item as Item).value)

const press = async (host: Stack, target: Element): Promise<void> => {
  target.shadowRoot?.querySelector<HTMLElement>('[part="item"]')?.click()
  await host.updateComplete
}

describe('drilldown', () => {
  test('the region says what it is through internals, not an attribute', async () => {
    const host = await stack()
    expect(role(host)).toBe('menu')
    expect(host.hasAttribute('role')).toBe(false)
  })

  test('only the top page shows to begin with', async () => {
    expect(showing(await stack())).toEqual(['appearance', 'about'])
  })

  test('a row with a page drills instead of announcing', async () => {
    /* Going somewhere and choosing something are different acts. A consumer
       listening for a choice should not hear navigation as one, so the row that
       drills stops its own event. */
    const host = await stack()
    let heard = ''
    host.addEventListener('helix-select', (event) => {
      heard = (event as CustomEvent<{ value: string }>).detail.value
    })
    await press(host, host.querySelector('helix-headless-drilldown-item') as Element)
    expect(showing(host)).toEqual(['theme'])
    expect(heard).toBe('')
  })

  test('a row with no page announces instead of drilling', async () => {
    const host = await stack()
    let heard = ''
    host.addEventListener('helix-select', (event) => {
      heard = (event as CustomEvent<{ value: string }>).detail.value
    })
    /* By value, not by index. `querySelectorAll` finds nested rows too, so
       index 1 is the page's own row rather than the second row of this page. */
    await press(host, host.querySelector('[value="about"]') as Element)
    expect(heard).toBe('about')
    expect(showing(host)).toEqual(['appearance', 'about'])
  })

  test('back returns one page and says which way it went', async () => {
    // The direction is the stack's to know: both moves replace one page with
    // another, and nothing downstream can tell them apart without being told.
    const host = await stack()
    await press(host, host.querySelector('helix-headless-drilldown-item') as Element)
    expect(host.getAttribute('data-direction')).toBe('forward')
    expect(host.hasAttribute('data-drilled')).toBe(true)

    host.back()
    await host.updateComplete
    expect(host.getAttribute('data-direction')).toBe('back')
    expect(host.hasAttribute('data-drilled')).toBe(false)
    expect(showing(host)).toEqual(['appearance', 'about'])
  })

  test('back at the top does nothing and says so', async () => {
    const host = await stack()
    expect(host.back()).toBe(false)
  })

  test('the header arrives with the page, not before it', async () => {
    // Nothing to go back to at the top, so no bar and no empty title.
    const host = await stack()
    expect(host.shadowRoot?.querySelector('[part="header"]')).toBeNull()
    await press(host, host.querySelector('helix-headless-drilldown-item') as Element)
    expect(host.shadowRoot?.querySelector('[part="title"]')?.textContent?.trim()).toBe('Appearance')
  })

  /* The row renders its page's slot in two places, beside the row and as the
     page, and going in and out swaps one for the other. The slot thrown away
     fires on its way out with nothing assigned, which is what cleared every
     caret in `Menu` after one drill-in until it read the live slot instead. */
  test('the row that opened a page still says so after coming back from it', async () => {
    const host = await stack()
    const appearance = host.querySelector('[value="appearance"]') as HTMLElement
    const mark = () => appearance.shadowRoot?.querySelector('[part="mark"]') ?? null
    expect(mark()).not.toBeNull()
    expect(
      host.querySelector('[value="about"]')?.shadowRoot?.querySelector('[part="mark"]'),
    ).toBeNull()

    await press(host, appearance)
    host.back()
    await host.updateComplete
    await (appearance as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mark()).not.toBeNull()
  })
})
