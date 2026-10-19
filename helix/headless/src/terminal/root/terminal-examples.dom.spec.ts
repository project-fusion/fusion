import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the headless preview example', () => {
  run('writes its output into the frame, held until a renderer is attached', async () => {
    await example(preview)
    const frame = document.querySelector('helix-headless-terminal') as Updatable & {
      attach(renderer: { write(data: string | Uint8Array, done: () => void): void }): unknown
    }
    await settle(frame)
    const written: string[] = []
    frame.attach({
      write: (data, done) => {
        written.push(String(data))
        done()
      },
    })
    expect(written.join('')).toContain('Hello from the headless tier')
  })
})
