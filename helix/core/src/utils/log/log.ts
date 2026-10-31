/**
 * What a log works out from its text: lines, steps, runs of ANSI, and the rows
 * it shows, for the web element and a phone to read.
 */
export {
  applySgr,
  type LogRun,
  type LogStyle,
  paletteColor,
  parseAnsi,
  stripAnsi,
} from './ansi.js'
export {
  elapsedClock,
  LogBuffer,
  type LogGroup,
  type LogLevel,
  type LogLine,
  type LogParsed,
  type LogParser,
  type LogStatus,
  levelSaid,
  lineRuns,
  loudEnough,
  stepDuration,
  timeOf,
} from './buffer.js'
export { LOG_FORMATS, parseGitHubActions, parseVercel } from './parsers.js'
export { type LogRow, type LogRows, type LogRowsInput, logRows, markMatches } from './rows.js'
