import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  slotted,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

/* The stylesheet the element adopts, as text. happy-dom resolves no cascade,
   so what can be held here is that a rule exists rather than that it applied.
   The group role and the name are the base tier's and are tested there. */
const sheet = (): string => {
  const declared = (customElements.get('helix-button-group') as unknown as { styles: unknown })
    .styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

/** The declarations of the first rule written for `selector`. */
const rule = (selector: string): string => sheet().split(`${selector} {`)[1]?.split('}')[0] ?? ''

const group = `<helix-button-group label="Export">
  <helix-button>CSV</helix-button>
  <helix-button>JSON</helix-button>
  <helix-button>Copy</helix-button>
</helix-button-group>`

describe('button group', () => {
  test("the buttons stay the consumer's own, through the one slot", async () => {
    expect(slotted(await mount(group))).toHaveLength(3)
  })

  test('variant reflects, since joining is a rule keyed on it, and rests on nothing', async () => {
    const host = (await mount(group)) as Updatable & { variant?: string }
    expect(host.hasAttribute('variant')).toBe(false)
    host.variant = 'spaced'
    await host.updateComplete
    expect(host.getAttribute('variant')).toBe('spaced')
  })

  test('joined by default: each button is pulled onto its neighbor and the inner corners go flat', () => {
    /* Through the hooks the buttons publish, because the corner belongs to the
       control inside each button's shadow root and a rule in here cannot reach
       it. The same hooks serve a consumer's own anchor styled as a button. */
    const joined = sheet()
      .split(':host(:not([variant="spaced"])) ::slotted(*:not(:first-child))')
      .slice(1)
      .join('\n')
    expect(joined).toContain('margin-inline-start: calc(var(--helix-border-thin) * -1)')
    expect(joined).toContain('--button-radius-start: 0')
    expect(rule(':host(:not([variant="spaced"])) ::slotted(*:not(:last-child))')).toContain(
      '--button-radius-end: 0',
    )
  })

  test('spaced puts air between them, and only then', () => {
    expect(rule(':host([variant="spaced"])')).toContain('gap: var(--button-group-gap,')
    expect(rule(':host')).not.toContain('gap:')
  })

  test('stacked, the pull and the flattened corners turn with it', () => {
    /* Everything above joins along the inline axis, so a column needs its own
       pair: the block-start pull, the block corners flattened, and the inline
       pull cleared, or every button after the first sits a border to the left
       of the one above it. */
    const stacked = rule(
      ':host([orientation="vertical"]:not([variant="spaced"])) ::slotted(*:not(:first-child))',
    )
    expect(stacked).toContain('margin-block-start: calc(var(--helix-border-thin) * -1)')
    expect(stacked).toContain('--button-radius-start-start: 0')
    expect(stacked).toContain('margin-inline-start: 0')
    expect(rule(':host([orientation="vertical"])')).toContain('flex-direction: column')
  })

  test('a hovered or focused button draws above its neighbors', () => {
    // The border it lights up is otherwise half covered by the one overlapping it.
    const raised = rule('::slotted(*:focus-within)')
    expect(raised).toContain('position: relative')
    expect(raised).toContain('z-index: var(--helix-layer-raised)')
  })

  /* WA and Shoelace size each button; a group of buttons all one size had to
     say it on every button or reach for `data-density`. */
  test('size reflects, rests on nothing, and declares the density steps for every button', async () => {
    const host = (await mount(group)) as Updatable & { size?: string }
    expect(host.hasAttribute('size')).toBe(false)
    host.size = 'sm'
    await host.updateComplete
    expect(host.getAttribute('size')).toBe('sm')
    expect(rule(':host([size="sm"])')).toContain(
      '--helix-size-control: var(--helix-size-control-sm)',
    )
    expect(rule(':host([size="lg"])')).toContain(
      '--helix-size-control: var(--helix-size-control-lg)',
    )
    expect(rule(':host([size="sm"])')).toContain(
      '--helix-size-control-tight: calc(var(--helix-size-control) * 0.8)',
    )
  })

  /* A pressed view had no look of its own: the state is on the control inside
     each button, where this sheet cannot select it. */
  test('a pressed button takes the solid fill through its own hooks, and loses it when released', async () => {
    const host =
      (await mount(`<helix-button-group label="View" selection-mode="single" value="week">
        <helix-button value="day">Day</helix-button><helix-button value="week">Week</helix-button>
      </helix-button-group>`)) as Updatable & { requestUpdate(): void; value: string }
    const buttons = [...host.querySelectorAll('helix-button')] as Updatable[]
    for (const button of buttons) {
      await button.updateComplete
    }
    const fills = async (): Promise<string[]> => {
      host.requestUpdate()
      await host.updateComplete
      await new Promise((done) => setTimeout(done, 0))
      return buttons.map(
        (button) =>
          button.shadowRoot
            ?.querySelector<HTMLElement>('[part="button"]')
            ?.style.getPropertyValue('--button-background-color') ?? 'no control',
      )
    }
    expect(await fills()).toEqual(['', 'var(--_button-group-pressed-background)'])
    host.value = 'day'
    expect(await fills()).toEqual(['var(--_button-group-pressed-background)', ''])
    const resolved = rule(':host([selection-mode])')
    expect(resolved).toContain('--button-group-pressed-background-color')
    expect(resolved).toContain('--button-group-pressed-color')
  })

  test('size reaches a native button too, and only under size', () => {
    // Measured 27px in a large group, where a Helix button was 48.
    expect(rule(':host([size]) ::slotted(button)')).toContain(
      'block-size: var(--helix-size-control)',
    )
  })

  if (hasLayout()) {
    test('in a browser, size sets the height of every button in the group', async () => {
      const height = async (size: string): Promise<number[]> => {
        const host = await mount(`<helix-button-group label="Export" ${size}>
            <helix-button>CSV</helix-button><helix-button>JSON</helix-button>
          </helix-button-group>`)
        return [...host.querySelectorAll('helix-button')].map(
          (button) => button.getBoundingClientRect().height,
        )
      }
      const [small, medium, large] = [
        await height('size="sm"'),
        await height(''),
        await height('size="lg"'),
      ]
      expect(small[0]).toBeLessThan(medium[0] as number)
      expect(large[0]).toBeGreaterThan(medium[0] as number)
      expect(small[0]).toBe(small[1] as number)
    })

    /* The page's base layer joins a native button, since its corners are its
       own radius and a page rule setting one beats any `::slotted()` rule. */
    test('in a browser, native buttons join too, even under a page rule with a radius', async () => {
      const corners = async (orientation: string): Promise<string[][]> => {
        const host = await mount(`<helix-button-group label="Export" ${orientation}>
            <button class="mine">CSV</button><button class="mine">JSON</button><button class="mine">Copy</button>
          </helix-button-group><style>.mine { border-radius: 8px }</style>`)
        return [...host.querySelectorAll('button')].map((button) => {
          const style = getComputedStyle(button)
          return [
            style.borderStartStartRadius,
            style.borderStartEndRadius,
            style.borderEndStartRadius,
            style.borderEndEndRadius,
          ]
        })
      }
      expect(await corners('')).toEqual([
        ['8px', '0px', '8px', '0px'],
        ['0px', '0px', '0px', '0px'],
        ['0px', '8px', '0px', '8px'],
      ])
      expect(await corners('orientation="vertical"')).toEqual([
        ['8px', '8px', '0px', '0px'],
        ['0px', '0px', '0px', '0px'],
        ['0px', '0px', '8px', '8px'],
      ])
      expect(await corners('variant="spaced"')).toEqual([
        ['8px', '8px', '8px', '8px'],
        ['8px', '8px', '8px', '8px'],
        ['8px', '8px', '8px', '8px'],
      ])
    })

    test('in a browser, anchors styled as buttons join down a column by their block corners', async () => {
      const host = await mount(`<helix-button-group label="Export" orientation="vertical">
          <a data-button href="#csv">CSV</a><a data-button href="#json">JSON</a><a data-button href="#copy">Copy</a>
        </helix-button-group>`)
      const flat = [...host.querySelectorAll('a')].map((anchor) => {
        const style = getComputedStyle(anchor)
        return [
          style.borderStartStartRadius,
          style.borderStartEndRadius,
          style.borderEndStartRadius,
          style.borderEndEndRadius,
        ].map((corner) => corner === '0px')
      })
      expect(flat).toEqual([
        [false, false, true, true],
        [true, true, true, true],
        [true, true, false, false],
      ])
    })
  }
})
