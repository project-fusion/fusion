import { ImageResponse } from 'next/og'

/**
 * The card every page falls back to, drawn rather than stored.
 *
 * **Drawn, because the alternative is a binary nobody can review.** A checked-in
 * PNG is a file that goes stale silently: the wordmark changes, the line changes,
 * and the card keeps saying what the site said a year ago with nothing to catch
 * it. This reads the same two strings the page does.
 *
 * The type is the fallback stack rather than the brand faces. `ImageResponse`
 * needs font bytes handed to it, and loading three woff2 files to draw a picture
 * nobody looks at closely is a cost with no return: what a card has to do is be
 * legible at thumbnail size and say which site it is.
 */
export const alt = 'Fusion Development Group'
export const size = { height: 630, width: 1200 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#0b0d10',
        color: '#f7f8f8',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: 80,
        width: '100%',
      }}
    >
      <div style={{ color: '#3b82f6', fontSize: 40, fontWeight: 700 }}>Fusion</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 76, lineHeight: 1.05 }}>The interface layer, already built</div>
        <div style={{ color: '#9aa4b2', fontSize: 32 }}>
          Take Helix and go, or hire us to build with it.
        </div>
      </div>
    </div>,
    size,
  )
}
