import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* happy-dom before the element, and the import dynamic for it: an element
   registered against the `customElements` happy-dom replaces never upgrades. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Lightbox = HTMLElement & {
  active: string
  close(): void
  idleDelay: number
  loop: boolean
  next(): void
  open: boolean
  previous(): void
  show(): void
  statusLabel: string
  updateComplete: Promise<boolean>
}

const lightbox = async (extra = ''): Promise<Lightbox> =>
  (await mount(
    `<helix-headless-lightbox label="Photos" ${extra}>
      <helix-headless-lightbox-item value="one" label="A harbour"></helix-headless-lightbox-item>
      <helix-headless-lightbox-item value="two" label="A hill"></helix-headless-lightbox-item>
      <helix-headless-lightbox-item value="three" label="A street"></helix-headless-lightbox-item>
    </helix-headless-lightbox>`,
  )) as Lightbox

/** Which item the root has marked as the one being shown. */
const shown = (host: Lightbox): string | undefined =>
  [...host.children]
    .find((child) => (child as { current?: boolean }).current)
    ?.getAttribute('value') ?? undefined

describe('lightbox', () => {
  test('it renders a real dialog element, not a div with a role', async () => {
    /* The whole modal half rests on this: the top layer, the backdrop, Escape
       and inert-behind are the platform's, and none of them are available to a
       div however it is labeled. */
    const host = await lightbox()
    expect((part(host, 'dialog') as HTMLElement).tagName.toLowerCase()).toBe('dialog')
  })

  test('a set with no `active` still shows something', async () => {
    // Every set before its consumer has chosen, which is most of them.
    const host = await lightbox()
    expect(shown(host)).toBe('one')
  })

  test('`active` names which item is shown, and only that one', async () => {
    const host = await lightbox('active="two"')
    expect(shown(host)).toBe('two')
    expect(
      [...host.children].filter((child) => (child as { current?: boolean }).current),
    ).toHaveLength(1)
  })

  test('the arrows walk the set rather than moving focus', async () => {
    /* The reader's focus stays in the dialog and the picture moves under it,
       which is why this is not `KeyboardNavigationController`: that one calls
       `focusItem()` on items that are controls, and these are pictures. */
    const host = await lightbox('open')
    await host.updateComplete
    const dialog = part(host, 'dialog') as HTMLElement
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }))
    await host.updateComplete
    expect(shown(host)).toBe('two')

    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }))
    await host.updateComplete
    expect(shown(host)).toBe('one')
  })

  test('the walk stops at the ends, and loops only when asked', async () => {
    const host = await lightbox('active="one"')
    host.previous()
    await host.updateComplete
    expect(shown(host)).toBe('one')

    host.loop = true
    host.previous()
    await host.updateComplete
    expect(shown(host)).toBe('three')
  })

  test('a step that goes nowhere asks for nothing, before anything was chosen too', async () => {
    // The first picture is shown with `active` naming none, and is still shown.
    const host = await lightbox('open')
    await host.updateComplete
    const asked: Event[] = []
    host.addEventListener('helix-before-activate', (event) => asked.push(event))
    host.previous()
    const dialog = part(host, 'dialog') as HTMLElement
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }))
    await host.updateComplete
    expect(asked).toHaveLength(0)
  })

  test('Home and End are an index rather than a step', async () => {
    const host = await lightbox('open active="two"')
    await host.updateComplete
    const dialog = part(host, 'dialog') as HTMLElement
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }))
    await host.updateComplete
    expect(shown(host)).toBe('three')

    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }))
    await host.updateComplete
    expect(shown(host)).toBe('one')
  })

  test('a refused walk leaves the shown item where it was', async () => {
    // The set moves through `requestActive`, so `helix-before-activate` is a
    // veto rather than an announcement.
    const host = await lightbox('active="one"')
    host.addEventListener('helix-before-activate', (event) => {
      event.preventDefault()
    })
    host.next()
    await host.updateComplete
    expect(shown(host)).toBe('one')
    expect(host.active).toBe('one')
  })

  test('it says where in the set the reader is, once they have moved', async () => {
    const host = await lightbox('open')
    await host.updateComplete
    const live = part(host, 'live') as HTMLElement
    expect(live.getAttribute('role')).toBe('status')
    host.next()
    await host.updateComplete
    expect(live.textContent?.trim()).toBe('2 of 3')
  })

  test('a consumer with their own counter can empty the reading', async () => {
    const host = await lightbox('open status-label=""')
    await host.updateComplete
    host.next()
    await host.updateComplete
    expect((part(host, 'live') as HTMLElement).textContent?.trim()).toBe('')
  })

  test('closing is a request a consumer can refuse', async () => {
    const host = await lightbox('open')
    await host.updateComplete
    host.addEventListener('helix-before-close', (event) => {
      event.preventDefault()
    })
    host.close()
    await host.updateComplete
    expect(host.open).toBe(true)
    expect(hasState(host, 'open')).toBe(true)
  })

  test('the chrome hides once the reader has been still, and comes back', async () => {
    const host = await lightbox('open idle-delay="10"')
    await host.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 30))
    await host.updateComplete
    expect(hasState(host, 'idle')).toBe(true)

    const dialog = part(host, 'dialog') as HTMLElement
    dialog.dispatchEvent(new Event('pointermove', { bubbles: true }))
    await host.updateComplete
    expect(hasState(host, 'idle')).toBe(false)
  })

  test('the chrome stays up where no wait was asked for', async () => {
    // Zero is a viewer with a caption worth reading, which is the default.
    const host = await lightbox('open')
    await host.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(hasState(host, 'idle')).toBe(false)
  })

  test("a field in the chrome keeps its arrows, and a chord is the browser's", async () => {
    /* A caption being edited in the footer is the case, and Alt with an arrow
       is back and forward. Said through `composedPath`, which is what a
       browser reports for a press from slotted content: happy-dom does not
       carry one through the shadow root to the dialog. */
    const host = await lightbox('open')
    await host.updateComplete
    const dialog = part(host, 'dialog') as HTMLElement
    const field = document.createElement('input')
    const typed = new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })
    Object.defineProperty(typed, 'composedPath', { value: () => [field, dialog] })
    dialog.dispatchEvent(typed)
    await host.updateComplete
    expect(shown(host)).toBe('one')

    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { altKey: true, bubbles: true, key: 'ArrowRight' }),
    )
    await host.updateComplete
    expect(shown(host)).toBe('one')
  })
})

