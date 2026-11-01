import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const real = window.matchMedia

afterEach(() => {
  window.matchMedia = real
})

/** A window that is narrower than 30rem as `matches` says. `matchMedia` is stood in for, since happy-dom does not evaluate a query. */
const windowOf = (matches: boolean) => {
  window.matchMedia = (() => ({
    addEventListener: () => {},
    matches,
    removeEventListener: () => {},
  })) as never
}

type Select = Updatable & { open: boolean; presentation: string }

const select = async (attributes = ''): Promise<Select> => {
  const host = (await mount(`<helix-headless-select label="Fruit" ${attributes}>
    <helix-headless-option value="a">Apple</helix-headless-option>
  </helix-headless-select>`)) as Select
  await settle(host)
  return host
}

const inSheet = (host: Select): boolean => hasState(host, 'sheet')

describe('select presentation', () => {
  test('a narrow window draws a sheet under auto', async () => {
    windowOf(true)
    expect(inSheet(await select())).toBe(true)
  })

  test('a wide window draws a popover under auto', async () => {
    windowOf(false)
    expect(inSheet(await select())).toBe(false)
  })

  test('presentation draws either one at any width', async () => {
    windowOf(true)
    expect(inSheet(await select('presentation="popover"'))).toBe(false)
    windowOf(false)
    expect(inSheet(await select('presentation="sheet"'))).toBe(true)
  })
})
