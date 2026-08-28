import { beforeAll, describe, expect, test } from 'bun:test'
import {
  formValue,
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const select = async (extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-headless-select label="L" name="c" ${extra}>
    <helix-headless-option value="one">Alpha</helix-headless-option>
    <helix-headless-option value="two">Beta</helix-headless-option>
  </helix-headless-select>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

/* The panel is positioned in a microtask after the render that reveals it, so
   a spec that reads straight after `updateComplete` sees the stylesheet's
   position and not the controller's. Waiting on the flag rather than on a timer
   keeps it honest: if placement never happens this hangs and is reported,
   rather than passing because a guessed delay happened to be long enough. */
const placed = async (surface: HTMLElement): Promise<void> => {
  for (let attempt = 0; attempt < 50 && !surface.hasAttribute('data-placed'); attempt += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
}

const trigger = (host: Updatable): HTMLElement =>
  part(host as HTMLElement, 'trigger') as HTMLElement
const shown = (host: Updatable): string =>
  (part(host as HTMLElement, 'value') as HTMLElement).textContent?.trim() ?? ''

describe('select', () => {
  test('the options reach the listbox through the slot', async () => {
    /* The fault the three-family split was for. The options are the consumer's
       light DOM, slotted into a listbox in this component's shadow root, so
       from the listbox's side its only child is a slot: a plain
       `querySelectorAll` finds the slot and no options, and the whole thing
       comes up empty. */
    const host = await select()
    const listbox = part(host as HTMLElement, 'listbox') as HTMLElement & {
      options: HTMLElement[]
    }
    expect(listbox.options.length).toBe(2)
  })

  test('nothing chosen shows the placeholder', async () => {
    const host = await select('placeholder="Pick one"')
    expect(shown(host)).toBe('Pick one')
  })

  test('the trigger says whether the list is open', async () => {
    const host = await select()
    expect(trigger(host).getAttribute('aria-expanded')).toBe('false')
    ;(host as Updatable & { open: boolean }).open = true
    await settle(host)
    expect(trigger(host).getAttribute('aria-expanded')).toBe('true')
  })

  test('the answer is the select own, and is what the form submits', async () => {
    // The listbox is the thing being operated, not a second place the answer
    // lives.
    const host = await select('value="one"')
    expect(formValue(host)).toBe('one')
  })

  test('required says so in its own words once asked', async () => {
    const host = await select('required')
    expect(part(host as HTMLElement, 'feedback')).toBeNull()

    host.dispatchEvent(new Event('invalid'))
    await settle(host)
    expect((part(host as HTMLElement, 'feedback') as HTMLElement).textContent?.trim()).toBe(
      'Choose one to continue.',
    )
  })

  test('the inner list is named by the label, not labeled with it', async () => {
    /* The select already shows the words above its trigger, so the listbox
       inside the panel rendering them again put a heading in the dropdown.
       It still needs the name, which is why this is `aria-label` and not a
       dropped attribute: the mixin renders it clipped, so the list keeps a
       name a screen reader reads. */
    const host = (await select()) as unknown as HTMLElement
    const listbox = part(host, 'listbox')
    expect(listbox?.getAttribute('aria-label')).toBe('L')
    expect(listbox?.hasAttribute('label')).toBe(false)
  })
})

if (hasLayout()) {
  test('the panel is placed rather than left where the stylesheet put it', async () => {
    // The controller was constructed and never started, which is invisible in
    // review: the field renders, the list opens, and the panel simply sits at
    // the host's own top-left, over the label and above the trigger. What says
    // it ran is `position: fixed`, which the controller writes inline and the
    // stylesheet does not: the sheet says `absolute`.
    const host = (await select('open')) as unknown as HTMLElement
    const surface = part(host, 'surface') as HTMLElement
    // Placement is async, so this waits for the flag rather than for a render.
    await placed(surface)
    expect(surface.style.position).toBe('fixed')
  })

  test('the panel is told how wide its trigger is, because CSS cannot ask', async () => {
    // `min-inline-size: 100%` on a `position: fixed` panel is the viewport, so
    // the list came out the full width of the window. The controller publishes
    // the anchor's width and the stylesheet reads that instead.
    const host = (await select('open')) as unknown as HTMLElement
    const surface = part(host, 'surface') as HTMLElement
    await placed(surface)
    expect(surface.style.getPropertyValue('--floating-anchor-width')).toMatch(/^\d+px$/)
  })

  describe('select trigger text', () => {
    /* Only in a browser, and not for layout: what these need is slot
       flattening across two roots. The options are the select's light DOM,
       assigned to a slot that is itself inside a listbox in the select's shadow
       root, and `assignedElements({ flatten: true })` does not resolve that
       chain in happy-dom. `hasLayout` is standing in for "a real engine",
       which is the same thing being asked for. */
    test('the trigger says what is chosen, once the options have arrived', async () => {
      /* Read off the options rather than stored, because the words are the
         consumer's content and a copy goes stale. Which is why it waits: on the
         first render the slot is not assigned, so a select with a value came up
         showing its placeholder. */
      const host = await select('value="two"')
      expect(shown(host)).toBe('Beta')
    })

    test('several chosen are read out together', async () => {
      const host = await select('multiple value="one,two"')
      expect(shown(host)).toBe('Alpha, Beta')
    })
  })
}

if (hasLayout()) {
  describe('select in a browser', () => {
    test('the open panel is in the top layer, not merely positioned', async () => {
      /* This is the defect the shared controller was extracted to fix. The
         select had a `FloatingController` and a `DismissController` and never
         called `showPopover`, so its panel was an ordinary positioned element:
         placed correctly, and clipped by the first ancestor with `overflow:
         hidden`, while a menu in the same position was not.

         `:popover-open` is the only thing that distinguishes the two. A panel
         that is merely visible passes every other spec in this file. */
      const host = (await mount(
        `<helix-headless-select label="Fruit" open>
          <helix-headless-option value="apple">Apple</helix-headless-option>
          <helix-headless-option value="pear">Pear</helix-headless-option>
        </helix-headless-select>`,
      )) as HTMLElement & { updateComplete: Promise<boolean> }
      await host.updateComplete
      const surface = part(host, 'surface') as HTMLElement
      expect(surface.matches(':popover-open')).toBe(true)
    })

    test('a closed panel is not in it, and paints nothing', async () => {
      const host = (await mount(
        `<helix-headless-select label="Fruit">
          <helix-headless-option value="apple">Apple</helix-headless-option>
        </helix-headless-select>`,
      )) as HTMLElement & { updateComplete: Promise<boolean> }
      await host.updateComplete
      const surface = part(host, 'surface') as HTMLElement
      expect(surface.matches(':popover-open')).toBe(false)
      expect(surface.getBoundingClientRect().height).toBe(0)
    })
  })
}

if (hasLayout()) {
  describe('choosing an option with a pointer', () => {
    /* Browser-only because the chain crosses a slot: the option is the
       consumer's element, slotted into the listbox inside the select's shadow
       root, and happy-dom does not propagate an event from slotted content
       through the `<slot>`. Every existing spec here chooses by setting `value`
       or by calling `select()`, which is why nothing caught that a select could
       not be operated with a mouse at all. */
    const opened = async (attrs = ''): Promise<Updatable & { value: string }> => {
      const host = (await mount(
        `<helix-headless-select label="Fruit" name="fruit" ${attrs}>
          <helix-headless-option value="apple">Apple</helix-headless-option>
          <helix-headless-option value="pear">Pear</helix-headless-option>
        </helix-headless-select>`,
      )) as Updatable & { value: string }
      await host.updateComplete
      ;(part(host as HTMLElement, 'trigger') as HTMLElement).click()
      await host.updateComplete
      return host
    }

    const press = async (host: HTMLElement, value: string): Promise<void> => {
      const option = host.querySelector(`helix-headless-option[value="${value}"]`) as HTMLElement
      await (option as unknown as { updateComplete: Promise<boolean> }).updateComplete
      const row = option.shadowRoot?.querySelector('[part="item"]') as HTMLElement | null
      if (!row) {
        throw new Error('the option renders no row, so there is nothing to press')
      }
      row.click()
      await (host as unknown as { updateComplete: Promise<boolean> }).updateComplete
      await new Promise((done) => setTimeout(done, 20))
    }

    test('a click chooses the option and the trigger says so', async () => {
      const host = await opened()
      await press(host as HTMLElement, 'pear')
      expect(host.value).toBe('pear')
      expect((part(host as HTMLElement, 'trigger') as HTMLElement).textContent?.trim()).toBe('Pear')
    })

    test('and it closes, because the question has been answered', async () => {
      const host = await opened()
      await press(host as HTMLElement, 'pear')
      expect(hasState(host as HTMLElement, 'open')).toBe(false)
    })

    test('a multiple stays open, and the answers accumulate', async () => {
      /* A multi-select that shut after each pick is a control the reader has to
         reopen to use again. */
      const host = await opened('multiple')
      await press(host as HTMLElement, 'pear')
      expect(hasState(host as HTMLElement, 'open')).toBe(true)
      await press(host as HTMLElement, 'apple')
      expect(host.value).toBe('pear,apple')
      expect(hasState(host as HTMLElement, 'open')).toBe(true)
    })
  })
}

describe('the trigger closes the panel it opened', () => {
  /* A real press is `pointerdown` then `click`, and the order is the whole bug:
     the dismisser listens on `pointerdown` and the trigger toggles on `click`.
     Dispatching `click` alone never reaches the dismisser and the spec passes
     on the broken code. */
  const press = (el: Element): void => {
    for (const type of ['pointerdown', 'pointerup']) {
      el.dispatchEvent(new Event(type, { bubbles: true, composed: true }))
    }
    el.dispatchEvent(new Event('click', { bubbles: true, composed: true }))
  }

  test('a second press closes it, rather than closing and reopening', async () => {
    const host = (await select()) as Updatable & { open: boolean }
    const trigger = part(host, 'trigger') as HTMLElement

    press(trigger)
    await settle(host)
    expect(host.open).toBe(true)

    press(trigger)
    await settle(host)
    expect(host.open).toBe(false)

    press(trigger)
    await settle(host)
    expect(host.open).toBe(true)
  })

  test('and a press outside still closes it, which is what the boundary is for', async () => {
    // The trigger joined the boundary; the rest of the document must not have.
    const host = (await select()) as Updatable & { open: boolean }
    press(part(host, 'trigger') as HTMLElement)
    await settle(host)
    expect(host.open).toBe(true)

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }))
    await settle(host)
    expect(host.open).toBe(false)
  })
})
