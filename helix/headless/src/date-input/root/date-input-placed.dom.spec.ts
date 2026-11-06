import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, registerDom, settle } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../combobox/index.js')
  await import('../../option/index.js')
})

type Field = HTMLElement & { open: boolean }

/** A Date Input, which stands for the picker fields that share its panel. */
const dateInput = async (): Promise<Field> => {
  document.body.innerHTML = '<helix-headless-date-input label="Due"></helix-headless-date-input>'
  const host = document.body.firstElementChild as Field
  await settle(host)
  return host
}

const combobox = async (): Promise<Field> => {
  document.body.innerHTML = `<helix-headless-combobox label="Language">
    <helix-headless-option value="rs">Rust</helix-headless-option>
  </helix-headless-combobox>`
  const host = document.body.firstElementChild as Field
  await settle(host)
  return host
}

/** Opens `host` and waits up to fifty frames for the placement to set `state`. */
const openUntil = async (host: Field, state: string): Promise<void> => {
  host.open = true
  await settle(host)
  for (let attempt = 0; attempt < 50 && !hasState(host, state); attempt += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
}

/* The shared entrance grows a panel out of the side it landed on, read from
   these states, as Popover's own sheet reads its own. */
describe('the side a field’s panel opens on', () => {
  test('is no state before the panel first opens', async () => {
    for (const host of [await dateInput(), await combobox()]) {
      expect(hasState(host, 'placed-bottom')).toBe(false)
      expect(hasState(host, 'placed-top')).toBe(false)
    }
  })

  /* Only a browser places a panel. */
  if (hasLayout()) {
    test('is a state on a Date Input, as on each picker field', async () => {
      const host = await dateInput()
      await openUntil(host, 'placed-bottom')
      expect(hasState(host, 'placed-bottom')).toBe(true)
      expect(hasState(host, 'aligned-start')).toBe(true)
      expect(hasState(host, 'placed-top')).toBe(false)
    })

    test('is a state on a Combobox, as on a Filter Input', async () => {
      const host = await combobox()
      await openUntil(host, 'placed-bottom')
      expect(hasState(host, 'placed-bottom')).toBe(true)
      expect(hasState(host, 'aligned-start')).toBe(true)
    })
  }
})
