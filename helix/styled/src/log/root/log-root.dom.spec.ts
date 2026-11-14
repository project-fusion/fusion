import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Log = HTMLElement & { updateComplete: Promise<unknown>; write(chunk: string): void }

const cssOf = (tag: string): string => {
  const styles = (customElements.get(tag) as unknown as { styles: unknown }).styles
  const list = Array.isArray(styles) ? styles : [styles]
  return list.map((style) => String((style as { cssText?: string }).cssText ?? '')).join('\n')
}

describe('the styled log', () => {
  test('draws lines written to it with the styled line', async () => {
    const element = (await mount(
      '<helix-log label="Build" style="--log-max-block-size: 20rem"></helix-log>',
    )) as Log
    element.write('ok\n')
    await element.updateComplete
    await element.updateComplete
    expect(element.shadowRoot?.querySelector('[part="row"] > helix-log-line')).not.toBeNull()
    expect(part(element, 'log')?.getAttribute('role')).toBe('log')
  })

  test('takes the sixteen ANSI colors from the theme, and lets a page set each', () => {
    const css = cssOf('helix-log')
    expect(css).toContain('--log-ansi-red: var(--helix-color-danger)')
    expect(css).toContain('--log-ansi-green: var(--helix-color-success)')
    expect(css).toContain('--log-max-block-size')
  })

  test('draws each bright hue from its hue, a quarter of the way to the ink', () => {
    const css = cssOf('helix-log')
    for (const hue of ['blue', 'cyan', 'green', 'magenta', 'red', 'yellow']) {
      expect(css).toMatch(
        new RegExp(
          `--log-ansi-bright-${hue}: color-mix\\(\\s*in oklab,\\s*var\\(--log-ansi-${hue}\\) 75%`,
        ),
      )
    }
  })

  test('draws a run in the color the log writes on it', () => {
    const css = cssOf('helix-log-line')
    expect(css).toContain('color: var(--log-run-color, inherit)')
    expect(css).toContain('var(--log-digits, 2)')
  })

  test('turns a group’s caret as it opens', () => {
    expect(cssOf('helix-log-group')).toMatch(/:host[^{]*:state\(open\)[^{]*\[part="mark"\]/)
  })

  test('sets a plain log’s steps as rows of an agent’s work', () => {
    const root = cssOf('helix-log')
    expect(root).toContain('--_log-caret-order: 1')
    expect(root).toContain('--_log-step-max-block-size: var(--log-step-max-block-size, 20rem)')
    const group = cssOf('helix-log-group')
    expect(group).toContain('order: var(--_log-caret-order, 0)')
    expect(group).toMatch(/:not\(:state\(steps\)\)[^{]*\[part="content"\]/)
    expect(group).toMatch(/:state\(steps\)[^{]*\[part="content"\]/)
  })
})

/* Browser only: happy-dom lays nothing out. */
const laid = hasLayout() ? test : (): void => {}

describe('a plain log of an agent’s work', () => {
  laid(
    'puts the mark on the edge, the caret after the heading, and a long output on a surface that scrolls',
    async () => {
      const lines = Array.from(
        { length: 80 },
        (_, at) => `<helix-log-line>line ${at}</helix-log-line>`,
      )
      const host = (await mount(
        `<div style="inline-size: 480px"><helix-log label="Work" separation="plain" wrap>
          <helix-log-group heading="2 steps" status="done" default-open>
            <helix-log-group heading="Shell" status="done" default-open>${lines.join('')}</helix-log-group>
            <helix-log-group heading="Read" status="done"></helix-log-group>
          </helix-log-group>
        </helix-log></div>`,
      )) as HTMLElement
      const log = host.querySelector('helix-log') as Log
      await settle(log)
      const [outer, shell, read] = [...host.querySelectorAll('helix-log-group')] as HTMLElement[]
      await Promise.all(
        [outer, shell, read].map((element) => (element as unknown as Log).updateComplete),
      )
      const box = (element: Element | null | undefined) =>
        (element as Element).getBoundingClientRect()
      const left = box(log).left
      // The outer step's mark is on the log's edge, and its caret after its heading.
      expect(Math.round(box(part(outer as HTMLElement, 'status')).left)).toBe(Math.round(left))
      expect(box(part(outer as HTMLElement, 'mark')).left).toBeGreaterThan(
        box(part(outer as HTMLElement, 'heading')).right - 1,
      )
      // A step's mark sits under the heading of the step that holds it.
      expect(Math.round(box(part(shell as HTMLElement, 'status')).left)).toBe(
        Math.round(box(part(outer as HTMLElement, 'heading')).left),
      )
      // The output is held to its height and scrolls.
      const content = part(shell as HTMLElement, 'content') as HTMLElement
      expect(content.scrollHeight).toBeGreaterThan(content.clientHeight)
      expect(getComputedStyle(content).overflowY).toBe('auto')
      // A step with nothing in it draws no caret.
      expect(getComputedStyle(part(read as HTMLElement, 'mark') as Element).visibility).toBe(
        'hidden',
      )
      // Nothing scrolls sideways.
      const scroller = part(log, 'log') as HTMLElement
      expect(scroller.scrollWidth).toBe(scroller.clientWidth)
    },
  )
})
