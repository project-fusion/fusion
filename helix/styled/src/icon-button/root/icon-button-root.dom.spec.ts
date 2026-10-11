import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The name, the disabled control and the press are the base tier's and are
   tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-icon-button') as unknown as { styles: unknown })
    .styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

type IconButton = Updatable & {
  emphasis?: string
  raised: boolean
  shape?: string
  tone?: string
}

const button = async (): Promise<IconButton> =>
  (await mount('<helix-icon-button label="Settings"><i></i></helix-icon-button>')) as IconButton

describe('icon button', () => {
  test('the control is a real button, square by construction', async () => {
    // One dimension for both axes, so the control stays a circle of influence
    // around the glyph rather than drifting wider as the icon changes.
    expect(part(await button(), 'button')?.tagName).toBe('BUTTON')
    expect(rule('[part="button"]')).toContain('block-size: var(--_icon-button-size)')
    expect(rule('[part="button"]')).toContain('inline-size: var(--_icon-button-size)')
  })

  test('emphasis, tone, shape and raised reflect, and rest on nothing', async () => {
    const host = await button()
    for (const name of ['emphasis', 'raised', 'shape', 'tone']) {
      expect(host.hasAttribute(name)).toBe(false)
    }
    host.emphasis = 'solid'
    host.tone = 'primary'
    host.shape = 'circle'
    host.raised = true
    await host.updateComplete
    expect(host.getAttribute('emphasis')).toBe('solid')
    expect(host.getAttribute('tone')).toBe('primary')
    expect(host.getAttribute('shape')).toBe('circle')
    expect(host.hasAttribute('raised')).toBe(true)
  })

  test('ghost is the resting emphasis and needs no rule; the other three have one', () => {
    /* Where a text button rests outlined, an icon button rests as a ghost,
       because a toolbar of framed squares is a toolbar of boxes. Written out,
       `ghost` would select nothing and land on the base rule anyway. */
    expect(sheet()).not.toContain(':host([emphasis="ghost"])')
    for (const emphasis of ['solid', 'outlined', 'subtle']) {
      expect(sheet()).toContain(`:host([emphasis="${emphasis}"]) [part="button"]`)
    }
    // Behind the public hook, which falls back to it.
    expect(rule(':host([emphasis="solid"]) [part="button"]')).toContain('var(--_icon-button-fill)')
  })

  test('each tone rewrites the surface variables the rules read, and the fill is not the tone', () => {
    /* Pointing one variable at both the fill and the ink is what put a glyph at
       3.20 against its own solid fill, so the fill is a `*-surface` token and
       the tone is the text color. */
    for (const tone of ['primary', 'accent', 'danger']) {
      expect(rule(`:host([tone="${tone}"])`)).toContain(
        `--_icon-button-tone: var(--helix-color-${tone})`,
      )
      expect(rule(`:host([tone="${tone}"])`)).toContain(
        `--_icon-button-fill: var(--helix-color-${tone}-surface)`,
      )
    }
  })

  test('four corners, so a group can flatten the two it needs to, or one', () => {
    /* One `border-radius` meant `ButtonGroup` could not reach this control: the
       group hands its hooks across as custom properties, which is the one thing
       that crosses a shadow boundary. A corner of its own each, as Button reads
       them, so a group stacking down joins it too. */
    const control = rule('[part="button"]')
    expect(control).toMatch(
      /border-start-start-radius: var\(\s*--button-radius-start-start,\s*var\(--button-radius-start,/,
    )
    expect(control).toMatch(
      /border-end-end-radius: var\(\s*--button-radius-end-end,\s*var\(--button-radius-end,/,
    )
    expect(control).not.toMatch(/\nborder-radius:/)
    expect(rule(':host([shape="circle"]) [part="button"]')).toContain(
      'border-radius: var(--helix-radii-full)',
    )
  })

  test('raised floats as the theme says what floats is drawn', () => {
    /* The theme's floating edge and lift, as a popover's: a fixed shadow of its
       own made a raised button the one floating thing on a page that ignored
       it. */
    const raised = rule(':host([raised]) [part="button"]')
    expect(raised).toContain('box-shadow: var(--icon-button-shadow, var(--helix-shadow-floating))')
    expect(raised).toContain(
      'border-width: var(--icon-button-border-width, var(--helix-border-floating))',
    )
  })

  test('material is the ground of every emphasis but solid', () => {
    for (const material of ['frosted', 'glass', 'transparent']) {
      expect(sheet()).toContain(
        `:host([material="${material}"]:not([emphasis="solid"])) [part="button"]`,
      )
    }
    expect(sheet()).toMatch(
      /backdrop-filter: var\(--icon-button-backdrop, var\(--helix-material-backdrop\)\)/,
    )
  })

  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of [
      '--icon-button-backdrop',
      '--icon-button-border-color',
      '--icon-button-border-width',
      '--icon-button-radius',
      '--icon-button-shadow',
      '--icon-button-size',
    ]) {
      // A fallback written across lines keeps its line breaks in the sheet.
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})

describe('the color hooks', () => {
  /* Button publishes its fill and ink, and Icon Button drew only from private
     variables, so recoloring one meant matching its hover by hand. */
  test('the fill and the icon color read public properties first', () => {
    const base = rule('[part="button"]')
    expect(base).toContain('var(--icon-button-background-color')
    expect(base).toContain('var(--icon-button-foreground-color')
    expect(rule(':host(:not(:disabled)) [part="button"]:hover')).toContain(
      '--icon-button-background-color-hover',
    )
  })
})

/* Under reduced motion the base layer sets every duration token to 0.01ms, so a
   crawl scaled from one turned the ring about eight thousand times a second. */
describe('the pending ring under reduced motion', () => {
  test('turns once in four seconds, on no duration token', () => {
    const turn =
      sheet()
        .split('@media (prefers-reduced-motion: reduce)')
        .slice(1)
        .find((block) => /^\s*\{\s*\[part="spinner"\]\s*\{/.test(block))
        ?.split('}')[0] ?? ''
    expect(turn).toContain('animation-duration: var(--_icon-button-crawl)')
    expect(turn).not.toContain('--helix-duration')
    expect(sheet()).toContain('--_icon-button-crawl: 4s')
  })
})
