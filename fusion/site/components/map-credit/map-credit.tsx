import type { CreditPart } from '@fusion.dev/helix-map/snapshot'

/**
 * A map snapshot's credit, in the frame's `attribution` slot, so the frame
 * credits the tiles from the first paint. Put it in the frame as a child of
 * its own. Marked `data-helix-map-credit`, so `connectMap` hides it once it
 * writes MapLibre's. Nothing where the tiles name no credit.
 */
export function MapCredit({ credit }: { credit: readonly CreditPart[] }) {
  if (credit.length === 0) {
    return null
  }
  return (
    <span data-helix-map-credit="" slot="attribution">
      {credit.map((part) =>
        part.href === undefined ? (
          part.text
        ) : (
          <a
            data-link="quiet"
            href={part.href}
            key={`${part.href} ${part.text}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {part.text}
          </a>
        ),
      )}
    </span>
  )
}
