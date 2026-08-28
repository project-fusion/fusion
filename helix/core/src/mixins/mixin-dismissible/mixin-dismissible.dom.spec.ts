import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * Anything a reader can take away, and what it says it was.
 *
 * `dismiss()` announces and reports whether the request stood, so the caller
 * can decide what to do next, which is the same shape every stateful change in
 * the library takes. The interesting part is the detail on the event: a
 * consumer removing a toast from their own list needs to know *which* one went,
 * and the surface's own text is what identifies it to them.
 */
type Dismissible = HTMLElement & {
  dismiss(): boolean
  dismissLabel: string
  dismissible: boolean
  updateComplete: Promise<boolean>
}

const tag = 'probe-dismissible'

beforeAll(async () => {
  registerDom()
  const { HelixElement } = await import('../../helix-element/helix-element.js')
  const { MixinDismissible } = await import('./mixin-dismissible.js')
  customElements.define(tag, class extends MixinDismissible(HelixElement) {})
})

const item = async (markup = '', attrs = ''): Promise<Dismissible> => {
  document.body.innerHTML = `<${tag} ${attrs}>${markup}</${tag}>`
  const host = document.body.firstElementChild as Dismissible
  await host.updateComplete
  return host
}

describe('asking to be dismissed', () => {
  test('announces it and says the request stood', async () => {
    const host = await item()
    let heard = 0
    host.addEventListener('helix-dismiss', () => {
      heard += 1
    })
    expect([host.dismiss(), heard]).toEqual([true, 1])
  })

  /* Announce first, then let the caller act: a listener calling
     `preventDefault()` stops it, and the return value is how the caller finds
     out rather than having to read the event back. */
  test('and a refusal is reported to the caller', async () => {
    const host = await item()
    host.addEventListener('helix-dismiss', (event) => {
      event.preventDefault()
    })
    expect(host.dismiss()).toBe(false)
  })
})

describe('what the event says was dismissed', () => {
  test('the surface’s own text, so a consumer knows which one went', async () => {
    const host = await item('Saved to drafts')
    let said = ''
    host.addEventListener('helix-dismiss', (event) => {
      said = (event as CustomEvent<{ label?: string }>).detail?.label ?? ''
    })
    host.dismiss()
    expect(said).toContain('Saved to drafts')
  })

  /* Default slot only. A node assigned to a named slot belongs to another
     region: an actions row or a dismiss glyph is not what this surface is
     called, and including it would hand the consumer the word "Dismiss" as the
     identity of the thing they just dismissed. */
  test('and not the text of another region', async () => {
    const host = await item('Saved to drafts<span slot="actions">Undo</span>')
    let said = ''
    host.addEventListener('helix-dismiss', (event) => {
      said = (event as CustomEvent<{ label?: string }>).detail?.label ?? ''
    })
    host.dismiss()
    expect(said).toContain('Saved to drafts')
    expect(said).not.toContain('Undo')
  })
})

describe('the defaults', () => {
  test('nothing is dismissible until it says so', async () => {
    expect((await item()).dismissible).toBe(false)
  })

  /* An icon has no name of its own, so the control needs one and it has to be
     a word rather than a glyph. */
  test('and the control has a name before anybody names it', async () => {
    expect((await item()).dismissLabel).toBe('Dismiss')
  })

  test('which reflects, so a stylesheet can select on it', async () => {
    const host = await item('', 'dismissible')
    expect(host.hasAttribute('dismissible')).toBe(true)
  })
})
