import { el, type PickedFile, type Scenario } from '../format.js'

/*
 * The scenarios of File Input, which a reader picks files into. The web
 * answers the element's own file input, and a phone answers its field's
 * press through the fake files capability, and the comparison holds the two
 * records to each other: the events each pick and each removal sends, the
 * names of the files the element holds, and whether it is marked wrong.
 */

/** A file input labeled Attachments, with its props. */
const field = (props: Readonly<Record<string, boolean | number | string>> = {}) =>
  el('helix-file-input', { label: 'Attachments', ...props })

/** A file the picker gives: its name, its size in bytes, and its type. */
const file = (name: string, type: string, size = 2048): PickedFile => ({ name, size, type })

const photo = file('photo.png', 'image/png')
const scan = file('scan.png', 'image/png')
const report = file('report.pdf', 'application/pdf')

/** File inputs: picking one and several, closing the picker, removing, the limits, and the verdict. */
export const FILE_INPUT: readonly Scenario[] = [
  {
    family: 'file-input',
    intents: [{ files: [photo], kind: 'pick' }],
    name: 'a pick asks with the names, then sends input and change, and holds the file',
    setup: field(),
  },
  {
    family: 'file-input',
    intents: [
      { files: [photo, report], kind: 'pick' },
      { files: [scan], kind: 'pick' },
    ],
    name: 'a field that holds several takes each file picked, and a new pick replaces them',
    setup: field({ multiple: true }),
  },
  {
    family: 'file-input',
    intents: [
      { files: [photo], kind: 'pick' },
      { files: [], kind: 'pick' },
    ],
    name: 'closing the picker changes nothing',
    setup: field(),
  },
  {
    family: 'file-input',
    intents: [
      { files: [photo, report], kind: 'pick' },
      { kind: 'press', part: 'remove' },
    ],
    name: 'the remove button takes its file out, asking first',
    setup: field({ multiple: true }),
  },
  {
    family: 'file-input',
    intents: [
      { event: 'before-change', kind: 'refuse' },
      { files: [photo], kind: 'pick' },
    ],
    name: 'a refused pick keeps the files the field had',
    setup: field(),
  },
  {
    family: 'file-input',
    intents: [{ files: [photo, report], kind: 'pick' }],
    name: 'a file accept does not name is left out and rejected',
    setup: field({ accept: 'image/*', multiple: true }),
  },
  {
    family: 'file-input',
    intents: [{ files: [photo, file('huge.png', 'image/png', 9000)], kind: 'pick' }],
    name: 'a file larger than max-file-size is left out and rejected',
    setup: field({ 'max-file-size': 4096, multiple: true }),
  },
  {
    family: 'file-input',
    intents: [{ files: [photo, scan, report], kind: 'pick' }],
    name: 'files past max-files are left out and rejected',
    setup: field({ 'max-files': 2, multiple: true }),
  },
  {
    family: 'file-input',
    intents: [
      { files: [photo], kind: 'pick' },
      { kind: 'press', part: 'remove' },
    ],
    name: 'a required field is marked wrong once a change leaves it empty',
    setup: field({ required: true }),
  },
  {
    family: 'file-input',
    intents: [{ files: [photo], kind: 'pick' }],
    name: 'a disabled field takes no pick',
    setup: field({ disabled: true }),
  },
  {
    family: 'file-input',
    intents: [{ files: [photo], kind: 'pick' }],
    name: 'the page’s own message marks the field wrong at once',
    setup: field({ feedback: 'Attach a signed copy.' }),
  },
]
