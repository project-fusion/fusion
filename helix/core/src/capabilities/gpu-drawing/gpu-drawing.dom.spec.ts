import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { webGpuDrawing } from './web.js'

beforeAll(() => {
  registerDom()
})

describe('webGpuDrawing', () => {
  test('answers whether a canvas here gives a 2D context, the same each time', () => {
    const draws = document.createElement('canvas').getContext('2d') !== null
    expect(webGpuDrawing.available()).toBe(draws)
    expect(webGpuDrawing.available()).toBe(draws)
  })
})
