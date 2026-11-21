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
 * Runs `work` against a body of its own, and gives React's back afterwards.
 *
 * **The specs own `document.body`, and so does React.** Every spec mounts by
 * writing the body's `innerHTML`, which throws away the nodes the root layout
 * rendered there. Nothing notices until React next commits to them, which in
 * development is the next compile: the router refreshes, React removes a node
 * that is no longer where it left it, and the frame falls over into the global
 * error page with "The node to be removed is not a child of this node."
 *
 * An empty body swapped in for the run keeps both honest. The specs see a
 * document whose body is theirs to overwrite, and React keeps a reference to a
 * body whose children are exactly the ones it made, so a refresh during a run
 * lands on it harmlessly and one after lands on it back in place. The copy
 * keeps the attributes the layout wrote, since a spec's page is still that page.
 */
const aside = async <T,>(work: () => Promise<T>): Promise<T> => {
  const owned = document.body
  const stage = owned.cloneNode(false) as HTMLElement
  owned.replaceWith(stage)
  try {
    return await work()
  } finally {
    if (stage.isConnected) {
      stage.replaceWith(owned)
    }
  }
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

    /* **One run at a time.** Every run owns the one document body, so two at
       once would each mount over the other's fixtures, and the second would
       set aside the first's stand-in body rather than React's and put that
       back. A reader picking another family mid-run queues it. */
    let queue = Promise.resolve()

    const onMessage = (event: MessageEvent<RunMessage>) => {
      if (event.data?.type !== 'helix-specs-run' || event.source !== window.parent) {
        return
      }
      parentOrigin = event.data.origin ?? event.origin
      const family = event.data.family
      if (!family || !/^[a-z][a-z0-9-]*$/.test(family)) {
        return
      }

      queue = queue.then(() => runFamily(family))
    }

    const runFamily = async (family: string): Promise<void> => {
      try {
        let bundle = loaded.get(family)
        if (!bundle) {
          bundle = import(/* webpackIgnore: true */ `/specs/${family}.js`)
          loaded.set(family, bundle)
        }
        const started = performance.now()
        const results = await aside(async () => (await bundle).run())
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
