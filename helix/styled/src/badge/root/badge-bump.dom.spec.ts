import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Badge = HTMLElement & { updateComplete: Promise<unknown>; value: number | string }

const watched = async (): Promise<{ badge: Badge; asked: Keyframe[][] }> => {
  const badge = (await mount('<helix-badge></helix-badge>')) as Badge
  badge.value = 3
  await badge.updateComplete
  badge.style.setProperty('--badge-bump-duration', '200ms')
  const asked: Keyframe[][] = []
  const mark = part(badge, 'indicator') as HTMLElement
  mark.animate = ((frames: Keyframe[]) => {
    asked.push(frames)
    return {} as Animation
  }) as typeof mark.animate
  return { asked, badge }
}

describe('a badge whose count changes', () => {
  test('swells its mark and settles it', async () => {
    const { asked, badge } = await watched()
    badge.value = 4
    await badge.updateComplete
    expect(asked).toHaveLength(1)
  })

  test('does not bump when the count goes, which the mark leaving draws', async () => {
    const { asked, badge } = await watched()
    badge.value = ''
    await badge.updateComplete
    expect(asked).toHaveLength(0)
  })
})
