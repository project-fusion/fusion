import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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
    expect(cssOf('helix-log-group')).toContain(':host(:state(open)) [part="mark"]')
  })
})
