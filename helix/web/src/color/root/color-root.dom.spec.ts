import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Color = HTMLElement & { format: string; updateComplete: Promise<unknown>; value: string }

const picker = async (attrs = ''): Promise<Color> => {
  const host = (await mount(`<helix-color ${attrs}></helix-color>`)) as Color
  await host.updateComplete
  return host
}

/** Moves one axis of the square, which is a real range input. */
const axis = async (host: Color, which: string, to: number): Promise<void> => {
  const range = part(host, `grid-${which}`) as HTMLInputElement
  range.value = String(to)
  range.dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

/** Moves one of the ramps, which announce rather than being driven directly. */
const ramp = async (host: Color, channel: string, to: number): Promise<void> => {
  host.shadowRoot?.querySelector(`[data-channel="${channel}"]`)?.dispatchEvent(
    new CustomEvent('helix-change', {
      bubbles: true,
      composed: true,
      detail: { name: channel, value: String(to) },
    }),
  )
  await host.updateComplete
}

describe('color syntaxes', () => {
  test('every one of them is read, whatever the picker writes', async () => {
    // A picker that refuses `rgb(255 0 0)` because it prefers hex is arguing
    // with the person using it. Each of these is the same red, and each has to
    // land as that red rather than be ignored.
    for (const written of [
      '#f00',
      '#ff0000',
      '#FF0000',
      'rgb(255 0 0)',
      'rgb(255, 0, 0)',
      'rgba(255, 0, 0, 1)',
      'rgb(100% 0% 0%)',
      'hsl(0 100% 50%)',
      'hsl(0, 100%, 50%)',
      'hsla(0, 100%, 50%, 1)',
    ]) {
      const host = await picker(`default-value="${written}"`)
      // Read all the way into the model: moving one axis proves the hue landed.
      await axis(host, 'saturation', 0)
      expect(host.value).toBe('#ffffff')
    }
  })

  test('and the alpha comes with them', async () => {
    for (const written of ['#ff000080', 'rgb(255 0 0 / 50%)', 'rgba(255,0,0,0.5)']) {
      const host = await picker(`alpha default-value="${written}"`)
      await ramp(host, 'hue', 0)
      expect(host.value).toBe('#ff000080')
    }
  })

  test('what is written is the format, whatever was read', async () => {
    const host = await picker('format="rgb" default-value="#ff0000"')
    await ramp(host, 'hue', 120)
    expect(host.value).toBe('rgb(0 255 0)')
  })

  test('hsl too, and it round trips through the model', async () => {
    const host = await picker('format="hsl" default-value="rgb(255 0 0)"')
    await ramp(host, 'hue', 240)
    expect(host.value).toBe('hsl(240 100% 50%)')
  })

  test('the toggle walks hex to rgb to hsl and back, rewriting as it goes', async () => {
    const host = await picker('default-value="#ff0000"')
    const toggle = part(host, 'format') as HTMLElement
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('rgb(255 0 0)')
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('hsl(0 100% 50%)')
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('#ff0000')
  })

  test('a name is not a colour here, and is left alone rather than half read', async () => {
    // Resolving `rebeccapurple` means shipping a table of a hundred and forty or
    // asking a browser that is not there during a server render.
    const host = await picker('default-value="rebeccapurple"')
    await ramp(host, 'hue', 0)
    // Falls back to the start rather than to some partial reading of the name.
    expect(host.value).toBe('#ff0000')
  })
})

describe('color picker', () => {
  test('the square is two real range inputs, which is what makes it reachable', async () => {
    // No `role="application"` and no key handler: the platform brings the arrow
    // keys, Home, End, the page keys and a name a screen reader can announce.
    const host = await picker()
    const saturation = part(host, 'grid-saturation') as HTMLInputElement
    const brightness = part(host, 'grid-brightness') as HTMLInputElement
    expect(saturation.type).toBe('range')
    expect(brightness.type).toBe('range')
    expect(saturation.getAttribute('aria-label')).toBe('Saturation')
    expect(brightness.getAttribute('aria-label')).toBe('Brightness')
    expect(part(host, 'grid')?.getAttribute('role')).toBeNull()
  })

  test('the handle is hidden from the tree, because the ranges are the control', async () => {
    const host = await picker()
    expect(part(host, 'grid-handle')?.getAttribute('aria-hidden')).toBe('true')
  })

  test('moving an axis moves the colour', async () => {
    const host = await picker('default-value="#ff0000"')
    await axis(host, 'brightness', 50)
    expect(host.value).toBe('#800000')
  })

  test('a hue survives a trip through a colour that has none', async () => {
    // The reason the model is the state rather than a reading of the value.
    // Black is brightness 0, whose hue and saturation are both undefined, so
    // re-deriving from the hex turns a green dragged down into a grey coming up.
    const host = await picker('default-value="#00ff00"')
    await axis(host, 'brightness', 0)
    expect(host.value).toBe('#000000')
    await axis(host, 'brightness', 100)
    expect(host.value).toBe('#00ff00')
  })

  test('nothing chosen starts somewhere every control can move from', async () => {
    // Not black, which is where `<input type="color">` starts: from there the
    // hue ramp moves nothing and the square is one flat colour.
    const host = await picker()
    await ramp(host, 'hue', 120)
    expect(host.value).toBe('#00ff00')
  })

  test('the square is painted from the hue and positioned from the two axes', async () => {
    const host = await picker('default-value="#00ff00"')
    const grid = part(host, 'grid')?.getAttribute('style')
    expect(grid).toContain('--_hue: 120')
    expect(grid).toContain('--_saturation: 100%')
    expect(grid).toContain('--_brightness: 100%')
  })

  test('alpha is offered only when it is asked for', async () => {
    const plain = await picker()
    expect(plain.shadowRoot?.querySelector('[data-channel="alpha"]')).toBeNull()
    const clear = await picker('alpha')
    expect(clear.shadowRoot?.querySelector('[data-channel="alpha"]')).not.toBeNull()
  })

  test('presets render, and only the ones that are colours', async () => {
    const host = await picker('swatches="#ff0000, not-a-colour, rgb(0 255 0)"')
    expect(
      [...(host.shadowRoot?.querySelectorAll('[part="swatch"]') ?? [])].map((one) =>
        one.getAttribute('aria-label'),
      ),
    ).toEqual(['#ff0000', 'rgb(0 255 0)'])
  })

  test('a preset is taken in the picker format, not as the preset spelled it', async () => {
    const host = await picker('format="rgb" swatches="#00ff00"')
    const swatch = host.shadowRoot?.querySelector('[part="swatch"]') as HTMLElement
    swatch.click()
    await host.updateComplete
    expect(host.value).toBe('rgb(0 255 0)')
  })

  test('the format toggle can be withheld', async () => {
    const host = await picker('no-format')
    expect(host.shadowRoot?.querySelector('[part="format"]')).toBeNull()
  })

  test('the footer is not drawn when it holds nothing', async () => {
    // An empty box still takes its padding, which is a band of nothing under the
    // ramps on a picker with no presets and no toggle.
    const host = await picker('no-format')
    expect(host.shadowRoot?.querySelector('[part="swatch"]')).toBeNull()
    expect(part(host, 'footer')?.childElementCount).toBe(0)
  })
})
