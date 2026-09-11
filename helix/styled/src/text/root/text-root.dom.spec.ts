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
