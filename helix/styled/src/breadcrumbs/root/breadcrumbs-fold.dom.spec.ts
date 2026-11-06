import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* A long trail's fold, pressed where there is a browser: the button opens
   the menu of the crumbs folded, each row a link to its crumb, drawn in the
   styled tier. A menu's trigger is heard through its slot, which only a
   browser assigns inside a shadow root. */

if (hasLayout()) {
  describe('a long trail’s fold', () => {
    beforeAll(async () => {
      registerDom()
      await import('../index.js')
    })

    afterEach(() => {
      document.body.innerHTML = ''
    })

    test('opens a menu of the crumbs folded, each a link to its crumb', async () => {
      document.body.innerHTML = `<helix-breadcrumbs max-items="3">
        <helix-breadcrumb href="#home">Home</helix-breadcrumb>
        <helix-breadcrumb href="#docs">Docs</helix-breadcrumb>
        <helix-breadcrumb href="#guides">Guides</helix-breadcrumb>
        <helix-breadcrumb href="#forms">Forms</helix-breadcrumb>
        <helix-breadcrumb current>Validation</helix-breadcrumb>
      </helix-breadcrumbs>`
      const trail = document.querySelector('helix-breadcrumbs') as Updatable
      await settle(trail)
      const first = document.querySelector('helix-breadcrumb') as Updatable
      await settle(first)
      const menu = part(first, 'fold') as Updatable & { open: boolean }
      expect(menu.localName).toBe('helix-menu')
      ;(part(first, 'expand') as HTMLElement).click()
      await settle(menu)
      expect(menu.open).toBe(true)
      const rows = [...(first.shadowRoot?.querySelectorAll('[part="fold-item"]') ?? [])]
      expect(rows.map((row) => row.localName)).toEqual(['helix-menu-item', 'helix-menu-item'])
      expect(rows.map((row) => row.getAttribute('href'))).toEqual(['#docs', '#guides'])
    })
  })
}
