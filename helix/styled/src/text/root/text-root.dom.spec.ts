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
     reaches, so the page is told rather than left with an unnamed field. */
  test('a label that wraps or names a control is reported, and a bare one is not', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    try {
      await mount('<helix-text as="label">Email <input /></helix-text>')
      await mount('<helix-text as="label" for="phone">Phone</helix-text>')
      await mount('<helix-text as="label">Section</helix-text>')
    } finally {
      console.warn = original
    }
    expect(warnings.length).toBe(2)
    expect(warnings[0]).toContain('data-text="label"')
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
