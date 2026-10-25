import { afterEach, describe, expect, test } from 'bun:test'
import { fakeHaptics } from './fake.js'
import { haptics, setHaptics } from './index.js'
import { serverHaptics } from './server.js'

afterEach(() => {
  setHaptics(serverHaptics)
})

describe('haptics', () => {
  test('is the server implementation until one is set', () => {
    expect(haptics()).toBe(serverHaptics)
  })

  test('calls the implementation set last', () => {
    const fake = fakeHaptics()
    setHaptics(fake)
    haptics().play('lift')
    expect(fake.played).toEqual(['lift'])
  })

  test('plays nothing on the server', () => {
    expect(serverHaptics.play('drop')).toBeUndefined()
  })

  test('the fake keeps each touch in the order it was played', () => {
    const fake = fakeHaptics()
    fake.play('lift')
    fake.play('pass')
    fake.play('drop')
    expect(fake.played).toEqual(['lift', 'pass', 'drop'])
  })
})
