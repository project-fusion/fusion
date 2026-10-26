'use client'

import { useEffect, useState } from 'react'

/*
 * The one route that must not have the library, and why it cannot say so itself.
 *
 * The spec runner imports a bundle per family from `public/specs`, and each of
 * those carries the family it tests: it has to, because
 * `run-browser-specs.mjs` runs the same bundles against a blank page in CI,
 * where nothing else registers anything. In the sandbox's iframe that is a
 * second registration of tags this component has already made, and the library
 * warns about it by name, once per tag, saying the page holds two copies of
 * Helix. It does, and this is the copy that should not be there:
 * `spec-frame.tsx` says in as many words that it imports no components, "because
 * loading every component would be loading 92 families to test one". A root
 * layout is above that intent and overrides it, since a child route cannot
 * un-render a parent's component.
 *
 * **Kept out of the spec runner by not being rendered there**, which replaced a
 * `window.location.pathname` test in this file. The sniff worked and put a route
 * into a component that has no other reason to know about routes; the structural
 * fix was read as needing a root layout per route group, and it did not. This
 * returns `null` and is a leaf, so where it renders is the whole of the
 * decision: `(site)`'s layout, the theme builder's layout, and the sandbox
 * *page* rather than the sandbox layout, which is an ancestor of `specs/`.
 * `fusion x spec`'s `isolated` fails if the specs document ever registers the
 * library again, whichever way it is kept out.
 */

/**
 * Gives dictation an engine for browsers whose own recognizer cannot listen,
 * Brave and Firefox among them. The browser's recognizer listens first, and
 * Moonshine, on the device, where it fails. The preview's examples listen
 * through the same engine. Moonshine's model downloads on the first press
 * that needs it, and never in a browser whose recognizer works. The worker is
 * served from `public/helix-speech`, which `speech-copy` writes.
 */
const listenWhereTheBrowserCannot = async (): Promise<void> => {
  const [{ browserSpeech, registerSpeechEngine }, { fallbackSpeech, moonshineSpeech }] =
    await Promise.all([import('@fusion.dev/helix-core'), import('@fusion.dev/helix-speech')])
  registerSpeechEngine(fallbackSpeech(browserSpeech, moonshineSpeech({ worker: '/helix-speech/' })))
}

/**
 * Registers every Helix element the site uses, and the dictation engine,
 * after React has hydrated.
 *
 * **The effect buys load order, not hydration safety.** The definitions leave
 * the critical path and arrive after the page does, measured at 169ms against a
 * load event at 136. The window where a tag is unknown is what
 * `@fusion.dev/helix-styles/helix.css` covers, hiding `:not(:defined)` by visibility
 * so the page does not reflow when the definitions land.
 */
export function HelixElements(): null {
  const [, setRegistered] = useState(false)

  useEffect(() => {
    let live = true
    /* **The bar's families first, then the library.** `helix.css` hides a tag
       until its definition loads, and a hidden link takes no focus, so until
       then the bar can neither be seen nor used: a key pressed on the Helix
       product 300 ms into a cold load did nothing. With the whole library in
       one import the megamenu was defined 348 to 366 ms into a cold load of the
       home page and about 1,300 ms at a quarter of the CPU, measured on October
       25, 2026. With the bar's own families asked for first, 168 to 235 ms and
       815 ms, and the rest of the library arrives when it did. The bar at rest
       is these; its drawer, tree, and palette open later and come with the
       rest. */
    const elements = Promise.allSettled([
      import('@fusion.dev/helix/app-header'),
      import('@fusion.dev/helix/navigation'),
      import('@fusion.dev/helix/megamenu'),
      import('@fusion.dev/helix/button'),
      import('@fusion.dev/helix/icon-button'),
      import('@fusion.dev/helix/icon'),
      import('@fusion.dev/helix/tooltip'),
      import('@fusion.dev/helix/kbd'),
      import('@fusion.dev/helix'),
      import('@fusion.dev/helix-workbench/specs'),
    ])
    /* **A mark on the document once the elements are in and drawn**, for an
       entrance that has to wait for them. The first frame after the
       definitions styles and lays out every element that just upgraded: 200ms
       on a cold load and about 900ms at a quarter of the CPU, measured on
       fusion.dev on October 22, 2026. An animation running through that frame
       holds and then jumps ahead, which is how the landing page's hero
       stuttered in. Set when the imports have settled, even where one failed,
       so nothing waits on it forever, and two frames later. The first
       callback runs before that frame is drawn and the second after it, so an
       animation started by the mark begins after the expensive frame. A tab
       opened in the background draws no frames, so its hero rises once the
       tab is shown. Kept on the document across navigations, as the elements
       are. */
    void elements.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.dataset.helixElements = ''
        })
      })
    })
    void Promise.all([elements, listenWhereTheBrowserCannot()]).then(() => {
      if (live) {
        setRegistered(true)
      }
    })
    return () => {
      live = false
    }
  }, [])

  return null
}
