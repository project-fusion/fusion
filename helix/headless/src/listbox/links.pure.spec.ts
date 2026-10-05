import { describe, expect, test } from 'bun:test'
import { afterLinkFollowed } from './links.js'

const said = (detail: object): Event => {
  const event = new Event('helix-select', { cancelable: true })
  Object.defineProperty(event, 'detail', { value: detail })
  return event
}

describe('after a link option is followed', () => {
  test('runs once every listener has had the event', async () => {
    let closed = 0
    afterLinkFollowed(said({ href: '/docs', value: 'docs' }), () => closed++)
    expect(closed).toBe(0)
    await Promise.resolve()
    expect(closed).toBe(1)
  })

  test('runs nothing where the page canceled it', async () => {
    let closed = 0
    const event = said({ href: '/docs', value: 'docs' })
    afterLinkFollowed(event, () => closed++)
    event.preventDefault()
    await Promise.resolve()
    expect(closed).toBe(0)
  })

  test('runs nothing for an option that is not a link', async () => {
    let closed = 0
    afterLinkFollowed(said({ value: 'docs' }), () => closed++)
    await Promise.resolve()
    expect(closed).toBe(0)
  })
})
