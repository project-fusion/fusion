import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '../../testing/dom.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

describe('tag', () => {
  test('shows its label and nothing else by default', async () => {
    const tag = await mount('<helix-tag>Draft</helix-tag>')
    expect(part(tag, 'tag')).not.toBeNull()
    expect(part(tag, 'remove')).toBeNull()
  })

  test('offers a named control when removable', async () => {
    const tag = await mount('<helix-tag removable>Draft</helix-tag>')
    const remove = part(tag, 'remove')
    expect(remove?.tagName).toBe('BUTTON')
    // A real button, so Enter and Space work without a key handler.
    expect(remove?.getAttribute('type')).toBe('button')
    expect(remove?.getAttribute('aria-label')).toBe('Remove')
  })

  test('the remove control can be named for what it removes', async () => {
    const tag = await mount('<helix-tag removable remove-label="Remove Draft">Draft</helix-tag>')
    expect(part(tag, 'remove')?.getAttribute('aria-label')).toBe('Remove Draft')
  })

  test('asks to be removed rather than removing itself', async () => {
    // The consumer owns the list the tag is in. Taking the node out from under
    // them would put their state and the document out of step.
    const tag = await mount('<helix-tag removable>Draft</helix-tag>')
    let detail: { label: string } | null = null
    tag.addEventListener('RemoveRequest', (event) => {
      detail = (event as CustomEvent<{ label: string }>).detail
    })
    ;(part(tag, 'remove') as HTMLElement).click()

    expect(detail).not.toBeNull()
    expect((detail as unknown as { label: string }).label).toBe('Draft')
    expect(tag.isConnected).toBe(true)
  })

  test('the request can be refused', async () => {
    const tag = await mount('<helix-tag removable>Draft</helix-tag>')
    let cancelable = false
    tag.addEventListener('RemoveRequest', (event) => {
      cancelable = event.cancelable
      event.preventDefault()
    })
    ;(part(tag, 'remove') as HTMLElement).click()
    expect(cancelable).toBe(true)
    expect(tag.isConnected).toBe(true)
  })
})
