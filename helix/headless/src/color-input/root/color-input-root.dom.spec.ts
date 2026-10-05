import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputColor = HTMLElement & { open: boolean; updateComplete: Promise<unknown>; value: string }

const field = async (attrs = ''): Promise<InputColor> => {
  const host = (await mount(`<helix-headless-color-input label="Brand" ${attrs}>
  </helix-headless-color-input>`)) as InputColor
  await host.updateComplete
  return host
}

const control = (host: InputColor): HTMLInputElement => part(host, 'control') as HTMLInputElement

/** Validity lives on the internals, not on the host, the same as Pin Input. */
const internals = (host: HTMLElement): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

const type = async (host: InputColor, text: string): Promise<void> => {
  control(host).value = text
  control(host).dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

describe('input color', () => {
  test('the picker is the real helix-headless-color-picker, not a second one written here', async () => {
    // The same arrangement Date Input has with the calendar: a settings pane
    // wants the picker flat on a page, and neither should be the other one with
    // parts hidden.
    const picker = part(await field(), 'picker')
    expect(picker?.tagName.toLowerCase()).toBe('helix-headless-color-picker')
  })

  test('the picker states no value of its own, because the field is that input', async () => {
    /* Two editable fields for one value is two places to type with no answer to
       which one is authoritative or which has the caret. The field stays the
       input, because a form wants the color readable and pasteable without
       opening a panel. */
    const host = await field()
    const picker = part(host, 'picker') as HTMLElement
    expect(picker.hasAttribute('no-value')).toBe(true)
    expect(picker.shadowRoot?.querySelector('[part="value"]')).toBeNull()
  })

  test('the swatch variant is the block alone, and the panel states the value', async () => {
    /* The two shapes between them state the value exactly once. The default
       field is the input, so the panel is told to leave its row out; a swatch
       states nothing, so the panel keeps it. */
    const host = await field('variant="swatch" default-value="#ff0000"')
    expect(host.shadowRoot?.querySelector('[part="control"]')).toBeNull()
    const picker = part(host, 'picker') as HTMLElement
    expect(picker.hasAttribute('no-value')).toBe(false)
    expect(picker.shadowRoot?.querySelector('[part="value"]')).not.toBeNull()
  })

  test('and the label names the trigger there, since it is the only control', async () => {
    // An IDREF has to resolve to something focusable, and in this shape the
    // input it used to name does not exist.
    const host = await field('variant="swatch"')
    const trigger = part(host, 'trigger') as HTMLElement
    expect(trigger.id).toBe('control')
    const label = host.shadowRoot?.querySelector('[part="label"]') as HTMLLabelElement
    expect(label.htmlFor).toBe('control')
    const scope = trigger.getRootNode() as ShadowRoot
    expect(scope.getElementById('control')).toBe(trigger)
  })

  test('a required swatch is checked here, since a block of color has no validity', async () => {
    const empty = await field('variant="swatch" required')
    expect(internals(empty).validationMessage).toBe('Choose a color.')
    const filled = await field('variant="swatch" default-value="#ff0000" required')
    expect(internals(filled).validationMessage).toBe('')
  })

  test('the value reaches the picker, and what it answers reaches the form', async () => {
    const host = await field('default-value="#ff0000" name="brand"')
    const picker = part(host, 'picker') as HTMLElement & { value: string }
    expect(picker.value).toBe('#ff0000')

    picker.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'color', value: '#00ff00' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('#00ff00')
    expect(control(host).value).toBe('#00ff00')
  })

  test('the picker says nothing under its own name, so a consumer hears one control', async () => {
    const host = await field('default-value="#ff0000"')
    const said: string[] = []
    host.addEventListener('helix-before-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    part(host, 'picker')?.dispatchEvent(
      new CustomEvent('helix-before-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'color', value: '#00ff00' },
      }),
    )
    await host.updateComplete
    expect(said).toEqual(['#00ff00'])
  })

  test('a pasted color lands in the picker, in any syntax', async () => {
    for (const [written, hue] of [
      ['rgb(0 255 0)', '120'],
      ['#00ff00', '120'],
      ['hsl(240 100% 50%)', '240'],
    ] as const) {
      const host = await field()
      await type(host, written)
      const picker = part(host, 'picker') as HTMLElement & { updateComplete: Promise<unknown> }
      await picker.updateComplete
      expect(picker.shadowRoot?.querySelector('[part="grid"]')?.getAttribute('style')).toContain(
        `--color-picker-hue: ${hue}`,
      )
    }
  })

  test('and half-typed input does not throw the square around on the way', async () => {
    /* Measured before this: typing `#00ff00` one character at a time walked the
       square red, red, red, blue, blue, RED, green, because `#00f` and `#00ff`
       are colors and `#00ff0` is not. The picker is handed the last value that
       was a color rather than a fallback, so it holds on blue until green
       arrives. The same reasoning Date Input records for its calendar. */
    const host = await field()
    const seen: string[] = []
    for (const text of ['#', '#0', '#00', '#00f', '#00ff', '#00ff0', '#00ff00']) {
      await type(host, text)
      const picker = part(host, 'picker') as HTMLElement & { updateComplete: Promise<unknown> }
      await picker.updateComplete
      const style = picker.shadowRoot?.querySelector('[part="grid"]')?.getAttribute('style') ?? ''
      seen.push(/--color-picker-hue: (\d+)/.exec(style)?.[1] ?? '?')
    }
    // Never back to red once it has left it.
    expect(seen).toEqual(['0', '0', '0', '240', '240', '240', '120'])
    // And the field kept every character, including the ones that were not colors.
    expect(host.value).toBe('#00ff00')
  })

  test('typing any syntax is accepted', async () => {
    for (const written of ['#f00', 'rgb(255 0 0)', 'hsl(0 100% 50%)', 'rgba(255,0,0,.5)']) {
      const host = await field()
      await type(host, written)
      expect(internals(host).validationMessage).toBe('')
    }
  })

  test('something that is not a color is invalid, and says what one looks like', async () => {
    const host = await field()
    await type(host, 'rebeccapurple')
    expect(internals(host).validationMessage).toContain('#ff0000')
  })

  test('an empty field is not invalid, it is empty', async () => {
    const host = await field()
    expect(internals(host).validationMessage).toBe('')
  })

  test('the preview is clear before a color is in it', async () => {
    const empty = await field()
    expect(part(empty, 'preview')?.getAttribute('style')).toContain('transparent')
    const set = await field('default-value="rgb(255 0 0)"')
    expect(part(set, 'preview')?.getAttribute('style')).toContain('255 0 0')
  })

  test('the trigger says whether the panel is up', async () => {
    const host = await field()
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('false')
    host.open = true
    await host.updateComplete
    expect(part(host, 'trigger')?.getAttribute('aria-expanded')).toBe('true')
  })

  test('the panel gets out of the way while the eyedropper has the pointer', async () => {
    /* `helix-headless-color-picker` cannot know it is in a panel, so it says what it is doing
       and whatever does know decides. A floating panel left up during a sample
       is one the reader cannot dismiss and may be trying to sample from
       underneath. */
    const host = await field()
    host.open = true
    await host.updateComplete
    const picker = part(host, 'picker') as HTMLElement
    picker.dispatchEvent(new Event('helix-sample-start', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.open).toBe(false)
    picker.dispatchEvent(new Event('helix-sample-end', { bubbles: true, composed: true }))
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('the hint is described by the input, not by the host', async () => {
    // An IDREF cannot leave a shadow root, so the description has to resolve in
    // the same tree as the control that points at it.
    const host = await field('hint="Any syntax"')
    const described = control(host).getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const scope = control(host).getRootNode() as ShadowRoot
    expect(scope.getElementById(described as string)?.textContent).toContain('Any syntax')
  })
})

describe('the swatch as the field', () => {
  test("is named by the field's label and says the color it holds", async () => {
    /* The field's label points at the swatch, and the trigger's own words
       overrode it, so "Brand color" was read as "Choose a color" and the color
       itself was never said. */
    const host = await field('variant="swatch" default-value="#ff0000"')
    const trigger = part(host, 'trigger') as HTMLElement
    const scope = trigger.getRootNode() as ShadowRoot
    const name = (trigger.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .map((id) => scope.getElementById(id)?.textContent?.trim())
      .join(' ')
    expect(name).toBe('Brand vibrant red #ff0000')
    expect(trigger.hasAttribute('aria-label')).toBe(false)
  })

  test('and opens what it says it opens: a dialog, named for what it is for', async () => {
    const host = await field('variant="swatch"')
    const trigger = part(host, 'trigger') as HTMLElement
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    const surface = part(host, 'surface') as HTMLElement
    expect(surface.getAttribute('role')).toBe('dialog')
    expect(surface.getAttribute('aria-label')).not.toBe('')
  })
})

describe('input color, dragged', () => {
  test('dragging the hue lands a color, never the slider’s own number', async () => {
    const host = await field('default-value="#ff0000"')
    /* Every value it announces, not only the last: a page derives on each one,
       and a number announced first and a color after is still a page that
       tried to read a number as a color. */
    const announced: string[] = []
    for (const type of ['helix-before-change', 'input', 'change']) {
      host.addEventListener(type, () => announced.push(`${type} ${host.value}`))
    }
    const picker = part(host, 'picker') as HTMLElement & { updateComplete: Promise<unknown> }
    await picker.updateComplete
    const slider = picker.shadowRoot?.querySelector('[data-channel="hue"]') as
      | (HTMLElement & { updateComplete: Promise<unknown> })
      | null
    await slider?.updateComplete
    const range = slider ? (part(slider, 'control') as HTMLInputElement) : null
    if (range) {
      range.value = '120'
      range.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    }
    await host.updateComplete
    expect(host.value).toMatch(/^#[0-9a-f]{6}$/)
    expect(host.value).not.toBe('#ff0000')
    expect(announced.filter((line) => !/ #[0-9a-f]{6}$/.test(line))).toEqual([])
  })
})

describe('a read-only color input', () => {
  /* Date Input and Time Input had it and this one did not, so `readonly` was
     ignored and the field stayed editable. */
  test('refuses a typed color and does not open', async () => {
    const host = (await field('readonly default-value="#3366ff"')) as InputColor & {
      readOnly: boolean
      requestValue(next: string): boolean
    }
    expect(host.readOnly).toBe(true)
    expect(control(host).readOnly).toBe(true)
    expect(host.requestValue('#ff0000')).toBe(false)
    ;(part(host, 'trigger') as HTMLElement).click()
    await host.updateComplete
    expect(host.open).toBe(false)
    expect(host.value).toBe('#3366ff')
  })
})

describe('the events a color input sends', () => {
  /* Measured before this: typing #0f0 sent four `change` events, one for the
     invalid `#`, and the message about it was shown from the first key. */
  test('typing sends `input`, and `change` once the reader is done', async () => {
    const host = await field()
    const log: string[] = []
    for (const name of ['input', 'change']) {
      host.addEventListener(name, () => log.push(name))
    }
    await type(host, '#')
    await type(host, '#0f0')
    expect(log).toEqual(['input', 'input'])
    control(host).dispatchEvent(new Event('change'))
    expect(log).toEqual(['input', 'input', 'change'])
  })
})

describe('a color input, said by its name', () => {
  test('hands color-words to the panel, whose square says the name in them', async () => {
    const host = await field(
      `value="#ff0000" color-words='{"red": "rouge", "vibrant": "vif", "colorName": "{hue} {chroma}"}'`,
    )
    const picker = part(host, 'picker') as HTMLElement & { updateComplete: Promise<unknown> }
    await picker.updateComplete
    const square = picker.shadowRoot?.querySelector('[part="grid-saturation"]')
    expect(square?.getAttribute('aria-valuetext')).toBe(
      'Saturation 100%, Brightness 100%, rouge vif',
    )
  })
})

describe('a color input with channel fields', () => {
  test('hands `channel-fields` to its panel', async () => {
    const host = await field('channel-fields value="#336699"')
    expect((part(host, 'picker') as unknown as { channelFields: boolean }).channelFields).toBe(true)
    const plain = await field('value="#336699"')
    expect((part(plain, 'picker') as unknown as { channelFields: boolean }).channelFields).toBe(
      false,
    )
  })
})

describe('the panel of a color input takes content of your own', () => {
  test('a header above the picker and a footer under it', async () => {
    const host = (await mount(
      `<helix-headless-color-input label="Field"><h3 slot="panel-header">Saved</h3><button slot="panel-footer">Reset</button></helix-headless-color-input>`,
    )) as InputColor
    await host.updateComplete
    const surface = part(host, 'surface') as HTMLElement
    const slots = [...surface.querySelectorAll<HTMLSlotElement>(':scope > slot')]
    expect(slots.map((one) => one.name)).toEqual(['panel-header', 'panel-footer'])
    expect(slots[0]?.nextElementSibling?.getAttribute('part')).toBe('picker')
    expect(slots[0]?.assignedElements()[0]?.textContent).toBe('Saved')
    expect(slots[1]?.assignedElements()[0]?.textContent).toBe('Reset')
  })
})

describe('the open panel of a color input', () => {
  test('shows the field’s message under the picker, once the field says it', async () => {
    const host = await field()
    const inner = part(host, 'picker') as HTMLElement & { feedback: string }
    await type(host, 'not a color')
    expect(inner.feedback).toBe('')
    host.dispatchEvent(new Event('change'))
    await host.updateComplete
    expect(inner.feedback).toContain('Enter a color')
    await type(host, '#ff0000')
    await host.updateComplete
    expect(inner.feedback).toBe('')
  })
})
