import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the wheels' hooks change, which only a browser computes. Run them with
   `bun run specs:browser time-picker`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

const wheels = async (style = '', attrs = ''): Promise<HTMLElement & Updatable> => {
  const host = (await mount(
    `<helix-time-picker variant="wheels" value="09:15" style="${style}" ${attrs}></helix-time-picker>`,
  )) as HTMLElement & Updatable
  await settle(host)
  for (const column of host.shadowRoot?.querySelectorAll<HTMLElement & Updatable>(
    '[part="column"]',
  ) ?? []) {
    await settle(column)
  }
  return host
}

/** The chosen row's mark in the hour wheel, inside the option's own shadow root. */
const mark = (host: HTMLElement): HTMLElement => {
  const option = host.shadowRoot?.querySelector(
    '[data-column="hour"] [part~="option"][selected]',
  ) as HTMLElement
  return option.shadowRoot?.querySelector('[part~="label"]') as HTMLElement
}

const items = (host: HTMLElement): HTMLElement => {
  const column = host.shadowRoot?.querySelector('[part="column"]') as HTMLElement
  return column.shadowRoot?.querySelector('[part="items"]') as HTMLElement
}

describe('time picker hooks', () => {
  geometry('the wheels keep their look, and the hooks change it', async () => {
    const plain = await wheels()
    const columns = plain.shadowRoot?.querySelector('[part="columns"]') as HTMLElement
    expect(getComputedStyle(columns).columnGap).toBe('0px')
    expect(getComputedStyle(items(plain)).maskImage).toContain('linear-gradient')
    const hooked = await wheels(
      '--time-picker-columns-gap: 7px; --time-picker-wheel-mask: none; --time-picker-selected-foreground-color: rgb(1, 2, 3); --time-picker-mark-radius: 5px',
    )
    const hookedColumns = hooked.shadowRoot?.querySelector('[part="columns"]') as HTMLElement
    expect(getComputedStyle(hookedColumns).columnGap).toBe('7px')
    expect(getComputedStyle(items(hooked)).maskImage).toBe('none')
    expect(getComputedStyle(mark(hooked)).color).toBe('rgb(1, 2, 3)')
    expect(getComputedStyle(mark(hooked)).borderTopLeftRadius).toBe('5px')
  })

  geometry('an invalid picker rings its time in the hook color', async () => {
    const hooked = await wheels('--time-picker-invalid-color: rgb(4, 5, 6)', 'invalid')
    expect(getComputedStyle(mark(hooked)).outlineColor).toBe('rgb(4, 5, 6)')
  })
})
