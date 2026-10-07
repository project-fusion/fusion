import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

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

/* Expressive Code's line numbers and Shiki's or Prism's highlighting, with the
   code itself left in the slot so a copy is the code as written. */
describe('line numbers and a highlighter', () => {
  type Block = Updatable & { highlight?: (code: string, language: string) => string }
  const copyValue = (el: Element): string =>
    (
      el.shadowRoot?.querySelector('helix-headless-copy-button') as
        | (HTMLElement & { value: string })
        | null
    )?.value ?? ''

  test('numbers each line in a gutter hidden from readers and left out of a copy', async () => {
    const el = (await mount(
      '<helix-headless-code-block line-numbers>one\ntwo\nthree\n</helix-headless-code-block>',
    )) as Block
    await el.updateComplete
    await el.updateComplete
    const gutter = el.shadowRoot?.querySelector('[part="gutter"]')
    expect(gutter?.textContent).toBe('1\n2\n3')
    expect(gutter?.getAttribute('aria-hidden')).toBe('true')
    expect(gutter?.parentElement?.getAttribute('part')).toBe('block')
    expect(copyValue(el)).toBe('one\ntwo\nthree\n')
  })

  test('draws no gutter unless asked', async () => {
    const el = await mount('<helix-headless-code-block>one</helix-headless-code-block>')
    expect(el.shadowRoot?.querySelector('[part="gutter"]')).toBeNull()
  })

  test('draws what the highlighter returns, and copies the code as written', async () => {
    const el = (await mount('<helix-headless-code-block></helix-headless-code-block>')) as Block
    el.highlight = (code) => `<span class="keyword">${code.replace(/</g, '&lt;')}</span>`
    el.textContent = 'const a = 1'
    await new Promise((resolve) => setTimeout(resolve, 0))
    await el.updateComplete
    const code = el.shadowRoot?.querySelector('[part="code"]')
    expect(code?.querySelector('.keyword')?.textContent).toBe('const a = 1')
    expect(el.shadowRoot?.querySelector('slot:not([name])')?.hasAttribute('hidden')).toBe(true)
    expect(copyValue(el)).toBe('const a = 1')
  })

  /* Shiki's `codeToHtml` returns a `<pre tabindex="0"><code>` of its own,
     which sat below the gutter's first number and added a tab stop. */
  test("draws Shiki's lines in the block's own pre, with no second tab stop", async () => {
    const el = (await mount(
      '<helix-headless-code-block line-numbers></helix-headless-code-block>',
    )) as Block
    el.highlight = (code) =>
      `<pre class="shiki" tabindex="0" style="background-color:#fff"><code>${code
        .split('\n')
        .map((line) => `<span class="line">${line}</span>`)
        .join('\n')}</code></pre>`
    el.textContent = 'one\ntwo'
    await new Promise((resolve) => setTimeout(resolve, 0))
    await el.updateComplete
    expect(el.shadowRoot?.querySelectorAll('pre')).toHaveLength(1)
    expect(el.shadowRoot?.querySelector('[part="code"] [tabindex]')).toBeNull()
    expect(el.shadowRoot?.querySelectorAll('[part="code"] .line')).toHaveLength(2)
    expect(copyValue(el)).toBe('one\ntwo')
  })

  /* "Bind the language in the function you pass" meant one function per
     block; Shiki and Prism each take the language beside the code. */
  test("hands the highlighter the block's language, so one function serves every block", async () => {
    const asked: string[] = []
    const highlight = (code: string, language: string): string => {
      asked.push(`${language}:${code}`)
      return code
    }
    for (const markup of [
      '<helix-headless-code-block language="ts"></helix-headless-code-block>',
      '<helix-headless-code-block></helix-headless-code-block>',
    ]) {
      const el = (await mount(markup)) as Block
      el.highlight = highlight
      el.textContent = 'a'
      await new Promise((resolve) => setTimeout(resolve, 0))
      await el.updateComplete
    }
    expect([...new Set(asked)]).toEqual(['ts:a', ':a'])
  })

  /* `language` drew nothing, so a block a docs page named only by its
     language showed no name and its button said only "Copy code". */
  test('names a block with no label by its language, in the header and on the button', async () => {
    const block = await mount(
      '<helix-headless-code-block language="ts">const a = 1</helix-headless-code-block>',
    )
    expect(part(block, 'label')?.textContent).toBe('ts')
    expect(part(block, 'copy')?.getAttribute('label')).toBe('Copy code, ts')
    const named = await mount(
      '<helix-headless-code-block label="a.ts" language="ts">const a = 1</helix-headless-code-block>',
    )
    expect(part(named, 'label')?.textContent).toBe('a.ts')
  })

  test('is not asked about empty code', async () => {
    let asked = 0
    const el = (await mount('<helix-headless-code-block></helix-headless-code-block>')) as Block
    el.highlight = (code) => {
      asked += 1
      return code
    }
    await el.updateComplete
    expect(asked).toBe(0)
    expect(el.shadowRoot?.querySelector('slot:not([name])')?.hasAttribute('hidden')).toBe(false)
  })

  /* A highlighter that threw took the whole render with it, and the block went blank. */
  test('that throws draws the code plain and reports the error', async () => {
    const reported: unknown[] = []
    const original = globalThis.reportError
    globalThis.reportError = (error: unknown) => reported.push(error)
    try {
      const el = (await mount(
        '<helix-headless-code-block>const a = 1</helix-headless-code-block>',
      )) as Block
      el.highlight = () => {
        throw new Error('no grammar')
      }
      await el.updateComplete?.catch(() => undefined)
      const slot = el.shadowRoot?.querySelector('[part="code"] slot:not([name])')
      expect([slot?.hasAttribute('hidden'), reported.length]).toEqual([false, 1])
    } finally {
      globalThis.reportError = original
    }
  })
})

