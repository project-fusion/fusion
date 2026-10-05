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

  test('four corners, so a group can flatten the two it needs to', () => {
    /* One `border-radius` meant `ButtonGroup` could not reach this control: the
       group hands its hooks across as custom properties, which is the one thing
       that crosses a shadow boundary. */
    const control = rule('[part="button"]')
    expect(control).toMatch(/border-start-start-radius: var\(\s*--button-radius-start,/)
    expect(control).toMatch(/border-end-end-radius: var\(\s*--button-radius-end,/)
    expect(control).not.toMatch(/\nborder-radius:/)
    expect(rule(':host([shape="circle"]) [part="button"]')).toContain(
      'border-radius: var(--helix-radii-full)',
    )
  })

  test('raised is a shadow and not a line', () => {
    // What is under a floating control is the page, and a border drawn on the
    // page says the control is part of it.
    expect(rule(':host([raised]) [part="button"]')).toContain(
      'box-shadow: var(--icon-button-shadow, var(--helix-shadow-md))',
    )
  })

  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of ['--icon-button-radius', '--icon-button-shadow', '--icon-button-size']) {
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
