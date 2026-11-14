import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the `start` slot does to the color of what is slotted into it. The rule
   text is held here; the cascade only a browser resolves, so run the rest with
   `bun run specs:browser list`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../avatar/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

/** The declarations of the rule written for exactly `selector` in the item's sheet. */
const rule = (selector: string): string => {
  const declared = (customElements.get('helix-list-item') as unknown as { styles: unknown }).styles
  const sheet = (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('}')
  return sheet.split(`}${selector} {`)[1]?.split('}')[0] ?? ''
}

const item = async (start: string): Promise<HTMLElement> => {
  const host = (await mount(
    `<helix-list label="People"><helix-list-item>Ada Lovelace<span slot="description">Analyst</span>${start}</helix-list-item></helix-list>`,
  )) as HTMLElement & Updatable
  await settle(host)
  const row = host.querySelector('helix-list-item') as HTMLElement & Updatable
  await settle(row)
  return row
}

describe('the start slot', () => {
  test('mutes through inheritance, so a slotted component keeps its own color', () => {
    expect(rule(':host [part="start"]')).toContain('color:')
    expect(rule(':host [part="start"]::slotted(*)')).not.toContain('color:')
  })

  geometry('an avatar keeps the color it draws its initials in', async () => {
    const alone = (await mount(
      '<helix-avatar name="Ada Lovelace"></helix-avatar>',
    )) as HTMLElement & Updatable
    await settle(alone)
    const own = getComputedStyle(alone).color
    const row = await item('<helix-avatar slot="start" name="Ada Lovelace"></helix-avatar>')
    const avatar = row.querySelector('helix-avatar') as HTMLElement
    const description = row.querySelector('[slot="description"]') as HTMLElement
    expect(getComputedStyle(avatar).color).toBe(own)
    expect(getComputedStyle(avatar).color).not.toBe(getComputedStyle(description).color)
  })

  geometry('an icon or a span takes the muted color', async () => {
    const row = await item('<span slot="start">AL</span>')
    const start = row.querySelector('[slot="start"]') as HTMLElement
    const description = row.querySelector('[slot="description"]') as HTMLElement
    expect(getComputedStyle(start).color).toBe(getComputedStyle(description).color)
  })

  geometry('an avatar takes its hook inside a list as it does outside one', async () => {
    const row = await item(
      '<helix-avatar slot="start" name="Ada Lovelace" style="--avatar-color: rgb(4, 5, 6)"></helix-avatar>',
    )
    expect(getComputedStyle(row.querySelector('helix-avatar') as HTMLElement).color).toBe(
      'rgb(4, 5, 6)',
    )
  })
})
