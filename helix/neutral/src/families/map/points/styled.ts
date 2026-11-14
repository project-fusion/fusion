import { oneOf } from '../../../render.js'
import { difference, measured, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import points from './headless.js'

/**
 * Map Points' styled tier.
 *
 * **Nothing drawn, three colors settled.** The renderer draws the points, and
 * what it draws them in is read off this element by the connector: the fill
 * as `color`, the edge as the border, and a count's ink as the outline, each a
 * color the page's stylesheet settles and the renderer can only be handed.
 * **The fill is a `-surface` step**, the one the token layer pairs with its
 * role's label, since a cluster writes its count on it.
 *
 * **Web only:** the focus ring and the name shown beside it.
 */
export default styles(
  points,
  {
    prefix: 'map-points',
    hooks: {
      casingColor: token('color-surface'),
      color: token('color-primary-surface'),
      ink: token('color-foreground-on-primary'),
    },
    props: {
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'success', 'warning']),
    },
    stylesheet: 'map/points/map-points.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        borderColor: hook.casingColor,
        color: hook.color,
        /* **A box of no size at the map's corner**, the buttons for the
           points in view stood from it by the connector, the way a marker is
           stood from it. `left` and not `inset-inline-start`, for the
           marker's reason. */
        blockSize: 0,
        display: 'block',
        inlineSize: 0,
        insetBlockStart: 0,
        left: 0,
        outlineColor: hook.ink,
        position: 'absolute',
        web: { pointerEvents: 'none' },
      }),
    ]),
    /* **A button on each point in view, invisible until focused.** The
       renderer draws the point and takes the pointer; this is where the
       keyboard stands, ringed in the focus ring when it does, a count's ring
       as wide as a count. */
    on('place', [
      rule({
        blockSize: token('size-control-sm'),
        borderRadius: token('radii-full'),
        inlineSize: token('size-control-sm'),
        left: measured('_map-place-x'),
        outline: 'none',
        position: 'absolute',
        top: measured('_map-place-y'),
        web: { translate: ['-50%', '-50%'] },
      }),
      rule(
        { also: { count: true } },
        { blockSize: token('size-control-lg'), inlineSize: token('size-control-lg') },
      ),
      web([
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      /* A phone has no share of the box to move by, so the button is placed
         back by half its side. */
      native([
        rule({
          left: difference(measured('_map-place-x'), product(token('size-control-sm'), '0.5')),
          top: difference(measured('_map-place-y'), product(token('size-control-sm'), '0.5')),
        }),
        rule(
          { also: { count: true } },
          {
            left: difference(measured('_map-place-x'), product(token('size-control-lg'), '0.5')),
            top: difference(measured('_map-place-y'), product(token('size-control-lg'), '0.5')),
          },
        ),
      ]),
    ]),
    /* **The name, beside the ring while it is focused**, as a marker's is,
       and hidden by opacity rather than taken out: it is the button's name. */
    on({ part: 'label', exact: true }, [
      rule({
        background: token('color-surface-overlay'),
        border: [token('border-floating'), 'solid', token('color-border-floating')],
        borderRadius: token('radii-sm'),
        boxShadow: token('shadow-floating'),
        color: token('color-foreground'),
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        fontWeight: token('weight-medium'),
        insetInlineStart: sum('100%', token('space-sm')),
        opacity: 0,
        padding: [token('space-2xs'), token('space-xs')],
        position: 'absolute',
        top: '50%',
        whiteSpace: 'nowrap',
        web: { translate: [0, '-50%'] },
      }),
      web([rule({ within: { place: { focusVisible: true } } }, { opacity: 1 })]),
    ]),
    on('host', [
      rule(
        { tone: 'accent' },
        {
          color: token('color-accent-surface'),
          outlineColor: hook.ink(token('color-foreground-on-accent')),
        },
      ),
      rule(
        { tone: 'danger' },
        {
          color: token('color-danger-surface'),
          outlineColor: hook.ink(token('color-foreground-on-status')),
        },
      ),
      rule(
        { tone: 'info' },
        {
          color: token('color-info-surface'),
          outlineColor: hook.ink(token('color-foreground-on-status')),
        },
      ),
      /* Muted ink has no fill of its own to carry white, so its counts are
         the surface. */
      rule(
        { tone: 'neutral' },
        { color: token('color-foreground-muted'), outlineColor: hook.ink(token('color-surface')) },
      ),
      rule(
        { tone: 'success' },
        {
          color: token('color-success-surface'),
          outlineColor: hook.ink(token('color-foreground-on-status')),
        },
      ),
      /* Warning takes the solid warning fill under the page's color, for the
         marker's reason: a cluster writes its count on it. */
      rule(
        { tone: 'warning' },
        { color: token('color-warning-solid'), outlineColor: hook.ink(token('color-background')) },
      ),
    ]),
  ],
)
