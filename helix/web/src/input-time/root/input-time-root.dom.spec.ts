import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputTime = HTMLElement & { open: boolean; updateComplete: Promise<unknown>; value: string }

const field = async (attrs = ''): Promise<InputTime> => {
  const host = (await mount(
    `<helix-input-time label="Starts" ${attrs}></helix-input-time>`,
  )) as InputTime
  await host.updateComplete
  return host
}

const control = (host: InputTime): HTMLInputElement => part(host, 'control') as HTMLInputElement

const internals = (host: HTMLElement): ElementInternals =>
  (host as unknown as { internals: ElementInternals }).internals

/* Focus first, because typing into an unfocused field is not a thing that
   happens and the two are not equivalent here: the field renders when idle and
   holds the value while it is being edited. */
const type = async (host: InputTime, text: string): Promise<void> => {
  control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
  control(host).value = text
  control(host).dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

describe('input time', () => {
  test('the list is the real helix-time, not a second one written here', async () => {
    expect(part(await field(), 'picker')?.tagName.toLowerCase()).toBe('helix-time')
  })

  test('the field renders the time idle and holds the value while edited', async () => {
    /* `2:30 PM` cannot be typed back and `Intl` has no parser to make it so, so
       the two are separated in time rather than chosen between. Input Date draws
       the same line. */
    const host = await field('default-value="14:30" locale="en-GB"')
    expect(control(host).value).toBe('14:30')

    const us = await field('default-value="14:30" locale="en-US"')
    expect(control(us).value).toContain('2:30')
    control(us).dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await us.updateComplete
    expect(control(us).value).toBe('14:30')
    control(us).dispatchEvent(new FocusEvent('blur'))
    await us.updateComplete
    expect(control(us).value).toContain('2:30')
  })

  test('`iso` holds the value whether or not it is being edited', async () => {
    const host = await field('default-value="14:30" locale="en-US" time-style="iso"')
    expect(control(host).value).toBe('14:30')
  })

  test('typing sets the value, so a reader who knows the time never uses the list', async () => {
    const host = await field()
    await type(host, '09:07')
    expect(host.value).toBe('09:07')
    // And a time the step does not offer is exactly the case the field is for.
    expect(internals(host).validationMessage).toBe('')
  })

  test('a half-typed time is kept but not handed to the list', async () => {
    // `09:` is not a time, and passing it on would clear the selection mid-word.
    const host = await field()
    await type(host, '09:')
    expect(host.value).toBe('09:')
    expect((part(host, 'picker') as unknown as { value: string }).value).toBe('')
  })

  test('bounds are checked, and the message says them the way the reader reads them', async () => {
    const host = await field('locale="en-GB" max="17:00" min="09:00"')
    await type(host, '08:30')
    expect(internals(host).validationMessage).toContain('09:00')
    await type(host, '18:00')
    expect(internals(host).validationMessage).toContain('17:00')
  })

  test('something that is not a time says what one looks like', async () => {
    const host = await field()
    await type(host, '25:00')
    expect(internals(host).validationMessage).toBe('Enter a time as HH:mm.')
  })

  test('an empty field is not invalid, it is empty', async () => {
    expect(internals(await field()).validationMessage).toBe('')
  })

  test('picking a time takes it and shuts the list', async () => {
    // One time has nothing more to say, unlike a range of dates.
    const host = await field()
    host.open = true
    await host.updateComplete
    part(host, 'picker')?.dispatchEvent(
      new CustomEvent('helix-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'time', value: '09:15' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('09:15')
    expect(host.open).toBe(false)
  })

  test('reaching the field from outside opens the list', async () => {
    const host = await field()
    control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: null }))
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('but a hand-off from inside does not, or picking a time reopens it', async () => {
    const host = await field()
    control(host).dispatchEvent(new FocusEvent('focus', { relatedTarget: part(host, 'trigger') }))
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('the hint is described by the input, not by the host', async () => {
    // An IDREF cannot leave a shadow root, so the description has to resolve in
    // the same tree as the control that points at it.
    const host = await field('hint="Any quarter hour"')
    const described = control(host).getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    const scope = control(host).getRootNode() as ShadowRoot
    expect(scope.getElementById(described as string)?.textContent).toContain('Any quarter hour')
  })
})
