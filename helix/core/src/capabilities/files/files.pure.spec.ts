import { afterEach, describe, expect, test } from 'bun:test'
import { fakeFiles } from './fake.js'
import { files, setFiles } from './index.js'
import { serverFiles } from './server.js'

afterEach(() => {
  setFiles(serverFiles)
})

const REPORT = {
  name: 'report.pdf',
  size: 2048,
  type: 'application/pdf',
  uri: 'file:///report.pdf',
}

describe('files', () => {
  test('is the server implementation until one is set', () => {
    expect(files()).toBe(serverFiles)
  })

  test('picks and saves nothing on the server', async () => {
    expect(await serverFiles.pick({ accept: [], multiple: false })).toEqual({
      files: [],
      outcome: 'unavailable',
    })
    expect(await serverFiles.save({ name: 'a.txt', type: 'text/plain', uri: 'data:,a' })).toBe(
      false,
    )
  })

  test('the fake gives what a spec sets for a pick, and keeps each pick', async () => {
    const fake = fakeFiles()
    setFiles(fake)
    expect((await files().pick({ accept: ['.pdf'], multiple: false })).outcome).toBe('dismissed')
    fake.next = { files: [REPORT], outcome: 'chosen' }
    expect(await files().pick({ accept: [], multiple: true })).toEqual({
      files: [REPORT],
      outcome: 'chosen',
    })
    expect(fake.picks).toEqual([
      { accept: ['.pdf'], multiple: false },
      { accept: [], multiple: true },
    ])
  })

  test('the fake keeps each save it takes, and refuses while it is told to', async () => {
    const fake = fakeFiles()
    const notes = { name: 'notes.txt', type: 'text/plain', uri: 'data:,Notes' }
    fake.saves = false
    expect(await fake.save(notes)).toBe(false)
    fake.saves = true
    expect(await fake.save(notes)).toBe(true)
    expect(fake.saved).toEqual([notes])
  })
})
