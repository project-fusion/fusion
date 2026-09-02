'use client'

import { useEffect } from 'react'

/**
 * The last resort: the root layout itself threw.
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
