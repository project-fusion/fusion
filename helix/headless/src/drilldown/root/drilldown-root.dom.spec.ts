import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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

  test('and refusing that choice leaves the stack on its page', async () => {
    /* `helix-select` is cancelable and the row documents it as refusable. The
       drill is the one thing in the library that acts on it, so a refusal
       nothing read left the stack moving anyway: valid code, no error, and the
       navigation happening regardless.

       Refused from above and in capture, which is the only position there is.
       This element stops the event in capture so a consumer does not hear
       navigation as a choice, and that stop is ahead of the row and of the host
       alike, so a listener nearer the event never runs at all. */
    const host = await stack()
    const refuse = (event: Event): void => event.preventDefault()
    document.addEventListener('helix-select', refuse, true)
    await press(host, host.querySelector('helix-headless-drilldown-item') as Element)
    document.removeEventListener('helix-select', refuse, true)
    expect(showing(host)).toEqual(['appearance', 'about'])
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
    expect(hasState(host, 'drilled')).toBe(true)

    host.back()
    await host.updateComplete
    expect(host.getAttribute('data-direction')).toBe('back')
    expect(hasState(host, 'drilled')).toBe(false)
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

/* In is where a row's caret points, along the line, and back is the other way.
   On a right-to-left page the caret points left, and the right arrow had gone
   in past it.

   A browser's, because the stack finds the row a press came from by
   `:focus-within`, and happy-dom does not match it on a row whose focus is
   inside its own shadow root: there, no press comes from any row. */
const browser = hasLayout() ? test : (): void => {}

const key = async (host: Stack, name: string): Promise<void> => {
  host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: name }))
  await host.updateComplete
}

const onAppearance = async (): Promise<Stack> => {
  const host = await stack()
  ;(host.querySelector('[value="appearance"]') as HTMLElement & { focusItem(): void }).focusItem()
  return host
}

describe('the horizontal arrows', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  browser('go in with the right arrow and back with the left', async () => {
    const host = await onAppearance()
    await key(host, 'ArrowRight')
    expect(showing(host)).toEqual(['theme'])
    await key(host, 'ArrowLeft')
    expect(showing(host)).toEqual(['appearance', 'about'])
  })

  browser('and the other way round on a right-to-left page', async () => {
    document.documentElement.dir = 'rtl'
    const host = await onAppearance()
    await key(host, 'ArrowRight')
    expect(showing(host)).toEqual(['appearance', 'about'])
    await key(host, 'ArrowLeft')
    expect(showing(host)).toEqual(['theme'])
    await key(host, 'ArrowRight')
    expect(showing(host)).toEqual(['appearance', 'about'])
  })
})

/**
 * Moving within a page is `KeyboardNavigationController`'s, reached by reserving
 * the horizontal pair the drill uses.
 *
 * Asserted here rather than taken on trust, because reserving is a claim about
 * the keys this component binds and nothing else holds the two halves together:
 * the vertical pair and Home and End have to still move, and the horizontal
 * pair has to still drill.
 */
describe('moving within a page', () => {
  const current = (): string => (document.activeElement as Item | null)?.value ?? ''

  browser('down and up walk the rows, and the ends join up', async () => {
    const host = await onAppearance()
    await key(host, 'ArrowDown')
    expect(current()).toBe('about')
    await key(host, 'ArrowDown')
    expect(current()).toBe('appearance')
    await key(host, 'ArrowUp')
    expect(current()).toBe('about')
  })

  /* Backward from nothing is the last row, which is the controller's reading
     and `Menu`'s: a reader arrowing up into a page they have not entered wants
     the end of it. */
  browser('up from nothing lands on the last row', async () => {
    const host = await stack()
    await key(host, 'ArrowUp')
    expect(current()).toBe('about')
  })

  browser('Home and End go to the ends', async () => {
    const host = await onAppearance()
    await key(host, 'End')
    expect(current()).toBe('about')
    await key(host, 'Home')
    expect(current()).toBe('appearance')
  })

  /* Arriving is not choosing here, which is why the controller is given
     `selects: false`: a row that followed itself on the way past would take the
     reader somewhere they were only passing through. */
  browser('arriving at a row does not follow it', async () => {
    const host = await onAppearance()
    let heard = ''
    host.addEventListener('helix-select', (event: Event) => {
      heard = (event as CustomEvent<{ value: string }>).detail.value
    })
    await key(host, 'ArrowDown')
    expect(heard).toBe('')
    expect(showing(host)).toEqual(['appearance', 'about'])
  })
})

describe('the way back out of a page', () => {
  /* The header's control is a caret and nothing else, so `backLabel` is its
     whole accessible name: unnamed, a reader two pages in hears "button" and
     has to press it to find out what it does.

     It cannot be asserted on the server. Whether there is anywhere to go back
     to is a fact about children, and Lit SSR gives this element no tree to read
     them from, so a served drilldown is always at its root.

     A phrase the component does not default to, `backLabel` holding "Back", so
     a template writing the literal would not satisfy this. */
  test('is named, and exists only once there is somewhere to go back to', async () => {
    const host = await stack()
    host.setAttribute('back-label', 'Up one')
    await host.updateComplete
    expect(part(host, 'back')).toBeNull()

    await press(host, host.querySelector('[value="appearance"]') as Element)
    expect(part(host, 'back')?.getAttribute('aria-label')).toBe('Up one')
  })

  test('an arrow in a field on the page moves its caret, and Escape still goes back', async () => {
    /* A filter above the rows is the case: ArrowLeft there went back a page,
       out from under a reader who was only editing what they had typed. */
    const host = await stack()
    await press(host, host.querySelector('[value="appearance"]') as Element)
    const field = document.createElement('input')
    host.append(field)
    field.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }),
    )
    await host.updateComplete
    expect(showing(host)).toContain('theme')

    field.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }),
    )
    await host.updateComplete
    expect(showing(host)).not.toContain('theme')
  })
})

/* What this family says where there is nothing in it, and while it is fetching.
 *
 * **The words, the moment they appear and which of the two beats the other
 * belong to `MixinCollection`**, which has its own spec beside it in
 * `helix/core`. What belongs here is the one thing the mixin cannot decide,
 * which is what *this* family counts as having rows: every host passes a
 * different expression, so one that got it wrong says "Nothing to show" over a
 * full set, or says nothing at all over an empty one, with the mixin behaving
 * perfectly either way.
 *
 * Words the mixin does not default to, since it holds "Nothing to show" and
 * "Loading": read against those, the assertion is satisfied by the mixin alone
 * and says nothing about the string reaching it from here. */
describe('an empty page of a drilldown', () => {
  test('says the consumer’s words where there is nothing in it', async () => {
    const host = await mount(
      '<helix-headless-drilldown label="Settings" empty-text="Nothing here yet"></helix-headless-drilldown>',
    )
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nothing here yet')
  })

  test('and says it is fetching instead, which beats being empty', async () => {
    /* A set that has not arrived is not a set that is empty, so a reader is
       never told there is nothing while a request is still in flight. */
    const host = await mount(
      '<helix-headless-drilldown label="Settings" loading loading-text="Still fetching"></helix-headless-drilldown>',
    )
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Still fetching')
    expect(part(host, 'empty')).toBeNull()
  })
})
