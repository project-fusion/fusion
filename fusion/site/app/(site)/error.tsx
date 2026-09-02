'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import styles from '@/components/trouble/trouble.module.css'

/**
 * What a reader gets when a page under the site chrome throws.
 *
 * **The prop is `retry`, not the `reset` earlier Next versions named.** It
 * re-fetches and re-renders the boundary's children, and if that succeeds the
 * fallback is replaced by the real page. Check `node_modules/next/dist/docs`
 * rather than memory, which is a version behind.
 *
 * **It sits inside `(site)`, so the nav and the footer survive the error.** An
 * `error` file does not wrap the layout in its own segment, which is exactly
 * the property wanted here: the thing that failed is the page, the way out is
 * the chrome, and a boundary at the root would take the way out down with it.
 * `global-error.tsx` is the one that catches a root layout that threw, and it
 * has to rebuild the document because by then there is nothing left standing.
 *
 * **The digest is shown because the message is not.** In production the `Error`
 * reaching the client from a server component carries a generic string and this
 * hash, deliberately, so the hash is the only thing a reader can tell us that
 * finds anything in the logs. Printing it is the difference between a bug report
 * we can act on and "the site broke".
 *
 * `console.error` because there is no error service yet. When there is one, this
 * is where it goes.
 */
export default function SiteError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={styles.trouble}>
      {/* A tag rather than the mono kicker the 404 wears. That one is a status
          code set in the voice of a server; this is a state the page is in, and
          `danger` is the tone the system already has for it. It also stops the
          word being shouted: the kicker uppercases, which turns a plain English
          word into ERROR. */}
      <helix-tag emphasis="subtle" tone="danger">
        Error
      </helix-tag>
      <h1 className={styles.troubleTitle}>This page did not finish loading.</h1>
      <p className={styles.troubleLede}>
        Something on our side threw while rendering. The rest of the site is unaffected, and trying
        again is worth a moment: a fair number of these are transient.
      </p>

      {error.digest ? <p className={styles.troubleDigest}>Reference: {error.digest}</p> : null}

      {/* **Two actions and an aside, rather than three things in a row.**
          Retrying and leaving are peers and read as buttons; telling us is a
          different kind of act and was sitting between them as unstyled text.
          `data-button` on an anchor is the base layer's recipe, which is what
          it is for: a control this library does not render. */}
      <div className={styles.troubleWays}>
        <helix-button emphasis="solid" onClick={() => retry()} tone="primary" width="standard">
          Try again
        </helix-button>
        <Link data-button="subtle" data-button-width="standard" href="/">
          Go to the front page
        </Link>
      </div>

      <p className={styles.troubleAside}>
        Still stuck? <Link href="/contact">Tell us about it</Link>
      </p>
    </div>
  )
}
