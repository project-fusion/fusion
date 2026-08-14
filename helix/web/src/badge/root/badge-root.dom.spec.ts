import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('badge', () => {
  test('caps the count rather than growing to fit', async () => {
    // A corner mark that widens with its value pushes the layout around for the
    // one case nobody planned for.
    const badge = await mount('<helix-badge max="9" value="42"><span>x</span></helix-badge>')
    expect(part(badge, 'indicator')?.textContent?.trim()).toBe('9+')
  })

  test('a value under the cap is shown as it is', async () => {
    const badge = await mount('<helix-badge max="9" value="3"><span>x</span></helix-badge>')
    expect(part(badge, 'indicator')?.textContent?.trim()).toBe('3')
  })

  test('no value renders no indicator, because zero does not look like this', async () => {
    const badge = await mount('<helix-badge><span>x</span></helix-badge>')
    expect(part(badge, 'indicator')).toBeNull()
  })

  test('a dot with a label announces it, and one without says nothing at all', async () => {
    // A bare coloured circle tells a sighted reader there is something new and
    // tells everyone else there is not.
    const named = await mount('<helix-badge dot label="3 unread"><span>x</span></helix-badge>')
    expect(part(named, 'indicator')?.getAttribute('aria-label')).toBe('3 unread')
    expect(part(named, 'indicator')?.getAttribute('role')).toBe('status')

    const bare = await mount('<helix-badge dot><span>x</span></helix-badge>')
    expect(part(bare, 'indicator')?.getAttribute('aria-hidden')).toBe('true')
  })
})
