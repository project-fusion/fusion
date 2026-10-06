import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import download from '../.examples/download.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../button/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the download example', () => {
  run('pressing the button saves the code under the name the page gives', async () => {
    await example(download)
    const code = document.getElementById('code') as HTMLElement & {
      download: (filename?: string) => Promise<void>
    }
    /* The browser's save is out of the harness's reach, so the call is
       recorded where the page makes it. */
    const asked: string[] = []
    code.download = async (filename = '') => {
      asked.push(filename)
    }
    ;(document.getElementById('save') as HTMLElement).click()
    await idle()
    expect(asked).toEqual(['helix-docs.png'])
  })
})
