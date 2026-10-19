import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { drawsInSoftware } from './draws-in-software.js'

/* Read once the page exists: a spec that runs first finds no `document` at import. */
let create: typeof document.createElement

beforeAll(() => {
  registerDom()
  create = document.createElement.bind(document)
})

afterEach(() => {
  document.createElement = create
})

/** `UNMASKED_RENDERER_WEBGL`, which a stubbed extension has to carry itself. */
const UNMASKED = 0x9246

/**
 * A canvas whose context names this renderer, or withholds the name when
 * `name` is `undefined`, and records whether it was given back.
 */
const renderer = (name: string | undefined): { released: () => boolean } => {
  let lost = false
  const gl = {
    getExtension: (which: string) => {
      if (which === 'WEBGL_debug_renderer_info') {
        return name === undefined ? null : { UNMASKED_RENDERER_WEBGL: UNMASKED }
      }
      if (which === 'WEBGL_lose_context') {
        return {
          loseContext: () => {
            lost = true
          },
        }
      }
      return null
    },
    getParameter: (which: number) => (which === UNMASKED ? name : null),
  }
  document.createElement = ((tag: string) =>
    tag === 'canvas'
      ? ({ getContext: () => gl, height: 0, width: 0 } as unknown as HTMLCanvasElement)
      : create(tag)) as typeof document.createElement
  return { released: () => lost }
}

describe('drawsInSoftware', () => {
  test('answers no where there is no WebGL at all, which the caller handles itself', () => {
    expect(drawsInSoftware({})).toBe(false)
  })

  test('names each renderer that draws on the CPU', () => {
    for (const name of [
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
      'llvmpipe (LLVM 15.0.7, 256 bits)',
      'softpipe',
      'Microsoft Basic Render Driver',
    ]) {
      renderer(name)
      expect(drawsInSoftware({})).toBe(true)
    }
  })

  test('keeps a hardware renderer on the drawing path', () => {
    renderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Max, Unspecified Version)')
    expect(drawsInSoftware({})).toBe(false)
  })

  test('draws where the name is withheld, because declining is the worse mistake', () => {
    renderer(undefined)
    expect(drawsInSoftware({})).toBe(false)
  })

  test('gives its probe context straight back', () => {
    const probe = renderer('softpipe')
    drawsInSoftware({})
    expect(probe.released()).toBe(true)
  })
})
