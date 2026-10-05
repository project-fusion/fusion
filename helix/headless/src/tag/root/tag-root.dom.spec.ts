import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('tag', () => {
  test('shows its label and nothing else by default', async () => {
    const tag = await mount('<helix-headless-tag>Draft</helix-headless-tag>')
    // The host is the box, so the shadow root holds the label slot and, when
    // asked for, the remove control. Nothing else.
    expect(tag.shadowRoot?.querySelector('slot')).not.toBeNull()
    expect(part(tag, 'dismiss')).toBeNull()
  })

  test('offers a named control when dismissible', async () => {
    const tag = await mount('<helix-headless-tag dismissible>Draft</helix-headless-tag>')
    const dismiss = part(tag, 'dismiss')
    expect(dismiss?.tagName).toBe('BUTTON')
    // A real button, so Enter and Space work without a key handler.
    expect(dismiss?.getAttribute('type')).toBe('button')
    expect(dismiss?.getAttribute('aria-label')).toBe('Remove Draft')
  })

  /* Each one was named "Remove", so a screen reader's list of buttons read
     "Remove, Remove, Remove" with nothing to say which tag each one takes. */
  test('names each remove control for its own tag, category first', async () => {
    const host = await mount(
      '<div><helix-headless-tag dismissible>Apple</helix-headless-tag><helix-headless-tag dismissible><span slot="start">Fruit</span>Plum</helix-headless-tag></div>',
    )
    const names = [...host.querySelectorAll('helix-headless-tag')].map((one) =>
      part(one as HTMLElement, 'dismiss')?.getAttribute('aria-label'),
    )
    expect(names).toEqual(['Remove Apple', 'Remove Fruit Plum'])
  })

  test('and `{label}` puts the words where a language wants them', async () => {
    const tag = await mount(
      '<helix-headless-tag dismissible dismiss-label="{label} entfernen">Apfel</helix-headless-tag>',
    )
    expect(part(tag, 'dismiss')?.getAttribute('aria-label')).toBe('Apfel entfernen')
  })

  /* Removing a tag as documented dropped focus to the body, so a keyboard user
     clearing tags started again from the top of the page. */
  test('hands focus to the next tag when its handler removes it', async () => {
    const host = await mount(
      '<div><helix-headless-tag dismissible>Apple</helix-headless-tag><helix-headless-tag dismissible>Pear</helix-headless-tag></div>',
    )
    const [apple, pear] = [...host.querySelectorAll('helix-headless-tag')] as HTMLElement[]
    apple?.addEventListener('helix-dismiss', () => apple.remove())
    const control = part(apple as HTMLElement, 'dismiss') as HTMLElement
    control.focus()
    control.click()
    expect(pear?.shadowRoot?.activeElement).toBe(part(pear as HTMLElement, 'dismiss'))
  })

  test('the dismiss control can be named for what it removes', async () => {
    const tag = await mount(
      '<helix-headless-tag dismissible dismiss-label="Remove Draft">Draft</helix-headless-tag>',
    )
    expect(part(tag, 'dismiss')?.getAttribute('aria-label')).toBe('Remove Draft')
  })

  test('asks to be dismissed rather than removing itself', async () => {
    // The consumer owns the list the tag is in. Taking the node out from under
    // them would put their state and the document out of step.
    const tag = await mount('<helix-headless-tag dismissible>Draft</helix-headless-tag>')
    let detail: { label: string } | null = null
    tag.addEventListener('helix-dismiss', (event) => {
      detail = (event as CustomEvent<{ label: string }>).detail
    })
    ;(part(tag, 'dismiss') as HTMLElement).click()

    expect(detail).not.toBeNull()
    expect((detail as unknown as { label: string }).label).toBe('Draft')
    expect(tag.isConnected).toBe(true)
  })

  test('the request can be refused', async () => {
    const tag = await mount('<helix-headless-tag dismissible>Draft</helix-headless-tag>')
    let cancelable = false
    tag.addEventListener('helix-dismiss', (event) => {
      cancelable = event.cancelable
      event.preventDefault()
    })
    ;(part(tag, 'dismiss') as HTMLElement).click()
    expect(cancelable).toBe(true)
    expect(tag.isConnected).toBe(true)
  })
})

describe('tag start', () => {
  test('a category sits before the label and is weightier than it', async () => {
    // The same kind of word doing a different job, so weight rather than color:
    // `Priority: high` is one phrase, and coloring half makes it two things.
    const tag = await mount(
      '<helix-headless-tag><span slot="start">Priority</span>High</helix-headless-tag>',
    )
    expect(slotted(tag, 'start')[0]?.textContent).toBe('Priority')
    /* The label is read off the host rather than through `slotted`, which
       returns assigned elements: a tag's label is usually bare text between the
       tags, and a text node is not one. */
    expect(tag.textContent?.replace('Priority', '').trim()).toBe('High')
  })

  test('and a tag without one carries nothing at all', async () => {
    /* Every declaration is on the slotted element rather than the slot. A slot
       is `display: contents`, so an unassigned one generates no box: giving it
       `display: flex` to hold the rule is what takes that away, and measured, a
       tag with no prefix carried nine pixels of border and padding for a slot
       with nothing in it. */
    const tag = await mount('<helix-headless-tag>Plain</helix-headless-tag>')
    expect(slotted(tag, 'start')).toHaveLength(0)
  })
})
