import { afterEach, describe, expect, test } from 'bun:test'
import { fakeOpenLink } from './fake.js'
import { openLink, setOpenLink } from './index.js'
import { serverOpenLink } from './server.js'

afterEach(() => {
  setOpenLink(serverOpenLink)
})

describe('openLink', () => {
  test('is the server implementation until one is set', () => {
    expect(openLink()).toBe(serverOpenLink)
  })

  test('calls the implementation set last', () => {
    const fake = fakeOpenLink()
    setOpenLink(fake)
    openLink().open('/orders/42')
    expect(fake.opened).toEqual(['/orders/42'])
  })

  test('follows nothing on the server', () => {
    expect(serverOpenLink.open('https://example.com/')).toBeUndefined()
  })

  test('the fake keeps each destination in the order it was followed', () => {
    const fake = fakeOpenLink()
    fake.open('/inbox')
    fake.open('https://example.com/help')
    expect(fake.opened).toEqual(['/inbox', 'https://example.com/help'])
  })
})
