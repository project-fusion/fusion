import { beforeAll, describe, expect, test } from 'bun:test'
import { listShortcuts, onApple } from '@fusion.dev/helix-core'
import { mount, nextFrame, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Region = HTMLElement & {
  undoable(
    message: string,
    options: { commit?: () => void; duration?: number; undo: () => void },
  ): Promise<'kept' | 'undone'>
  updateComplete: Promise<unknown>
}

type Item = HTMLElement & { dismiss(): boolean; open: boolean; updateComplete: Promise<boolean> }

const region = async (): Promise<Region> =>
  (await mount('<helix-headless-toast></helix-headless-toast>')) as Region

const newest = (host: Region): Item => host.lastElementChild as Item

const pressUndo = (target: EventTarget = document.body): void => {
  const apple = onApple()
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: !apple,
      key: 'z',
      metaKey: apple,
    }),
  )
}

describe('an undoable message', () => {
  test('holds an Undo button that undoes, and settles as undone', async () => {
    const host = await region()
    let undone = 0
    const settled = host.undoable('Deleted 3 files', { undo: () => (undone += 1) })
    const item = newest(host)
    await item.updateComplete
    const button = item.querySelector('[slot="actions"]') as HTMLElement
    expect(button.localName).toBe('helix-headless-button')
    expect(button.textContent).toBe('Undo')
    expect(button.getAttribute('aria-keyshortcuts')).toBe(onApple() ? 'Meta+Z' : 'Control+Z')
    button.click()
    expect(await settled).toBe('undone')
    expect(undone).toBe(1)
    expect(item.open).toBe(false)
  })

  test('undoes the newest message on Command+Z, and leaves the key to a text field', async () => {
    const host = await region()
    const order: string[] = []
    void host.undoable('Archived one', { undo: () => order.push('one') })
    void host.undoable('Archived two', { undo: () => order.push('two') })
    const field = document.createElement('input')
    document.body.append(field)
    pressUndo(field)
    expect(order).toEqual([])
    pressUndo()
    pressUndo()
    expect(order).toEqual(['two', 'one'])
    field.remove()
  })

  test('commits and settles as kept when it closes any other way', async () => {
    const host = await region()
    let committed = 0
    const settled = host.undoable('Moved to trash', {
      commit: () => (committed += 1),
      undo: () => {},
    })
    newest(host).dismiss()
    expect(await settled).toBe('kept')
    expect(committed).toBe(1)
    pressUndo()
    expect(committed).toBe(1)
  })

  test('is said with the keys that undo it, and is on the page’s list of shortcuts while it shows', async () => {
    const host = await region()
    const settled = host.undoable('Deleted 3 files', { undo: () => {} })
    await nextFrame()
    await host.updateComplete
    const [polite] = [...(host.shadowRoot?.querySelectorAll('[part="live"]') ?? [])]
    expect(polite?.textContent).toBe(
      onApple()
        ? 'Deleted 3 files. Press Command Z to undo.'
        : 'Deleted 3 files. Press Ctrl+Z to undo.',
    )
    expect(listShortcuts().some((one) => one.keys === 'mod+z' && one.label === 'Undo')).toBe(true)
    newest(host).dismiss()
    await settled
    expect(listShortcuts().some((one) => one.keys === 'mod+z')).toBe(false)
  })

  test('commits what is still showing as the region leaves, and as the page is hidden', async () => {
    const host = await region()
    const committed: string[] = []
    const left = host.undoable('Archived one', {
      commit: () => committed.push('left'),
      undo: () => {},
    })
    host.remove()
    expect(await left).toBe('kept')
    const again = await region()
    const hidden = again.undoable('Archived two', {
      commit: () => committed.push('hidden'),
      undo: () => {},
    })
    window.dispatchEvent(new Event('pagehide'))
    expect(await hidden).toBe('kept')
    expect(committed).toEqual(['left', 'hidden'])
  })

  test('leaves the keys to the app with an empty undo-keys, or where the app handled them', async () => {
    const host = await region()
    let undone = 0
    void host.undoable('Archived one', { undo: () => (undone += 1) })
    document.addEventListener('keydown', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    })
    pressUndo()
    expect(undone).toBe(0)
    host.setAttribute('undo-keys', '')
    await host.updateComplete
    void host.undoable('Archived two', { undo: () => (undone += 1) })
    const item = newest(host)
    await item.updateComplete
    expect(item.querySelector('[slot="actions"]')?.hasAttribute('aria-keyshortcuts')).toBe(false)
    pressUndo()
    expect(undone).toBe(0)
  })
})
