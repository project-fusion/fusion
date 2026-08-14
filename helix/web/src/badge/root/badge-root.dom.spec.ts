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

  test('a value that counts nothing renders no mark at all', async () => {
    const badge = await mount('<helix-badge value="0"><span>x</span></helix-badge>')
    expect(part(badge, 'indicator')).toBeNull()
  })

  test('no value leaves an empty indicator, which is what `:empty` draws as a dot', async () => {
    // Shape follows content, so the dot is the indicator with nothing in it.
    // Lit's marker comments do not count against `:empty`, but a whitespace
    // text node would, so the check is on the text and not just the node.
    const badge = await mount('<helix-badge label="3 unread"><span>x</span></helix-badge>')
    const indicator = part(badge, 'indicator')
    expect(indicator).not.toBeNull()
    expect(indicator?.textContent).toBe('')
    expect(indicator?.matches(':empty')).toBe(true)
  })

  test('a dot with a label announces it, and one without says nothing at all', async () => {
    // A bare colored circle tells a sighted reader there is something new and
    // tells everyone else there is not.
    const named = await mount('<helix-badge label="3 unread"><span>x</span></helix-badge>')
    expect(part(named, 'indicator')?.getAttribute('aria-label')).toBe('3 unread')
    expect(part(named, 'indicator')?.getAttribute('role')).toBe('status')

    const bare = await mount('<helix-badge><span>x</span></helix-badge>')
    expect(part(bare, 'indicator')?.getAttribute('aria-hidden')).toBe('true')
  })
})
