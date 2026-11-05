import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* A row inside an element of the page's own is read by no walk the menu makes:
   the keys skipped it, and a drilled page hid the wrapper with the top page, so
   the row's submenu opened with no rows and nothing was said. The specs run
   under the development condition, which is the build that says so. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Menu = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

/** What the menu warns as it opens, holding `rows`. */
const warnings = async (rows: string): Promise<string[]> => {
  const said: string[] = []
  console.warn = (message: string) => said.push(message)
  const menu = (await mount(
    `<helix-headless-menu label="Actions"><button slot="trigger">Open</button>${rows}</helix-headless-menu>`,
  )) as Menu
  menu.open = true
  await menu.updateComplete
  menu.open = false
  await menu.updateComplete
  menu.open = true
  await menu.updateComplete
  return said.filter((message) => message.includes('sits inside'))
}

describe('a wrapped row', () => {
  test('a row with a submenu inside a wrapper is reported once, with where it belongs', async () => {
    const said = await warnings(
      `<helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
       <div><helix-headless-menu-item>Sort
         <helix-headless-menu-item slot="submenu" value="name">Name</helix-headless-menu-item>
       </helix-headless-menu-item></div>`,
    )
    expect(said).toHaveLength(1)
    expect(said[0]).toContain(
      '<helix-headless-menu-item> sits inside a <div> in <helix-headless-menu>',
    )
    expect(said[0]).toContain('its submenu shows none of its rows')
    expect(said[0]).toContain(
      'Place each <helix-headless-menu-item> directly in the menu, in a <helix-headless-menu-section>, or in the submenu slot of another row.',
    )
  })

  test('a plain row inside a wrapper is reported as one the keys skip', async () => {
    const said = await warnings(
      '<span><helix-headless-menu-item value="pin">Pin to top</helix-headless-menu-item></span>',
    )
    expect(said).toHaveLength(1)
    expect(said[0]).toContain('so the arrow keys skip it.')
  })

  test('a wrapper inside a submenu slot is reported', async () => {
    const said = await warnings(
      `<helix-headless-menu-item>Sort
         <div slot="submenu"><helix-headless-menu-item value="name">Name</helix-headless-menu-item></div>
       </helix-headless-menu-item>`,
    )
    expect(said).toHaveLength(1)
    expect(said[0]).toContain('sits inside a <div>')
  })

  test('rows in the menu, in a section and in a submenu say nothing', async () => {
    const said = await warnings(
      `<helix-headless-menu-item value="copy">Copy</helix-headless-menu-item>
       <helix-headless-menu-section><span slot="heading">Order</span>
         <helix-headless-menu-item>Sort
           <helix-headless-menu-item slot="submenu">By
             <helix-headless-menu-item slot="submenu" value="name">Name</helix-headless-menu-item>
           </helix-headless-menu-item>
         </helix-headless-menu-item>
       </helix-headless-menu-section>`,
    )
    expect(said).toEqual([])
  })
})
