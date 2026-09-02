import type { ReactNode } from 'react'

/**
 * A 40 pixel avatar and two lines, at 40% and 70% of the row.
 *
 * The sweep is the component's own: a straight band, traveling leftward,
 * 1.4s ease-in-out, continuous, matching `helix-skeleton-sweep` rather than
 * looking better than it.
 *
 * The bars are unequal on purpose. Two of the same length read as a pattern,
 * and a reader waiting on content reads a pattern as decoration rather than
 * as something about to be replaced.
 */
export const skeletonArt: ReactNode = (
  <>
    <defs>
      <g id="helixArtSkeleton">
        <circle cx="80" cy="100" r="20" />
        <rect height="14" rx="7" width="64" x="116" y="86" />
        <rect height="14" rx="7" width="112" x="116" y="108" />
      </g>
      <linearGradient id="helixArtSkeletonSweep" x1="0" x2="1">
        <stop offset="0" stopColor="var(--helix-color-foreground)" stopOpacity="0" />
        <stop offset="0.5" stopColor="var(--helix-color-foreground)" stopOpacity="0.14" />
        <stop offset="1" stopColor="var(--helix-color-foreground)" stopOpacity="0" />
      </linearGradient>
      {/* The three shapes again, written out, and never a `use` pointed at
          the group above.
       *
       * A `clipPath` may hold shapes, `text` and `use`, but the `use` has to
       * reference a *basic shape*: pointed at a `<g>` it contributes no
       * geometry, so the clip is empty, and an empty clip does not mean "do
       * not clip", it means clip everything. The band then traverses the card
       * on schedule with every pixel of it discarded.
       *
       * Nothing warns. The markup is well formed, the id resolves, the
       * element exists, and the only symptom is that a thing you cannot see
       * is not there. */}
      <clipPath id="helixArtSkeletonClip">
        <circle cx="80" cy="100" r="20" />
        <rect height="14" rx="7" width="64" x="116" y="86" />
        <rect height="14" rx="7" width="112" x="116" y="108" />
      </clipPath>
    </defs>
    <use className="artInk" fillOpacity="0.12" href="#helixArtSkeleton" />
    <g clipPath="url(#helixArtSkeletonClip)">
      <rect
        className="artSweep"
        fill="url(#helixArtSkeletonSweep)"
        height="90"
        width="240"
        x="0"
        y="60"
      />
    </g>
  </>
)
