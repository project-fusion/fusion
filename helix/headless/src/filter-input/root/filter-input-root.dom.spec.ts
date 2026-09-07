import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The tokens are `Tag`s, and Backspace asks one of them to go.
  await import('../../tag/index.js')
})

/** Types into the control the way a reader does, and lets the element hear it. */
const type = async (host: HTMLElement, text: string): Promise<void> => {
  const control = part(host, 'control') as HTMLInputElement
  control.value = text
  control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
}

/** Backspace on the control, which is where the key lands. */
const backspace = (host: HTMLElement): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Backspace' })
  ;(part(host, 'control') as HTMLInputElement).dispatchEvent(event)
  return event
}

const WITH_TAGS = `<helix-headless-filter-input label="Filter rows">
  <helix-headless-tag dismissible slot="tags">design</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">infra</helix-headless-tag>
  <helix-headless-tag dismissible slot="tags">docs</helix-headless-tag>
</helix-headless-filter-input>`

describe('filter input', () => {
  test('renders the field, the row and a real input', async () => {
    const filter = await mount('<helix-headless-filter-input label="Filter rows" />')
    expect(part(filter, 'field')).not.toBeNull()
    expect(part(filter, 'control')?.tagName).toBe('INPUT')
    /* The row is rendered whether or not anything is in it, because a slot that
       is not in the tree assigns nothing. */
    expect(part(filter, 'tags')).not.toBeNull()
  })

  test('takes the consumer’s own elements as its tokens', async () => {
    const filter = await mount(WITH_TAGS)
    expect(slotted(filter, 'tags')).toHaveLength(3)
  })

  test('announces every keystroke, carrying the text on the element', async () => {
    // What Combobox cannot do, its `value` being a selection rather than text.
    const filter = await mount('<helix-headless-filter-input label="Filter rows" />')
    const heard: string[] = []
    filter.addEventListener('input', (event) => {
      heard.push((event.target as HTMLElement & { value: string }).value)
    })

    await type(filter, 'dep')
    await type(filter, 'deploy')

    expect(heard).toEqual(['dep', 'deploy'])
  })

  test('the text can be refused, and the control is put back', async () => {
    const filter = await mount('<helix-headless-filter-input label="Filter rows" />')
    filter.addEventListener('helix-before-change', (event) => {
      event.preventDefault()
    })

    await type(filter, 'deploy')

    expect((filter as HTMLElement & { value: string }).value).toBe('')
    // On screen and in the form, the same answer.
    expect((part(filter, 'control') as HTMLInputElement).value).toBe('')
  })

  test('backspace on an empty field asks the last token to go', async () => {
    const filter = await mount(WITH_TAGS)
    const asked: string[] = []
    filter.addEventListener('helix-dismiss', (event) => {
      asked.push((event as CustomEvent<{ label: string }>).detail.label)
    })

    const event = backspace(filter)

    // Asked, not taken: the consumer owns the markup the tokens are in.
    expect(asked).toEqual(['docs'])
    expect(slotted(filter, 'tags')).toHaveLength(3)
    expect(event.defaultPrevented).toBe(true)
  })

  test('the same request the close control makes, so one handler covers both', async () => {
    const filter = await mount(WITH_TAGS)
    const asked: string[] = []
    filter.addEventListener('helix-dismiss', (event) => {
      asked.push((event as CustomEvent<{ label: string }>).detail.label)
    })

    const last = slotted(filter, 'tags').at(-1) as HTMLElement
    ;(part(last, 'dismiss') as HTMLElement).click()
    backspace(filter)

    // One from the pointer, one from the keyboard, indistinguishable here.
    expect(asked).toEqual(['docs', 'docs'])
  })

  test('backspace with text in the field is the reader deleting a character', async () => {
    const filter = await mount(WITH_TAGS)
    let asked = 0
    filter.addEventListener('helix-dismiss', () => {
      asked += 1
    })

    await type(filter, 'dep')
    const event = backspace(filter)

    expect(asked).toBe(0)
    // Left alone, so the platform deletes the character.
    expect(event.defaultPrevented).toBe(false)
  })

  test('shows every token when no cap is set', async () => {
    const filter = await mount(WITH_TAGS)
    expect(slotted(filter, 'tags').filter((tag) => tag.hasAttribute('hidden'))).toHaveLength(0)
    expect(part(filter, 'rest')).toBeNull()
  })

  test('a cap hides the rest and counts them', async () => {
    const filter = await mount(WITH_TAGS.replace('label=', 'max-tags="2" label='))
    const tags = slotted(filter, 'tags')

    // Hidden rather than removed: they are the consumer's nodes.
    expect(tags.map((tag) => tag.hasAttribute('hidden'))).toEqual([false, false, true])
    expect(part(filter, 'rest')?.textContent).toBe('+1')
  })

  test('a cap that moves re-decides what fits', async () => {
    const filter = await mount(WITH_TAGS.replace('label=', 'max-tags="2" label='))
    ;(filter as HTMLElement & { maxTags: number }).maxTags = 3
    await (filter as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete

    expect(slotted(filter, 'tags').filter((tag) => tag.hasAttribute('hidden'))).toHaveLength(0)
    expect(part(filter, 'rest')).toBeNull()
  })

  test('clearing empties the text and leaves the tokens alone', async () => {
    const filter = await mount(WITH_TAGS.replace('label=', 'clearable label='))
    await type(filter, 'deploy')
    ;(part(filter, 'clear') as HTMLElement).click()
    await (filter as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete

    expect((filter as HTMLElement & { value: string }).value).toBe('')
    expect(slotted(filter, 'tags')).toHaveLength(3)
  })
})
