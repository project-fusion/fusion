/**
 * A live terminal in the preview frame, loaded only when a render carries one.
 *
 * Bundled to a classic script beside `frame.js` by `build-frame.mjs`, for the
 * reason that file gives: the frame is sandboxed onto an opaque origin, and a
 * classic `<script src>` is the one kind of request from there that is not
 * CORS-checked. xterm.js and its addons are inside it.
 *
 * **Separate from `frame.js`** because most renders draw no terminal, and
 * xterm.js is most of this file's weight.
 *
 * **No process is behind it.** An example writes its own output into the
 * frame, which holds it until this connects, and answers its own input if it
 * answers any.
 */

import { connectTerminal, terminalThemeReady } from '@fusion.dev/helix-terminal'
import { xtermDriver, xtermOptions } from '@fusion.dev/helix-terminal/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from '@xterm/xterm'
import { RESTYLED } from './preview-events'

/** xterm.js's stylesheet, inlined at build time. */
declare const __XTERM_CSS__: string

/** xterm.js's own stylesheet, once, since its rows and its input are positioned by it. */
const ensureStyles = (): void => {
  if (document.getElementById('preview-xterm')) {
    return
  }
  const sheet = document.createElement('style')
  sheet.id = 'preview-xterm'
  sheet.textContent = __XTERM_CSS__
  document.head.append(sheet)
}

/**
 * One terminal: made once the theme and its face are ready, opened in the
 * frame's element, connected, and fitted again when the frame restyles. A
 * frame taken away before then gets none.
 */
const mountOne = (frame: HTMLElement): (() => void) => {
  let gone = false
  let stop: (() => void) | undefined
  void terminalThemeReady(frame).then((theme) => {
    const box = frame.querySelector<HTMLElement>('[data-preview-terminal-canvas]')
    if (gone || !box) {
      return
    }
    const terminal = new Terminal(xtermOptions(theme))
    terminal.open(box)
    const connection = connectTerminal(
      frame,
      xtermDriver(terminal, {
        fit: new FitAddon(),
        search: new SearchAddon(),
        webLinks: WebLinksAddon,
      }),
    )
    const restyled = (): void => connection.fit()
    window.addEventListener(RESTYLED, restyled)
    stop = () => {
      window.removeEventListener(RESTYLED, restyled)
      connection.disconnect()
      terminal.dispose()
    }
  })
  return () => {
    gone = true
    stop?.()
  }
}

window.helixPreviewTerminal = {
  mount(root) {
    ensureStyles()
    const unmounts = [
      ...root.querySelectorAll<HTMLElement>(
        ':is(helix-terminal, helix-headless-terminal)[data-preview-terminal]',
      ),
    ].map(mountOne)
    return () => {
      for (const unmount of unmounts) {
        unmount()
      }
    }
  },
}
