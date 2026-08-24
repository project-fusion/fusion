'use client'

import '@helix-io/styles/tokens.css'
import '@helix-io/styles/primitives.css'
import '@helix-io/styles/base.css'
import { useEffect } from 'react'

interface RunMessage {
  family?: string
  origin?: string
  type?: string
}

/**
 * Runs a component's own DOM specs, in a real browser.
 *
 * A frame of its own, not the preview's. `mount` replaces the document body for
 * every test, so specs sharing the preview's document would tear down the
 * example a reader is looking at, several dozen times a second.
 *
 * No `@helix-io/styled` import here. Each spec bundle brings the family it tests,
 * because that is what the spec file itself imports, so loading every component
 * up front would only mean the definitions race: whichever registered first
 * wins, and `customElements.define` throws on the second.
 *
 * What runs is the same file CI runs. `bun:test` and the DOM helpers are
 * resolved to a browser harness at bundle time, and nothing else is rewritten.
 */
export function SpecFrame() {
  useEffect(() => {
    let parentOrigin = '*'
    const post = (message: unknown) => window.parent?.postMessage(message, parentOrigin)

    // Loaded once each. A second import of the same bundle would register every
    // test again, and the element definitions with them.
    const loaded = new Map<string, Promise<{ run: () => Promise<unknown[]> }>>()

    const onMessage = async (event: MessageEvent<RunMessage>) => {
      if (event.data?.type !== 'helix-specs-run' || event.source !== window.parent) {
        return
      }
      parentOrigin = event.data.origin ?? event.origin
      const family = event.data.family
      if (!family || !/^[a-z][a-z0-9-]*$/.test(family)) {
        return
      }

      try {
        let bundle = loaded.get(family)
        if (!bundle) {
          bundle = import(/* webpackIgnore: true */ `/specs/${family}.js`)
          loaded.set(family, bundle)
        }
        const started = performance.now()
        const results = await (await bundle).run()
        post({
          duration: performance.now() - started,
          family,
          results,
          type: 'helix-specs-results',
        })
      } catch (error) {
        post({
          error: error instanceof Error ? error.message : String(error),
          family,
          type: 'helix-specs-failed',
        })
      }
    }

    window.addEventListener('message', onMessage)
    post({ type: 'helix-specs-ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return null
}
