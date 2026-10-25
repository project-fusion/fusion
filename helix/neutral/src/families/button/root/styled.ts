import { hookOf, list, mix, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import button from './headless.js'

/**
 * Button's styled tier, which writes `helix/styled/src/button/root/button-root.generated.css`.
 *
 * **Two axes.** Each tone sets the private colors, and each emphasis reads
 * them. Written out, `outlined` and `neutral` select nothing and land on the
 * base rule, which is the resting state.
 *
 * **Every hover is gated on the control being live.** A disabled button is
 * half the opacity and nothing else, so an ungated fill would still deepen
 * under the pointer. **A press looks as a hover does**: a touch screen has no
 * hover, and a tap showed nothing until the button acted.
 *
 * **Every emphasis names its own hover, including the ones whose fill does
 * not change.** The generic hover is four class-equivalents and an emphasis
 * rule is three, so without a hover of its own an emphasis loses its fill the
 * moment a pointer touches it.
 */
export default styles(
  button,
  {
    prefix: 'button',
    hooks: [
      'background-color',
      'background-color-hover',
      'border-color',
      'foreground-color',
      'gap',
      'inline-size',
      'padding-inline',
      'radius',
      'radius-end',
      'radius-end-end',
      'radius-end-start',
      'radius-start',
      'radius-start-end',
      'radius-start-start',
      'size',
      'spinner-color',
      'spinner-duration',
      'spinner-size',
    ],
    own: [
      'button-crawl',
      'button-edge',
      'button-fill',
      'button-fill-hover',
      'button-ink',
      'button-on-tone',
      'button-tone',
      'button-tone-hover',
      'button-turn',
    ],
    props: [
      prop('emphasis', ['ghost', 'outlined', 'solid', 'subtle']),
      prop('tone', ['accent', 'danger', 'neutral', 'primary']),
      prop('width', ['auto', 'full']),
    ],
    stylesheet: 'button/root/button-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule, variants }) => [
    on('host', [
      /* `auto` is the initial value, so an unset hook changes nothing. */
      rule({
        display: 'inline-flex',
        minInlineSize: hook.inlineSize('auto'),
        maxInlineSize: '100%',
      }),
      rule({
        own: {
          edge: token('color-border'),
          /* The solid fill is separate from the tone, and it has to be.
             Measured: primary 2.80, warning 1.84. */
          fill: own.tone,
          fillHover: own.toneHover,
          /* The label wherever it sits on a wash of its own tone, deepened
             toward the foreground. The `subtle` emphasis below says why. */
          ink: mix(own.tone, 78, token('color-foreground')),
          onTone: token('color-background'),
          tone: token('color-foreground'),
          /* Loader's own turn and crawl, so two rings on one page agree. No
             rung of the duration scale is that long. */
          crawl: '4s',
          turn: '0.8s',
          /* Softened toward the page, because neutral's tone is already the
             darkest ink there is and there is nothing past it to go to. */
          toneHover: mix(token('color-foreground'), 86, token('color-background')),
        },
      }),
      /* Each tone takes the same six values, so a consumer learns one tone
         and knows the rest. */
      variants('tone', {
        primary: {
          own: {
            edge: token('color-primary'),
            fill: token('color-primary-surface'),
            fillHover: token('color-primary-surface-hover'),
            onTone: token('color-foreground-on-primary'),
            tone: token('color-primary'),
            toneHover: token('color-primary-hover'),
          },
        },
        accent: {
          own: {
            edge: token('color-accent'),
            fill: token('color-accent-surface'),
            fillHover: token('color-accent-surface-hover'),
            onTone: token('color-foreground-on-accent'),
            tone: token('color-accent'),
            toneHover: token('color-accent-hover'),
          },
        },
        danger: {
          own: {
            edge: token('color-danger'),
            fill: token('color-danger-surface'),
            fillHover: token('color-danger-surface-hover'),
            onTone: token('color-foreground-on-status'),
            tone: token('color-danger'),
            /* Mixed toward the ink, for the ink states. */
            toneHover: mix(token('color-danger'), 86, token('color-foreground')),
          },
        },
      }),
      /* **Pressed by a Button Group, the solid fill.** The web group writes
         these hooks onto a pressed button's control. A phone's button reads
         the group's own hooks, with the same fallbacks. */
      rule(
        { platform: 'native', state: 'pressed' },
        {
          '--button-background-color': hookOf(
            'button-group',
            'pressed-background-color',
            token('color-foreground'),
          ),
          '--button-border-color': hookOf(
            'button-group',
            'pressed-border-color',
            hookOf('button-group', 'pressed-background-color', token('color-foreground')),
          ),
          '--button-foreground-color': hookOf(
            'button-group',
            'pressed-color',
            token('color-background'),
          ),
        },
      ),
      /* Block-level at full width. */
      rule({ width: 'full' }, { display: 'flex', inlineSize: '100%' }),
      /* A control is not printed. */
      rule({ print: true }, { display: 'none' }),
    ]),
    on('button', [
      /* `all: unset` first, so the browser's own button styling is gone
         before anything below lands. At rest, a wash of the foreground
         inside a hairline. A container that has already sized its own row
         sets `size` and `padding-inline`: a crumb is 28px, between `sm` at 32
         and nothing, so a button slotted into one stepped the whole trail. */
      rule({
        all: web('unset'),
        alignItems: 'center',
        backgroundColor: hook.backgroundColor(mix(own.tone, 6, 'transparent')),
        blockSize: hook.size(token('size-control')),
        border: [token('border-thin'), 'solid', hook.borderColor(own.edge)],
        boxSizing: 'border-box',
        color: hook.foregroundColor(own.ink),
        cursor: web('pointer'),
        display: 'inline-flex',
        fontFamily: token('font-sans'),
        fontSize: token('text-control'),
        fontWeight: token('weight-medium'),
        gap: hook.gap(token('space-xs')),
        inlineSize: '100%',
        justifyContent: 'center',
        letterSpacing: token('tracking-normal'),
        lineHeight: token('leading-tight'),
        paddingInline: hook.paddingInline(token('space-control')),
        textDecoration: 'none',
        transition: list(
          ['background-color', token('duration-fast'), token('easing-standard')],
          ['border-color', token('duration-fast'), token('easing-standard')],
          ['color', token('duration-fast'), token('easing-standard')],
        ),
        whiteSpace: 'nowrap',
      }),
      /* A corner apiece, so a group can flatten the ones it needs to. `start`
         and `end` name the two inline sides, which is all a row of buttons
         needs: the first keeps its leading corners and the last its trailing
         ones. */
      rule({
        borderEndEndRadius: hook.radiusEndEnd(hook.radiusEnd(hook.radius(token('radii-sm')))),
        borderEndStartRadius: hook.radiusEndStart(hook.radiusStart(hook.radius(token('radii-sm')))),
        borderStartEndRadius: hook.radiusStartEnd(hook.radiusEnd(hook.radius(token('radii-sm')))),
        borderStartStartRadius: hook.radiusStartStart(
          hook.radiusStart(hook.radius(token('radii-sm'))),
        ),
      }),
      /* Hover deepens the wash. */
      rule(
        { disabled: false, interaction: ['hover', 'active'] },
        {
          backgroundColor: hook.backgroundColorHover(
            hook.backgroundColor(mix(own.tone, 12, 'transparent')),
          ),
        },
      ),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      rule(
        { emphasis: 'solid' },
        {
          backgroundColor: hook.backgroundColor(own.fill),
          borderColor: 'transparent',
          color: hook.foregroundColor(own.onTone),
        },
      ),
      rule(
        { disabled: false, emphasis: 'solid', interaction: ['hover', 'active'] },
        {
          backgroundColor: hook.backgroundColorHover(hook.backgroundColor(own.fillHover)),
          borderColor: 'transparent',
        },
      ),
      /* A wash with no line, for a button that reads as colored without
         reading as the one thing to press.

         **A label on a wash of its own tone is deepened**, here and wherever
         else one is: `button-ink`, 78% of the tone mixed toward the
         foreground. A theme the engine derives solves each tone to clear the
         target on the page with nothing to spare, so any wash of the tone
         under it takes it below. Measured in Chromium on October 10, 2026,
         across the shipped theme and 34 the engine derives, the bare tone
         read as low as 4.04:1 on the resting `outlined` wash, 3.66:1 on its
         hover, and 3.92:1 on a `ghost` hover. At 78% every pair clears its
         target in every theme measured but a #4a4a4a dark page. The `ghost`
         label at rest keeps the bare tone, which stands on the page alone
         and clears it there.

         Toward the foreground, because the foreground turns over with the
         mode and a fixed step of the tone does not. */
      rule(
        { emphasis: 'subtle' },
        {
          backgroundColor: hook.backgroundColor(mix(own.tone, 14, 'transparent')),
          borderColor: 'transparent',
          color: hook.foregroundColor(own.ink),
        },
      ),
      rule(
        { disabled: false, emphasis: 'subtle', interaction: ['hover', 'active'] },
        {
          backgroundColor: hook.backgroundColorHover(
            hook.backgroundColor(mix(own.tone, 22, 'transparent')),
          ),
          borderColor: 'transparent',
        },
      ),
      rule(
        { emphasis: 'ghost' },
        {
          backgroundColor: hook.backgroundColor('transparent'),
          borderColor: 'transparent',
          color: hook.foregroundColor(own.tone),
        },
      ),
      /* A wash of the tone. A fixed sunken surface was a 1.39 step darker
         than a raised dialog panel in dark mode, which reads as a hole. */
      rule(
        { disabled: false, emphasis: 'ghost', interaction: ['hover', 'active'] },
        {
          backgroundColor: hook.backgroundColorHover(
            hook.backgroundColor(mix(own.tone, 8, 'transparent')),
          ),
          borderColor: 'transparent',
          color: hook.foregroundColor(own.ink),
        },
      ),
      /* `:disabled` on the host, which a form's disabled fieldset sets too. */
      rule({ disabled: true }, { cursor: web('not-allowed'), opacity: 0.5 }),
      /* **Pending: the words stay where they are, unseen, and a ring turns
         over them**, so the button keeps its width and nothing beside it
         moves. The ring is the `spinner` part, drawn only while pending. The
         cursor says the press is held. */
      rule({ state: 'pending' }, { cursor: web('progress'), position: 'relative' }),
    ]),
    /* **The letters at the middle, in any font.** The line box is centered
       and the letters sit in it where the font's ascent and descent put
       them: in Source Sans 3, 1.3px high in a 40px button. Trimmed to the
       capitals and the baseline, with equal padding for the descenders, the
       box is the letters. The slot is a box so the trim has something to
       apply to. The icons stay their own flex items in `start` and `end`.
       Only where the trim is supported, the padding being only a taller line
       without it. */
    on({ region: 'default' }, [
      rule(
        { platform: 'web', supports: '(text-box: trim-both cap alphabetic)' },
        {
          display: 'block',
          paddingBlock: token('space-2xs'),
          textBox: 'trim-both cap alphabetic',
        },
      ),
    ]),
    /* Icons scale with the label, so a large button does not draw a small
       glyph beside big text. An icon reads `--icon-size`, and a phone stops
       it growing at the largest standard text size. */
    on({ region: '*', slotted: 'helix-icon' }, [rule({ '--icon-size': '1.15em' })]),
    on({ region: '*' }, [rule({ state: 'pending' }, { visibility: 'hidden' })]),
    on('spinner', [
      rule({
        animation: ['helix-button-turn', hook.spinnerDuration(own.turn), 'linear', 'infinite'],
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
      /* Slowed, as Loader does: a ring that holds still reads as broken. The
         crawl is a fixed rate. The base layer sets every duration token to
         0.01ms under the preference, so a rate scaled from one turned the
         ring about eight thousand times a second. */
      rule({ reducedMotion: true }, { animationDuration: own.crawl }),
    ]),
    keyframes('helix-button-turn', { to: { rotate: '1turn' } }),
  ],
)
