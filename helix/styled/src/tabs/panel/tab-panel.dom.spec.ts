import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Panel = HTMLElement & { selected: boolean; updateComplete: Promise<unknown> }

/** Records the moves a panel asks for, standing in for the browser's `animate`. */
const watch = (panel: Panel): Keyframe[][] => {
  const asked: Keyframe[][] = []
  const box = part(panel, 'panel') as HTMLElement
  box.animate = ((frames: Keyframe[]) => {
    asked.push(frames)
    return {} as Animation
  }) as typeof box.animate
  return asked
}

describe('a tab panel', () => {
  test('settles in when its tab is chosen, from the distance its hook holds', async () => {
    const panel = (await mount('<helix-tab-panel>Overview</helix-tab-panel>')) as Panel
    panel.style.setProperty('--tabs-panel-enter-duration', '200ms')
    panel.style.setProperty('--tabs-panel-enter-distance', '4px')
    const asked = watch(panel)
    panel.selected = true
    await panel.updateComplete
    expect(asked).toHaveLength(1)
    expect(asked[0]?.[0]).toEqual({ opacity: 0, translate: '0 4px' })
  })

  test('shows at once where its hook says 0ms', async () => {
    const panel = (await mount('<helix-tab-panel>Overview</helix-tab-panel>')) as Panel
    panel.style.setProperty('--tabs-panel-enter-duration', '0ms')
    const asked = watch(panel)
    panel.selected = true
    await panel.updateComplete
    expect(asked).toHaveLength(0)
  })
})
