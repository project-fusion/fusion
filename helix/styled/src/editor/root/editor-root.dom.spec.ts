import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const cssOf = (tag: string): string => {
  const styles = (customElements.get(tag) as unknown as { styles: unknown }).styles
  const list = Array.isArray(styles) ? styles : [styles]
  return list.map((style) => String((style as { cssText?: string }).cssText ?? '')).join('\n')
}

describe('the styled editor', () => {
  test('is the headless frame, with its parts, and composes the styled tools', async () => {
    const element = await mount('<helix-editor label="Notes"><div></div></helix-editor>')
    expect(part(element, 'region')?.getAttribute('aria-label')).toBe('Notes')
    expect(part(element, 'viewport')).not.toBeNull()
    expect(part(element, 'bold')?.localName).toBe('helix-icon-button')
    expect(part(element, 'controls')?.localName).toBe('helix-toolbar')
    expect(part(element, 'block-menu')?.localName).toBe('helix-menu')
  })

  test('keeps the toolbar at the top of the page, and the lines to a measure', () => {
    const css = cssOf('helix-editor')
    expect(css).toContain('position: sticky')
    expect(css).toContain('var(--editor-header-offset, 0)')
    expect(css).toContain('var(--editor-measure, 72ch)')
    expect(css).toContain('overflow: clip')
  })

  test('fill and separation reflect, so the sheet can select on them when a script sets them', async () => {
    const element = (await mount('<helix-editor></helix-editor>')) as HTMLElement & {
      fill: boolean
      separation?: string
      updateComplete: Promise<unknown>
    }
    element.fill = true
    element.separation = 'plain'
    await element.updateComplete
    expect(element.hasAttribute('fill')).toBe(true)
    expect(element.getAttribute('separation')).toBe('plain')
  })
})

/** Waits until `check` holds, a frame at a time, for at most a second. */
const until = async (check: () => boolean): Promise<void> => {
  for (let turn = 0; turn < 60 && !check(); turn += 1) {
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
  }
}

describe('the toolbar folds what does not fit', () => {
  test('draws the overflow menu, hidden while nothing has folded, and the button named', async () => {
    const element = await mount('<helix-editor label="Notes"><div></div></helix-editor>')
    const menu = part(element, 'overflow') as HTMLElement
    expect(menu?.localName).toBe('helix-menu')
    expect(menu.hidden).toBe(true)
    expect(part(element, 'more')?.getAttribute('label')).toBe('More tools')
    expect(cssOf('helix-editor')).toContain('flex-wrap: nowrap')
  })

  if (hasLayout()) {
    /** An editor `width` pixels wide, once its toolbar has measured. */
    const narrow = async (width: number): Promise<HTMLElement> => {
      document.body.innerHTML = `<div style="inline-size: ${width}px"><helix-editor label="Notes"><div></div></helix-editor></div>`
      const element = document.body.querySelector('helix-editor') as HTMLElement & {
        attach: (renderer: { run: () => boolean }) => unknown
        updateComplete: Promise<unknown>
      }
      /* A renderer that runs every tool, so none is disabled. */
      element.attach({ run: () => true })
      await element.updateComplete
      await until(
        () => (part(element, 'overflow') as HTMLElement | null)?.hidden === false || width > 800,
      )
      await new Promise((done) => requestAnimationFrame(() => done(undefined)))
      return element
    }

    /** The tools still on the row, and the rows in the overflow menu. */
    const tally = (element: HTMLElement): { folded: number; shown: HTMLElement[] } => {
      const root = element.shadowRoot as ShadowRoot
      const shown = [
        ...root.querySelectorAll<HTMLElement>(
          '[part~="undo"], [part~="redo"], [part~="block"], [part~="bold"], [part~="italic"], [part~="strike"], [part~="code"], [part~="link"], [part~="bullet-list"], [part~="ordered-list"], [part~="quote"]',
        ),
      ].filter((tool) => tool.closest('[hidden]') === null)
      const folded = root.querySelectorAll('[part="overflow"] > [part="overflow-option"]').length
      return { folded, shown }
    }

    for (const [width, at] of [
      [342, 390],
      [232, 280],
    ] as const) {
      test(`in a browser, keeps one row in a frame ${width} pixels wide, as at ${at}, with every tool on it or in the menu`, async () => {
        const element = await narrow(width)
        const controls = part(element, 'controls') as HTMLElement
        expect(controls.scrollWidth).toBeLessThanOrEqual(controls.clientWidth)
        const more = part(element, 'more') as HTMLElement
        expect((part(element, 'overflow') as HTMLElement).hidden).toBe(false)
        const { folded, shown } = tally(element)
        /* Eleven tools by default: Undo, Redo, the block menu, four marks,
           Link, two lists, and Quote. */
        expect(shown.length + folded).toBe(11)
        expect(folded).toBeGreaterThan(0)
        const top = more.getBoundingClientRect().top
        for (const tool of shown) {
          expect(Math.abs(tool.getBoundingClientRect().top - top)).toBeLessThan(1)
        }
        /* The tools fold from the end, so Undo stays longest. */
        expect(shown[0]?.getAttribute('part')).toBe('undo')
      })
    }

    test('in a browser, folds nothing in a wide frame', async () => {
      const element = await narrow(1000)
      expect((part(element, 'overflow') as HTMLElement).hidden).toBe(true)
      expect(tally(element).shown.length).toBe(11)
    })

    test('in a browser, the arrow keys reach the overflow button as the last control', async () => {
      const element = await narrow(342)
      const undo = part(element, 'undo') as HTMLElement
      undo.focus()
      undo.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: 'End',
        }),
      )
      expect(element.shadowRoot?.activeElement).toBe(part(element, 'more'))
    })
  }
})
