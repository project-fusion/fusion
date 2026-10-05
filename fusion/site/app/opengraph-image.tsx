import { ImageResponse } from 'next/og'
import { SITE_BRAND } from '@/utils/theme-defaults/theme-defaults'

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
      <div style={{ color: SITE_BRAND || '#f7f8f8', fontSize: 40, fontWeight: 700 }}>Fusion</div>
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
