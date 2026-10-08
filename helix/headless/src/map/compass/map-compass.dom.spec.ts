import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/*
 * The compass is an entry of its own, so a map that shows none carries none
 * of its code. A map asks its class for the compass as it draws, and a class
 * the entry never added it to draws nothing there and says which entry to
 * import.
 */

let Frame: typeof import('../root/map-root.js').HelixHeadlessMap

beforeAll(async () => {
  registerDom()
  ;({ HelixHeadlessMap: Frame } = await import('../index.js'))
  await import('./index.js')
  /* A map class the entry has added nothing to, as a page that never imported
     it has, since the specs of this family share one registry. */
  customElements.define(
    'bare-compass-map',
    class extends Frame {
      static compass = undefined
    },
  )
})

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

const painted = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

describe('the compass entry', () => {
  test('draws the compass a map shows by default', async () => {
    const map = await mount('<helix-headless-map label="Edinburgh"></helix-headless-map>')
    expect(part(map, 'face-north')?.getAttribute('aria-label')).toBe('Face north')
    expect(part(map, 'needle')).not.toBeNull()
  })

  test('draws the arrows round it where controls names them', async () => {
    const map = await mount(
      '<helix-headless-map label="Edinburgh" controls="pan rotate"></helix-headless-map>',
    )
    for (const name of [
      'pan-up',
      'pan-start',
      'pan-end',
      'pan-down',
      'rotate-left',
      'rotate-right',
    ]) {
      expect(part(map, name)).not.toBeNull()
    }
  })

  test('a map without it draws no compass, and says which entry to import', async () => {
    const warnings: string[] = []
    console.warn = (message: string) => warnings.push(message)
    const map = await mount('<bare-compass-map label="Edinburgh"></bare-compass-map>')
    expect(part(map, 'compass')).toBeNull()
    expect(part(map, 'zoom-in')).not.toBeNull()
    await painted()
    expect(warnings).toEqual([
      "<bare-compass-map> has the compass among its controls, which does nothing until its entry is imported. Import '@fusion.dev/helix-headless/map/compass'.",
    ])
  })
})
