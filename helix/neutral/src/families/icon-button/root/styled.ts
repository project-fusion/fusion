import iconButtonFloating from '../../../fragments/icon-button-floating.js'
import iconButtonTones from '../../../fragments/icon-button-tones.js'
import { hookOf, inherit, list, mix, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Icon Button's styled tier, which writes
 * `helix/styled/src/icon-button/root/icon-button-root.generated.css`.
 *
 * **Button's two axes, resting elsewhere.** A text button rests outlined,
 * because a button with words in it is a thing you are meant to see. An icon
 * button rests as a ghost, because a toolbar of framed squares is a toolbar of
 * boxes. So the resting ink is muted, and it lifts to the full foreground
 * under a pointer.
 *
 * **Every rule that colors the button reads through two pressed values**,
 * `icon-button-pressed-fill` and `icon-button-pressed-ink`, which are set only
 * while the button is down and only from the `-active` hooks. With neither
 * hook set, a press looks as the state under it does.
 *
 * **The private colors each tone sets are `icon-button-tones`**, and the
 * ground and lift of a button over a busy surface are
 * `icon-button-floating`, which Copy Button takes in with the rest of Icon
 * Button's rules.
 */
export default styles(
  root,
  {
    prefix: 'icon-button',
    hooks: [
      'background-color',
      'background-color-active',
      'background-color-hover',
      'border-color',
      'border-width',
      'foreground-color',
      'foreground-color-active',
      'radius',
      'size',
      'spinner-color',
      'spinner-duration',
      'spinner-size',
    ],
    own: [
      'icon-button-crawl',
      'icon-button-edge',
      'icon-button-fill',
      'icon-button-fill-hover',
      'icon-button-ink',
      'icon-button-ink-hover',
      'icon-button-on-tone',
      'icon-button-pressed-fill',
      'icon-button-pressed-ink',
      'icon-button-size',
      'icon-button-tone',
      'icon-button-turn',
    ],
    props: [
      prop('emphasis', ['ghost', 'outlined', 'solid', 'subtle']),
      prop('material', ['frosted', 'glass', 'transparent']),
      prop('raised', 'boolean', { default: false }),
      prop('shape', ['circle']),
      prop('tone', ['accent', 'danger', 'neutral', 'primary']),
    ],
    stylesheet: 'icon-button/root/icon-button-root.generated.css',
  },
  ({ hook, include, keyframes, on, own, rule }) => [
    on('host', [rule({ display: 'inline-flex', own: { size: hook.size(token('size-control')) } })]),
    include(iconButtonTones),
    /* Square by construction: one length for both sides, so the control stays
       the same box whatever glyph it holds. The edge is written in longhands,
       so `--icon-button-border-width` takes one to four widths, for a control
       one side of whose edge is another's. */
    on('button', [
      rule({
        alignItems: 'center',
        backgroundColor: own.pressedFill(hook.backgroundColor('transparent')),
        blockSize: own.size,
        borderColor: hook.borderColor('transparent'),
        borderStyle: 'solid',
        borderWidth: hook.borderWidth(token('border-thin')),
        /* A corner apiece, read from Button's corner hooks, so a Button Group
           flattens the corners it joins on an icon button as on a button. */
        borderEndEndRadius: hookOf(
          'button',
          'radius-end-end',
          hookOf('button', 'radius-end', hook.radius(token('radii-sm'))),
        ),
        borderEndStartRadius: hookOf(
          'button',
          'radius-end-start',
          hookOf('button', 'radius-start', hook.radius(token('radii-sm'))),
        ),
        borderStartEndRadius: hookOf(
          'button',
          'radius-start-end',
          hookOf('button', 'radius-end', hook.radius(token('radii-sm'))),
        ),
        borderStartStartRadius: hookOf(
          'button',
          'radius-start-start',
          hookOf('button', 'radius-start', hook.radius(token('radii-sm'))),
        ),
        color: own.pressedInk(hook.foregroundColor(own.ink)),
        cursor: web('pointer'),
        display: 'inline-flex',
        /* A browser gives a button its own font, which the first content that
           is not an icon would show. */
        font: inherit(),
        inlineSize: own.size,
        justifyContent: 'center',
        padding: token('space-none'),
        transition: list(
          ['background-color', token('duration-fast'), token('easing-standard')],
          ['color', token('duration-fast'), token('easing-standard')],
        ),
      }),
      /* A wash of the tone under the pointer, which is a step away from whatever
         the button sits on in either mode. A rung of the surface ladder vanished
         inside a menu, a dialog, or a popover in dark mode. */
      rule(
        { disabled: false, hover: true },
        {
          backgroundColor: own.pressedFill(
            hook.backgroundColorHover(hook.backgroundColor(mix(own.tone, 8, 'transparent'))),
          ),
          color: own.pressedInk(hook.foregroundColor(own.inkHover)),
        },
      ),
      /* Pressed: the two values every color rule reads through, from the
         `-active` hooks alone. */
      rule(
        { active: true, disabled: false },
        {
          own: {
            pressedFill: hook.backgroundColorActive(),
            pressedInk: hook.foregroundColorActive(),
          },
        },
      ),
      rule({ shape: 'circle' }, { borderRadius: token('radii-full') }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      /* The three departures from the resting ghost. */
      rule(
        { emphasis: 'solid' },
        {
          backgroundColor: own.pressedFill(hook.backgroundColor(own.fill)),
          borderColor: hook.borderColor('transparent'),
          color: own.pressedInk(hook.foregroundColor(own.onTone)),
        },
      ),
      rule(
        { disabled: false, emphasis: 'solid', hover: true },
        {
          backgroundColor: own.pressedFill(
            hook.backgroundColorHover(hook.backgroundColor(own.fillHover)),
          ),
          color: own.pressedInk(hook.foregroundColor(own.onTone)),
        },
      ),
      /* Framed, for a control beside a field, with the same 6% wash Button
         rests on, so a row of an icon button and a text button reads as one
         kind of control. */
      rule(
        { emphasis: 'outlined' },
        {
          backgroundColor: own.pressedFill(hook.backgroundColor(mix(own.tone, 6, 'transparent'))),
          borderColor: hook.borderColor(own.edge),
          color: own.pressedInk(hook.foregroundColor(own.tone)),
        },
      ),
      rule(
        { disabled: false, emphasis: 'outlined', hover: true },
        {
          backgroundColor: own.pressedFill(
            hook.backgroundColorHover(hook.backgroundColor(mix(own.tone, 12, 'transparent'))),
          ),
          color: own.pressedInk(hook.foregroundColor(own.tone)),
        },
      ),
      rule(
        { emphasis: 'subtle' },
        {
          backgroundColor: own.pressedFill(hook.backgroundColor(mix(own.tone, 14, 'transparent'))),
          borderColor: hook.borderColor('transparent'),
          color: own.pressedInk(hook.foregroundColor(own.tone)),
        },
      ),
      rule(
        { disabled: false, emphasis: 'subtle', hover: true },
        {
          backgroundColor: own.pressedFill(
            hook.backgroundColorHover(hook.backgroundColor(mix(own.tone, 22, 'transparent'))),
          ),
          color: own.pressedInk(hook.foregroundColor(own.tone)),
        },
      ),
      /* `:disabled` on the host, which a form's disabled fieldset sets too. */
      rule({ disabled: true }, { cursor: web('not-allowed'), opacity: 0.5 }),
      /* **Pending: the icon stays where it is, unseen, and a ring turns over
         it**, as on Button. The ring is the `spinner` part, drawn only while
         pending. */
      rule({ state: 'pending' }, { cursor: web('progress'), position: 'relative' }),
    ]),
    /* **Pressed by a Button Group, the solid fill**, as a Button takes it. The
       web group writes these hooks onto a pressed button's control. A phone's
       icon button reads the group's own hooks, with the same fallbacks. */
    on('host', [
      rule(
        { state: 'pressed', platform: 'native' },
        {
          '--icon-button-background-color': hookOf(
            'button-group',
            'pressed-background-color',
            token('color-foreground'),
          ),
          '--icon-button-border-color': hookOf(
            'button-group',
            'pressed-border-color',
            hookOf('button-group', 'pressed-background-color', token('color-foreground')),
          ),
          '--icon-button-foreground-color': hookOf(
            'button-group',
            'pressed-color',
            token('color-background'),
          ),
        },
      ),
    ]),
    on({ region: '*' }, [rule({ state: 'pending' }, { visibility: 'hidden' })]),
    on('spinner', [
      rule({
        animation: ['helix-icon-button-turn', hook.spinnerDuration(own.turn), 'linear', 'infinite'],
        blockSize: hook.spinnerSize('1.15em'),
        border: [
          token('border-thick'),
          'solid',
          mix(hook.spinnerColor('currentColor'), 30, 'transparent'),
        ],
        borderBlockStartColor: hook.spinnerColor('currentColor'),
        borderRadius: token('radii-full'),
        boxSizing: 'border-box',
        inlineSize: hook.spinnerSize('1.15em'),
        inset: 0,
        margin: 'auto',
        position: 'absolute',
      }),
      /* Slowed to a fixed rate, as Loader does. The base layer sets every
         duration token to 0.01ms under the preference, so a rate scaled from one
         turned the ring about eight thousand times a second. */
      rule({ reducedMotion: true }, { animationDuration: own.crawl }),
    ]),
    keyframes('helix-icon-button-turn', { to: { rotate: '1turn' } }),
    include(iconButtonFloating),
    /* A control is not printed. */
    on('host', [rule({ print: true }, { display: 'none' })]),
  ],
)
