import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* A menu drawn as a sheet, where there is a browser to lay it out: along the
   window's bottom edge, as wide as the window, over a scrim, and shown once
   a frame has passed. `presentation="sheet"` draws it at the width the specs
   run at, which a window narrower than 30rem draws under `auto`. */

if (hasLayout()) {
  describe('a menu drawn as a sheet', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
      await import('../../button/index.js')
    })

    afterEach(() => {
      document.body.innerHTML = ''
    })

    /** Two frames, after which a sheet's entrance has started, and the time it takes. */
    const frames = async () => {
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
      await new Promise((done) => setTimeout(done, 400))
    }

    test('stands on the window’s bottom edge, as wide as the window, over a scrim', async () => {
      document.body.innerHTML = `<helix-menu label="Actions" presentation="sheet">
        <helix-button slot="trigger">Actions</helix-button>
        <helix-menu-item value="rename">Rename</helix-menu-item>
        <helix-menu-item value="delete">Delete</helix-menu-item>
      </helix-menu>`
      const menu = document.querySelector('helix-menu') as Updatable & { open: boolean }
      await settle(menu)
      menu.open = true
      await settle(menu)
      await frames()
      const surface = part(menu, 'surface') as HTMLElement
      expect(surface.hasAttribute('data-placed')).toBe(true)
      const box = surface.getBoundingClientRect()
      expect(Math.round(box.left)).toBe(0)
      expect(Math.round(box.width)).toBe(document.documentElement.clientWidth)
      expect(Math.round(box.bottom)).toBe(window.innerHeight)
      expect(getComputedStyle(surface, '::backdrop').backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    })

    test('is placed against its trigger again as a popover', async () => {
      document.body.innerHTML = `<helix-menu label="Actions" presentation="sheet" open>
        <helix-button slot="trigger">Actions</helix-button>
        <helix-menu-item value="rename">Rename</helix-menu-item>
      </helix-menu>`
      const menu = document.querySelector('helix-menu') as Updatable & { presentation: string }
      await settle(menu)
      await frames()
      menu.presentation = 'popover'
      await settle(menu)
      await frames()
      const surface = part(menu, 'surface') as HTMLElement
      const trigger = (menu.querySelector('helix-button') as HTMLElement).getBoundingClientRect()
      const box = surface.getBoundingClientRect()
      expect(Math.round(box.top)).toBeGreaterThanOrEqual(Math.round(trigger.bottom))
      expect(Math.round(box.width)).toBeLessThan(document.documentElement.clientWidth)
    })
  })
}
