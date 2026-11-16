import { fn, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * `emphasis="ghost"`, the inline field, styled once: what the shared field ghost
 * sheet holds, for Input, Number Input, Date Input, and Time Input. Select draws
 * its own. Taken in after `field-frame`, which it quiets.
 *
 * - **It reads as text at rest**, takes a well and a text cursor under the
 *   pointer, and while it is edited draws a ring inside its own box, so a field
 *   in a table cell or a line of a details list never grows the row it is in.
 * - **A value its page refuses rings in the danger color**, as `aria-invalid`
 *   says where the field's own validity is not what refused it: a table's rule,
 *   or a server.
 * - **It is sized by its place**, never by itself, and reads at the control
 *   size and the weight of the text around it. A touch screen keeps the size
 *   iOS will not zoom.
 * - **Round dots under the value at rest** say it can be edited, in the color
 *   the includer hands over as the private `field-ghost-dots`, and the value
 *   lines up as its `field-ghost-align` says, each from the family's own hooks.
 *   Time Input hands over neither, so its dots are none. A browser with no
 *   `field-sizing` draws the dots as a dotted underline.
 *
 * Written out, and the web's: the rules read the host's attributes and states
 * together, which the vocabulary names one at a time. A phone draws no ghost.
 */
export default fragment(
  'field-ghost',
  {
    parts: ['field', 'control'],
    own: { fieldGhostAlign: null, fieldGhostDots: null },
  },
  ({ on, own, rule }) => [
    on(
      {
        part: 'field',
        selector:
          ':host([emphasis="ghost"]) [part="field"], :host([emphasis="ghost"]:not(:disabled, [readonly])) [part="field"]:hover',
      },
      [web([rule({ backgroundColor: 'transparent', borderColor: 'transparent' })])],
    ),
    /* The well and the text cursor say the words can be changed, before a press. */
    on(
      {
        part: 'field',
        selector:
          ':host([emphasis="ghost"]:not(:disabled, [readonly], :focus-within)) [part="field"]:hover',
      },
      [web([rule({ backgroundColor: token('color-well'), cursor: 'text' })])],
    ),
    /* A ring inside the box, never an outline around it, so the field is as
       tall editing as at rest. */
    on(
      {
        part: 'field',
        selector:
          ':host([emphasis="ghost"]:focus-within) [part="field"], :host([emphasis="ghost"]:focus-within) [part="field"]:hover',
      },
      [
        web([
          rule({
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            boxShadow: ['inset', 0, 0, 0, token('border-thick'), token('color-primary')],
            outline: 'none',
          }),
        ]),
      ],
    ),
    on(
      {
        part: 'field',
        selector:
          ':host([emphasis="ghost"]:state(invalid)) [part="field"], :host([emphasis="ghost"]:state(invalid)) [part="field"]:hover',
      },
      [
        web([
          rule({ boxShadow: ['inset', 0, 0, 0, token('border-thick'), token('color-danger')] }),
        ]),
      ],
    ),
    on(
      {
        part: 'field',
        selector:
          ':host([emphasis="ghost"][aria-invalid="true"]) [part="field"], :host([emphasis="ghost"][aria-invalid="true"]:focus-within) [part="field"]',
      },
      [
        web([
          rule({ boxShadow: ['inset', 0, 0, 0, token('border-thick'), token('color-danger')] }),
        ]),
      ],
    ),
    /* A column's track is as wide as its widest content, so a field's resting
       width of twenty characters widened the column it opened in. */
    on(
      {
        part: 'control',
        selector: ':host([emphasis="ghost"]) [part="control"]:not([type="file"])',
      },
      [web([rule({ containIntrinsicInlineSize: 0 })])],
    ),
    on({ part: 'control', selector: ':host([emphasis="ghost"]) [part="control"]' }, [
      web([
        rule({
          fontSize: token('text-control'),
          fontWeight: 'inherit',
          paddingInline: token('space-xs'),
        }),
        rule(
          { coarsePointer: true },
          { fontSize: fn('max', token('text-field-min'), token('text-control')) },
        ),
      ]),
    ]),
    /* The box after the control that carries the resting width. */
    on({ part: 'field', selector: ':host([emphasis="ghost"]) [part="field"]::after' }, [
      web([rule({ content: 'none' })]),
    ]),
    /* The words line up as the place around them does. */
    on({ part: 'control', selector: ':host([emphasis="ghost"]) [part="control"]' }, [
      web([rule({ textAlign: 'inherit' })]),
    ]),
    /* The ring is the edge, so the frame's own inset is taken off. */
    on({ part: 'field', selector: ':host([emphasis="ghost"]) [part="field"]' }, [
      web([rule({ paddingInline: 0 })]),
    ]),
    /* The dots under a value at rest: round dots one and a half pixels across,
       four apart, under the words alone, on the control's own box, which
       `field-sizing` sizes to its words. */
    on(
      {
        part: 'control',
        selector: ':host([emphasis="ghost"]:not(:focus-within)) [part="control"]',
      },
      [
        web([
          rule({
            textDecoration: ['underline', 'dotted', own.fieldGhostDots('transparent')],
            textUnderlineOffset: '0.25em',
          }),
        ]),
      ],
    ),
    on(
      {
        part: 'field',
        selector: ':host([emphasis="ghost"]:not(:focus-within)) [part="field"]',
      },
      [
        web([
          rule(
            { supports: '(field-sizing: content)' },
            { justifyContent: own.fieldGhostAlign('start') },
          ),
        ]),
      ],
    ),
    on(
      {
        part: 'control',
        selector: ':host([emphasis="ghost"]:not(:focus-within)) [part="control"]',
      },
      [
        web([
          rule(
            { supports: '(field-sizing: content)' },
            {
              backgroundClip: 'content-box',
              backgroundImage: fn(
                'radial-gradient',
                'circle',
                [own.fieldGhostDots('transparent'), '0.75px'],
                ['transparent', '1px'],
              ),
              backgroundOrigin: 'content-box',
              backgroundPosition: [0, '100%'],
              backgroundRepeat: 'repeat-x',
              backgroundSize: ['4px', '2px'],
              /* The frame contains the control's width so a resting field
                 takes none of its own, which would size the words to nothing. */
              contain: 'none',
              fieldSizing: 'content',
              flex: '0 1 auto',
              inlineSize: 'auto',
              maxInlineSize: '100%',
              textDecorationLine: 'none',
            },
          ),
        ]),
      ],
    ),
  ],
)
