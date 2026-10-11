import { expect, test } from 'bun:test'
import type { FitAddon } from '@xterm/addon-fit'
import type { SearchAddon } from '@xterm/addon-search'
import type { WebLinksAddon } from '@xterm/addon-web-links'
import type { Terminal } from '@xterm/xterm'

/** The driver, by type only: loading it here would evaluate Lit before a spec registers the DOM. */
type Drivers = typeof import('./xterm/index.js')

/* The driver types the terminal and the addons it takes by what it calls on
   them, so this package imports no version of xterm.js. This function is what
   holds that shape to the real classes: if xterm.js renames what the driver
   calls, the typecheck fails here rather than at a page. */
const fits = (drivers: Drivers) => ({
  xterm: (terminal: Terminal, fit: FitAddon, search: SearchAddon, webLinks: typeof WebLinksAddon) =>
    drivers.xtermDriver(terminal, { fit, search, webLinks }),
})

test('the real terminal and its addons fit the driver', () => {
  expect(typeof fits).toBe('function')
})
