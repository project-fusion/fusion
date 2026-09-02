'use client'

import { useEffect } from 'react'

/**
 * Registers the sandbox editor, after React has hydrated.
 */
export function useSandboxEditor(): void {
  useEffect(() => {
    void import('@fusion.dev/helix-sandbox/editor')
  }, [])
}
