import field from '../../../fragments/field.js'
import fieldInline from '../../../fragments/field-inline.js'
import printExact from '../../../fragments/print-exact.js'
import { difference, first, list, product, quotient, scheme, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Switch's styled tier, which writes `helix/styled/src/switch/root/switch-root.generated.css`.
 *
 * **The width follows the height**, so `--switch-block-size` widens the
 * switch too and keeps its proportion, and the density steps carry the ratio
 * without three widths written down.
 *
 * **The thumb travels**, and the fill says the switch is on: a switch has no
 * mark, so the fill is the whole difference between the two states. The fill
 * is `primary-surface`, the ground the thumb's `foreground-on-primary` ink is
 * solved against.
 *
 * **The input is the track on the web**: stretched over it, invisible, and
 * still what takes the press and the focus. A phone presses the row, and the
 * focus ring goes on the thumb either way.
 */
export default styles(
  root,
  {
    prefix: 'switch',
    hooks: ({ own }) => ({
      blockSize: token('size-switch'),
      iconColor: null,
      inlineSize: product(own.height, 1.75),
      onColor: token('color-primary-surface'),
      thumbColor: null,
    }),
    own: ['field-control-inline-size', 'switch-height', 'switch-inset', 'switch-width'],
    stylesheet: 'switch/root/switch-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => [
    include(field),
    include(fieldInline),
    /* The gap around the thumb, named once because three things derive from
       it: the thumb's size, where it rests, and how far it travels. */
    on('host', [
      rule({
        own: {
          height: hook.blockSize,
          width: hook.inlineSize,
          inset: quotient(token('space-2xs'), 2),
          /* What `field-inline` indents the hint by, so it starts under the
             words, declared beside the size it derives from. */
          fieldControlInlineSize: own.width,
        },
      }),
      rule({ display: 'inline-flex', flexDirection: 'column', gap: token('space-2xs') }),
      rule({ formDisabled: true }, { opacity: 0.5 }),
    ]),
    on('field', [
      rule({
        alignItems: 'center',
        web: { cursor: 'pointer' },
        display: 'inline-flex',
        gap: token('space-xs'),
      }),
      /* `:disabled` matches a disabled fieldset around the switch as well. */
      web([rule({ formDisabled: true }, { cursor: 'default' })]),
    ]),
    /* The groove. One cell, so the input lies over the whole of it. */
    on('track', [
      rule({
        backgroundColor: token('color-surface-sunken'),
        blockSize: own.height,
        border: [token('border-thin'), 'solid', token('color-border')],
        borderRadius: token('radii-full'),
        display: 'grid',
        flex: '0 0 auto',
        inlineSize: own.width,
        position: 'relative',
        transition: list(
          ['background-color', token('duration-fast'), token('easing-standard')],
          ['border-color', token('duration-fast'), token('easing-standard')],
        ),
      }),
      rule(
        { checked: true },
        {
          backgroundColor: hook.onColor,
          borderColor: hook.onColor,
        },
      ),
      rule({ invalid: true }, { borderColor: token('color-danger') }),
    ]),
    /* A hairline, which is symmetric where a shadow is not. Over the groove,
       which is `overlay`: lighter than the groove in light, a step up in
       dark. The inset is less the border, since an absolute box is placed
       against its containing block's padding box. */
    on('thumb', [
      rule({
        alignItems: 'center',
        color: hook.iconColor(
          scheme(token('color-foreground-muted'), token('color-surface-sunken')),
        ),
        display: 'flex',
        justifyContent: 'center',
        /* In dark, a light thumb instead. There `overlay` is a single step above
           `sunken`, and an off switch read as an empty groove. A mid-light ink is
           what the platforms' own switches show in dark, and the icon inside it
           turns to the groove's color so it still reads. */
        backgroundColor: hook.thumbColor(
          scheme(token('color-surface-overlay'), token('color-foreground-muted')),
        ),
        blockSize: difference(own.height, product(own.inset, 2)),
        border: [token('border-thin'), 'solid', token('color-border')],
        borderRadius: token('radii-full'),
        inlineSize: difference(own.height, product(own.inset, 2)),
        insetBlockStart: '50%',
        insetInlineStart: difference(own.inset, token('border-thin')),
        pointerEvents: 'none',
        position: 'absolute',
        translate: '0 -50%',
        transition: ['translate', token('duration-fast'), token('easing-emphasized')],
      }),
      /* No hairline once it is on: the thumb on the fill is distinct already. */
      rule(
        { checked: true },
        {
          borderColor: 'transparent',
          color: first(hook.iconColor, hook.onColor),
        },
      ),
      /* On the fill, so it takes the ink meant to sit on it. The travel is the
         track less the thumb and the gap at both ends. */
      rule(
        { checked: true },
        {
          backgroundColor: hook.thumbColor(token('color-foreground-on-primary')),
          translate: [difference(own.width, own.height), '-50%'],
        },
      ),
      rule(
        { within: { track: { holds: { control: 'focusVisible' } } } },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    /* An icon takes most of the thumb, and the thumb's own color. */
    on({ region: ['on', 'off'], slotted: '*' }, [
      rule({ '--icon-size': product(difference(own.height, product(own.inset, 2)), 0.7) }),
    ]),
    /* The input is the track on the web: stretched over it, invisible, and
       still what takes the press and the focus. */
    on('control', [
      rule({
        appearance: web('none'),
        blockSize: '100%',
        cursor: web('inherit'),
        gridArea: web('1 / 1'),
        inlineSize: '100%',
        margin: token('space-none'),
        opacity: 0,
      }),
    ]),
    /* Nothing in it, so no box and no gap beside it. */
    on('label', [rule({ part: { 'data-empty': true } }, { display: 'none' })]),
    /* A switch carries no mark, so the fill must print. */
    include(printExact),
  ],
)
