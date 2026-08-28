'use client'

import { useEffect } from 'react'

/**
 * The last resort: the root layout itself threw.
 *
 * **This file replaces the root layout, so it renders its own document.** That
 * is the documented contract and it has consequences worth stating, because
 * every one of them looks like a mistake in review. There is no
 * `@fusion.dev/helix` here, so no `helix-*` element would upgrade and none is
 * used. There is no `helix.css`, so no token resolves and every value below is
 * literal. There is no `metadata` export, because a boundary is a client
 * component and metadata is not supported in one, so the title is React's
 * `<title>` element instead.
 *
 * **The system font stack rather than ours.** The faces are served from
 * `public/fonts` and reaching them would mean an `@font-face` block, a preload
 * and a swap, on the one page in the application that renders when the
 * application is broken. A page whose job is to work when nothing else does
 * should ask the network for nothing.
 *
 * **The color scheme is the operating system's**, because the pre-paint script
 * that writes `data-color-mode` lives in the root layout this file replaced.
 * `prefers-color-scheme` is the only signal left, so it is the one used, and a
 * reader whose site theme disagrees with their OS sees the OS answer for this
 * one page. Solving that properly means shipping the theme script again here to
 * cover a page that should be unreachable.
 *
 * **In practice this is nearly unreachable**, and that is the point of writing
 * it down: `(site)/error.tsx` catches anything a page throws, so getting here
 * takes a failure in the root layout, the font loading or the providers above
 * it. It is untested by any spec for the same reason. If it ever renders, the
 * digest below is the whole of what we get.
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          alignItems: 'center',
          backgroundColor: 'Canvas',
          color: 'CanvasText',
          colorScheme: 'light dark',
          display: 'flex',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          justifyContent: 'center',
          lineHeight: 1.5,
          margin: 0,
          minHeight: '100dvh',
          padding: '2rem',
        }}
      >
        <title>Something went wrong | Fusion</title>

        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
            Something went wrong.
          </h1>
          <p style={{ margin: '0 0 1.5rem', opacity: 0.75 }}>
            The site failed to start rendering. This is ours to fix, not something you did.
          </p>

          {error.digest ? (
            <p
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '0.8125rem',
                margin: '0 0 1.5rem',
                opacity: 0.6,
                userSelect: 'all',
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}

          <button
            onClick={() => retry()}
            style={{
              background: 'CanvasText',
              border: 0,
              borderRadius: '0.5rem',
              color: 'Canvas',
              cursor: 'pointer',
              font: 'inherit',
              padding: '0.625rem 1.25rem',
            }}
            type="button"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
