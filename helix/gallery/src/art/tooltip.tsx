import type { CSSProperties, ReactNode } from 'react'

export const tooltipArt: ReactNode = (
  <>
    <rect className="artSunken" height="24" rx="4" width="24" x="100" y="112" />
    <rect className="artEdge" height="23" rx="4" width="23" x="100.5" y="112.5" />
    {/* It scales up out of the target and carries no arrow.
     *
     * An arrow is a thing the component can draw and at card size it reads as
     * a notch in the panel's underside. What says "this belongs to that" is
     * the scale origin: growing from `center bottom`, directly above the
     * target, is the same gesture the real component performs and needs no
     * second mark to explain it.
     *
     * Shift zeroed, scale raised. The shared swell drifts five units down,
     * which on a panel anchored to something reads as it coming loose. */}
    <g
      className="artMotion artOpen"
      style={
        {
          '--art-swell-scale': 1.08,
          '--art-swell-shift': '0px',
          transformOrigin: 'center bottom',
        } as CSSProperties
      }
    >
      <g filter="url(#helixArtShadow)">
        <rect className="artInverse" height="32" rx="4" width="128" x="96" y="52" />
      </g>
      <rect className="artOnInverse" height="8" rx="4" width="80" x="112" y="64" />
    </g>
  </>
)
