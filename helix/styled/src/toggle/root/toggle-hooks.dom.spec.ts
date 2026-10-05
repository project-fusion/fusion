import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, idle, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* What the item's hooks change, which only a browser computes: the base
   layer styles the `item` part from the page, so the hooks are read there.
   Run them with `bun run specs:browser toggle`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

describe('toggle hooks', () => {
  geometry('an item takes its space and its two colors from the hooks', async () => {
    const group = await mount(`<helix-toggle-group label="View" value="grid"
      style="--toggle-item-padding-inline: 13px; --toggle-item-color: rgb(1, 2, 3);
        --toggle-item-color-selected: rgb(4, 5, 6)">
      <helix-toggle value="grid">Grid</helix-toggle>
      <helix-toggle value="list">List</helix-toggle>
    </helix-toggle-group>`)
    await idle()
    const [chosen, other] = [...group.querySelectorAll('helix-toggle')].map((one) =>
      getComputedStyle(part(one, 'item') as HTMLElement),
    )
    expect(other?.paddingInlineStart).toBe('13px')
    expect(other?.color).toBe('rgb(1, 2, 3)')
    expect(chosen?.color).toBe('rgb(4, 5, 6)')
  })

  geometry('and keeps today’s look without them', async () => {
    const group = await mount(`<helix-toggle-group label="View" value="grid">
      <helix-toggle value="grid">Grid</helix-toggle>
      <helix-toggle value="list">List</helix-toggle>
    </helix-toggle-group>`)
    await idle()
    const probe = document.createElement('span')
    probe.style.cssText =
      'color: var(--helix-color-foreground-muted); padding-inline: var(--helix-space-sm)'
    document.body.append(probe)
    const other = getComputedStyle(
      part(group.querySelectorAll('helix-toggle')[1] as HTMLElement, 'item') as HTMLElement,
    )
    expect(other.color).toBe(getComputedStyle(probe).color)
    expect(other.paddingInlineStart).toBe(getComputedStyle(probe).paddingInlineStart)
  })
})
