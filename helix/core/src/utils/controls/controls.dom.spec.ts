import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

type Controls = typeof import('./controls.js')
let controls: Controls

beforeAll(async () => {
  registerDom()
  controls = await import('./controls.js')
})

const added: HTMLElement[] = []

afterEach(() => {
  for (const element of added.splice(0)) {
    controls.unregisterControl(element)
    element.remove()
  }
  document.body.replaceChildren()
})

/** A button on the page, listed as a control that is pressed. */
const button = (markup: string, kind: 'focus' | 'press' = 'press'): HTMLElement => {
  const holder = document.createElement('div')
  holder.innerHTML = markup
  const element = holder.firstElementChild as HTMLElement
  document.body.append(element)
  controls.registerControl({ element, kind })
  added.push(element)
  return element
}

describe('listControls', () => {
  test('lists each control by its name, in document order, with its keys as chords', () => {
    button('<button aria-keyshortcuts="Meta+Shift+K">Second</button>')
    button('<button aria-label="First">x</button>')
    const first = document.body.lastElementChild as HTMLElement
    document.body.prepend(first)
    expect(controls.listControls().map(({ keys, name }) => ({ keys, name }))).toEqual([
      { keys: [], name: 'First' },
      { keys: ['meta+shift+k'], name: 'Second' },
    ])
  })

  test('leaves out a control that is disabled, inert, unlisted or inside something that is', () => {
    button('<button disabled>Disabled</button>')
    button('<button inert>Inert</button>')
    button('<button unlisted>Mine</button>')
    const region = document.createElement('section')
    region.setAttribute('unlisted', '')
    document.body.append(region)
    const inside = button('<button>Inside</button>')
    region.append(inside)
    button('<button>Shown</button>')
    expect(controls.listControls().map((one) => one.name)).toEqual(['Shown'])
  })

  test('names a control by its label first, then aria-label, then aria-labelledby, then its text', () => {
    const labeled = button('<button aria-label="Aria">Text</button>')
    ;(labeled as unknown as { label: string }).label = 'Label'
    document.body.insertAdjacentHTML('beforeend', '<span id="named">Pointed at</span>')
    const pointed = button('<button aria-labelledby="named">Text</button>')
    expect(controls.controlName(labeled)).toBe('Label')
    expect(controls.controlName(pointed)).toBe('Pointed at')
  })

  test('gives each control the name of the labeled region around it', () => {
    const nav = document.createElement('nav')
    nav.setAttribute('aria-label', 'Project')
    document.body.append(nav)
    const settings = button('<button>Settings</button>')
    nav.append(settings)
    expect(controls.listControls()[0]?.group).toBe('Project')
  })

  test('drops a control that leaves the page', () => {
    const gone = button('<button>Gone</button>')
    controls.unregisterControl(gone)
    expect(controls.listControls()).toEqual([])
  })
})

describe('listShortcuts', () => {
  test('lists a shortcut while its owner is on the page, reading its keys and label each time', () => {
    const owner = document.createElement('div')
    document.body.append(owner)
    let keys = 'mod+k'
    const unregister = controls.registerShortcut({
      keys: () => keys,
      label: () => 'Open Commands',
      owner,
    })
    expect(controls.listShortcuts().map(({ keys, label }) => ({ keys, label }))).toEqual([
      { keys: 'mod+k', label: 'Open Commands' },
    ])
    keys = 'mod+p'
    expect(controls.listShortcuts()[0]?.keys).toBe('mod+p')
    owner.remove()
    expect(controls.listShortcuts()).toEqual([])
    unregister()
  })
})

describe('chordOfAria', () => {
  test('writes an aria-keyshortcuts chord in the words a chord uses', () => {
    expect(controls.chordOfAria('Control+Shift+ArrowUp')).toBe('ctrl+shift+up')
    expect(controls.chordOfAria('Meta+K')).toBe('meta+k')
    expect(controls.chordOfAria('Escape')).toBe('esc')
  })
})

describe('runControl', () => {
  test('presses a control that is pressed, and focuses one that is focused', () => {
    let pressed = 0
    const press = button('<button>Press</button>')
    press.addEventListener('click', () => {
      pressed += 1
    })
    const field = button('<input aria-label="Field">', 'focus')
    controls.runControl({ element: press, kind: 'press' })
    controls.runControl({ element: field, kind: 'focus' })
    expect(pressed).toBe(1)
    expect(document.activeElement).toBe(field)
  })
})