describe('the chrome and a keyboard reader', () => {
  /* Only the pointer and focus counted as activity, and the styled tier hides
     the chrome with `visibility: hidden`, so a keyboard reader on a control in
     it lost focus to the body and the arrow keys stopped working. */
  test('a key press counts as being there', async () => {
    const host = await lightbox('open idle-delay="10"')
    await host.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 30))
    await host.updateComplete
    const rested = hasState(host, 'idle')
    const dialog = part(host, 'dialog') as HTMLElement
    dialog.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Shift' }))
    await host.updateComplete
    expect([rested, hasState(host, 'idle')]).toEqual([true, false])
  })

  test('and the chrome stays while focus is on a control in it', async () => {
    const host = (await mount(
      `<helix-headless-lightbox label="Photos" open idle-delay="10">
        <div slot="header"><button>Close</button></div>
        <helix-headless-lightbox-item value="one" label="A harbour"></helix-headless-lightbox-item>
      </helix-headless-lightbox>`,
    )) as Lightbox
    await host.updateComplete
    host.querySelector('button')?.focus()
    await new Promise((resolve) => setTimeout(resolve, 30))
    await host.updateComplete
    expect(hasState(host, 'idle')).toBe(false)
  })
})

describe('the reading', () => {
  test('can name the item, as its `label` says', async () => {
    const host = await lightbox('open status-label="{label}, {index} of {count}"')
    await host.updateComplete
    host.next()
    await host.updateComplete
    expect((part(host, 'live') as HTMLElement).textContent?.trim()).toBe('A hill, 2 of 3')
  })
})

describe('the page behind an open viewer', () => {
  test('does not scroll, and scrolls again once it closes', async () => {
    const root = document.documentElement
    const host = await lightbox('open')
    await host.updateComplete
    const held = root.style.overflow
    host.close()
    await host.updateComplete
    expect([held, root.style.overflow]).toEqual(['hidden', ''])
  })
})
