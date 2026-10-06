import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const select = async (extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<helix-select label="L" name="c" ${extra}>
    <helix-option value="one">Alpha</helix-option>
    <helix-option value="two">Beta</helix-option>
  </helix-select>`
  const host = document.body.firstElementChild as Updatable
  await settle(host)
  return host
}

/* The panel is positioned in a microtask after the render that reveals it, so
   a spec that reads straight after `updateComplete` sees the stylesheet's
   position and not the controller's. Waiting on the flag rather than on a timer
   keeps it honest: if placement never happens this hangs and is reported,
   rather than passing because a guessed delay happened to be long enough. */
const placed = async (surface: HTMLElement): Promise<void> => {
  for (let attempt = 0; attempt < 50 && !surface.hasAttribute('data-placed'); attempt += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
}

/* What the stylesheet does to the panel, which is the half of Select that stays
   on this tier. Everything the controllers do to it, placement, the anchor
   width, the top layer, is the headless element's and is tested there.

   Browser only, and not because it is slow. happy-dom's `CSSStyleDeclaration`
   has no `paddingInline` at all, so the assertion reads `undefined` and the
   test fails on the harness rather than on the component. */
if (hasLayout()) {
  describe('the select panel, as the stylesheet leaves it', () => {
    test('the panel takes the trigger"s width, and the content is its floor', async () => {
      /* Two rules in one declaration, and the second is what stops a long option
         from wrapping to fit a field it has no relationship to. The panel has no
         inline padding of its own, so its width is the rows" width exactly. */
      const host = (await select('open')) as unknown as HTMLElement
      const surface = part(host, 'surface') as HTMLElement
      const trigger = part(host, 'trigger') as HTMLElement
      await placed(surface)
      const style = getComputedStyle(surface)
      expect(style.minInlineSize).toBe('max-content')
      expect(style.paddingInline).toBe('0px')
      /* `offsetWidth`, not `getBoundingClientRect`. The panel opens with
         `scale: 0.96` transitioning to `1`, and `data-placed` is set when that
         transition *starts*, so `placed()` returns with the box still scaled.
         `getBoundingClientRect` reports the transformed box, so a 1280px panel
         measured 1228.8, which is 1280 x 0.96 exactly. `offsetWidth` is layout
         width and ignores transforms, which is what this assertion is about.

         The two only diverge far enough to fail on a wide trigger: at a 200px
         control the scaled box is 8px short and the assertion still holds. */
      expect(surface.offsetWidth).toBeGreaterThanOrEqual(trigger.offsetWidth)
    })

    test('a trigger as wide as the screen opens a list that stays inside its edges', async () => {
      /* Measured before this: a full-width trigger 900 wide opened a list from
         8 to 908, past the end edge, either way it opens. */
      for (const position of ['floating', 'item-aligned']) {
        const host = (await select(
          `open position="${position}" style="inline-size: 100vw"`,
        )) as unknown as HTMLElement
        const surface = part(host, 'surface') as HTMLElement
        await placed(surface)
        expect(surface.offsetWidth).toBeLessThanOrEqual(window.innerWidth - 16)
      }
    })
  })
}
