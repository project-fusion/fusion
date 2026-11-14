import { afterEach, describe, expect, test } from 'bun:test'
import { fakeAnnounce } from './fake.js'
import { announce, setAnnounce } from './index.js'
import { serverAnnounce } from './server.js'

afterEach(() => {
  setAnnounce(serverAnnounce)
})

describe('announce', () => {
  test('is the server implementation until one is set', () => {
    expect(announce()).toBe(serverAnnounce)
  })

  test('calls the implementation set last', () => {
    const fake = fakeAnnounce()
    setAnnounce(fake)
    announce().say('Moved to place 2 of 4', 'assertive')
    expect(fake.said).toEqual([{ message: 'Moved to place 2 of 4', urgency: 'assertive' }])
  })

  test('says nothing on the server', () => {
    expect(serverAnnounce.say('Saved', 'polite')).toBeUndefined()
  })

  test('the fake keeps each message in the order it was said', () => {
    const fake = fakeAnnounce()
    fake.say('Picked up', 'assertive')
    fake.say('Dropped', 'polite')
    expect(fake.said.map((one) => one.message)).toEqual(['Picked up', 'Dropped'])
  })
})
