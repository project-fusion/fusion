import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('text', () => {
  test('the ramp is presentation, `as` is semantics, and they are separate', async () => {
    // A heading that should not look like one is the whole reason these are
    // two properties rather than one.
    const text = await mount('<helix-text variant="body" as="h3">Title</helix-text>')
    expect(part(text, 'text')?.tagName).toBe('H3')
    expect(text.getAttribute('variant')).toBe('body')
  })

  test('renders its content through a slot', async () => {
    const text = await mount('<helix-text>Contents</helix-text>')
    expect(text.shadowRoot?.querySelector('slot')).not.toBeNull()
  })

  /* Its label is in its shadow root, which neither `for` nor a wrapped control
     reaches, so the value is deprecated and every use of it is told so. */
  test('`as="label"` still renders a label, and is reported as deprecated wherever it is', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      const wrapped = await mount('<helix-text as="label">Email <input /></helix-text>')
      expect(part(wrapped, 'text')?.tagName).toBe('LABEL')
      await mount('<helix-text as="label" for="phone">Phone</helix-text>')
      await mount('<helix-text as="label">Section</helix-text>')
      await mount('<helix-text variant="label">Section</helix-text>')
    } finally {
      console.warn = original
    }
    expect(warnings.length).toBe(3)
    expect(warnings[0]).toContain('deprecated')
    expect(warnings[0]).toContain('data-text="label"')
  })

  test('`lines` clamps the part to that many lines, and a count that is no count clamps nothing', async () => {
    const clamped = await mount('<helix-text lines="2">Long</helix-text>')
    expect(part(clamped, 'text')?.getAttribute('style')).toBe('-webkit-line-clamp: 2')
    const plain = await mount('<helix-text lines="none">Long</helix-text>')
    expect(part(plain, 'text')?.hasAttribute('style')).toBe(false)
    const unset = await mount('<helix-text>Long</helix-text>')
    expect(part(unset, 'text')?.hasAttribute('style')).toBe(false)
  })
})

describe('lines, alignment and wrapping', () => {
  /* The rest is layout, which only a browser has. */
  const laid = hasLayout() ? test : (): void => {}

  laid('two lines of a long text are two lines tall, and end in an ellipsis box', async () => {
    const wrapper = await mount(
      `<div style="inline-size: 120px"><helix-text as="p" lines="2">${'word '.repeat(60)}</helix-text><helix-text as="p">One</helix-text></div>`,
    )
    const [clamped, one] = [...wrapper.querySelectorAll('helix-text')] as HTMLElement[]
    const line = (one as HTMLElement).getBoundingClientRect().height
    expect(Math.round((clamped as HTMLElement).getBoundingClientRect().height)).toBe(
      Math.round(line * 2),
    )
    expect(getComputedStyle(clamped as HTMLElement).display).toBe('block')
  })

  laid('`text-align` and `text-wrap` set the properties they are named for', async () => {
    const text = await mount(
      '<helix-text as="p" text-align="center" text-wrap="balance">A</helix-text>',
    )
    expect(getComputedStyle(text).textAlign).toBe('center')
    expect(getComputedStyle(text).textWrap).toBe('balance')
  })

  laid('a `--text-*` property overrides that value of the ramp, and only that one', async () => {
    const wrapper = await mount(
      '<div style="--text-font-size: 31px"><helix-text as="h2">Big</helix-text><helix-text>Run</helix-text></div>',
    )
    const [heading, run] = [...wrapper.querySelectorAll('helix-text')] as HTMLElement[]
    expect(getComputedStyle(heading as HTMLElement).fontSize).toBe('31px')
    expect(getComputedStyle(run as HTMLElement).fontSize).toBe('31px')
    /* Read before the next mount, which replaces the body: a heading off the
       page has no computed style at all. */
    const weight = getComputedStyle(heading as HTMLElement).fontWeight
    const plain = await mount('<helix-text as="h2">Big</helix-text>')
    expect(getComputedStyle(plain).fontSize).not.toBe('31px')
    expect(weight).toBe(getComputedStyle(plain).fontWeight)
  })
})

/* Browser only: the colors come from the base layer, which happy-dom does not
   load, and a computed color is what is being asserted. */
const painted = hasLayout() ? test : (): void => {}

/** What a token resolves to on this page, read the same way a text color is. */
const ink = (token: string): string => {
  const probe = document.createElement('span')
  probe.style.color = `var(--helix-${token})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

describe('tone and emphasis', () => {
  painted('are two axes, and each alone keeps its own ink', async () => {
    const quiet = await mount('<helix-text emphasis="muted">Quiet</helix-text>')
    expect(getComputedStyle(quiet).color).toBe(ink('color-foreground-muted'))
    const danger = await mount('<helix-text tone="danger">Danger</helix-text>')
    expect(getComputedStyle(danger).color).toBe(ink('color-danger'))
  })

  /* The combination the old single axis could not say: a validation hint is a
     danger, and it is quiet. */
  painted('together they are the tone in its quiet ink', async () => {
    const hint = await mount('<helix-text emphasis="muted" tone="danger">Hint</helix-text>')
    expect(getComputedStyle(hint).color).toBe(ink('color-danger-muted'))
    expect(getComputedStyle(hint).color).not.toBe(ink('color-danger'))
  })

  /* One quiet step per tone, because the readable range holds one (#124). */
  painted('and subtle on a tone is that same quiet ink, not a second one', async () => {
    const subtle = await mount('<helix-text emphasis="subtle" tone="success">Saved</helix-text>')
    expect(getComputedStyle(subtle).color).toBe(ink('color-success-muted'))
  })
})

describe('tone and emphasis inside another shadow root', () => {
  /** A text rendered by a component of the page's own, out of the base layer's reach. */
  const shadowed = async (attributes: string): Promise<HTMLElement> => {
    const host = await mount('<div></div>')
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<helix-text ${attributes}>Inside</helix-text>`
    const text = root.querySelector('helix-text') as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await text.updateComplete
    return text
  }

  painted('keep their ink where no document rule reaches', async () => {
    expect(getComputedStyle(await shadowed('tone="danger"')).color).toBe(ink('color-danger'))
    expect(getComputedStyle(await shadowed('emphasis="muted"')).color).toBe(
      ink('color-foreground-muted'),
    )
    expect(getComputedStyle(await shadowed('tone="danger" emphasis="muted"')).color).toBe(
      ink('color-danger-muted'),
    )
  })

  painted('a tone wins over the heading ink there, as it does on the page', async () => {
    expect(getComputedStyle(await shadowed('as="h2" tone="success"')).color).toBe(
      ink('color-success'),
    )
  })
})

describe('the ramp a paragraph takes', () => {
  /* A paragraph in a large header slot read at the slot's size, while the
     variant's description promised the ramp matching `as`. */
  painted('is the body ramp, whatever size surrounds it', async () => {
    const wrapper = await mount(
      '<div style="font-size: 40px"><helix-text as="p">Para</helix-text><helix-text as="p" variant="body">Body</helix-text></div>',
    )
    const [plain, body] = [...wrapper.querySelectorAll('helix-text')]
    expect(getComputedStyle(plain as Element).fontSize).toBe(
      getComputedStyle(body as Element).fontSize,
    )
    expect(getComputedStyle(plain as Element).fontSize).not.toBe('40px')
  })
})