describe('the copy button of a named block', () => {
  test('says the name of its block, so several on a page are told apart', async () => {
    const named = await mount(
      '<helix-headless-code-block label="app.ts">const a = 1</helix-headless-code-block>',
    )
    const copyOf = (host: Element): Element | null | undefined =>
      host.shadowRoot?.querySelector('helix-headless-copy-button')
    expect(copyOf(named)?.getAttribute('label')).toBe('Copy code, app.ts')
    const plain = await mount('<helix-headless-code-block>const a = 1</helix-headless-code-block>')
    expect(copyOf(plain)?.getAttribute('label')).toBe('Copy code')
  })
})

/* A docs site's long example opens to every line from a capped block. */
describe('an expandable block', () => {
  type Block = Updatable & {
    expandable: boolean
    internals: ElementInternals
    requestUpdate: () => void
  }

  /* happy-dom lays nothing out, so the cap is said by the scroller's sizes. */
  const capped = (el: Element): void => {
    const code = el.shadowRoot?.querySelector('[part="code"]') as HTMLElement
    Object.defineProperty(code, 'scrollHeight', { configurable: true, get: () => 400 })
    Object.defineProperty(code, 'clientHeight', { configurable: true, get: () => 120 })
  }
  const expand = (el: Element): HTMLButtonElement | null =>
    el.shadowRoot?.querySelector<HTMLButtonElement>('[part="expand"]') ?? null

  test('draws a button only while the cap hides lines', async () => {
    const el = (await mount(
      '<helix-headless-code-block expandable>one\ntwo</helix-headless-code-block>',
    )) as Block
    await el.updateComplete
    expect(expand(el)).toBeNull()
    capped(el)
    el.requestUpdate()
    await el.updateComplete
    await el.updateComplete
    expect(expand(el)?.textContent?.trim()).toBe('Show all lines')
    expect(expand(el)?.getAttribute('aria-expanded')).toBe('false')
  })

  /* `aria-expanded` said the button opened something and never said what. */
  test('names the block it opens', async () => {
    const el = (await mount(
      '<helix-headless-code-block expandable>one\ntwo</helix-headless-code-block>',
    )) as Block
    capped(el)
    el.requestUpdate()
    await el.updateComplete
    await el.updateComplete
    const controls = expand(el)?.getAttribute('aria-controls') ?? ''
    expect(controls).not.toBe('')
    expect(el.shadowRoot?.getElementById(controls)?.getAttribute('part')).toBe('block')
  })

  test('shows every line, says so, and shows fewer again', async () => {
    const el = (await mount(
      '<helix-headless-code-block expandable collapse-label="Less" expand-label="More">one\ntwo</helix-headless-code-block>',
    )) as Block
    capped(el)
    el.requestUpdate()
    await el.updateComplete
    await el.updateComplete
    expand(el)?.click()
    await el.updateComplete
    expect(expand(el)?.getAttribute('aria-expanded')).toBe('true')
    expect(expand(el)?.textContent?.trim()).toBe('Less')
    expect(el.internals.states.has('expanded')).toBe(true)
    expand(el)?.click()
    await el.updateComplete
    expect(expand(el)?.textContent?.trim()).toBe('More')
    expect(el.internals.states.has('expanded')).toBe(false)
  })

  test('draws nothing without expandable, capped or not', async () => {
    const el = (await mount(
      '<helix-headless-code-block>one\ntwo</helix-headless-code-block>',
    )) as Block
    capped(el)
    el.requestUpdate()
    await el.updateComplete
    await el.updateComplete
    expect(expand(el)).toBeNull()
  })
})

