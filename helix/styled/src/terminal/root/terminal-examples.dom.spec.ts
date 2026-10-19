import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import ansiColors from '../.examples/ansi-colors.html' with { type: 'text' }
import exited from '../.examples/exited.html' with { type: 'text' }
import inAPane from '../.examples/in-a-pane.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import transcript from '../.examples/transcript.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../card/index.js')
  await import('../../icon/index.js')
  await import('../../icon-button/index.js')
  await import('../../splitter/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

type Frame = Updatable & {
  attach(renderer: { write(data: string | Uint8Array, done: () => void): void }): {
    input(data: string): void
  }
  exitCode?: number | undefined
}

/**
 * The example's terminal with a stand-in renderer attached, which takes what
 * the example wrote, held until now, and everything it writes after.
 */
const attached = async (): Promise<{
  frame: Frame
  sink: { input(data: string): void }
  written: string[]
}> => {
  const frame = document.querySelector('helix-terminal') as Frame
  await settle(frame)
  const written: string[] = []
  const sink = frame.attach({
    write: (data, done) => {
      written.push(typeof data === 'string' ? data : new TextDecoder().decode(data))
      done()
    },
  })
  return { frame, sink, written }
}

describe('the preview example', () => {
  run('writes a shell’s output, and writes back what the reader types', async () => {
    await example(preview)
    const { sink, written } = await attached()
    expect(written.join('')).toContain('git status --short')
    sink.input('l')
    sink.input('\r')
    expect(written.at(-2)).toBe('l')
    expect(written.at(-1)).toContain('\r\n')
  })

  run('takes away only what the reader typed, and never the prompt', async () => {
    await example(preview)
    const { sink, written } = await attached()
    sink.input('ls')
    sink.input('\x7f')
    sink.input('\x7f')
    const erased = written.length
    sink.input('\x7f')
    sink.input('\x1b[D')
    expect(written.slice(-3)).toEqual(['ls', '\b \b', '\b \b'])
    expect(written.length).toBe(erased)
  })

  run(
    'brings back the lines the reader entered with Up and Down, as a shell’s history does',
    async () => {
      await example(preview)
      const { sink, written } = await attached()
      const shown = (): string => written.at(-1) ?? ''
      sink.input('ls')
      sink.input('\r')
      sink.input('pwd')
      sink.input('\r')
      sink.input('git')
      sink.input('\x1b[A')
      expect(shown().startsWith('\x1b[2K\r')).toBe(true)
      expect(shown().endsWith('pwd')).toBe(true)
      sink.input('\x1bOA')
      expect(shown().endsWith('ls')).toBe(true)
      const oldest = written.length
      sink.input('\x1b[A')
      expect(written.length).toBe(oldest)
      sink.input('\x7f')
      sink.input('\x7f')
      const erased = written.length
      sink.input('\x7f')
      expect(written.length).toBe(erased)
      sink.input('\x1b[B')
      expect(shown().endsWith('pwd')).toBe(true)
      sink.input('\x1b[B')
      expect(shown().endsWith('git')).toBe(true)
      const newest = written.length
      sink.input('\x1b[B')
      expect(written.length).toBe(newest)
    },
  )
})

describe('the transcript example', () => {
  run('writes a build’s output once, into a frame that takes no input', async () => {
    await example(transcript)
    const { frame, sink, written } = await attached()
    expect(written.join('')).toContain('16 successful')
    let sent = 0
    frame.addEventListener('helix-terminal-input', () => {
      sent += 1
    })
    sink.input('x')
    expect(sent).toBe(0)
  })
})

describe('the exited example', () => {
  run('says the process exited, and Restart runs it again', async () => {
    await example(exited)
    const { frame, written } = await attached()
    expect(part(frame, 'status')?.textContent).toContain('exited with code 1')
    const before = written.length
    ;(part(frame, 'restart') as HTMLElement).click()
    await settle(frame)
    expect(written.length).toBeGreaterThan(before)
    expect(frame.exitCode).toBe(1)
  })
})

describe('the pane example', () => {
  run('writes a prompt into a terminal that fills the lower pane of a splitter', async () => {
    await example(inAPane)
    const { written } = await attached()
    expect(written.join('')).toContain('Development')
  })
})

describe('the ANSI colors example', () => {
  run('writes every color as text and as a ground', async () => {
    await example(ansiColors)
    const { written } = await attached()
    const output = written.join('')
    for (const code of ['30', '37', '90', '97', '40', '47', '100', '107']) {
      expect(output).toContain(`\u001b[${code}m`)
    }
  })
})
