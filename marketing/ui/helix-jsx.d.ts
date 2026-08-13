import type { HTMLAttributes } from 'react'

/**
 * Hand-written for this experiment. If this approach wins, the generator emits
 * it from the manifest, so JSX types stay in step with the elements.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'helix-card': HTMLAttributes<HTMLElement> & { appearance?: 'outlined' | 'elevated' | 'plain' }
      'helix-card-body': HTMLAttributes<HTMLElement>
      'helix-card-header': HTMLAttributes<HTMLElement>
      'helix-card-title': HTMLAttributes<HTMLElement> & { level?: number }
    }
  }
}