/* Button gained a `spinner` part, and a page reached it on a code block's copy
   button through nothing. */
test("forwards the copy button's pending ring as `copy-spinner`", async () => {
  const el = (await mount(
    '<helix-headless-code-block>one</helix-headless-code-block>',
  )) as Updatable
  const copy = el.shadowRoot?.querySelector('[part="copy"]')
  expect(copy?.getAttribute('exportparts')).toContain('spinner: copy-spinner')
})

/* Safari makes no scroller a tab stop, so a keyboard there could not reach the
   end of a long line. happy-dom lays nothing out, so the overflow is said by
   the scroller's sizes and its sheet by an inline style. */
describe('a block that scrolls', () => {
  type Block = Updatable & { requestUpdate: () => void }
  const overflow = (box: HTMLElement, wide: boolean): void => {
    box.style.overflowX = 'auto'
    Object.defineProperty(box, 'scrollWidth', { configurable: true, get: () => (wide ? 900 : 300) })
    Object.defineProperty(box, 'clientWidth', { configurable: true, get: () => 300 })
  }

  test('is a tab stop and a region named for the block, and only while it scrolls', async () => {
    const el = (await mount(
      '<helix-headless-code-block label="app.ts">const a = 1</helix-headless-code-block>',
    )) as Block
    await el.updateComplete
    const block = part(el, 'block') as HTMLElement
    expect(block.hasAttribute('tabindex')).toBe(false)
    overflow(block, true)
    el.requestUpdate()
    await el.updateComplete
    expect(block.getAttribute('tabindex')).toBe('0')
    expect(block.getAttribute('role')).toBe('region')
    expect(block.getAttribute('aria-label')).toBe('Code, app.ts')
    overflow(block, false)
    el.requestUpdate()
    await el.updateComplete
    expect(['tabindex', 'role', 'aria-label'].some((name) => block.hasAttribute(name))).toBe(false)
  })

  test('a block with no name is named by its words alone', async () => {
    const el = (await mount(
      '<helix-headless-code-block code-label="Codice">x</helix-headless-code-block>',
    )) as Block
    await el.updateComplete
    const block = part(el, 'block') as HTMLElement
    overflow(block, true)
    el.requestUpdate()
    await el.updateComplete
    expect(block.getAttribute('aria-label')).toBe('Codice')
  })

  /* An unstyled `<pre>` runs past its box without scrolling, and a stop on it
     would scroll nothing. */
  test('a box that overflows without scrolling is no stop', async () => {
    const el = (await mount('<helix-headless-code-block>x</helix-headless-code-block>')) as Block
    await el.updateComplete
    const block = part(el, 'block') as HTMLElement
    overflow(block, true)
    block.style.overflowX = 'visible'
    el.requestUpdate()
    await el.updateComplete
    expect(block.hasAttribute('tabindex')).toBe(false)
  })
})

describe('translation', () => {
  test('the drawn code is marked untranslated, and the host is left as written', async () => {
    const el = await mount('<helix-headless-code-block>const a = 1</helix-headless-code-block>')
    expect(part(el, 'block')?.getAttribute('translate')).toBe('no')
    expect(el.hasAttribute('translate')).toBe(false)
  })
})

/* Line highlighting was missing: a page could not point a reader at the lines
   a passage is about. */
