import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { formValue, mount, part, registerDom, settle, slotted } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Color = HTMLElement & { format: string; updateComplete: Promise<unknown>; value: string }

const picker = async (attrs = ''): Promise<Color> => {
  const host = (await mount(
    `<helix-headless-color-picker ${attrs}></helix-headless-color-picker>`,
  )) as Color
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

/**
 * Moves a channel the way its slider does: apply, then announce natively.
 *
 * `helix-change` is a *request*, announced before the slider has moved and
 * while a listener may still refuse it, so acting on it would act on a decision
 * not yet taken. The picker reads the applied value off the slider instead,
 * which is what the native pair reports.
 */
const ramp = async (host: Color, channel: string, to: number): Promise<void> => {
  const slider = host.shadowRoot?.querySelector(`[data-channel="${channel}"]`) as
    | (HTMLElement & { value: string })
    | null
  if (slider) {
    slider.value = String(to)
    slider.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }
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
    expect(host.value).toBe('rgb(0, 255, 0)')
  })

  test('hsl too, and it round trips through the model', async () => {
    const host = await picker('format="hsl" default-value="rgb(255 0 0)"')
    await ramp(host, 'hue', 240)
    expect(host.value).toBe('hsl(240, 100%, 50%)')
  })

  test('the toggle walks hex to rgb to hsl and back, rewriting as it goes', async () => {
    const host = await picker('default-value="#ff0000"')
    const toggle = part(host, 'format') as HTMLElement
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('rgb(255, 0, 0)')
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('hsl(0, 100%, 50%)')
    toggle.click()
    await host.updateComplete
    expect(host.value).toBe('#ff0000')
  })

  test('a name is not a color here, and is left alone rather than half read', async () => {
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

  test('moving an axis moves the color', async () => {
    const host = await picker('default-value="#ff0000"')
    await axis(host, 'brightness', 50)
    expect(host.value).toBe('#800000')
  })

  test('a hue survives a trip through a color that has none', async () => {
    // The reason the model is the state rather than a reading of the value.
    // Black is brightness 0, whose hue and saturation are both undefined, so
    // re-deriving from the hex turns a green dragged down into a gray coming up.
    const host = await picker('default-value="#00ff00"')
    await axis(host, 'brightness', 0)
    expect(host.value).toBe('#000000')
    await axis(host, 'brightness', 100)
    expect(host.value).toBe('#00ff00')
  })

  test('nothing chosen starts somewhere every control can move from', async () => {
    // Not black, which is where `<input type="color">` starts: from there the
    // hue ramp moves nothing and the square is one flat color.
    const host = await picker()
    await ramp(host, 'hue', 120)
    expect(host.value).toBe('#00ff00')
  })

  test('the square is painted from the hue and positioned from the two axes', async () => {
    const host = await picker('default-value="#00ff00"')
    const grid = part(host, 'grid')?.getAttribute('style')
    expect(grid).toContain('--color-picker-hue: 120')
    expect(grid).toContain('--color-picker-saturation: 100%')
    expect(grid).toContain('--color-picker-brightness: 100%')
  })

  test('alpha is offered only when it is asked for', async () => {
    const plain = await picker()
    expect(plain.shadowRoot?.querySelector('[data-channel="alpha"]')).toBeNull()
    const clear = await picker('alpha')
    expect(clear.shadowRoot?.querySelector('[data-channel="alpha"]')).not.toBeNull()
  })

  test('presets render, and only the ones that are colors', async () => {
    const host = await picker('swatches="#ff0000, not-a-color, rgb(0 255 0)"')
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
    expect(host.value).toBe('rgb(0, 255, 0)')
  })

  test('presets may be written in any syntax, mixed', async () => {
    // The question is whether a row can hold `#ef4444` beside `rgb(...)` beside
    // `hsl(...)`. It can: each is parsed the same way the field is, and each is
    // handed to CSS as written, which understands all three.
    const host = await picker(
      'swatches="#ef4444, rgb(249 115 22), hsl(48 96% 53%), rgba(34,197,94,.5)"',
    )
    const swatches = [...(host.shadowRoot?.querySelectorAll('[part="swatch"]') ?? [])]
    expect(swatches).toHaveLength(4)
    // Painted from the string as given, so the browser resolves each syntax.
    expect(swatches[1]?.getAttribute('style')).toContain('rgb(249 115 22)')
    // And taken in the picker's own format, whatever the preset was written in.
    ;(swatches[2] as HTMLElement).click()
    await host.updateComplete
    // hsl(48 96% 53%) is rgb(250, 204, 20), and it survives the trip through the
    // HSB model the panel holds rather than landing a rounding step away.
    expect(host.value).toBe('#facc14')
  })

  test('the chosen preset is not marked with a ring, but is still announced', async () => {
    // A ring on one swatch is a focus ring in another color sitting there
    // permanently, and what the swatch was chosen for is already showing on the
    // chip. A screen reader has neither, so `aria-pressed` stays.
    const host = await picker('default-value="#00ff00" swatches="#ff0000,#00ff00"')
    const swatches = [...(host.shadowRoot?.querySelectorAll('[part="swatch"]') ?? [])]
    expect(swatches.map((one) => one.getAttribute('aria-pressed'))).toEqual(['false', 'true'])
  })

  test('the chip copies the value, and says so for as long as it shows', async () => {
    const written: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          written.push(text)
          return Promise.resolve()
        },
      },
    })
    const host = await picker('default-value="#ff0000"')
    const said: string[] = []
    host.addEventListener('helix-copy', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    const sample = part(host, 'sample') as HTMLButtonElement
    sample.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await host.updateComplete
    expect(written).toEqual(['#ff0000'])
    expect(said).toEqual(['#ff0000'])
    expect(sample.hasAttribute('data-copied')).toBe(true)
    expect(sample.getAttribute('aria-label')).toBe('Copied')
  })

  test('and a refused clipboard falls through to the older route', async () => {
    /* The modern API is gated in more places than it looks: an insecure origin,
       an unfocused document, and a Permissions Policy defaulting to `self`,
       which a sandboxed iframe is not. `execCommand` rides the gesture instead
       of asking for a permission, so it works where the other is refused, and a
       control that silently does nothing is indistinguishable from a broken one. */
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('NotAllowedError')) },
    })
    let copied: string | undefined
    const original = document.execCommand
    document.execCommand = ((command: string) => {
      if (command === 'copy') {
        copied = document.querySelector('textarea')?.value
        return true
      }
      return false
    }) as typeof document.execCommand

    const host = await picker('default-value="#ff0000"')
    const sample = part(host, 'sample') as HTMLButtonElement
    sample.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await host.updateComplete
    document.execCommand = original

    expect(copied).toBe('#ff0000')
    expect(sample.hasAttribute('data-copied')).toBe(true)
    // And nothing is left behind in the document.
    expect(document.querySelector('textarea')).toBeNull()
  })

  test('and there is nothing to copy from an empty picker', async () => {
    const host = await picker()
    expect((part(host, 'sample') as HTMLButtonElement).disabled).toBe(true)
  })

  test('the format toggle can be withheld', async () => {
    const host = await picker('no-format')
    expect(host.shadowRoot?.querySelector('[part="format"]')).toBeNull()
  })

  test('the footer is not drawn when it holds nothing', async () => {
    /* An empty box still takes its padding, which is a band of nothing under the
       ramps on a picker with no value, no tools and no presets.
     *
     * `no-eyedropper` as well: the eyedropper is offered where the platform has
     * one, so a browser with `EyeDropper` renders the tools group and the footer
     * holds it. Naming only two of the three things it can hold still passes
     * under happy-dom, which implements none of that API. */
    const host = await picker('no-eyedropper no-format no-value')
    expect(part(host, 'footer')?.childElementCount).toBe(0)
  })

  test('the value is stated as text, which is what completes a picker on a page', async () => {
    // A square and two ramps can build a color and cannot state one, and a
    // reader who already has a hex should not have to find it by dragging.
    const host = await picker('default-value="#ff0000"')
    expect((part(host, 'value') as HTMLInputElement).value).toBe('#ff0000')
  })

  test('and typed into, in any syntax', async () => {
    const host = await picker()
    const field = part(host, 'value') as HTMLInputElement
    field.value = 'rgb(0 255 0)'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    /* Kept exactly as typed, whatever `format` says. The format is the shape
       this element writes when it produces a value; what a reader typed is
       already a value and rewriting it under them would move the caret. */
    expect(host.value).toBe('rgb(0 255 0)')
    expect(part(host, 'grid')?.getAttribute('style')).toContain('--color-picker-hue: 120')
  })

  test('and half-typed input does not throw the square around', async () => {
    /* `#00f` and `#00ff` are colors and `#00ff0` is not, so re-reading the
       square from the value on every keystroke walks it red, blue, red, green.
       The last whole color holds it until the next one arrives. */
    const host = await picker()
    const field = part(host, 'value') as HTMLInputElement
    const seen: string[] = []
    for (const text of ['#', '#0', '#00', '#00f', '#00ff', '#00ff0', '#00ff00']) {
      field.value = text
      field.dispatchEvent(new Event('input', { bubbles: true }))
      await host.updateComplete
      const style = part(host, 'grid')?.getAttribute('style') ?? ''
      seen.push(/--color-picker-hue: (\d+)/.exec(style)?.[1] ?? '?')
    }
    expect(seen).toEqual(['0', '0', '0', '240', '240', '240', '120'])
    expect(host.value).toBe('#00ff00')
  })

  test('and it can be withheld, for a picker whose value is stated elsewhere', async () => {
    const host = await picker('no-value')
    expect(host.shadowRoot?.querySelector('[part="value"]')).toBeNull()
  })

  describe('the mark on the eyedropper', () => {
    /* The control is offered only where the platform has an `EyeDropper`, and
       happy-dom has none, so the button never renders and neither does the
       slot. Stubbed rather than skipped: what is under test is the swap, and
       the gate is a different question that the specs above already ask. */
    const withEyeDropper = async (children = ''): Promise<HTMLElement> => {
      ;(globalThis as { EyeDropper?: unknown }).EyeDropper = class {}
      const host = await mount(
        `<helix-headless-color-picker>${children}</helix-headless-color-picker>`,
      )
      await settle(host as Parameters<typeof settle>[0])
      return host
    }

    afterEach(() => {
      ;(globalThis as { EyeDropper?: unknown }).EyeDropper = undefined
    })

    test('the dropper is a fallback, so a page can hand over its own icon set', async () => {
      const host = await withEyeDropper('<span slot="eyedropper-icon">pick</span>')
      expect(slotted(host, 'eyedropper-icon').length).toBe(1)
    })

    test('and draws its own where nothing is handed over', async () => {
      const host = await withEyeDropper()
      expect(slotted(host, 'eyedropper-icon').length).toBe(0)
      expect(part(host, 'eyedropper')).not.toBeNull()
    })
  })
})

