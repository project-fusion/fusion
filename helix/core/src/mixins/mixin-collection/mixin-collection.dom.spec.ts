import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * A set that says when it is loading and when there is nothing in it.
 *
 * **The interesting part is what it says before it knows.** A collection cannot
 * count its rows until they are assigned, so `hasRows` answers `true` until
 * somebody has looked. Answering `false` would flash "Nothing to show" on every
 * set that has content, for the one frame between rendering and assignment,
 * which is the wrong answer at the only moment a reader is watching.
 */
type Collection = HTMLElement & {
  emptyText: string
  loading: boolean
  loadingText: string
  updateComplete: Promise<boolean>
}

const tag = 'probe-collection'

beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('../../helix-element/helix-element.js')
  const { MixinCollection } = await import('./mixin-collection.js')
  const { html } = await import('lit')
  customElements.define(
    tag,
    class extends MixinCollection(HelixElement) {
      protected override render() {
        return html`${this.renderStatus(this.hasRows)}<slot @slotchange=${this.countRows}></slot>${this.renderLive(this.hasRows)}`
      }
    },
  )
})

const set = async (markup = '', attrs = ''): Promise<Collection> => {
  document.body.innerHTML = `<${tag} ${attrs}>${markup}</${tag}>`
  const host = document.body.firstElementChild as Collection
  await host.updateComplete
  return host
}

const part = (host: HTMLElement, name: string) => host.shadowRoot?.querySelector(`[part="${name}"]`)

describe('a set with rows in it', () => {
  test('says nothing about being empty', async () => {
    const host = await set('<div>one</div><div>two</div>')
    expect(part(host, 'empty')).toBeNull()
  })
})

describe('a set with nothing in it', () => {
  test('says so, once it has looked', async () => {
    const host = await set()
    await host.updateComplete
    expect(part(host, 'empty')?.textContent).toBe('Nothing to show')
  })

  test('in the consumer’s words where they gave any', async () => {
    const host = await set('', 'empty-text="No results"')
    await host.updateComplete
    expect(part(host, 'empty')?.textContent).toBe('No results')
  })
})

describe('a set that is loading', () => {
  /* Loading beats empty, because a set that has not arrived is not a set that
     is empty, and saying "Nothing to show" while a request is in flight is the
     component answering a question nobody has asked yet. */
  test('says that rather than that it is empty', async () => {
    const host = await set('', 'loading')
    await host.updateComplete
    expect(part(host, 'loading')?.textContent).toBe('Loading')
    expect(part(host, 'empty')).toBeNull()
  })

  /* Said by a region that is always there, so the arrival is announced. A
     spinner nobody is told about is a spinner only sighted readers know is
     there, and a status inserted with its words in it is one a screen reader
     reads inconsistently at best. */
  test('and announces it, rather than only drawing it', async () => {
    const host = await set('', 'loading')
    await host.updateComplete
    expect(part(host, 'live')?.getAttribute('role')).toBe('status')
    expect(part(host, 'live')?.textContent).toBe('Loading')
    expect(part(host, 'loading')?.hasAttribute('role')).toBe(false)
  })

  test('even when it does have rows, since they may be the old ones', async () => {
    const host = await set('<div>one</div>', 'loading')
    await host.updateComplete
    expect(part(host, 'loading')).not.toBeNull()
  })
})
