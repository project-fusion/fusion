import { ImageResponse } from 'next/og'
import { findFamily } from '../../../../../../content/catalog/catalog'

/**
 * The card a component family unfurls with, drawn from what the family already
 * says about itself.
 *
 * **Eighty-eight routes shared one picture.** The title and the description
 * became per-family when 247 landed, and the card did not, so a link to
 * `Accordion` and a link to `VirtualList` still arrived in a chat window as the
 * same image of the site's own pitch. That is most of the site by count
 * unfurling as though every page were the front page.
 *
 * **Drawn rather than shot, which 255 settled and the reasoning is worth
 * keeping.** The alternative was rendering each family's headline example
 * through Playwright, which puts the real component in the card and costs 88
 * binaries in the repository plus a step that has to re-run whenever a
 * component changes. A card is read at thumbnail size in a message list, where
 * a name set large is legible and a screenshot of a control is a gray smudge.
 * Drawing it also cannot go stale: it reads the same `label`, `summary` and
 * `status` the page does, so a renamed component renames its card.
 *
 * The type is the fallback stack, for the reason the root card gives:
 * `ImageResponse` wants font bytes handed to it, and loading the brand faces to
 * draw a picture nobody inspects closely buys nothing.
 */
/* **Every `<div>` here declares `display`, and the ones holding text hold one
   child.** Satori, which draws this, refuses a box with more than one child and
   no explicit display, and the refusal arrives as `failed to pipe response`
   with an empty body rather than as a build error: the route compiles, the
   metadata points at it, and the crawler gets nothing. `Since ${'${family.since}'}`
   was two children, a string and an expression, and cost exactly that. */
export const alt = 'A Helix component'
export const size = { height: 630, width: 1200 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ family: string }> }) {
  const family = findFamily((await params).family)

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
      <div style={{ alignItems: 'center', display: 'flex', gap: 16 }}>
        <div style={{ color: '#3b82f6', fontSize: 40, fontWeight: 700 }}>Fusion</div>
        <div style={{ color: '#3f4650', fontSize: 40 }}>/</div>
        <div style={{ color: '#9aa4b2', fontSize: 40 }}>Helix</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 96, lineHeight: 1.02 }}>{family?.label ?? 'Components'}</div>
        {/* The summary is written as the one sentence that says what the
            component is, which is exactly what a card wants. Clamped rather
            than wrapped freely: `ImageResponse` has no overflow, so a long
            sentence would draw past the edge instead of ending. */}
        <div style={{ color: '#9aa4b2', fontSize: 34, lineHeight: 1.3, maxWidth: 900 }}>
          {family?.summary ?? 'The Helix component reference'}
        </div>
      </div>

      {/* The stage, because it is the one fact a reader wants before they
          depend on something and the page already refuses to soften it. */}
      {family ? (
        <div style={{ display: 'flex', gap: 16 }}>
          <div
            style={{
              border: '2px solid #3f4650',
              borderRadius: 999,
              color: '#9aa4b2',
              fontSize: 26,
              padding: '8px 24px',
            }}
          >
            {family.status === 'stable' ? 'Stable' : 'Experimental'}
          </div>
          {family.since ? (
            <div
              style={{
                border: '2px solid #3f4650',
                borderRadius: 999,
                color: '#9aa4b2',
                fontSize: 26,
                padding: '8px 24px',
              }}
            >
              {`Since ${family.since}`}
            </div>
          ) : null}
        </div>
      ) : (
        <div />
      )}
    </div>,
    size,
  )
}
