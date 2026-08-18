import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type InputDate = HTMLElement & {
  open: boolean
  toggleOpen(): boolean
  updateComplete: Promise<unknown>
  value: string
}

const field = async (attrs = ''): Promise<InputDate> => {
  const host = (await mount(
    `<helix-input-date label="Starts" ${attrs}></helix-input-date>`,
  )) as InputDate
  await host.updateComplete
  return host
}

const control = (host: InputDate): HTMLInputElement => part(host, 'control') as HTMLInputElement
const calendar = (host: InputDate): HTMLElement & { value: string } =>
  part(host, 'calendar') as HTMLElement & { value: string }

const type = async (host: InputDate, text: string): Promise<void> => {
  control(host).value = text
  control(host).dispatchEvent(new Event('input', { bubbles: true }))
  await host.updateComplete
}

describe('input date', () => {
  test('the calendar is the real one, not a grid written here', async () => {
    const host = await field()
    expect(calendar(host).tagName).toBe('HELIX-CALENDAR')
  })

  test('typing sets the value, so a reader who knows the date never opens it', async () => {
    const host = await field()
    await type(host, '2026-08-18')
    expect(host.value).toBe('2026-08-18')
    expect(host.open).toBe(false)
  })

  test('a half-typed date is kept but not handed to the calendar', async () => {
    // `2026-08-1` is not a date. Passing it on would move the month under a
    // reader mid-word.
    const host = await field()
    await type(host, '2026-08-1')
    expect(host.value).toBe('2026-08-1')
    expect(calendar(host).value).toBe('')
  })

  test('and the calendar follows once the field says something whole', async () => {
    const host = await field()
    await type(host, '2026-08-18')
    expect(calendar(host).value).toBe('2026-08-18')
  })

  test('picking a date takes it and shuts the panel', async () => {
    // A single date has nothing more to say, unlike a multi-select list.
    const host = await field()
    host.toggleOpen()
    await host.updateComplete
    expect(host.open).toBe(true)

    calendar(host).dispatchEvent(
      new CustomEvent('helix-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'value', value: '2026-12-25' },
      }),
    )
    await host.updateComplete
    expect(host.value).toBe('2026-12-25')
    expect(host.open).toBe(false)
  })

  test('the calendar’s own change does not escape as a second event', async () => {
    // One control, one announcement, whichever half of it the reader used.
    const host = await field()
    const said: string[] = []
    host.addEventListener('helix-change', (event) => {
      said.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    calendar(host).dispatchEvent(
      new CustomEvent('helix-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'value', value: '2026-12-25' },
      }),
    )
    await host.updateComplete
    expect(said).toEqual(['2026-12-25'])
  })

  test('bounds reach the calendar, which is what enforces them in the grid', async () => {
    const host = await field('min="2026-01-01" max="2026-12-31" first-day-of-week="1"')
    expect(calendar(host).getAttribute('min')).toBe('2026-01-01')
    expect(calendar(host).getAttribute('max')).toBe('2026-12-31')
    expect(calendar(host).getAttribute('first-day-of-week')).toBe('1')
  })

  test('the trigger says what it opens, and whether it is open', async () => {
    const host = await field()
    const trigger = part(host, 'trigger') as HTMLElement
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    host.toggleOpen()
    await host.updateComplete
    expect((part(host, 'trigger') as HTMLElement).getAttribute('aria-expanded')).toBe('true')
  })

  test('declaring `value` hands it over: it announces and applies nothing', async () => {
    const host = await field('value="2026-01-01"')
    let asked = ''
    host.addEventListener('helix-change', (event) => {
      asked = (event as CustomEvent<{ value: string }>).detail.value
    })
    await type(host, '2026-02-02')
    expect(asked).toBe('2026-02-02')
    expect(host.value).toBe('2026-01-01')
    // And the field is put back, or what is on screen is not the answer.
    expect(control(host).value).toBe('2026-01-01')
  })

  test('the hint is described by the input, in the same tree', async () => {
    const host = await field('hint="Any weekday"')
    const described = control(host).getAttribute('aria-describedby')
    const scope = control(host).getRootNode() as ShadowRoot
    expect(scope.getElementById(described as string)?.textContent).toContain('Any weekday')
  })
})
