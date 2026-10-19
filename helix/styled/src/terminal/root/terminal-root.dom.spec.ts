import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not inherit a custom property into a computed
   style, so the theme a frame reads can only be read there. */
const run = hasLayout() ? test : (): void => {}

const cssOf = (tag: string): string => {
  const styles = (customElements.get(tag) as unknown as { styles: unknown }).styles
  const list = Array.isArray(styles) ? styles : [styles]
  return list.map((style) => String((style as { cssText?: string }).cssText ?? '')).join('\n')
}

describe('the styled terminal', () => {
  test('is the headless frame, with its parts', async () => {
    const element = await mount('<helix-terminal label="zsh"><div></div></helix-terminal>')
    expect(part(element, 'region')?.getAttribute('aria-label')).toBe('zsh')
    expect(part(element, 'viewport')).not.toBeNull()
  })

  test('sets the theme on the host, where a page can set its own, and draws the frame in it', () => {
    const css = cssOf('helix-terminal')
    expect(css).toContain('--terminal-ansi-red: var(--helix-color-danger)')
    expect(css).toContain('--terminal-background-color: var(--helix-color-background)')
    expect(css).toContain('background-color: var(--terminal-background-color)')
    expect(css).toContain('var(--terminal-font-family, var(--helix-font-mono))')
    expect(css).toContain('var(--terminal-block-size, 24rem)')
  })

  test('fill and separation reflect, so the sheet can select on them when a script sets them', async () => {
    const element = (await mount('<helix-terminal></helix-terminal>')) as HTMLElement & {
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

  run('gives every color the connector themes with from the theme, and its face', async () => {
    const element = (await mount('<helix-terminal></helix-terminal>')) as HTMLElement & {
      look(): { colors: Record<string, string>; font?: { family: string; size: number } }
    }
    const { colors, font } = element.look()
    for (const name of [
      'background',
      'foreground',
      'cursor',
      'selection',
      'red',
      'brightWhite',
      'match',
    ]) {
      expect(colors[name]).toBeTruthy()
    }
    expect(Object.keys(colors)).toHaveLength(24)
    expect(font?.size).toBeGreaterThan(0)
  })

  run('draws each bright hue apart from its hue, and from the hue the page sets', async () => {
    type Looking = HTMLElement & { look(): { colors: Record<string, string> } }
    const element = (await mount('<helix-terminal></helix-terminal>')) as Looking
    const { colors } = element.look()
    for (const hue of ['blue', 'cyan', 'green', 'magenta', 'red', 'yellow']) {
      const bright = colors[`bright${hue[0]?.toUpperCase()}${hue.slice(1)}`]
      expect(bright).toBeTruthy()
      expect(bright).not.toBe(colors[hue])
    }
    const reddened = (await mount(
      '<helix-terminal style="--terminal-ansi-red: rgb(200, 0, 0)"></helix-terminal>',
    )) as Looking
    expect(reddened.look().colors.brightRed).not.toBe(colors.brightRed)
  })

  run('takes a color the page sets on the terminal over the theme’s', async () => {
    const element = (await mount(
      '<helix-terminal style="--terminal-ansi-blue: rgb(1, 2, 3)"></helix-terminal>',
    )) as HTMLElement & { look(): { colors: Record<string, string> } }
    expect(element.look().colors.blue).toBe('rgb(1, 2, 3)')
  })
})
