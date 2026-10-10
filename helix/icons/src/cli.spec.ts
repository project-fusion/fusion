import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from './cli.js'

const PEAK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2 2 22h20Z"/></svg>'

const scratch: string[] = []

/** A directory holding one drawing, and a path to write the module to. */
const planted = () => {
  const at = mkdtempSync(join(tmpdir(), 'helix-icons-cli-'))
  scratch.push(at)
  const drawings = join(at, 'drawings')
  mkdirSync(drawings)
  writeFileSync(join(drawings, 'peak.svg'), PEAK)
  return { at, directory: drawings, out: join(at, 'icons.ts') }
}

/* What the command printed, by stream, with the console kept quiet. */
let printed: { error: string; log: string }
beforeEach(() => {
  printed = { error: '', log: '' }
  spyOn(console, 'log').mockImplementation((...said: unknown[]) => {
    printed.log += `${said.join(' ')}\n`
  })
  spyOn(console, 'error').mockImplementation((...said: unknown[]) => {
    printed.error += `${said.join(' ')}\n`
  })
})

afterEach(() => {
  mock.restore()
  for (const at of scratch.splice(0)) {
    rmSync(at, { force: true, recursive: true })
  }
})

describe('helix-icons', () => {
  test('--help and -h print the usage and succeed, with or without the command', () => {
    for (const argv of [['--help'], ['-h'], ['build', '--help'], ['build', '-h']]) {
      printed.log = ''
      expect(main(argv)).toBe(0)
      expect(printed.log).toContain('--source <dir>')
    }
  })

  test('no command, or one it does not have, fails and says so', () => {
    expect(main([])).toBe(1)
    expect(printed.error).toContain('needs a command')
    expect(main(['bulid'])).toBe(1)
    expect(printed.error).toContain('bulid is not a command')
  })

  test('an option it does not have is refused, and nothing is written', () => {
    /* Ignored, a mistyped `--indx` built a module without the index. */
    const { directory, out } = planted()
    expect(main(['build', '--source', directory, '--out', out, '--indx'])).toBe(1)
    expect(printed.error).toContain('--indx is not an option of build')
    expect(existsSync(out)).toBe(false)
  })

  test('an argument with no option before it is refused', () => {
    const { directory, out } = planted()
    expect(main(['build', directory, '--out', out])).toBe(1)
    expect(printed.error).toContain(`${directory} is not an option of build`)
  })

  test('an option missing its value is refused', () => {
    const { directory } = planted()
    expect(main(['build', '--source', directory, '--out'])).toBe(1)
    expect(printed.error).toContain('--out needs a file')
    expect(main(['build', '--source', directory, '--list', '--index'])).toBe(1)
    expect(printed.error).toContain('--list needs a file')
  })

  test('a suffix that starts with a dash is a value', () => {
    const { at, directory } = planted()
    writeFileSync(join(directory, 'ring-bold.svg'), PEAK)
    const out = join(at, 'bold.ts')
    expect(main(['build', '--source', directory, '--suffix', '-bold', '--out', out])).toBe(0)
    expect(readFileSync(out, 'utf8')).toContain('export const ring: HelixIcon')
  })

  test('a source that is not there fails, naming it, and writes nothing', () => {
    const { at, out } = planted()
    const missing = join(at, 'brand-icons')
    expect(main(['build', '--source', missing, '--out', out])).toBe(1)
    expect(printed.error).toContain(`no directory at ${missing}`)
    expect(existsSync(out)).toBe(false)
  })

  test('--out into a directory that is not there creates it', () => {
    const { at, directory } = planted()
    const out = join(at, 'src', 'icons.ts')
    expect(main(['build', '--source', directory, '--out', out])).toBe(0)
    expect(readFileSync(out, 'utf8')).toContain('export const peak: HelixIcon')
  })
})
