import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { fakeCamera } from './fake.js'
import { camera, setCamera } from './index.js'
import { serverCamera } from './server.js'
import { installWebCamera, webCamera } from './web.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  setCamera(serverCamera)
})

/** Catches the next file input the page clicks, and keeps it from opening a chooser. */
const nextInput = (): Promise<HTMLInputElement> =>
  new Promise((caught) => {
    const click = spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement,
    ) {
      click.mockRestore()
      caught(this)
    })
  })

describe('webCamera', () => {
  test('a capture asks for an image from the camera that faces away, and gives the photo', async () => {
    const opened = nextInput()
    const taking = webCamera.capture()
    const input = await opened
    expect(input.accept).toBe('image/*')
    expect(input.getAttribute('capture')).toBe('environment')
    expect(input.multiple).toBe(false)
    Object.defineProperty(input, 'files', {
      value: [new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' })],
    })
    input.dispatchEvent(new Event('change'))
    const taken = await taking
    expect(taken.outcome).toBe('chosen')
    expect(taken.files[0]).toMatchObject({ name: 'photo.jpg', type: 'image/jpeg' })
  })

  test('choosing asks for images from the library, as many as asked for', async () => {
    const opened = nextInput()
    const choosing = webCamera.choose(true)
    const input = await opened
    expect(input.accept).toBe('image/*')
    expect(input.hasAttribute('capture')).toBe(false)
    expect(input.multiple).toBe(true)
    input.dispatchEvent(new Event('cancel'))
    expect(await choosing).toEqual({ files: [], outcome: 'dismissed' })
  })

  test('is installed where nothing is set, and leaves a fake in place', () => {
    installWebCamera()
    expect(camera()).toBe(webCamera)
    const fake = fakeCamera()
    setCamera(fake)
    installWebCamera()
    expect(camera()).toBe(fake)
  })
})
