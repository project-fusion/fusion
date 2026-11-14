/*
 * The generated File Input, drawn from its real intermediate form: the field
 * a press opens the document picker from, through the fake files
 * capability, each chosen file a row with its name, its size and kind as
 * tags, and a press that removes it, the events a change sends, the files a
 * pick leaves out, the verdict on a required field, and the upload status a
 * page sets through the ref. `test:native` writes the component beside this
 * file.
 */

import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setFiles } from '@fusion.dev/helix-core/capabilities/files'
import { type FakeFiles, fakeFiles } from '@fusion.dev/helix-core/capabilities/files/fake'
import type { DeviceFile } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { Dimensions, Text } from 'react-native'
import type { FilesHandle } from '../machines/files'
import { HelixTheme } from '../theme/helix-theme'
import { HelixFileInput, type HelixFileInputProps } from './file-input/index.native'

/** A file as the capability gives it. */
const record = (name: string, type: string, size = 2048): DeviceFile => ({
  name,
  size,
  type,
  uri: `file:///cache/${name}`,
})

let picker: FakeFiles
let announcer: FakeAnnounce
/** What a screen reader was told last. */
const lastSaid = (): string | undefined => announcer.said.at(-1)?.message

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  picker = fakeFiles()
  setFiles(picker)
  announcer = fakeAnnounce()
  setAnnounce(announcer)
})

afterEach(() => {
  setFiles(fakeFiles())
})

const FileInput = (props: HelixFileInputProps) => (
  <HelixTheme mode="light">
    <HelixFileInput label="Attachments" {...props} />
  </HelixTheme>
)

/** Presses the field, and lets the pick it opens settle. */
const pick = async (...chosen: DeviceFile[]) => {
  picker.next =
    chosen.length === 0 ? { files: [], outcome: 'dismissed' } : { files: chosen, outcome: 'chosen' }
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: /Attachments/ }))
    /* The picker answers in a later task. */
    await new Promise<void>((done) => setTimeout(done, 0))
  })
}

