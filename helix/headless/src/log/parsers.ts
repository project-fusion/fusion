import { stripAnsi } from './ansi.js'
import type { LogLevel, LogParsed, LogParser } from './buffer.js'

/**
 * The time a line starts with, as GitHub writes it in a downloaded run log and
 * the Vercel CLI writes it in a build log, and the space after it.
 */
const STAMP = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z) {1,2}/

/** A line's leading time taken off, and the rest. */
const stamped = (raw: string): { at: string | undefined; text: string } => {
  const found = STAMP.exec(raw)
  return found ? { at: found[1], text: raw.slice(found[0].length) } : { at: undefined, text: raw }
}

/** `at`, as a field to spread, where there is one. */
const timed = (at: string | undefined): { at?: string } => (at === undefined ? {} : { at })

/** The level each annotation GitHub writes is drawn at. */
const ANNOTATIONS: Readonly<Record<string, LogLevel>> = {
  debug: 'debug',
  error: 'error',
  notice: 'info',
  warning: 'warn',
}

/** Commands GitHub acts on and never shows, so the log drops them too. */
const HIDDEN = new Set([
  'add-mask',
  'add-matcher',
  'add-path',
  'echo',
  'remove-matcher',
  'save-state',
  'set-env',
  'set-output',
  'stop-commands',
])

/** Text a workflow command escaped, as GitHub writes `%`, a return and a line break. */
const unescaped = (text: string): string =>
  text
    .replace(/%0D/gi, '')
    .replace(/%0A/gi, ' ')
    .replace(/%3A/gi, ':')
    .replace(/%2C/gi, ',')
    .replace(/%25/g, '%')

/**
 * An annotation's message with where it points in front, as GitHub shows it:
 * `src/app.ts:12:5: title: message` from `file`, `line`, `col` and `title`.
 */
const located = (properties: string, message: string): string => {
  const read = new Map<string, string>()
  for (const pair of properties.split(',')) {
    const at = pair.indexOf('=')
    if (at > 0) {
      read.set(pair.slice(0, at).trim(), unescaped(pair.slice(at + 1).trim()))
    }
  }
  const place = [read.get('file'), read.get('line'), read.get('col')].filter(Boolean).join(':')
  const title = read.get('title')
  return [place, title, unescaped(message)].filter(Boolean).join(': ')
}

/**
 * Reads a GitHub Actions log: the workflow commands a step writes, such as
 * `::group::Install` and `::error file=app.ts,line=3::Missing`, and the
 * `##[group]` form and leading times of a log downloaded from a run.
 *
 * - `group` and `endgroup` open and close a step, which folds once it passes
 *   and stays open where a line in it is an error.
 * - `error`, `warning`, `notice` and `debug` set the line's level, with the
 *   file, line, column and title in front of the message.
 * - `command`, the line GitHub writes for each command a step runs, stays as
 *   it is.
 * - `add-mask`, `set-output` and the other commands GitHub never shows are
 *   dropped. Text after `stop-commands` is read as commands still.
 * - A leading time becomes the line's `at`, which times each step and which
 *   `timestamps` shows.
 */
export const parseGitHubActions: LogParser = (raw) => {
  const { at, text } = stamped(raw)
  const plain = stripAnsi(text)
  const downloaded = /^##\[([a-z-]+)\](.*)$/i.exec(plain)
  const written = downloaded ? undefined : /^::([a-z-]+)(?: ([^:]*))?::(.*)$/i.exec(plain)
  const kind = (downloaded?.[1] ?? written?.[1])?.toLowerCase()
  if (kind === undefined) {
    return at === undefined ? undefined : { at, text }
  }
  const properties = written?.[2] ?? ''
  const body = downloaded?.[2] ?? written?.[3] ?? ''
  if (kind === 'group') {
    return { ...timed(at), open: unescaped(body).trim() || 'Group' }
  }
  if (kind === 'endgroup') {
    return { ...timed(at), close: true }
  }
  const level = ANNOTATIONS[kind]
  if (level !== undefined) {
    return { ...timed(at), level, text: located(properties, body) }
  }
  if (kind === 'command') {
    return { ...timed(at), text: body }
  }
  if (HIDDEN.has(kind)) {
    return null
  }
  return at === undefined ? undefined : { at, text }
}

/** The level a Vercel build line is drawn at, read off how it starts. */
const vercelLevel = (plain: string): LogLevel | undefined => {
  if (/^(?:error\b|failed\b|fatal\b|npm err!)|\berror:/i.test(plain)) {
    return 'error'
  }
  if (/^(?:warning\b|warn\b|npm warn\b)|\bwarning:/i.test(plain)) {
    return 'warn'
  }
  return undefined
}

/**
 * Reads a Vercel build log, as the CLI prints it with `vercel inspect --logs`
 * and the dashboard shows it: a time and two spaces in front of each line.
 *
 * - `Running "…"` opens a step named for what it runs, and the line is its
 *   first. `Build Completed in …` closes it and stands after it.
 * - `Deploying outputs…` opens a step named for it, and `Deployment
 *   completed` closes it.
 * - A line starting `Error`, `Failed` or `npm ERR!`, or holding `error:`, is
 *   at `error`, and one starting `Warning` or `warn` is at `warn`.
 * - The leading time becomes the line's `at`, which times each step.
 */
export const parseVercel: LogParser = (raw) => {
  const { at, text } = stamped(raw)
  const plain = stripAnsi(text).trim()
  const level = vercelLevel(plain)
  const fields: LogParsed = { ...timed(at), ...(level === undefined ? {} : { level }), text }
  const running = /^Running "([^"]+)"( command)?/.exec(plain)
  if (running) {
    return { ...fields, open: running[2] ? `${running[1]} command` : (running[1] ?? plain) }
  }
  if (/^Deploying outputs/i.test(plain)) {
    return { ...fields, open: 'Deploying outputs' }
  }
  if (/^Build Completed in /i.test(plain) || /^Deployment completed/i.test(plain)) {
    return { ...fields, close: true }
  }
  return at === undefined && level === undefined ? undefined : fields
}

/** The parsers `format` names. */
export const LOG_FORMATS = {
  'github-actions': parseGitHubActions,
  vercel: parseVercel,
} as const
