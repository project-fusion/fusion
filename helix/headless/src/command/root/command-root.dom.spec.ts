import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const markup = `<helix-headless-command hotkey="mod+k" label="Commands">
  <helix-headless-option value="new">New file</helix-headless-option>
  <helix-headless-option value="open">Open recent</helix-headless-option>
  <helix-headless-option value="theme">Switch color mode</helix-headless-option>
</helix-headless-command>`

type Palette = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

/**
 * One update, then a turn of the loop for anything the listbox scheduled.
 *
 * Not a `while` on `updateComplete`. This element renders a dialog which
 * renders a listbox, and the promise resolving `false` means only that another
 * update was queued somewhere in that chain, not that this one is unsettled.
 * Looping on it waits for a chain that has no reason to end, and the wait is
 * inside the `await`, so a bound around the loop never gets a turn: the run
 * stops rather than the test failing.
 */
const settle = async (host: Palette): Promise<void> => {
  await host.updateComplete
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const palette = async (source = markup): Promise<Palette> => {
  const host = (await mount(source)) as Palette
  await settle(host)
  return host
}

const listbox = (host: Palette): HTMLElement & { requestFilter: (next: string) => boolean } =>
  part(host, 'listbox') as HTMLElement & { requestFilter: (next: string) => boolean }

const press = (key: string, extra: KeyboardEventInit = {}): void => {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
      ...extra,
    }),
  )
}

describe('command', () => {
  test('is shut until something opens it', async () => {
    const host = await palette()
    expect(host.open).toBe(false)
  })

  test('the hotkey answers from the document, not from the element', async () => {
    /* Which is the whole point of a palette: it is summoned from wherever the
       reader is, including from inside another control's text field. An element
       that only heard keys while it had focus could never be opened. */
    const host = await palette()
    press('k', { metaKey: true })
    await settle(host)
    expect(host.open).toBe(true)
  })

  test('and closes it again, so one key is the whole gesture', async () => {
    const host = await palette()
    press('k', { metaKey: true })
    await settle(host)
    press('k', { metaKey: true })
    await settle(host)
    expect(host.open).toBe(false)
  })

  test('`mod` is Control where there is no Command', async () => {
    // Resolved here so a consumer writes one thing rather than detecting the
    // platform and writing two.
    const host = await palette()
    press('k', { ctrlKey: true })
    await settle(host)
    expect(host.open).toBe(true)
  })

  test('the key alone is not enough when a modifier was asked for', async () => {
    const host = await palette()
    press('k')
    await settle(host)
    expect(host.open).toBe(false)
  })

  test('nor a modifier that was not', async () => {
    const host = await palette()
    press('k', { metaKey: true, shiftKey: true })
    await settle(host)
    expect(host.open).toBe(false)
  })

  test('an empty hotkey leaves the keyboard alone entirely', async () => {
    // For a consumer who opens it from a button, or who owns their own
    // shortcut handling and does not want two things fighting over one key.
    const host = await palette(markup.replace('hotkey="mod+k"', 'hotkey=""'))
    press('k', { metaKey: true })
    await settle(host)
    expect(host.open).toBe(false)
  })

  test('it stops listening once it leaves the page', async () => {
    // The listener is on the document, which outlives the element.
    const host = await palette()
    host.remove()
    press('k', { metaKey: true })
    await settle(host)
    expect(host.open).toBe(false)
  })

  test('the list is filterable, which is where the search comes from', async () => {
    const host = await palette()
    expect((listbox(host) as unknown as HTMLElement & { filterable: boolean }).filterable).toBe(
      true,
    )
  })

  test('`loading` reaches the list, which says so while the commands load', async () => {
    /* A palette filled from a server had no way to say it was waiting: the
       listbox has the state and the words, and nothing passed them down. */
    const host = await palette(
      markup.replace('label="Commands"', 'label="Commands" loading loading-text="Fetching"'),
    )
    const list = listbox(host) as unknown as HTMLElement & { loading: boolean; loadingText: string }
    expect(list.loading).toBe(true)
    expect(list.loadingText).toBe('Fetching')
  })
})

/* Choosing, and anything that follows from it, needs a real engine.
 *
 * The commands are light DOM children of this element, assigned to a slot in
 * its shadow root which is itself assigned to a slot in the listbox's. happy-dom
 * does not flatten that second hop, so the list comes up holding no options at
 * all and nothing can be chosen from it. Combobox's spec is split for the same
 * reason, and so is the footer's, whose slot sits inside a slotted wrapper.
 *
 * See `hasLayout`. */