describe('the generated File Input', () => {
  test('is a button named by its label and its trigger, which opens the picker with what accept offers', async () => {
    await render(<FileInput accept="image/*, .pdf" multiple />)
    expect(screen.getByRole('button', { name: 'Attachments Choose files' })).toBeTruthy()
    await pick()
    expect(picker.picks).toEqual([{ accept: ['image/*', '.pdf'], multiple: true }])
  })

  test('draws each chosen file as a row with its name, its size, its kind, and a press that removes it', async () => {
    await render(<FileInput multiple />)
    await pick(record('report.pdf', 'application/pdf', 1536), record('notes.txt', 'text/plain', 12))
    expect(screen.getByText('report.pdf')).toBeTruthy()
    expect(screen.getByText('1.5 KB')).toBeTruthy()
    expect(screen.getByText('PDF')).toBeTruthy()
    expect(screen.getByText('12 bytes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove notes.txt' })).toBeTruthy()
  })

  test('asks before a pick stands, then sends input and change, and a refused change keeps the files', async () => {
    const events: string[] = []
    let refuse = false
    await render(
      <FileInput
        multiple
        onBeforeChange={(event) => {
          events.push(`before-change ${event.detail.value}`)
          if (refuse) {
            event.preventDefault()
          }
        }}
        onChange={() => events.push('change')}
        onInput={() => events.push('input')}
      />,
    )
    await pick(record('a.png', 'image/png'), record('b.png', 'image/png'))
    expect(events).toEqual(['before-change a.png, b.png', 'input', 'change'])
    refuse = true
    await pick(record('c.png', 'image/png'))
    expect(screen.queryByText('c.png')).toBeNull()
    expect(screen.getByText('a.png')).toBeTruthy()
  })

  test('changes nothing where the reader closes the picker', async () => {
    const events: string[] = []
    await render(<FileInput onChange={() => events.push('change')} />)
    await pick()
    expect(events).toEqual([])
  })

  test('leaves out what accept, the size, the count, and validate refuse, sends reject with each record, and says it', async () => {
    const rejected: string[] = []
    await render(
      <FileInput
        accept="image/*"
        maxFileSize={4096}
        maxFiles={2}
        multiple
        onReject={(event) =>
          rejected.push(
            ...event.detail.files.map(
              (one) => `${one.file.uri} ${one.reason}${one.message ? ` ${one.message}` : ''}`,
            ),
          )
        }
        validate={(file) => (file.name.startsWith('x') ? 'No x files.' : null)}
      />,
    )
    await pick(
      record('a.png', 'image/png'),
      record('doc.pdf', 'application/pdf'),
      record('big.png', 'image/png', 9000),
      record('xray.png', 'image/png'),
      record('b.png', 'image/png'),
      record('c.png', 'image/png'),
    )
    expect(rejected).toEqual([
      'file:///cache/doc.pdf type',
      'file:///cache/big.png size',
      'file:///cache/xray.png invalid No x files.',
      'file:///cache/c.png count',
    ])
    expect(screen.getByText('a.png')).toBeTruthy()
    expect(screen.getByText('b.png')).toBeTruthy()
    expect(lastSaid()).toContain('Not added: doc.pdf')
  })

  test('takes the last file a single field accepts', async () => {
    await render(<FileInput />)
    await pick(record('a.png', 'image/png'), record('b.png', 'image/png'))
    expect(screen.queryByText('a.png')).toBeNull()
    expect(screen.getByText('b.png')).toBeTruthy()
  })

  test('hands what a pick takes through transformFiles', async () => {
    await render(
      <FileInput
        multiple
        transformFiles={(files) => files.map((one) => ({ ...one, name: `small-${one.name}` }))}
      />,
    )
    await pick(record('a.png', 'image/png'))
    expect(screen.getByText('small-a.png')).toBeTruthy()
  })

  test('removes a file by its press, asking first, and says it', async () => {
    const events: string[] = []
    await render(
      <FileInput
        multiple
        onBeforeChange={(event) => events.push(`before-change ${event.detail.value}`)}
      />,
    )
    await pick(record('a.png', 'image/png'), record('b.png', 'image/png'))
    events.length = 0
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Remove a.png' }))
    })
    expect(events).toEqual(['before-change b.png'])
    expect(screen.queryByText('a.png')).toBeNull()
    expect(lastSaid()).toBe('Removed: a.png')
  })

  test('draws a row its own way where renderFile is given, beside its remove button', async () => {
    await render(
      <FileInput
        multiple
        renderFile={(file, index) => <Text>{`${index + 1}. ${file.name} at ${file.uri}`}</Text>}
      />,
    )
    await pick(record('a.png', 'image/png'))
    expect(screen.getByText('1. a.png at file:///cache/a.png')).toBeTruthy()
    expect(screen.queryByText('PNG')).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove a.png' })).toBeTruthy()
  })

  test('marks a required field wrong once a change leaves it empty', async () => {
    await render(<FileInput multiple required />)
    expect(screen.queryByText('Fill in this field.')).toBeNull()
    await pick(record('a.png', 'image/png'))
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Remove a.png' }))
    })
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  test('opens no picker while disabled', async () => {
    await render(<FileInput disabled />)
    await pick(record('a.png', 'image/png'))
    expect(picker.picks).toEqual([])
  })

  test('draws the upload status the page sets through its ref, and says a finish', async () => {
    const ref = createRef<FilesHandle>()
    await render(<FileInput multiple ref={ref} />)
    await pick(record('a.png', 'image/png'))
    const file = ref.current?.files()[0]
    expect(file?.name).toBe('a.png')
    await act(async () => {
      if (file !== undefined) {
        ref.current?.setFileStatus(file, { progress: 0.5, state: 'uploading', text: 'Halfway' })
      }
    })
    expect(screen.getByText('Halfway')).toBeTruthy()
    expect(screen.getByLabelText('Uploading a.png')).toBeTruthy()
    await act(async () => {
      if (file !== undefined) {
        ref.current?.setFileStatus(file, { state: 'done', text: 'Uploaded' })
      }
    })
    expect(lastSaid()).toBe('Uploaded')
    await act(async () => {
      ref.current?.removeAt(0)
    })
    expect(screen.queryByText('a.png')).toBeNull()
  })
})
