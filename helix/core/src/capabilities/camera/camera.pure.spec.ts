import { afterEach, describe, expect, test } from 'bun:test'
import { fakeCamera } from './fake.js'
import { camera, setCamera } from './index.js'
import { serverCamera } from './server.js'

afterEach(() => {
  setCamera(serverCamera)
})

const PHOTO = {
  name: 'IMG_0001.jpg',
  size: 81_920,
  type: 'image/jpeg',
  uri: 'file:///IMG_0001.jpg',
}

describe('camera', () => {
  test('is the server implementation until one is set', () => {
    expect(camera()).toBe(serverCamera)
  })

  test('takes nothing on the server', async () => {
    expect(await serverCamera.capture()).toEqual({ files: [], outcome: 'unavailable' })
    expect(await serverCamera.choose(true)).toEqual({ files: [], outcome: 'unavailable' })
  })

  test('the fake keeps each request and gives what a spec sets', async () => {
    const fake = fakeCamera()
    setCamera(fake)
    expect((await camera().capture()).outcome).toBe('dismissed')
    fake.next = { files: [PHOTO], outcome: 'chosen' }
    expect(await camera().choose(false)).toEqual({ files: [PHOTO], outcome: 'chosen' })
    expect(fake.asked).toEqual([{ kind: 'capture' }, { kind: 'choose', multiple: false }])
  })
})
