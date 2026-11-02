import { fn, quotient, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * A date or a time as a row of segments: what the shared field segments sheet
 * holds, for Date Input and Time Input. Each family hands in its own hooks through
 * the private `segment-*` values.
 *
 * **The row takes the text's type**, so a field reads the same size whichever it
 * holds, with figures of one width so a segment does not move the ones after it.
 *
 * **The segment with focus is marked by its fill**, and the ring stays the field's.
 * The fill is `primary-surface`, the ground `foreground-on-primary` is solved
 * against. A family writes a disabled row's rule, since a fragment declares no state.
 */
export default fragment(
  'field-segments',
  {
    parts: ['segments', 'segment', 'segment-placeholder', 'literal'],
    own: {
      segmentFocusBackgroundColor: null,
      segmentFocusColor: null,
      segmentLiteralColor: null,
      segmentPlaceholderColor: null,
    },
  },
  ({ on, own, rule }) => [
    on('segments', [
      rule({
        alignItems: 'center',
        color: token('color-foreground'),
        display: 'flex',
        flex: '1 1 auto',
        fontFamily: token('font-sans'),
        fontSize: fn('max', token('text-field-min'), token('text-field')),
        fontVariantNumeric: 'tabular-nums',
        fontWeight: token('weight-medium'),
        minInlineSize: 0,
        whiteSpace: 'nowrap',
      }),
    ]),
    on('segment', [
      rule({
        web: { caretColor: 'transparent', outline: 'none' },
        borderRadius: token('radii-sm'),
        paddingInline: quotient(token('space-2xs'), 2),
      }),
    ]),
    /* Written out: the vocabulary's focus is the host's, and this is the segment's own. */
    on({ part: 'segment', selector: '[part~="segment"]:focus' }, [
      web([
        rule({
          backgroundColor: own.segmentFocusBackgroundColor(token('color-primary-surface')),
          color: own.segmentFocusColor(token('color-foreground-on-primary')),
        }),
      ]),
    ]),
    on('segment-placeholder', [
      rule({
        color: own.segmentPlaceholderColor(token('color-foreground-muted')),
        fontWeight: token('weight-regular'),
      }),
    ]),
    on('literal', [
      rule({ color: own.segmentLiteralColor(token('color-foreground-muted')), whiteSpace: 'pre' }),
    ]),
  ],
)