describe('color picker in a form', () => {
  /* It extends `HelixFormElement`, takes `MixinControllerValue` and carries
     `name`, so a consumer writing one inside a form has every reason to expect
     an entry. It called `setFormValue` nowhere, so the form carried none: no
     error, nothing in the markup to look at, and a field silently missing from
     the submission. Both of its siblings in that composition position, Color
     Input and Slider, report. */
  test('reports the color under its name', async () => {
    const host = await picker('name="brand" value="#336699"')
    expect(formValue(host)).toBe('#336699')
  })

  test('and reports nothing at all rather than a blank when it holds no color', async () => {
    // `null` is a control that submits nothing and `''` is one that submits a
    // blank, and a picker with no color has not answered.
    const host = await picker('name="brand"')
    expect(formValue(host)).toBeNull()
  })

  test('and follows the reader', async () => {
    const host = await picker('name="brand" value="#ff0000"')
    await axis(host, 'brightness', 50)
    expect(formValue(host)).toBe(host.value)
  })
})

describe('a required color', () => {
  /* A color is exactly as requirable as a date, and the two pickers in the same
     composition position both check it. This one carried the property nowhere,
     so a form holding an unanswered required picker submitted, `:valid` true
     and the entry absent. */
  const internals = (host: HTMLElement): ElementInternals =>
    (host as unknown as { internals: ElementInternals }).internals

  test('with nothing chosen is missing', async () => {
    const host = await picker('name="brand" required')
    expect(internals(host).validity.valueMissing).toBe(true)
  })

  test('and is valid once a color is in it', async () => {
    const host = await picker('name="brand" required value="#336699"')
    expect(internals(host).validity.valid).toBe(true)
  })

  test('becomes valid as the reader answers, rather than at the next submit', async () => {
    const host = await picker('name="brand" required')
    await axis(host, 'brightness', 50)
    expect(internals(host).validity.valid).toBe(true)
  })

  test('a picker nobody required is never missing, whatever it holds', async () => {
    expect(internals(await picker('name="brand"')).validity.valid).toBe(true)
  })

  test('the message points at the square, which is where the answer is given', async () => {
    const host = await picker('required')
    expect(part(host, 'grid')).not.toBeNull()
    expect(internals(host).validationMessage).toBe('Choose a color.')
  })

  test('and a half-typed color is left alone, the field above owning bad input', async () => {
    /* Every keystroke in the value row reaches `requestValue`, so reporting
       bad input here would fault `#0`, `#00` and `#00f` on the way to a color.
       Color Input reports it once, against the field that was typed into. */
    const host = await picker('name="brand" required')
    const field = part(host, 'value') as HTMLInputElement
    field.value = '#00f'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect(internals(host).validity.valid).toBe(true)
  })
})

