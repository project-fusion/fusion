import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  servedParts,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const served = (
  markup = html`<helix-headless-device-screen label="iPhone 17 Pro"></helix-headless-device-screen>`,
) => withoutStyles(ssr(markup))

describe('device screen server output', () => {
  test('the screen is served named, focusable, and taking keys', () => {
    /* A screen added on hydration is one a keyboard reader cannot reach until
       the script lands, and one a screen reader cannot name. */
    const screen = partTag(served(), 'screen')
    expect(screen).toContain('role="application"')
    expect(screen).toContain('aria-label="iPhone 17 Pro"')
    expect(screen).toContain('aria-roledescription="screen"')
    expect(screen).toContain('tabindex="0"')
    expect(screen).toContain('aria-describedby="keys-hint"')
    expect(screen).toContain('data-touches')
  })

  test('the description the screen points at is served beside it', () => {
    const hint = partTag(served(), 'keys-hint')
    expect(hint).toContain('id="keys-hint"')
    expect(rendered(served(), 'helix-headless-device-screen')).toContain(
      'Keys you press go to the device. Press Tab to leave the screen.',
    )
  })

  test('the resting buttons are Home and the screenshot, named', () => {
    const markup = served()
    expect(partTag(markup, 'home')).toContain('label="Home"')
    expect(partTag(markup, 'screenshot')).toContain('label="Take a screenshot"')
    expect(hasPart(markup, 'back')).toBe(false)
    expect(hasPart(markup, 'volume-up')).toBe(false)
  })

  /* `arrow` and `surface` are the Tooltip's, one beside each button to show
     its name. No `empty`: a server cannot know whether a stream is inside. */
  test('the frame is served whole, its Icon Buttons with their own parts, and nothing drawn on the screen', () => {
    expect(servedParts(served())).toEqual([
      'arrow',
      'bezel',
      'button',
      'controls',
      'device',
      'footer',
      'header',
      'home',
      'keys-hint',
      'live',
      'loading',
      'picture',
      'region',
      'screen',
      'screenshot',
      'surface',
      'text',
    ])
  })

  test('the shape is served from the size the page gave, so the device does not move on hydration', () => {
    const markup = served(
      html`<helix-headless-device-screen label="iPhone" screen-width="402" screen-height="874"></helix-headless-device-screen>`,
    )
    expect(partTag(markup, 'region')).toContain('--device-screen-ratio: 0.45995')
    expect(partTag(markup, 'region')).toContain('--device-screen-rotation: 0deg')
  })

  test('a picture turned a quarter is served the device’s height wide', () => {
    const markup = served(
      html`<helix-headless-device-screen label="iPhone" screen-width="402" screen-height="874" rotation="90"></helix-headless-device-screen>`,
    )
    expect(partTag(markup, 'region')).toContain('--device-screen-ratio: 2.17413')
    expect(partTag(markup, 'region')).toContain('--device-screen-rotation: 90deg')
  })

  test('a read-only screen is served as a picture, out of the tab order', () => {
    const screen = partTag(
      served(
        html`<helix-headless-device-screen label="iPhone" readonly></helix-headless-device-screen>`,
      ),
      'screen',
    )
    expect(screen).toContain('role="img"')
    expect(screen).not.toContain('tabindex')
    expect(screen).not.toContain('data-touches')
    expect(screen).not.toContain('aria-describedby')
  })

  test('`top` puts the buttons where they rest, before the device', () => {
    const markup = rendered(
      served(
        html`<helix-headless-device-screen label="iPhone" controls-placement="top"></helix-headless-device-screen>`,
      ),
      'helix-headless-device-screen',
    )
    expect(markup.indexOf('part="controls"')).toBeLessThan(markup.indexOf('part="screen"'))
  })

  test('a frame that keeps no buttons ships none', () => {
    const markup = served(
      html`<helix-headless-device-screen label="iPhone" controls="none"></helix-headless-device-screen>`,
    )
    expect(hasPart(markup, 'controls')).toBe(false)
    expect(partTag(markup, 'screen')).toContain('aria-label="iPhone"')
  })

  test('the buttons come after the device in the markup where they are drawn after it', () => {
    const markup = rendered(
      served(
        html`<helix-headless-device-screen label="iPhone" controls-placement="end"></helix-headless-device-screen>`,
      ),
      'helix-headless-device-screen',
    )
    expect(markup.indexOf('part="controls"')).toBeGreaterThan(markup.indexOf('part="screen"'))
  })

  test('the slots a page fills are served', () => {
    const inside = rendered(served(), 'helix-headless-device-screen')
    for (const name of ['header', 'footer', 'bezel', 'controls', 'home-icon', 'screenshot-icon']) {
      expect(inside).toContain(`name="${name}"`)
    }
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(served(), 'helix-headless-device-screen')).toEqual(['label'])
  })
})
