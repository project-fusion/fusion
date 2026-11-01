import { ImageResponse } from 'next/og'

/** The mark's small cut, as `helix/icons/raw/fusion.svg` draws it, for a renderer with no Helix in it. */
const MARK = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="#f7f8f8" transform="rotate(-30 50 50)"><path d="M54.5 4.221A46 46 0 0 1 54.5 95.779L54.5 65.354A16 16 0 0 0 54.5 34.646Z"/><path d="M45.5 4.221A46 46 0 0 0 45.5 95.779L45.5 85.718A36 36 0 0 1 45.5 14.282Z"/><path d="M45.5 23.378A27 27 0 0 0 45.5 76.622L45.5 65.354A16 16 0 0 1 45.5 34.646Z"/></g></svg>',
)}`

/**
 * The card every page falls back to, drawn rather than stored.
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
      <div
        style={{ alignItems: 'center', display: 'flex', fontSize: 40, fontWeight: 500, gap: 16 }}
      >
        {/* biome-ignore lint/performance/noImgElement: this draws in Satori, where next/image does not exist */}
        <img alt="" height={52} src={MARK} width={52} />
        Fusion
      </div>
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
