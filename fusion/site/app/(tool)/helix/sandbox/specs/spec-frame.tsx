'use client'

import '@fusion.dev/helix-styles/tokens.css'
import '@fusion.dev/helix-styles/primitives.css'
import '@fusion.dev/helix-styles/base.css'
import { useEffect } from 'react'

interface RunMessage {
  family?: string
  origin?: string
  type?: string
}

/**
 * Runs a component's own DOM specs, in a real browser.
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
