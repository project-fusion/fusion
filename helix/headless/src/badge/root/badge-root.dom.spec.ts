import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('badge', () => {
  test('caps the count rather than growing to fit', async () => {
    // A corner mark that widens with its value pushes the layout around for the
    // one case nobody planned for.
    const badge = await mount(
      '<helix-headless-badge max="9" value="42"><span>x</span></helix-headless-badge>',
    )
    expect(part(badge, 'indicator')?.textContent?.trim()).toBe('9+')
  })

  test('a value under the cap is shown as it is', async () => {
    const badge = await mount(
      '<helix-headless-badge max="9" value="3"><span>x</span></helix-headless-badge>',
    )
    expect(part(badge, 'indicator')?.textContent?.trim()).toBe('3')
  })

  test('a value that counts nothing marks the indicator blank, and keeps it', async () => {
    // Mounted so it can transition out. `data-blank` is on the shadow content,
    // so the host still carries nothing the consumer did not write.
    const badge = await mount(
      '<helix-headless-badge value="0"><span>x</span></helix-headless-badge>',
    )
    const indicator = part(badge, 'indicator')
    expect(indicator?.hasAttribute('data-blank')).toBe(true)
    // Its `0` is kept to fade out with and not read: clearing a count says nothing.
    expect(indicator?.querySelector('[aria-hidden="true"]')?.textContent).toBe('0')
    expect(badge.getAttributeNames()).toEqual(['value'])
  })

  test('a one-character mark drops its padding, so it is a circle', async () => {
    // `min-inline-size` alone does not get there. A wide glyph plus the inline
    // padding is wider than the block size, so a 9 rendered as an oval where a
    // 1 did not. CSS cannot count characters, so the marker comes from here.
    const badge = await mount(
      '<helix-headless-badge value="9"><span>x</span></helix-headless-badge>',
    )
    expect(part(badge, 'indicator')?.hasAttribute('data-single')).toBe(true)
  })

  test('two characters keep their padding, so the mark grows into a pill', async () => {
    const badge = await mount(
      '<helix-headless-badge value="42"><span>x</span></helix-headless-badge>',
    )
    expect(part(badge, 'indicator')?.hasAttribute('data-single')).toBe(false)
  })

  test('a capped count is measured after the cap, not before it', async () => {
    // `42` capped at `9` reads `9+`, which is two characters and not one.
    const badge = await mount(
      '<helix-headless-badge max="9" value="42"><span>x</span></helix-headless-badge>',
    )
    expect(part(badge, 'indicator')?.hasAttribute('data-single')).toBe(false)
  })

  test('a blank mark keeps its text, so it never matches the dot rule', async () => {
    // `:empty` is not asserted here. happy-dom answers it without looking at
    // text nodes, so it reports true for an indicator reading "0". The text is
    // what the selector turns on, so the text is what is checked.
    const badge = await mount(
      '<helix-headless-badge value="0"><span>x</span></helix-headless-badge>',
    )
    expect(part(badge, 'indicator')?.textContent).toBe('0')
  })

  test('a blank mark is not announced, even with a label', async () => {
    const badge = await mount(
      '<helix-headless-badge value="0" label="unread"><span>x</span></helix-headless-badge>',
    )
    const indicator = part(badge, 'indicator')
    expect(indicator?.hasAttribute('aria-label')).toBe(false)
    expect(indicator?.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  test('the region is there before the first count is, so the count is heard', async () => {
    /* The role arrived with the first count, so the count arrived in a region
       appearing with it, which a screen reader could miss. */
    const badge = (await mount(
      '<helix-headless-badge value="0"><span>x</span></helix-headless-badge>',
    )) as HTMLElement & { updateComplete: Promise<boolean>; value: string }
    const indicator = part(badge, 'indicator')
    expect(indicator?.getAttribute('role')).toBe('status')
    badge.value = '1'
    await badge.updateComplete
    expect(part(badge, 'indicator')).toBe(indicator)
    expect(indicator?.getAttribute('role')).toBe('status')
    expect(indicator?.textContent).toBe('1')
  })

  test('no value leaves the indicator with no text, which is what draws it as a dot', async () => {
    // Shape follows content, so the dot is the indicator with nothing in it.
    // The text is the assertion, not `:empty`: happy-dom does not consider text
    // nodes when answering it, so it would pass here whatever the text was.
    const badge = await mount(
      '<helix-headless-badge label="3 unread"><span>x</span></helix-headless-badge>',
    )
    const indicator = part(badge, 'indicator')
    expect(indicator).not.toBeNull()
    expect(indicator?.textContent).toBe('')
  })

  test('a dot with a label announces it, and one without says nothing at all', async () => {
    // A bare colored circle tells a sighted reader there is something new and
    // tells everyone else there is not.
    const named = await mount(
      '<helix-headless-badge label="3 unread"><span>x</span></helix-headless-badge>',
    )
    expect(part(named, 'indicator')?.getAttribute('aria-label')).toBe('3 unread')
    expect(part(named, 'indicator')?.getAttribute('role')).toBe('status')

    // A bare dot is an empty region, which has nothing to say and says nothing.
    const bare = await mount('<helix-headless-badge><span>x</span></helix-headless-badge>')
    expect(part(bare, 'indicator')?.textContent).toBe('')
    expect(part(bare, 'indicator')?.hasAttribute('aria-label')).toBe(false)
  })

  test('a count set as a number shows the number', async () => {
    // The property path, which is the one a framework takes and the one that
    // skips the attribute converter. Read raw it reached `this.value.trim()`
    // and threw inside `render`, so the mark kept whatever it had: measured in
    // a browser, a badge set to 2 stayed an 8px dot with no digit in it.
    const badge = await mount('<helix-headless-badge><span>x</span></helix-headless-badge>')
    const counted = badge as unknown as { updateComplete: Promise<unknown>; value: number }
    counted.value = 2
    await counted.updateComplete

    const indicator = part(badge, 'indicator')
    expect(indicator?.textContent?.trim()).toBe('2')
    // And the rest of the reading is made from the same text, so a number gets
    // the circle and the cap exactly as a string does.
    expect(indicator?.hasAttribute('data-single')).toBe(true)
    expect(indicator?.hasAttribute('data-blank')).toBe(false)
  })

  test('a numeric zero counts nothing, the same as the string does', async () => {
    const badge = await mount('<helix-headless-badge><span>x</span></helix-headless-badge>')
    const counted = badge as unknown as { updateComplete: Promise<unknown>; value: number }
    counted.value = 0
    await counted.updateComplete

    expect(part(badge, 'indicator')?.hasAttribute('data-blank')).toBe(true)
  })

  test('a number past the cap reads as the ceiling', async () => {
    const badge = await mount('<helix-headless-badge max="9"><span>x</span></helix-headless-badge>')
    const counted = badge as unknown as { updateComplete: Promise<unknown>; value: number }
    counted.value = 42
    await counted.updateComplete

    expect(part(badge, 'indicator')?.textContent?.trim()).toBe('9+')
  })
})
