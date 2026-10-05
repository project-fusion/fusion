import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The note role, the tone's name and the icon fallback are the base tier's and
   are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-callout') as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

describe('callout', () => {
  test('draws the mark and the content the base tier renders, under its own tag', async () => {
    const note = await mount(
      '<helix-callout tone="info">The release ships Tuesday.</helix-callout>',
    )
    expect(part(note, 'icon')).not.toBeNull()
    expect(part(note, 'content')).not.toBeNull()
    expect(part(note, 'icon-mark')?.tagName.toLowerCase()).toBe('svg')
  })

  test('info is the resting color, and each of the others rewrites the one variable', () => {
    /* One variable feeds the wash, the bar and the mark, so a tone is a single
       line and the three cannot disagree. `info` needs no rule of its own, and
       a rule for it would be the resting state written twice. */
    expect(rule(':host')).toContain('--_callout-tone: var(--helix-color-info)')
    expect(sheet()).not.toContain(':host([tone="info"])')
    for (const tone of ['success', 'warning', 'danger']) {
      expect(rule(`:host([tone="${tone}"])`)).toContain(
        `--_callout-tone: var(--helix-color-${tone})`,
      )
    }
    /* A note reports no status, so it takes the muted ink, which stays in the
       neutral ramp on any palette. */
    expect(rule(':host([tone="neutral"])')).toContain(
      '--_callout-tone: var(--helix-color-foreground-muted)',
    )
  })

  test('the tone survives grayscale as a bar on the inline start, clipped by the box', () => {
    /* A bar drawn inside and clipped rather than a border: a thick border on
       one side of a rounded box thins to a crescent at each end. */
    expect(rule(':host')).toContain(
      '--_callout-bar: var(--callout-bar-thickness, var(--helix-border-thick))',
    )
    expect(rule(':host::before')).toContain('inline-size: var(--_callout-bar)')
    expect(rule(':host::before')).toContain('background-color: var(--_callout-color)')
    expect(rule(':host')).toContain('overflow: hidden')
    expect(rule(':host')).toContain(
      'padding-inline-start: calc(var(--_callout-inset) + var(--_callout-bar))',
    )
  })

  test('a slotted icon is sized like the default one, so swapping it moves nothing', () => {
    expect(rule('[part="icon"] svg')).toContain('block-size: var(--helix-size-icon)')
    expect(rule('slot[name="icon"]::slotted(*)')).toContain('--icon-size: var(--helix-size-icon)')
  })

  test('a heading is its own line, not the opening words of the content', () => {
    // A slotted `<span>` is inline, so without this the heading and the first
    // words run together as one sentence in two weights.
    expect(rule('slot[name="heading"]::slotted(*)')).toContain('display: block')
    expect(rule('slot[name="heading"]::slotted(*)')).toContain(
      'font-weight: var(--helix-weight-semibold)',
    )
  })

  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of ['--callout-background-color', '--callout-radius']) {
      // A fallback written across lines keeps its line breaks in the sheet.
      expect(sheet()).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})

/* wa-callout's appearance and size, through the house's axis and hooks: the
   box's edge is `separation`, and the size is the inset and the type. */
describe('callout separation and hooks', () => {
  test('`outlined` draws the edge in the tone with no fill, the same size as the tint', () => {
    const outlined = rule(':host([separation="outlined"])')
    expect(outlined).toContain('transparent')
    expect(outlined).toContain('box-shadow: inset')
    expect(outlined).not.toMatch(/^\s*border/m)
  })

  test('`plain` drops the fill and keeps the bar', () => {
    expect(rule(':host([separation="plain"])')).toContain('transparent')
    expect(sheet()).not.toContain(':host([separation="plain"])::before')
  })

  test('reflects, so the sheet can reach it from a script', async () => {
    const note = (await mount('<helix-callout>Text</helix-callout>')) as HTMLElement & {
      separation?: string
      updateComplete: Promise<boolean>
    }
    note.separation = 'outlined'
    await note.updateComplete
    expect(note.getAttribute('separation')).toBe('outlined')
  })

  test('every hook falls back to the value it replaced', () => {
    const host = rule(':host')
    expect(host).toContain('--_callout-color: var(--callout-accent-color, var(--_callout-tone))')
    expect(host).toContain(
      '--_callout-bar: var(--callout-bar-thickness, var(--helix-border-thick))',
    )
    /* The control steps, `space-md` and `text-sm` at rest, so a callout in a
       `data-density` region follows it as the controls beside it do. */
    expect(host).toContain('--_callout-inset: var(--callout-padding, var(--helix-space-control))')
    expect(host).toContain('font-size: var(--callout-font-size, var(--helix-text-control))')
    expect(host).toContain('gap: var(--callout-gap, var(--helix-space-sm))')
    expect(rule(':host::before')).toContain('inline-size: var(--_callout-bar)')
  })
})

describe('the dismiss button', () => {
  test('stands at the end of the line, with a hover well and the focus ring', () => {
    expect(rule('[part="dismiss"]')).toContain('margin-inline: auto')
    expect(rule('[part="dismiss"]:hover')).toContain('background-color: color-mix(')
    expect(rule('[part="dismiss"]:focus-visible')).toContain(
      'outline: var(--helix-size-focus-ring) solid var(--helix-color-focus-ring)',
    )
  })
})