if (hasLayout()) {
  describe('command, once a list can be chosen from', () => {
    test('the footer is not drawn when nobody filled it', async () => {
      /* A wrapper holding a slot always has a child element, which is the slot,
         so asking CSS whether it is empty always answers no and an empty footer
         drew its rule and its padding over nothing. */
      const bare = await palette()
      expect((part(bare, 'footer') as HTMLElement).hidden).toBe(true)

      const withOne = await palette(
        markup.replace(
          '</helix-headless-command>',
          '<span slot="footer">Esc to close</span></helix-headless-command>',
        ),
      )
      expect((part(withOne, 'footer') as HTMLElement).hidden).toBe(false)
    })

    test('choosing says so under this element"s name, once', async () => {
      /* The listbox says `helix-before-change`, which is right for a control
         that holds a value and wrong for a palette: nothing changed, a command
         ran. */
      const host = await palette()
      /* Values and identities kept apart, and the identity compared with `toBe`.
         A deep equality against an object holding a DOM node walks the node, and
         an element in a rendered document is a graph with cycles: that does not
         fail the test, it stops the run. */
      const heard: string[] = []
      const targets: EventTarget[] = []
      host.addEventListener('helix-select', (event) => {
        heard.push((event as CustomEvent<{ value: string }>).detail.value)
        targets.push(event.target as EventTarget)
      })
      let changes = 0
      host.addEventListener('helix-before-change', () => {
        changes += 1
      })

      listbox(host).requestFilter('color')
      ;(
        host.querySelector('helix-headless-option[value="theme"]') as HTMLElement & {
          select: () => void
        }
      ).select()
      await settle(host)

      expect(heard).toEqual(['theme'])
      expect(targets.length).toBe(1)
      expect(targets[0]).toBe(host)
      expect(changes).toBe(0)
    })

    test('and shuts the palette, because a command has been run', async () => {
      const host = await palette()
      press('k', { metaKey: true })
      await settle(host)
      ;(
        host.querySelector('helix-headless-option[value="new"]') as HTMLElement & {
          select: () => void
        }
      ).select()
      await settle(host)
      expect(host.open).toBe(false)
    })

    test('the same command chosen twice runs twice, the list keeping no answer between', async () => {
      const host = await palette()
      const heard: string[] = []
      host.addEventListener('helix-select', (event) =>
        heard.push((event as CustomEvent<{ value: string }>).detail.value),
      )
      const choose = async (): Promise<void> => {
        press('k', { metaKey: true })
        await settle(host)
        ;(
          host.querySelector('helix-headless-option[value="open"]') as HTMLElement & {
            select: () => void
          }
        ).select()
        await settle(host)
      }
      await choose()
      await choose()
      expect(heard).toEqual(['open', 'open'])
      expect(host.open).toBe(false)
    })

    test('a refused choice leaves it open and runs nothing', async () => {
      const host = await palette()
      press('k', { metaKey: true })
      await settle(host)
      host.addEventListener('helix-select', (event) => event.preventDefault())
      ;(
        host.querySelector('helix-headless-option[value="new"]') as HTMLElement & {
          select: () => void
        }
      ).select()
      await settle(host)
      expect(host.open).toBe(true)
    })

    test('a space typed in the filter is typed, and runs nothing', async () => {
      /* Measured before this: "open f" ran the highlighted command on the space
         and shut the palette with the filter emptied. */
      const host = await palette()
      const heard: string[] = []
      host.addEventListener('helix-select', (event) =>
        heard.push((event as CustomEvent<{ value: string }>).detail.value),
      )
      press('k', { metaKey: true })
      await settle(host)
      listbox(host).requestFilter('open')
      await settle(host)
      const field = listbox(host).shadowRoot?.querySelector('[part="search-field"]') as HTMLElement
      const space = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: ' ',
      })
      field.dispatchEvent(space)
      await settle(host)
      expect(space.defaultPrevented).toBe(false)
      expect(heard).toEqual([])
      expect(host.open).toBe(true)
    })

    test('the filter goes when the palette does', async () => {
      /* A palette is opened far more often than any other control here, so a
         second visit starting from the first one's search would be the version of
         this fault a reader meets most. */
      const host = await palette()
      press('k', { metaKey: true })
      await settle(host)
      // The words, not the value: an option is matched on what it says.
      listbox(host).requestFilter('color')
      await settle(host)
      expect(
        [...host.querySelectorAll('helix-headless-option')].filter((one) => !one.hidden).length,
      ).toBe(1)

      press('k', { metaKey: true })
      await settle(host)
      expect(
        [...host.querySelectorAll('helix-headless-option')].filter((one) => !one.hidden).length,
      ).toBe(3)
    })
  })
}

describe('the palette says how many commands are left', () => {
  test('in its own words as typing narrows the list', async () => {
    const host = await palette()
    listbox(host).requestFilter('e')
    await settle(host)
    const live = () =>
      listbox(host).shadowRoot?.querySelector('[part="live"]')?.textContent?.trim() ?? ''
    expect(live()).toBe('3 commands')
    listbox(host).requestFilter('new')
    await settle(host)
    expect(live()).toBe('1 command')
  })

  test('and its empty line takes slotted content', async () => {
    const host = await palette(
      markup.replace(
        '</helix-headless-command>',
        '<p slot="empty">No commands. <kbd>Esc</kbd> to close</p></helix-headless-command>',
      ),
    )
    listbox(host).requestFilter('zzz')
    await settle(host)
    const empty = listbox(host).shadowRoot?.querySelector('[part="empty"] slot') as HTMLSlotElement
    const flattened = empty.assignedNodes({ flatten: true })
    expect(flattened.map((node) => node.textContent).join('')).toContain('to close')
  })
})
