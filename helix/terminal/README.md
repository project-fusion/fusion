# @fusion.dev/helix-terminal

Connects the Helix `Terminal` frame to the emulator that draws it: xterm.js,
or a driver of your own, themed from your tokens.

```sh
bun add @fusion.dev/helix @fusion.dev/helix-terminal @xterm/xterm @xterm/addon-fit @xterm/addon-search @xterm/addon-web-links
```

**The guide is [Terminals](https://fusion.dev/helix/docs/terminals)**:
connecting a process, keeping up with a fast one, exits and restarts, the
theme and its colors, read-only output, links, the keyboard and screen
readers, and writing a driver. The element itself is on the
[Terminal reference](https://fusion.dev/helix/components/terminal).

```js
import '@fusion.dev/helix/terminal'
import '@xterm/xterm/css/xterm.css'
import { connectTerminal, terminalThemeReady } from '@fusion.dev/helix-terminal'
import { xtermDriver, xtermOptions } from '@fusion.dev/helix-terminal/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { Terminal } from '@xterm/xterm'

const frame = document.querySelector('helix-terminal')
const terminal = new Terminal(xtermOptions(await terminalThemeReady(frame)))
terminal.open(frame.querySelector('div'))

const connection = connectTerminal(
  frame,
  xtermDriver(terminal, { fit: new FitAddon(), search: new SearchAddon() }),
)

// The process is yours: write its output, and send it what the reader types.
pty.onData((bytes) => frame.write(bytes))
frame.addEventListener('helix-terminal-input', (event) => pty.write(event.detail.data))
frame.addEventListener('helix-terminal-resize', (event) => pty.resize(event.detail))
```

Helix starts no process and opens no pseudo-terminal. The frame takes output
through `write()` and sends `helix-terminal-input` and `helix-terminal-resize`
for you to answer.

## What it exports

| Import | What |
|---|---|
| `@fusion.dev/helix-terminal` | `connectTerminal`, `terminalThemeFrom`, `terminalThemeNow`, `terminalThemeReady`, and the types `ConnectTerminalOptions`, `TerminalColors`, `TerminalConnection`, `TerminalDriver`, `TerminalFont`, `TerminalGrid`, `TerminalMatches`, `TerminalOptions`, `TerminalSearchOptions`, and `TerminalTheme` |
| `@fusion.dev/helix-terminal/xterm` | `xtermDriver(terminal, addons)`, `xtermOptions(theme)`, and the types `XtermAddons`, `XtermFit`, `XtermSearch`, `XtermTerminal`, and `XtermWebLinks` |

**xterm.js is not a dependency.** The driver types the terminal and the
addons it takes by the calls it makes on them, so a page brings the version it
has. A spec holds those shapes to the real classes, so a renamed method fails
a typecheck here before it reaches a page.

| `connectTerminal` option | Default | What else it takes |
|---|---|---|
| `contrast` | `4.5` | The contrast every cell's text keeps against its ground, from `1`, which draws every color as the program wrote it, to `21` |

## Working on it

```sh
bun run --filter @fusion.dev/helix-terminal build
bun run --filter @fusion.dev/helix-terminal test
```

The specs drive the driver twice. A stand-in for xterm.js records what the
driver asks of it, under `bun test`. The browser specs, run with
`bun run specs:browser terminal`, connect a frame to the real xterm.js, write
output, type, search, and check what the frame said.

MIT