describe('marked lines', () => {
  test('draws a band for each run of lines mark-lines names, hidden from the tree', async () => {
    const el = (await mount(
      '<helix-headless-code-block mark-lines="2, 4-5, 5">a\nb\nc\nd\ne</helix-headless-code-block>',
    )) as Updatable
    await el.updateComplete
    const marks = [...(el.shadowRoot?.querySelectorAll('[part="mark"]') ?? [])]
    expect(marks.map((mark) => mark.getAttribute('data-lines'))).toEqual(['2-2', '4-5'])
    expect(marks.every((mark) => mark.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  test('places a band where its lines are laid out', async () => {
    const el = (await mount(
      '<helix-headless-code-block mark-lines="2">a\nb\nc</helix-headless-code-block>',
    )) as Updatable
    await el.updateComplete
    const mark = part(el as HTMLElement, 'mark') as HTMLElement
    expect(mark.style.getPropertyValue('--code-block-mark-start')).toMatch(/px$/)
    expect(mark.style.getPropertyValue('--code-block-mark-size')).toMatch(/px$/)
  })
})

describe('wrapping', () => {
  test('wrappable draws a pressed button that asks, then wraps the lines', async () => {
    const el = (await mount(
      '<helix-headless-code-block wrappable no-copy>one</helix-headless-code-block>',
    )) as Updatable & { wrap: boolean }
    const asked: boolean[] = []
    const told: boolean[] = []
    el.addEventListener('helix-before-toggle', (event) =>
      asked.push((event as CustomEvent<{ checked: boolean }>).detail.checked),
    )
    el.addEventListener('helix-toggle', (event) =>
      told.push((event as CustomEvent<{ checked: boolean }>).detail.checked),
    )
    const button = part(el as HTMLElement, 'wrap-toggle') as HTMLButtonElement
    // A header stands for the button alone, with no name.
    expect(part(el as HTMLElement, 'header')?.contains(button)).toBe(true)
    expect(button.getAttribute('aria-pressed')).toBe('false')
    button.click()
    await el.updateComplete
    expect(el.wrap).toBe(true)
    expect(el.hasAttribute('wrap')).toBe(true)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    el.addEventListener('helix-before-toggle', (event) => event.preventDefault(), { once: true })
    button.click()
    await el.updateComplete
    expect(el.wrap).toBe(true)
    expect(asked).toEqual([true, false])
    expect(told).toEqual([true])
  })

  test('numbers each line in an element of its own, so it can be as tall as its line', async () => {
    const el = (await mount(
      '<helix-headless-code-block wrap line-numbers>a\nb</helix-headless-code-block>',
    )) as Updatable
    await el.updateComplete
    await el.updateComplete
    const numbers = [
      ...(el.shadowRoot?.querySelectorAll('[part="gutter"] > [part="number"]') ?? []),
    ]
    expect(numbers.map((number) => number.textContent?.trim())).toEqual(['1', '2'])
  })
})

describe('the header', () => {
  test('holds the page controls in actions, and draws for them with no name', async () => {
    const el = (await mount(
      '<helix-headless-code-block><button slot="actions">Run</button>one</helix-headless-code-block>',
    )) as Updatable
    await el.updateComplete
    const header = part(el as HTMLElement, 'header')
    expect(header?.querySelector('slot[name="actions"]')).not.toBeNull()
    // The copy button moves into the header with them, and is drawn once.
    expect(el.shadowRoot?.querySelectorAll('[part="copy"]')).toHaveLength(1)
    expect(header?.querySelector('[part="copy"]')).not.toBeNull()
  })

  test("passes the page's icons to the copy button", async () => {
    const el = (await mount(
      '<helix-headless-code-block><span slot="copy-icon">C</span><span slot="copied-icon">D</span>one</helix-headless-code-block>',
    )) as Updatable
    await el.updateComplete
    const copy = part(el as HTMLElement, 'copy') as HTMLElement
    expect(copy.querySelector('slot[name="copy-icon"]')?.hasAttribute('slot')).toBe(false)
    expect(copy.querySelector('slot[name="copied-icon"]')?.getAttribute('slot')).toBe('copied')
    const plain = (await mount(
      '<helix-headless-code-block>one</helix-headless-code-block>',
    )) as Updatable
    await plain.updateComplete
    expect((part(plain as HTMLElement, 'copy') as HTMLElement).querySelector('slot')).toBeNull()
  })
})
