import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, hasState, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* Registered before the module is evaluated, and the import is dynamic for the
   reason Aura's spec gives: `@customElement` runs at evaluation, and a static
   import would run it before `registerDom` has installed a `customElements`. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* **Every element here is mounted with no box, so none of them draws.** What
   these assert is markup, attributes, and the fallback, and not one reads a
   pixel. A draw is a pipeline compiled on the shared GPU process of the browser
   lane, which Aura's spec measured holding every other page's frames. A
   `travel` host is fixed to the viewport and would draw, so it is hidden. */
const undrawn = (attributes = ''): string =>
  `<helix-strands ${attributes} style="display: none"></helix-strands>`

/** `UNMASKED_RENDERER_WEBGL`, which a stubbed extension has to carry itself. */
const UNMASKED_RENDERER = 0x9246

const SOFTWARE =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)'

/** Makes `WEBGL_debug_renderer_info` report one name, and gives back the undo. Aura's helper. */
const reportRenderer = (name: string): (() => void) => {
  const proto = globalThis.WebGL2RenderingContext?.prototype
  if (!proto) {
    return () => {}
  }
  type Asked = (this: WebGL2RenderingContext, asked: never) => unknown
  const extension = proto.getExtension as Asked
  const parameter = proto.getParameter as Asked
  proto.getExtension = function (this: WebGL2RenderingContext, asked: string) {
    if (asked === 'WEBGL_debug_renderer_info') {
      return { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER }
    }
    return extension.call(this, asked as never)
  } as WebGL2RenderingContext['getExtension']
  proto.getParameter = function (this: WebGL2RenderingContext, asked: number) {
    return asked === UNMASKED_RENDERER ? name : parameter.call(this, asked as never)
  } as WebGL2RenderingContext['getParameter']
  return () => {
    proto.getExtension = extension as WebGL2RenderingContext['getExtension']
    proto.getParameter = parameter as WebGL2RenderingContext['getParameter']
  }
}

/** Collects the reasons `helix-strands-fallback` gives while `run` runs. */
const reasonsDuring = async (run: () => Promise<unknown>): Promise<string[]> => {
  const reasons: string[] = []
  const heard = (event: Event): void => {
    reasons.push((event as CustomEvent<{ reason: string }>).detail.reason)
  }
  document.addEventListener('helix-strands-fallback', heard)
  try {
    await run()
  } finally {
    document.removeEventListener('helix-strands-fallback', heard)
  }
  return reasons
}

type Strands = HTMLElement & {
  density: number
  speed: number
  travel: boolean
  updateComplete: Promise<boolean>
  variant: string | undefined
}

describe('strands', () => {
  test('renders a canvas and hides it from assistive technology', async () => {
    const host = (await mount(undrawn())) as Strands
    await host.updateComplete
    const canvas = host.shadowRoot?.querySelector('canvas')
    expect(canvas).toBeDefined()
    expect(canvas?.getAttribute('aria-hidden')).toBe('true')
    expect(host.getAttribute('aria-hidden')).toBeNull()
  })

  test('with no WebGL it says it shows the gradient, once, and why', async () => {
    /* happy-dom has no WebGL, which is a reader on a refused context. */
    if (hasLayout()) {
      return
    }
    let host: HTMLElement | undefined
    const reasons = await reasonsDuring(async () => {
      host = await mount(undrawn())
    })
    expect(host && hasState(host, 'fallback')).toBe(true)
    expect(reasons).toEqual(['unavailable'])
  })

  /* Browser only: happy-dom has no renderer to name. */
  if (hasLayout()) {
    test('a renderer that draws in software takes the gradient, and says so', async () => {
      const undo = reportRenderer(SOFTWARE)
      try {
        let host: HTMLElement | undefined
        const reasons = await reasonsDuring(async () => {
          host = await mount(undrawn())
        })
        expect(host && hasState(host, 'fallback')).toBe(true)
        expect(reasons).toEqual(['software'])
      } finally {
        undo()
      }
    })
  }

  test('content placed inside sits in the content part, over the canvas', async () => {
    const host = await mount(
      '<helix-strands style="display: none"><h1>Ship faster</h1></helix-strands>',
    )
    const slot = host.shadowRoot?.querySelector('[part="content"] slot') as HTMLSlotElement | null
    expect(slot?.assignedElements()).toEqual([host.querySelector('h1') as Element])
  })

  test('travel reflects, and the variant and the numbers do not', async () => {
    /* Reflection exists so a selector can reach a value. The stylesheet fixes
       a traveling host to the viewport; nothing selects on the rest. */
    const host = (await mount(undrawn())) as Strands
    host.travel = true
    host.variant = 'bend'
    host.density = 0.4
    host.speed = 2
    await host.updateComplete
    expect(host.hasAttribute('travel')).toBe(true)
    expect(host.getAttribute('variant')).toBeNull()
    expect(host.getAttribute('density')).toBeNull()
    expect(host.getAttribute('speed')).toBeNull()
  })

  test('the sheet keeps it out of the way: no pointer, and behind the page in travel', async () => {
    /* Imported here rather than at the top for the reason Aura's spec gives:
       this module builds a stylesheet at evaluation. */
    const { styles } = await import('./strands-root.css.js')
    const sheet = (styles as { cssText?: string }).cssText ?? String(styles)
    expect(sheet).toContain('pointer-events: none')
    expect(sheet).toMatch(/:host\(\[travel\]\)\s*\{[^}]*position: fixed/)
    expect(sheet).toMatch(/:host\(\[travel\]\)\s*\{[^}]*z-index: var\(--helix-layer-beneath\)/)
  })

  test('each color hook reaches the canvas, which is where the script reads it', async () => {
    const { styles } = await import('./strands-root.css.js')
    const sheet = (styles as { cssText?: string }).cssText ?? String(styles)
    for (const hook of ['--strands-glow', '--strands-ground', '--strands-peak', '--strands-tint']) {
      expect(sheet).toContain(`var(${hook},`)
    }
  })

  test('removed before its first update, it never asks for a context', async () => {
    const original = HTMLCanvasElement.prototype.getContext
    let asked = 0
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<HTMLCanvasElement['getContext']>
    ) {
      if (args[0] === 'webgl2' && this.parentNode) {
        asked += 1
      }
      return original.apply(this, args)
    } as HTMLCanvasElement['getContext']
    try {
      const host = document.createElement('helix-strands')
      document.body.append(host)
      host.remove()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(asked).toBe(0)
    } finally {
      HTMLCanvasElement.prototype.getContext = original
    }
  })
})
