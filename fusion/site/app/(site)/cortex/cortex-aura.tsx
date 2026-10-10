'use client'
import { useMotion } from '@/hooks/use-motion/use-motion'

/**
 * The field behind the Cortex page: an aura, where the landing page runs a
 * strand. The strand is the DNA's light, one thread down the page; the mind
 * gets a field, a lattice of light that breathes behind the bands, in the
 * same element the services page and the Aura page draw with.
 *
 * It holds still when the reader turns motion off in the preferences drawer,
 * through the element's own `paused`, which is what WCAG 2.2.2 asks of
 * anything that moves for more than five seconds; the device's reduced-motion
 * setting stills it inside the element itself.
 */
export function CortexAura({
  className,
  variant = 'particles',
}: {
  className: string
  variant?: 'lattice' | 'particles' | 'threads' | 'flow'
}) {
  const motion = useMotion()
  return (
    <helix-aura
      class={className}
      data-layer
      gain={0.9}
      paused={motion === 'off' || undefined}
      scale={2.4}
      speed={0.4}
      terminus={0.5625}
      variant={variant}
    ></helix-aura>
  )
}
