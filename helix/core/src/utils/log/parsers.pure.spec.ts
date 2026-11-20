import { describe, expect, test } from 'bun:test'
import { LogBuffer } from './buffer.js'
import { parseGitHubActions, parseVercel } from './parsers.js'

describe('parseGitHubActions', () => {
  test('opens and closes a step on the workflow commands, dropping both markers', () => {
    expect(parseGitHubActions('::group::Install dependencies')).toEqual({
      open: 'Install dependencies',
    })
    expect(parseGitHubActions('::endgroup::')).toEqual({ close: true })
  })

  test('reads the form and the times of a log downloaded from a run', () => {
    expect(
      parseGitHubActions('2026-10-10T00:19:09.4320585Z ##[group]Run actions/checkout@v4'),
    ).toEqual({
      at: '2026-10-10T00:19:09.4320585Z',
      open: 'Run actions/checkout@v4',
    })
    expect(parseGitHubActions('2026-10-10T00:19:10.0000000Z Syncing repository')).toEqual({
      at: '2026-10-10T00:19:10.0000000Z',
      text: 'Syncing repository',
    })
  })

  test('sets each annotation’s level, with where it points in front', () => {
    expect(
      parseGitHubActions('::error file=src/app.ts,line=12,col=5,title=Type error::Missing name'),
    ).toEqual({
      level: 'error',
      text: 'src/app.ts:12:5: Type error: Missing name',
    })
    expect(parseGitHubActions('::warning::Node 20 is deprecated')).toEqual({
      level: 'warn',
      text: 'Node 20 is deprecated',
    })
    expect(parseGitHubActions('##[notice]Cache restored')).toMatchObject({ level: 'info' })
    expect(parseGitHubActions('::debug::step 3')).toMatchObject({ level: 'debug' })
  })

  test('unescapes what a workflow command escaped', () => {
    expect(parseGitHubActions('::error::100%25 failed%0Aon retry')).toMatchObject({
      text: '100% failed on retry',
    })
  })

  test('drops what GitHub never shows, and leaves other lines as they are', () => {
    expect(parseGitHubActions('::add-mask::hunter2')).toBeNull()
    expect(parseGitHubActions('::set-output name=x::1')).toBeNull()
    expect(parseGitHubActions('Compiled 214 modules')).toBeUndefined()
    expect(parseGitHubActions('a :: b')).toBeUndefined()
  })
})

describe('parseVercel', () => {
  const at = '2026-10-10T03:22:39.852Z'

  test('takes the time off each line', () => {
    expect(parseVercel(`${at}  Cloning completed: 2.656s`)).toEqual({
      at,
      text: 'Cloning completed: 2.656s',
    })
  })

  test('opens a step at each command it runs, keeping the line as its first', () => {
    expect(parseVercel(`${at}  Running "vercel build"`)).toEqual({
      at,
      open: 'vercel build',
      text: 'Running "vercel build"',
    })
    expect(parseVercel(`${at}  Running "install" command: \`bun install\`...`)).toMatchObject({
      open: 'install command',
    })
  })

  test('closes the step when the build completes, keeping the line after it', () => {
    expect(parseVercel(`${at}  Build Completed in /vercel/output [2m]`)).toMatchObject({
      close: true,
      text: 'Build Completed in /vercel/output [2m]',
    })
    expect(parseVercel(`${at}  Deploying outputs...`)).toMatchObject({ open: 'Deploying outputs' })
    expect(parseVercel(`${at}  Deployment completed`)).toMatchObject({ close: true })
  })

  test('reads warnings and errors off how a line starts', () => {
    expect(parseVercel(`${at}  Warning: Detected "engines"`)).toMatchObject({ level: 'warn' })
    expect(parseVercel(`${at}  npm warn deprecated glob@7.2.3`)).toMatchObject({ level: 'warn' })
    expect(parseVercel(`${at}  Error: Command "bun run build" exited with 1`)).toMatchObject({
      level: 'error',
    })
    expect(parseVercel(`${at}  Failed to compile.`)).toMatchObject({ level: 'error' })
  })
})

describe('steps a parser opens', () => {
  const run = (text: string, parse = parseGitHubActions): LogBuffer => {
    const buffer = new LogBuffer()
    buffer.parse = parse
    buffer.write(text)
    return buffer
  }

  test('hold the lines between their markers, open while they run', () => {
    const buffer = run('::group::Install\nadded 214 packages\n')
    expect(buffer.steps).toEqual([
      { heading: 'Install', id: 'step-1', open: true, status: 'running' },
    ])
    expect(buffer.lines).toEqual([{ group: 'step-1', text: 'added 214 packages' }])
    expect(buffer.current()).toBeUndefined()
  })

  test('fold once they pass, timed from their lines, and stay open where one failed', () => {
    const buffer = run(
      [
        '2026-10-10T00:00:00.0000000Z ##[group]Install',
        '2026-10-10T00:00:38.0000000Z added 214 packages',
        '2026-10-10T00:00:38.0000000Z ##[endgroup]',
        '2026-10-10T00:00:39.0000000Z ##[group]Test',
        '2026-10-10T00:02:10.0000000Z ##[error]1 failed',
        '2026-10-10T00:02:10.0000000Z ##[endgroup]',
        'Done',
        '',
      ].join('\n'),
    )
    expect(buffer.steps).toEqual([
      { duration: '38s', heading: 'Install', id: 'step-1', open: false, status: 'done' },
      { duration: '1m 31s', heading: 'Test', id: 'step-2', open: true, status: 'failed' },
    ])
    expect(buffer.lines.at(-1)).toEqual({ text: 'Done' })
  })

  test('a new step closes the one that is open', () => {
    const buffer = run('::group::One\na\n::group::Two\nb\n')
    expect(buffer.steps.map((step) => [step.heading, step.status])).toEqual([
      ['One', 'done'],
      ['Two', 'running'],
    ])
  })

  test('keep a marker line the parser gave text, inside an opening step and after a closing one', () => {
    const buffer = run('Running "build"\nok\nBuild Completed in 1s\n', parseVercel)
    expect(buffer.lines).toEqual([
      { group: 'step-1', text: 'Running "build"' },
      { group: 'step-1', text: 'ok' },
      { text: 'Build Completed in 1s' },
    ])
  })

  test('the line still being written belongs to the open step', () => {
    const buffer = run('::group::Install\nadd')
    expect(buffer.current()).toEqual({ group: 'step-1', text: 'add' })
  })

  test('start over with the buffer', () => {
    const buffer = run('::group::Install\na\n')
    buffer.clear()
    expect(buffer.steps).toEqual([])
  })
})
