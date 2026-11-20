import { afterEach, describe, expect, test } from 'bun:test'
import { fakeGpuDrawing } from './fake.js'
import { gpuDrawing, setGpuDrawing } from './index.js'
import { serverGpuDrawing } from './server.js'

afterEach(() => {
  setGpuDrawing(serverGpuDrawing)
})

describe('gpu drawing', () => {
  test('is the server implementation until one is set, which draws nothing', () => {
    expect(gpuDrawing()).toBe(serverGpuDrawing)
    expect(gpuDrawing().available()).toBe(false)
  })

  test('calls the implementation set last', () => {
    const fake = fakeGpuDrawing()
    setGpuDrawing(fake)
    expect(gpuDrawing().available()).toBe(true)
    fake.draws = false
    expect(gpuDrawing().available()).toBe(false)
  })
})