describe('a read-only color picker', () => {
  test('refuses the square, and the handle goes back where the value still is', async () => {
    /* The square is drawn from the model rather than from the value, so a
       refusal taken at `requestValue` alone would move the handle and leave the
       color behind it. */
    const host = await picker('readonly value="#ff0000"')
    await axis(host, 'brightness', 20)
    expect(host.value).toBe('#ff0000')
    expect((part(host, 'grid-brightness') as HTMLInputElement).value).toBe('100')
  })

  test('refuses a ramp, and puts that handle back too', async () => {
    const host = await picker('readonly value="#ff0000"')
    await ramp(host, 'hue', 200)
    expect(host.value).toBe('#ff0000')
    const slider = host.shadowRoot?.querySelector('[data-channel="hue"]') as unknown as {
      value: string
    }
    expect(slider.value).toBe('0')
  })

  test('refuses a preset', async () => {
    const host = await picker('readonly swatches="#00ff00" value="#ff0000"')
    ;(part(host, 'swatch') as HTMLElement).click()
    await host.updateComplete
    expect(host.value).toBe('#ff0000')
  })

  test('refuses the syntax toggle whole, that being a rewrite of the value', async () => {
    /* Half-refused, the toggle would say `rgb` over a hex it was no longer
       allowed to restate. */
    const host = await picker('format="hex" readonly value="#ff0000"')
    ;(part(host, 'format') as HTMLElement).click()
    await host.updateComplete
    expect(host.format).toBe('hex')
    expect(host.value).toBe('#ff0000')
  })

  test('refuses the eyedropper whole, rather than running one that cannot land', async () => {
    /* `helix-sample-start` is a request to whatever is holding this picker to
       get off the screen, and the sampler takes the pointer over the whole
       page. Gated at `move` alone, a read-only picker cleared the panel, ran
       the sampler, took a color from the reader and dropped it. */
    let opened = 0
    ;(globalThis as { EyeDropper?: unknown }).EyeDropper = class {
      open(): Promise<{ sRGBHex: string }> {
        opened += 1
        return Promise.resolve({ sRGBHex: '#00ff00' })
      }
    }
    try {
      const host = await picker('readonly value="#ff0000"')
      /* The control is offered only where the platform has an `EyeDropper`, and
         the read that decides is a second pass rather than the first. */
      await settle(host as Parameters<typeof settle>[0])
      let started = 0
      host.addEventListener('helix-sample-start', () => {
        started += 1
      })
      ;(part(host, 'eyedropper') as HTMLElement).click()
      await settle(host as Parameters<typeof settle>[0])
      expect(opened).toBe(0)
      expect(started).toBe(0)
      expect(host.value).toBe('#ff0000')
    } finally {
      ;(globalThis as { EyeDropper?: unknown }).EyeDropper = undefined
    }
  })

  test('refuses a value asked for in script, which is the one seam every path comes through', async () => {
    const host = await picker('readonly value="#ff0000"')
    const asked = (host as unknown as { requestValue: (next: string) => boolean }).requestValue(
      '#00ff00',
    )
    expect(asked).toBe(false)
    expect(host.value).toBe('#ff0000')
  })

  test('marks the field read-only rather than disabling it, so the color can still be read', async () => {
    const host = await picker('readonly value="#ff0000"')
    const field = part(host, 'value') as HTMLInputElement
    expect(field.hasAttribute('readonly')).toBe(true)
    expect(field.disabled).toBe(false)
  })

  test('and still submits what it holds, which is the whole difference from disabled', async () => {
    const host = await picker('readonly name="brand" value="#ff0000"')
    expect(formValue(host)).toBe('#ff0000')
  })
})
