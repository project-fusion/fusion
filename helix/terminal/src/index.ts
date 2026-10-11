export type {
  ConnectTerminalOptions,
  TerminalConnection,
  TerminalDriver,
  TerminalGrid,
  TerminalOptions,
  TerminalSearchOptions,
} from './connect-terminal/index.js'
export { connectTerminal } from './connect-terminal/index.js'
export type {
  TerminalColors,
  TerminalFont,
  TerminalMatches,
  TerminalTheme,
} from './theme/index.js'
export { terminalThemeFrom, terminalThemeNow, terminalThemeReady } from './theme/index.js'
