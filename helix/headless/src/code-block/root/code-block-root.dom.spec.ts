import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('code block', () => {
  test('renders pre wrapping code, which is what a block of code is', async () => {
    const el = (await mount(
      '<helix-headless-code-block>one</helix-headless-code-block>',
    )) as Updatable
    const block = el.shadowRoot?.querySelector('[part="block"]')
    expect([block?.tagName, block?.firstElementChild?.tagName]).toEqual(['PRE', 'CODE'])
  })

  test('draws no header when there is nothing to put in it', async () => {
    const el = (await mount(
      '<helix-headless-code-block no-copy>one</helix-headless-code-block>',
    )) as Updatable
    expect(el.shadowRoot?.querySelector('[part="header"]')).toBeNull()
  })

  /* The copy value comes from the slot, not a property, so there is no second
     copy of the code to go stale. */
  test('copies what was slotted', async () => {
    const el = (await mount(
      '<helix-headless-code-block>bun add @fusion.dev/helix</helix-headless-code-block>',
    )) as Updatable
    /* Twice. The slot is empty on the first render, because assignment happens
       after it; `slotchange` then schedules the update that fills the button.
       One `updateComplete` catches the render that has nothing in it. */
    await el.updateComplete
    await el.updateComplete
    const copy = el.shadowRoot?.querySelector('helix-headless-copy-button') as HTMLElement & {
      value: string
    }
    expect(copy.value).toBe('bun add @fusion.dev/helix')
  })
})

/* In the header it stands over nothing; beside the code it stands over the
   block, which then has to keep room for it. */
/* React updates a single string child by writing the text node's data, which
   fires no `slotchange`. The block showed the new code while the button kept
   copying the old. */
describe('code edited in place', () => {
  test('is what the button copies', async () => {
    const el = (await mount(
      '<helix-headless-code-block>echo one</helix-headless-code-block>',
    )) as Updatable
    await el.updateComplete
    ;(el.firstChild as Text).data = 'echo two'
    await new Promise((done) => setTimeout(done, 0))
    await el.updateComplete
    const copy = el.shadowRoot?.querySelector('helix-headless-copy-button') as HTMLElement & {
      value: string
    }
    expect(copy.value).toBe('echo two')
  })
})

/* The button's words were fixed English, with no way to translate them. */
describe('the copy button', () => {
  test('takes its words from the block', async () => {
    const el = (await mount(
      '<helix-headless-code-block copy-label="Code kopieren" copied-label="Kopiert">x</helix-headless-code-block>',
    )) as Updatable
    const copy = el.shadowRoot?.querySelector('helix-headless-copy-button')
    expect(copy?.getAttribute('label')).toBe('Code kopieren')
    expect(copy?.getAttribute('copied-label')).toBe('Kopiert')
  })
})

describe('where the copy button stands', () => {
  test('in the header, after the name, when there is a name', async () => {
    const el = (await mount(
      '<helix-headless-code-block label="index.html">one</helix-headless-code-block>',
    )) as Updatable
    await el.updateComplete
    await el.updateComplete
    const header = el.shadowRoot?.querySelector('[part="header"]')
    expect([...(header?.children ?? [])].map((child) => child.getAttribute('part'))).toEqual([
      'label',
      'copy',
    ])
    expect(el.shadowRoot?.querySelector('[part="frame"] > [part="copy"]')).toBeNull()
    const copy = header?.lastElementChild as (HTMLElement & { value: string }) | null | undefined
    expect(copy?.value).toBe('one')
  })

  test('beside the code when there is none, and draws no header to hold it', async () => {
    const el = (await mount(
      '<helix-headless-code-block>one</helix-headless-code-block>',
    )) as Updatable
    expect(el.shadowRoot?.querySelector('[part="header"]')).toBeNull()
    expect(el.shadowRoot?.querySelector('[part="frame"] > [part="copy"]')).not.toBeNull()
  })

  test('in each file’s header, in a diff', async () => {
    const el = (await mount(
      '<helix-headless-code-block diff>--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-a\n+b\n--- a/b.ts\n+++ b/b.ts\n@@ -1 +1 @@\n-c\n+d\n</helix-headless-code-block>',
    )) as Updatable
    await el.updateComplete
    await el.updateComplete
    const files = [...(el.shadowRoot?.querySelectorAll('[part="file"]') ?? [])]
    expect(files).toHaveLength(2)
    expect(
      files.map((file) => file.querySelector('[part="header"] > [part="copy"]') !== null),
    ).toEqual([true, true])
    expect(el.shadowRoot?.querySelector('[part="frame"] > [part="copy"]')).toBeNull()
  })
})

/**
 * `no-copy` reaches the host, because the gutter is a rule and not code.
 *
 * **The property alone is half the feature.** `render` reads it and leaves the
 * copy button off, which is visible and looks like the whole job done; a sheet
 * reserves that button's width with `:host(:not([no-copy]))`, so without the
 * reflection a block told from script to drop the button still pays 40px for
 * it.
 */
describe('the no-copy attribute follows the property', () => {
  test('a property write reflects, which is the only way the gutter rule hears it', async () => {
    const el = (await mount(
      '<helix-headless-code-block>one</helix-headless-code-block>',
    )) as Updatable
    expect(el.hasAttribute('no-copy')).toBe(false)

    ;(el as HTMLElement & { noCopy: boolean }).noCopy = true
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete

    expect(el.hasAttribute('no-copy')).toBe(true)
    expect(el.shadowRoot?.querySelector('[part="copy"]')).toBeNull()
  })

  /* The other direction, which is what keeps a reflected boolean honest: false
     is the attribute's absence, so nothing is stamped onto a block that never
     asked. */
  test('and clearing it takes the attribute back off', async () => {
    const el = (await mount(
      '<helix-headless-code-block no-copy>one</helix-headless-code-block>',
    )) as Updatable
    expect(el.hasAttribute('no-copy')).toBe(true)

    ;(el as HTMLElement & { noCopy: boolean }).noCopy = false
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete

    expect(el.hasAttribute('no-copy')).toBe(false)
  })
})
